<?php

namespace App\Services;

use App\Jobs\NotificarCancelacionLluviaWhatsAppJob;
use App\Models\Cancha;
use App\Models\CancelacionLluvia;
use App\Models\Complejo;
use App\Models\Turno;
use App\Models\User;
use App\Models\ValeCredito;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CancelacionLluviaService
{
    public function __construct(
        protected WalletService $walletService,
        protected ReservaLockService $reservaLockService,
        protected DisponibilidadService $disponibilidadService
    ) {}

    /**
     * Previsualizar el impacto de la suspensión masiva antes de ejecutarla.
     */
    public function previsualizarImpacto(Complejo $complejo, array $params): array
    {
        $fecha = $params['fecha'];
        $horaDesde = !empty($params['hora_desde']) ? $params['hora_desde'] : null;
        $soloDescubiertas = (bool) ($params['solo_descubiertas'] ?? true);

        $canchas = Cancha::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('estado', 'activo')
            ->orderBy('id', 'asc')
            ->get();

        $esDescubierta = function (Cancha $c) {
            return !$c->techada || strtolower($c->tipo_cubierta ?? '') === 'outdoor';
        };

        if (isset($params['canchas_ids']) && is_array($params['canchas_ids'])) {
            $selectedIds = array_map('intval', $params['canchas_ids']);
        } else {
            $selectedIds = $soloDescubiertas
                ? $canchas->filter($esDescubierta)->pluck('id')->all()
                : $canchas->pluck('id')->all();
        }

        // Consultar todos los turnos del día
        $turnosQuery = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('fecha', $fecha)
            ->whereIn('estado', ['reservado', 'confirmado', 'pendiente', 'pagado']);

        if (!empty($horaDesde)) {
            $turnosQuery->where('hora_inicio', '>=', $horaDesde);
        }

        $allTurnos = $turnosQuery->with(['cliente', 'cancha'])->get();

        $turnosAfectados = $allTurnos->whereIn('cancha_id', $selectedIds);
        $turnosProtegidos = $allTurnos->whereNotIn('cancha_id', $selectedIds);

        $canchasData = $canchas->map(function (Cancha $c) use ($selectedIds, $esDescubierta, $allTurnos) {
            $cTurnos = $allTurnos->where('cancha_id', $c->id);
            $isSelected = in_array($c->id, $selectedIds);
            $descubierta = $esDescubierta($c);

            return [
                'id' => $c->id,
                'nombre' => $c->nombre,
                'deporte' => $c->deporte,
                'techada' => (bool) $c->techada,
                'tipo_cubierta' => $c->tipo_cubierta ?: ($c->techada ? 'indoor' : 'outdoor'),
                'es_descubierta' => $descubierta,
                'seleccionada' => $isSelected,
                'turnos_afectados_count' => $isSelected ? $cTurnos->count() : 0,
                'monto_afectado' => $isSelected ? (float) $cTurnos->sum('monto_pagado') : 0.0,
                'turnos_protegidos_count' => !$isSelected ? $cTurnos->count() : 0,
            ];
        });

        $turnosConBilletera = $turnosAfectados->whereNotNull('cliente_id');
        $turnosSinCuenta = $turnosAfectados->whereNull('cliente_id');

        $turnosAfectadosDetalle = $turnosAfectados->map(function (Turno $t) {
            return [
                'id' => $t->id,
                'cancha_id' => $t->cancha_id,
                'cancha_nombre' => $t->cancha?->nombre ?: "Cancha {$t->cancha_id}",
                'hora_inicio' => substr($t->hora_inicio, 0, 5),
                'hora_fin' => $t->hora_fin ? substr($t->hora_fin, 0, 5) : '',
                'cliente_id' => $t->cliente_id,
                'cliente_nombre' => $t->cliente_nombre ?: $t->cliente?->name ?: 'Cliente Mostrador',
                'cliente_telefono' => $t->cliente_telefono ?: $t->cliente?->telefono,
                'precio' => (float) $t->precio,
                'monto_pagado' => (float) $t->monto_pagado,
                'saldo_pendiente' => (float) $t->saldo_pendiente,
                'tiene_cuenta' => !empty($t->cliente_id),
                'tipo_reembolso_estimado' => !empty($t->cliente_id) ? 'billetera' : ($t->monto_pagado > 0 ? 'vale' : 'sin_costo'),
            ];
        })->values();

        return [
            'resumen' => [
                'total_turnos_a_cancelar' => $turnosAfectados->count(),
                'total_clientes_afectados' => $turnosAfectados->count(),
                'total_monto_a_reembolsar' => (float) $turnosAfectados->sum('monto_pagado'),
                'turnos_con_billetera' => $turnosConBilletera->count(),
                'monto_billetera' => (float) $turnosConBilletera->sum('monto_pagado'),
                'turnos_sin_cuenta' => $turnosSinCuenta->count(),
                'monto_vales' => (float) $turnosSinCuenta->sum('monto_pagado'),
                'total_canchas_techadas_protegidas' => $canchas->where('techada', true)->whereNotIn('id', $selectedIds)->count(),
                'total_turnos_protegidos' => $turnosProtegidos->count(),
            ],
            'canchas' => $canchasData->values(),
            'turnos_afectados' => $turnosAfectadosDetalle,
        ];
    }

    /**
     * Ejecutar la cancelación masiva de turnos de manera atómica.
     */
    public function ejecutarCancelacionMasiva(Complejo $complejo, User $admin, array $params): array
    {
        $fecha = $params['fecha'];
        $horaDesde = !empty($params['hora_desde']) ? $params['hora_desde'] : null;
        $canchasIds = array_map('intval', $params['canchas_ids'] ?? []);
        $notificarWhatsApp = (bool) ($params['notificar_whatsapp'] ?? true);
        $bloquearGrilla = (bool) ($params['bloquear_grilla'] ?? true);
        $observaciones = $params['observaciones'] ?? null;

        if (empty($canchasIds)) {
            throw new \InvalidArgumentException('Debe seleccionar al menos una cancha para cancelar.');
        }

        $jobsAEncolar = [];
        $cancelacion = null;
        $totalTurnosCancelados = 0;
        $totalMontoReembolsado = 0.0;
        $valesEmitidosCount = 0;
        $billeterasAcreditadasCount = 0;

        DB::transaction(function () use (
            $complejo,
            $admin,
            $fecha,
            $horaDesde,
            $canchasIds,
            $notificarWhatsApp,
            $bloquearGrilla,
            $observaciones,
            &$cancelacion,
            &$totalTurnosCancelados,
            &$totalMontoReembolsado,
            &$valesEmitidosCount,
            &$billeterasAcreditadasCount,
            &$jobsAEncolar
        ) {
            $cancelacion = CancelacionLluvia::create([
                'complejo_id' => $complejo->id,
                'user_id' => $admin->id,
                'fecha' => $fecha,
                'hora_desde' => $horaDesde,
                'solo_descubiertas' => (bool) ($params['solo_descubiertas'] ?? false),
                'canchas_afectadas_ids' => $canchasIds,
                'total_turnos_cancelados' => 0,
                'total_clientes_afectados' => 0,
                'total_monto_reembolsado' => 0.0,
                'metodo_reembolso' => 'billetera_y_vales',
                'notificaciones_whatsapp_enviadas' => 0,
                'bloquear_grilla_restante' => $bloquearGrilla,
                'observaciones' => $observaciones,
            ]);

            $turnosQuery = Turno::withoutGlobalScopes()
                ->where('complejo_id', $complejo->id)
                ->whereIn('cancha_id', $canchasIds)
                ->where('fecha', $fecha)
                ->whereIn('estado', ['reservado', 'confirmado', 'pendiente', 'pagado']);

            if (!empty($horaDesde)) {
                $turnosQuery->where('hora_inicio', '>=', $horaDesde);
            }

            $turnos = $turnosQuery->with(['cliente', 'cancha'])->get();
            $totalTurnosCancelados = $turnos->count();

            foreach ($turnos as $turno) {
                $montoPagado = (float) $turno->monto_pagado;
                $turno->update([
                    'estado' => 'cancelado',
                    'motivo_cancelacion' => 'lluvia',
                    'cancelado_por_user_id' => $admin->id,
                    'cancelacion_lluvia_id' => $cancelacion->id,
                    'estado_pago' => $montoPagado > 0 ? 'reembolsado' : 'cancelado',
                    'saldo_pendiente' => 0.0,
                ]);

                // Liberar cualquier bloqueo temporal en Redis si existiera
                try {
                    $this->reservaLockService->liberarBloqueo(
                        $turno->cancha_id,
                        $fecha,
                        substr($turno->hora_inicio, 0, 5)
                    );
                } catch (\Throwable $e) {
                    // Ignorar errores secundarios de lock
                }

                if ($montoPagado > 0) {
                    $totalMontoReembolsado += $montoPagado;

                    if ($turno->cliente_id) {
                        // Cliente con cuenta registrada -> Acreditación en su billetera virtual
                        $this->walletService->acreditar(
                            $turno->cliente_id,
                            $complejo->id,
                            $montoPagado,
                            'reembolso_lluvia',
                            $turno->id,
                            "Reembolso por lluvia / contingencia climática - Turno {$turno->hora_inicio} hs ({$turno->cancha->nombre})"
                        );
                        $billeterasAcreditadasCount++;

                        if ($notificarWhatsApp) {
                            $jobsAEncolar[] = [
                                'turno' => $turno,
                                'tipo' => 'billetera',
                                'monto' => $montoPagado,
                                'link' => null,
                                'codigo' => null,
                            ];
                        }
                    } else {
                        // Cliente de mostrador / sin cuenta -> Emisión de Vale Digital Tokenizado
                        $codigo = 'LLUVIA-' . strtoupper(Str::random(4)) . rand(10, 99);
                        $token = Str::random(40);

                        $frontendHost = rtrim(env('FRONTEND_URL', 'http://localhost:8080'), '/');
                        $subdominio = $complejo->subdominio;
                        if ($subdominio && $subdominio !== 'app' && !str_contains($frontendHost, $subdominio)) {
                            $parsed = parse_url($frontendHost);
                            $host = $parsed['host'] ?? 'localhost';
                            $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
                            $scheme = $parsed['scheme'] ?? 'http';
                            $linkVale = "{$scheme}://{$subdominio}.{$host}{$port}/vales/{$token}";
                        } else {
                            $linkVale = "{$frontendHost}/vales/{$token}";
                        }

                        ValeCredito::create([
                            'complejo_id' => $complejo->id,
                            'turno_origen_id' => $turno->id,
                            'codigo' => $codigo,
                            'token_seguro' => $token,
                            'monto' => $montoPagado,
                            'saldo_restante' => $montoPagado,
                            'cliente_nombre' => $turno->cliente_nombre ?: 'Cliente Mostrador',
                            'cliente_telefono' => $turno->cliente_telefono,
                            'estado' => 'activo',
                            'fecha_emision' => Carbon::now(),
                            'fecha_vencimiento' => Carbon::now()->addDays(90),
                        ]);
                        $valesEmitidosCount++;

                        if ($notificarWhatsApp) {
                            $jobsAEncolar[] = [
                                'turno' => $turno,
                                'tipo' => 'vale',
                                'monto' => $montoPagado,
                                'link' => $linkVale,
                                'codigo' => $codigo,
                            ];
                        }
                    }
                } else {
                    if ($notificarWhatsApp) {
                        $jobsAEncolar[] = [
                            'turno' => $turno,
                            'tipo' => 'aviso_sin_costo',
                            'monto' => 0.0,
                            'link' => null,
                            'codigo' => null,
                        ];
                    }
                }
            }

            // Bloqueo preventivo de slots libres restantes en las canchas seleccionadas
            if ($bloquearGrilla) {
                foreach ($canchasIds as $canchaId) {
                    try {
                        $slotsLibres = $this->disponibilidadService->obtenerSlotsDisponibles($canchaId, $fecha);
                        foreach ($slotsLibres as $slot) {
                            if (empty($horaDesde) || $slot['hora_inicio'] >= $horaDesde) {
                                Turno::withoutGlobalScopes()->create([
                                    'complejo_id' => $complejo->id,
                                    'cancha_id' => $canchaId,
                                    'fecha' => $fecha,
                                    'hora_inicio' => $slot['hora_inicio'],
                                    'hora_fin' => $slot['hora_fin'],
                                    'precio' => $slot['precio'] ?? 0,
                                    'monto_pagado' => 0,
                                    'saldo_pendiente' => 0,
                                    'estado' => 'bloqueado',
                                    'motivo_cancelacion' => 'lluvia',
                                    'cliente_nombre' => 'Bloqueo Preventivo Lluvia',
                                    'cancelado_por_user_id' => $admin->id,
                                    'cancelacion_lluvia_id' => $cancelacion->id,
                                ]);
                            }
                        }
                    } catch (\Throwable $e) {
                        Log::warning("No se pudieron bloquear slots libres en cancha {$canchaId}: " . $e->getMessage());
                    }
                }
            }

            $cancelacion->update([
                'total_turnos_cancelados' => $totalTurnosCancelados,
                'total_clientes_afectados' => $totalTurnosCancelados,
                'total_monto_reembolsado' => $totalMontoReembolsado,
                'notificaciones_whatsapp_enviadas' => count($jobsAEncolar),
            ]);
        });

        // Despachar notificaciones de WhatsApp en background
        foreach ($jobsAEncolar as $jobItem) {
            try {
                NotificarCancelacionLluviaWhatsAppJob::dispatch(
                    $jobItem['turno'],
                    $jobItem['tipo'],
                    $jobItem['monto'],
                    $jobItem['link'],
                    $jobItem['codigo']
                );
            } catch (\Throwable $e) {
                Log::warning("Error al encolar WhatsApp de cancelación por lluvia: " . $e->getMessage());
            }
        }

        return [
            'success' => true,
            'cancelacion_id' => $cancelacion->id,
            'total_turnos_cancelados' => $totalTurnosCancelados,
            'total_monto_reembolsado' => $totalMontoReembolsado,
            'billeteras_acreditadas_count' => $billeterasAcreditadasCount,
            'vales_emitidos_count' => $valesEmitidosCount,
            'whatsapp_encolados_count' => count($jobsAEncolar),
            'message' => "Se suspendieron {$totalTurnosCancelados} turnos exitosamente con reembolso aplicado.",
        ];
    }
}
