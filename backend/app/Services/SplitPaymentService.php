<?php

namespace App\Services;

use App\Mail\AlertaTransferenciaPendienteClubMail;
use App\Mail\ComprobanteCuotaSplitMail;
use App\Models\PartidoAbierto;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SplitPaymentService
{
    /**
     * Divide el precio total de un turno en cuotas individuales (Split Payment)
     * y opcionalmente crea una convocatoria de Partido Abierto.
     */
    public function crearSplit(Turno $turno, int $cuotas, array $params = []): array
    {
        if ($cuotas < 2) {
            throw ValidationException::withMessages([
                'cuotas' => ['El número de cuotas debe ser al menos 2.'],
            ]);
        }

        if ($turno->precio <= 0) {
            throw ValidationException::withMessages([
                'precio' => ['El turno debe tener un precio mayor a 0 para dividir el pago.'],
            ]);
        }

        return DB::transaction(function () use ($turno, $cuotas, $params) {
            // Cancelar o limpiar splits pendientes previos si existieran
            TurnoPagoDividido::where('turno_id', $turno->id)
                ->where('estado', 'pendiente')
                ->delete();

            // Si el turno está temporalmente bloqueado para la convocatoria de partido abierto, definir motivo
            if (!empty($params['es_partido_abierto']) && $turno->estado === 'bloqueado') {
                $turno->motivo_cancelacion = 'convocatoria_abierta';
                $turno->save();
            }

            $totalCentavos = (int) round($turno->precio * 100);
            $baseCuotaCentavos = intdiv($totalCentavos, $cuotas);
            $residuoCentavos = $totalCentavos % $cuotas;

            $partidoAbierto = null;
            if (!empty($params['es_partido_abierto'])) {
                $partidoAbierto = PartidoAbierto::create([
                    'complejo_id' => $turno->complejo_id,
                    'turno_id' => $turno->id,
                    'organizador_id' => $params['organizador_id'] ?? $turno->cliente_id ?? auth()->id(),
                    'nivel_min' => $params['nivel_min'] ?? null,
                    'nivel_max' => $params['nivel_max'] ?? null,
                    'jugadores_requeridos' => $cuotas,
                    'jugadores_actuales' => 0,
                    'estado' => 'pendiente_pago',
                    'tipo_partido' => $params['tipo_partido'] ?? 'competitivo',
                ]);
            }

            // Bloquear el turno para que no quede libre al público ni disponible para otro cliente
            if ($turno->estado !== 'reservado') {
                $turno->estado = 'bloqueado';
                if (empty($turno->cliente_nombre) && !empty($params['organizador_nombre'])) {
                    $turno->cliente_nombre = $params['organizador_nombre'];
                } elseif (empty($turno->cliente_nombre)) {
                    $turno->cliente_nombre = 'Convocatoria Abierta';
                }
                $turno->save();
            }

            $cuotasGeneradas = [];

            for ($i = 1; $i <= $cuotas; $i++) {
                // Asignar los centavos sobrantes a las primeras cuotas
                $montoCuotaCentavos = $baseCuotaCentavos + ($i <= $residuoCentavos ? 1 : 0);
                $montoCuota = $montoCuotaCentavos / 100;

                $nombreJugador = null;
                $emailJugador = null;
                $userId = null;

                if ($i === 1 && !empty($params['organizador_nombre'])) {
                    $nombreJugador = $params['organizador_nombre'];
                    $emailJugador = $params['organizador_email'] ?? null;
                    $userId = $params['organizador_id'] ?? null;
                }

                $cuota = TurnoPagoDividido::create([
                    'complejo_id' => $turno->complejo_id,
                    'turno_id' => $turno->id,
                    'partido_abierto_id' => $partidoAbierto?->id,
                    'user_id' => $userId,
                    'nombre_jugador' => $nombreJugador,
                    'email_jugador' => $emailJugador,
                    'monto' => $montoCuota,
                    'cuota_numero' => $i,
                    'total_cuotas' => $cuotas,
                    'token_pago' => (string) Str::uuid(),
                    'estado' => 'pendiente',
                ]);

                $cuotasGeneradas[] = [
                    'id' => $cuota->id,
                    'cuota_numero' => $cuota->cuota_numero,
                    'total_cuotas' => $cuota->total_cuotas,
                    'monto' => (float) $cuota->monto,
                    'token_pago' => $cuota->token_pago,
                    'checkout_url' => url("/checkout/split/{$cuota->token_pago}"),
                    'estado' => $cuota->estado,
                    'nombre_jugador' => $cuota->nombre_jugador,
                    'email_jugador' => $cuota->email_jugador,
                ];
            }

            return [
                'turno_id' => $turno->id,
                'precio_total' => (float) $turno->precio,
                'total_cuotas' => $cuotas,
                'partido_abierto' => $partidoAbierto,
                'cuotas' => $cuotasGeneradas,
            ];
        });
    }

    /**
     * Cancela una convocatoria de partido abierto o fraccionamiento,
     * liberando el turno si aún no estaba confirmado o reembolsando si correspondiese.
     */
    public function cancelarPartidoAbierto(PartidoAbierto $partido, ?string $motivo = null): array
    {
        return DB::transaction(function () use ($partido, $motivo) {
            $partidoBloqueado = PartidoAbierto::where('id', $partido->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($partidoBloqueado->estado === 'cancelado') {
                throw ValidationException::withMessages([
                    'partido' => ['Este partido ya se encuentra cancelado.'],
                ]);
            }

            $partidoBloqueado->estado = 'cancelado';
            $partidoBloqueado->save();

            // Cancelar cuotas pendientes
            TurnoPagoDividido::where('partido_abierto_id', $partidoBloqueado->id)
                ->where('estado', 'pendiente')
                ->update(['estado' => 'cancelado']);

            // Si el turno estaba en estado bloqueado por este partido y no confirmado, liberarlo a disponible
            if ($partidoBloqueado->turno && $partidoBloqueado->turno->estado === 'bloqueado') {
                $partidoBloqueado->turno->estado = 'disponible';
                $partidoBloqueado->turno->save();
            }

            return [
                'partido_id' => $partidoBloqueado->id,
                'estado' => $partidoBloqueado->estado,
                'motivo' => $motivo,
            ];
        });
    }

    /**
     * Procesa el pago de una cuota de split payment.
     * Si todas las cuotas quedan pagadas, confirma automáticamente el turno de forma atómica.
     */
    public function procesarPagoCuota(string $tokenPago, array $datosPago = []): array
    {
        return DB::transaction(function () use ($tokenPago, $datosPago) {
            $cuota = TurnoPagoDividido::where('token_pago', $tokenPago)
                ->lockForUpdate()
                ->firstOrFail();

            if ($cuota->estado === 'pagado') {
                throw ValidationException::withMessages([
                    'cuota' => ['Esta cuota ya ha sido pagada previamente.'],
                ]);
            }

            $metodoPago = $datosPago['metodo_pago'] ?? 'tarjeta';
            $esTransferenciaIniciada = ($metodoPago === 'transferencia' && empty($datosPago['verificado_por_club']));

            if ($esTransferenciaIniciada) {
                $cuota->estado = 'revision_transferencia';
                $cuota->metodo_pago = 'transferencia';
                if (!empty($datosPago['comprobante_transferencia'])) {
                    $cuota->comprobante_transferencia = $datosPago['comprobante_transferencia'];
                }
            } else {
                $cuota->estado = 'pagado';
                $cuota->metodo_pago = $metodoPago;
                $cuota->pagado_en = now();
            }

            if (!empty($datosPago['nombre_jugador'])) {
                $cuota->nombre_jugador = $datosPago['nombre_jugador'];
            }
            if (!empty($datosPago['email_jugador'])) {
                $cuota->email_jugador = $datosPago['email_jugador'];
            }
            if (!empty($datosPago['user_id'])) {
                $cuota->user_id = $datosPago['user_id'];
            }

            $cuota->save();

            // Cargar relaciones para envíos de correo
            $cuota->load(['complejo.owner', 'turno.cancha', 'partidoAbierto']);

            // Disparar alertas / comprobantes según estado
            try {
                if ($esTransferenciaIniciada) {
                    // Notificar al dueño / administración del club que hay una transferencia por verificar
                    $ownerEmail = $cuota->complejo?->owner?->email ?? $cuota->complejo?->user?->email;
                    if ($ownerEmail) {
                        Mail::to($ownerEmail)->send(new AlertaTransferenciaPendienteClubMail($cuota));
                    }
                } else if ($cuota->estado === 'pagado') {
                    // Enviar comprobante oficial por email al jugador si tiene email registrado
                    if (!empty($cuota->email_jugador)) {
                        Mail::to($cuota->email_jugador)->send(new ComprobanteCuotaSplitMail($cuota));
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Error al despachar email en split payment: ' . $e->getMessage());
            }

            // Evaluar todas las cuotas del turno con bloqueo pesimista
            $todasCuotas = TurnoPagoDividido::where('turno_id', $cuota->turno_id)
                ->lockForUpdate()
                ->get();

            $totalCuotas = $todasCuotas->count();
            $pagadas = $todasCuotas->where('estado', 'pagado')->count();
            $enRevision = $todasCuotas->where('estado', 'revision_transferencia')->count();
            $montoRecaudado = (float) $todasCuotas->where('estado', 'pagado')->sum('monto');
            $completamentePagado = ($pagadas === $totalCuotas);

            $partido = null;
            if ($cuota->partido_abierto_id) {
                $partido = PartidoAbierto::where('id', $cuota->partido_abierto_id)
                    ->lockForUpdate()
                    ->first();

                if ($partido) {
                    $partido->jugadores_actuales = $pagadas;
                    if ($completamentePagado) {
                        $partido->estado = 'completo';
                    } elseif ($pagadas > 0) {
                        // Al estar acreditada al menos 1 cuota (la del organizador), la convocatoria pasa a publicarse activamente
                        $partido->estado = 'buscando';
                    }
                    $partido->save();
                }
            }

            // Actualizar el turno: sumar al monto pagado actual y descontar saldo pendiente
            $turno = Turno::where('id', $cuota->turno_id)
                ->lockForUpdate()
                ->first();

            if ($turno) {
                $turno->monto_pagado = $montoRecaudado;
                $turno->saldo_pendiente = max(0.0, (float) $turno->precio - $montoRecaudado);

                if ($completamentePagado) {
                    $turno->estado = 'reservado';
                    $turno->estado_pago = 'pagado_total';
                    $turno->saldo_pendiente = 0.00;
                    if ($turno->motivo_cancelacion === 'convocatoria_abierta') {
                        $turno->motivo_cancelacion = null;
                    }
                } elseif ($pagadas > 0) {
                    $turno->estado_pago = 'senado';
                }

                $turno->save();
            }

            return [
                'cuota' => [
                    'id' => $cuota->id,
                    'cuota_numero' => $cuota->cuota_numero,
                    'total_cuotas' => $cuota->total_cuotas,
                    'monto' => (float) $cuota->monto,
                    'token_pago' => $cuota->token_pago,
                    'estado' => $cuota->estado,
                    'metodo_pago' => $cuota->metodo_pago,
                    'pagado_en' => $cuota->pagado_en?->toIso8601String(),
                    'complejo' => $cuota->complejo ? [
                        'id' => $cuota->complejo->id,
                        'subdominio' => $cuota->complejo->subdominio,
                        'nombre' => $cuota->complejo->nombre,
                    ] : null,
                ],
                'resumen_split' => [
                    'total_cuotas' => $totalCuotas,
                    'cuotas_pagadas' => $pagadas,
                    'cuotas_pendientes' => $totalCuotas - $pagadas,
                    'monto_recaudado' => $montoRecaudado,
                    'completamente_pagado' => $completamentePagado,
                    'turno_confirmado' => $completamentePagado,
                ],
                'partido_abierto' => $partido,
            ];
        });
    }

    /**
     * Permite a un jugador unirse a un partido abierto tomando una cuota pendiente.
     */
    public function unirseAPartidoAbierto(PartidoAbierto $partido, array $datosJugador): TurnoPagoDividido
    {
        return DB::transaction(function () use ($partido, $datosJugador) {
            $partidoBloqueado = PartidoAbierto::where('id', $partido->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($partidoBloqueado->estado !== 'buscando') {
                throw ValidationException::withMessages([
                    'partido' => ['El partido ya no se encuentra disponible para nuevos jugadores.'],
                ]);
            }

            // Buscar la siguiente cuota disponible (pendiente y sin nombre/user asignado o libre)
            $cuotaLibre = TurnoPagoDividido::where('partido_abierto_id', $partidoBloqueado->id)
                ->where('estado', 'pendiente')
                ->whereNull('user_id')
                ->whereNull('nombre_jugador')
                ->lockForUpdate()
                ->first();

            if (!$cuotaLibre) {
                // Buscar cualquier cuota pendiente
                $cuotaLibre = TurnoPagoDividido::where('partido_abierto_id', $partidoBloqueado->id)
                    ->where('estado', 'pendiente')
                    ->lockForUpdate()
                    ->first();
            }

            if (!$cuotaLibre) {
                throw ValidationException::withMessages([
                    'cuotas' => ['No quedan cupos disponibles para este partido.'],
                ]);
            }

            $cuotaLibre->user_id = $datosJugador['user_id'] ?? null;
            $cuotaLibre->nombre_jugador = $datosJugador['nombre_jugador'] ?? 'Jugador Convocado';
            $cuotaLibre->email_jugador = $datosJugador['email_jugador'] ?? null;
            $cuotaLibre->save();

            return $cuotaLibre;
        });
    }

    /**
     * Listar partidos abiertos disponibles para matchmaking.
     * Se ordenan de manera cronológica ascendente por fecha y hora de inicio del turno
     * (los más próximos a suceder se muestran primero).
     */
    public function listarPartidosAbiertos(array $filtros = []): Collection
    {
        $estado = $filtros['estado'] ?? 'buscando';

        $query = PartidoAbierto::query()
            ->with(['turno.cancha', 'organizador', 'pagosDivididos']);

        if ($estado !== 'todos') {
            $query->where('partidos_abiertos.estado', $estado);
        }

        // Si se listan partidos activos para convocatoria ("buscando" o por defecto),
        // filtramos fechas futuras o de hoy no vencidas
        if ($estado === 'buscando') {
            $query->whereHas('turno', function ($q) {
                $q->whereDate('fecha', '>=', now()->toDateString());
            });
        }

        if (!empty($filtros['tipo_partido'])) {
            $query->where('partidos_abiertos.tipo_partido', $filtros['tipo_partido']);
        }

        if (!empty($filtros['nivel'])) {
            $nivel = $filtros['nivel'];
            $query->where(function ($q) use ($nivel) {
                $q->whereNull('nivel_min')->orWhere('nivel_min', '<=', $nivel);
            })->where(function ($q) use ($nivel) {
                $q->whereNull('nivel_max')->orWhere('nivel_max', '>=', $nivel);
            });
        }

        // Orden cronológico: fecha y hora de inicio del turno más próximo primero
        $query->join('turnos', 'partidos_abiertos.turno_id', '=', 'turnos.id')
            ->select('partidos_abiertos.*')
            ->orderBy('turnos.fecha', 'asc')
            ->orderBy('turnos.hora_inicio', 'asc');

        return $query->get();
    }
}
