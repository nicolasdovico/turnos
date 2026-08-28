<?php

namespace App\Services;

use App\Models\PartidoAbierto;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
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
                    'jugadores_actuales' => 1,
                    'estado' => 'buscando',
                    'tipo_partido' => $params['tipo_partido'] ?? 'competitivo',
                ]);
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

            $cuota->estado = 'pagado';
            $cuota->metodo_pago = $datosPago['metodo_pago'] ?? 'tarjeta';
            $cuota->pagado_en = now();

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

            // Evaluar todas las cuotas del turno con bloqueo pesimista
            $todasCuotas = TurnoPagoDividido::where('turno_id', $cuota->turno_id)
                ->lockForUpdate()
                ->get();

            $totalCuotas = $todasCuotas->count();
            $pagadas = $todasCuotas->where('estado', 'pagado')->count();
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
                    }
                    $partido->save();
                }
            }

            // Si se completaron los pagos de todas las partes, confirmar el turno
            if ($completamentePagado) {
                $turno = Turno::where('id', $cuota->turno_id)
                    ->lockForUpdate()
                    ->first();

                if ($turno) {
                    $turno->estado = 'reservado';
                    $turno->save();
                }
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
     */
    public function listarPartidosAbiertos(array $filtros = []): Collection
    {
        $query = PartidoAbierto::query()
            ->where('estado', $filtros['estado'] ?? 'buscando')
            ->with(['turno.cancha', 'organizador', 'pagosDivididos']);

        if (!empty($filtros['tipo_partido'])) {
            $query->where('tipo_partido', $filtros['tipo_partido']);
        }

        if (!empty($filtros['nivel'])) {
            $nivel = $filtros['nivel'];
            $query->where(function ($q) use ($nivel) {
                $q->whereNull('nivel_min')->orWhere('nivel_min', '<=', $nivel);
            })->where(function ($q) use ($nivel) {
                $q->whereNull('nivel_max')->orWhere('nivel_max', '>=', $nivel);
            });
        }

        return $query->latest()->get();
    }
}
