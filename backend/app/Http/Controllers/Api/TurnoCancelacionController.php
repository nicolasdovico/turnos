<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\NotificarListaEsperaJob;
use App\Models\Turno;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TurnoCancelacionController extends Controller
{
    public function __construct(
        protected WalletService $walletService,
        protected ?\App\Services\ReservaLockService $reservaLockService = null
    ) {
        $this->reservaLockService = $reservaLockService ?? app(\App\Services\ReservaLockService::class);
    }

    public function misTurnos(Request $request): JsonResponse
    {
        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Debes iniciar sesión para consultar tus turnos.',
            ], 401);
        }

        $turnos = Turno::withoutGlobalScopes()
            ->where('cliente_id', $user->id)
            ->with(['cancha.complejo'])
            ->orderBy('fecha', 'desc')
            ->orderBy('hora_inicio', 'desc')
            ->get();

        $data = $turnos->map(function ($t) {
            $complejo = $t->cancha?->complejo;
            $timezone = $complejo?->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');

            $fechaStr = $t->fecha instanceof Carbon ? $t->fecha->format('Y-m-d') : (string) $t->fecha;
            $slotStartDateTime = Carbon::parse($fechaStr . ' ' . $t->hora_inicio, $timezone);
            $now = Carbon::now($timezone);

            $horasRestantes = $now->diffInHours($slotStartDateTime, false);
            $limiteHoras = (int) ($complejo?->horas_limite_cancelacion ?? 4);

            $dentroDeTiempo = $horasRestantes >= $limiteHoras;
            $puedeCancelar = $t->estado === 'reservado';

            return [
                'id' => $t->id,
                'complejo_id' => $t->complejo_id,
                'cancha_id' => $t->cancha_id,
                'fecha' => $fechaStr,
                'hora_inicio' => substr($t->hora_inicio, 0, 5),
                'hora_fin' => substr($t->hora_fin, 0, 5),
                'precio' => (float) $t->precio,
                'monto_pagado' => (float) ($t->monto_pagado ?? 0),
                'saldo_pendiente' => (float) ($t->saldo_pendiente ?? 0),
                'estado' => $t->estado,
                'estado_pago' => $t->estado_pago,
                'metodo_pago' => $t->metodo_pago,
                'es_fijo' => (bool) $t->es_fijo,
                'cancha' => $t->cancha ? [
                    'id' => $t->cancha->id,
                    'nombre' => $t->cancha->nombre,
                    'deporte' => $t->cancha->deporte,
                ] : null,
                'complejo' => $complejo ? [
                    'id' => $complejo->id,
                    'nombre' => $complejo->nombre,
                    'subdominio' => $complejo->subdominio,
                    'horas_limite_cancelacion' => $limiteHoras,
                ] : null,
                'horas_restantes' => $horasRestantes,
                'puede_cancelar' => $puedeCancelar,
                'aplica_reembolso' => $dentroDeTiempo && (float) $t->monto_pagado > 0,
                'limite_horas_cancelacion' => $limiteHoras,
            ];
        });

        return response()->json([
            'data' => $data,
            'total' => $data->count(),
        ]);
    }

    public function cancelarCliente(Request $request, int $id): JsonResponse
    {
        $turno = Turno::withoutGlobalScopes()->with(['cancha.complejo'])->find($id);

        if (!$turno) {
            return response()->json([
                'error' => 'TURNO_NOT_FOUND',
                'message' => 'El turno especificado no existe.',
            ], 404);
        }

        if ($turno->estado === 'cancelado') {
            return response()->json([
                'error' => 'ALREADY_CANCELLED',
                'message' => 'Este turno ya se encuentra cancelado.',
            ], 400);
        }

        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        // Ownership validation: user must be the client who booked it or an admin of the complex
        $esOwner = $user && $turno->cliente_id === $user->id;
        $esAdmin = $user && ($user->id === $turno->cancha?->complejo?->user_id);

        if (!$esOwner && !$esAdmin) {
            return response()->json([
                'error' => 'UNAUTHORIZED',
                'message' => 'No tienes permisos para cancelar esta reserva.',
            ], 403);
        }

        $complejo = $turno->cancha?->complejo;

        if (!$complejo || !$complejo->hasModule('reservas')) {
            return response()->json([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'reservas',
                'message' => 'El módulo de reservas no está activo en este complejo.',
            ], 403);
        }

        $timezone = $complejo->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');

        $fechaStr = $turno->fecha instanceof Carbon ? $turno->fecha->format('Y-m-d') : (string) $turno->fecha;
        $slotStartDateTime = Carbon::parse($fechaStr . ' ' . $turno->hora_inicio, $timezone);
        $now = Carbon::now($timezone);

        $horasRestantes = $now->diffInHours($slotStartDateTime, false);
        $limiteHoras = (int) ($complejo?->horas_limite_cancelacion ?? 4);

        $dentroDeTiempo = $horasRestantes >= $limiteHoras;
        $montoReembolsado = 0.0;
        $reembolsoAcreditado = false;

        DB::transaction(function () use (
            $turno,
            $complejo,
            $dentroDeTiempo,
            &$montoReembolsado,
            &$reembolsoAcreditado
        ) {
            // If cancelled in time and had a payment/seña, refund to wallet
            if ($dentroDeTiempo && (float) $turno->monto_pagado > 0 && $turno->cliente_id) {
                $montoReembolsado = (float) $turno->monto_pagado;
                $this->walletService->acreditar(
                    $turno->cliente_id,
                    $complejo->id,
                    $montoReembolsado,
                    'reembolso_cancelacion',
                    $turno->id,
                    "Reembolso por cancelación de turno {$turno->hora_inicio} en {$turno->cancha->nombre}"
                );
                $reembolsoAcreditado = true;
            }

            $turno->update([
                'estado' => 'cancelado',
                'estado_pago' => $reembolsoAcreditado ? 'reembolsado' : ($turno->monto_pagado > 0 ? 'retenido_penalidad' : 'cancelado'),
            ]);
        });

        $horaInicioNorm = Carbon::parse($turno->hora_inicio)->format('H:i');
        $horaFinNorm = $turno->hora_fin ? Carbon::parse($turno->hora_fin)->format('H:i') : null;

        // Asegurar que cualquier bloqueo temporal residual en Redis quede liberado de inmediato
        try {
            $this->reservaLockService->liberarBloqueo($turno->cancha_id, $fechaStr, $horaInicioNorm);
            $this->reservaLockService->liberarBloqueo($turno->cancha_id, $fechaStr, $turno->hora_inicio);
        } catch (\Throwable $e) {
            // Ignorar fallas secundarias de redis
        }

        // Trigger asynchronous waitlist notification for interested players
        try {
            NotificarListaEsperaJob::dispatch(
                $turno->cancha_id,
                $fechaStr,
                $horaInicioNorm,
                $horaFinNorm
            );
        } catch (\Throwable $e) {
            // Queue failure should not block cancellation response
        }

        return response()->json([
            'success' => true,
            'message' => $reembolsoAcreditado
                ? "Turno cancelado exitosamente. Se han acreditado $" . number_format($montoReembolsado, 2, ',', '.') . " en tu billetera virtual de {$complejo->nombre}."
                : "Turno cancelado exitosamente." . (!$dentroDeTiempo && $turno->monto_pagado > 0 ? " La seña abonada fue retenida por cancelación fuera de término (< {$limiteHoras}hs)." : ""),
            'reembolso_acreditado' => $reembolsoAcreditado,
            'monto_reembolsado' => $montoReembolsado,
            'horas_restantes' => $horasRestantes,
            'limite_horas_complejo' => $limiteHoras,
            'turno' => $turno->fresh(),
        ], 200);
    }
}
