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
        protected WalletService $walletService
    ) {}

    public function cancelarCliente(Request $request, int $id): JsonResponse
    {
        $turno = Turno::with(['cancha.complejo'])->find($id);

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
        $timezone = $complejo?->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');

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

        // Trigger asynchronous waitlist notification for interested players
        try {
            $horaInicioNorm = Carbon::parse($turno->hora_inicio)->format('H:i');
            $horaFinNorm = $turno->hora_fin ? Carbon::parse($turno->hora_fin)->format('H:i') : null;

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
