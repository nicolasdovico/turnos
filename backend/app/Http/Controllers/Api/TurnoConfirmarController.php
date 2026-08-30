<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use App\Services\ReservaLockService;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TurnoConfirmarController extends Controller
{
    public function __construct(
        protected ReservaLockService $reservaLockService,
        protected WalletService $walletService
    ) {}

    /**
     * Confirm a court reservation atomically with SELECT FOR UPDATE and DB transaction.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancha_id' => ['required', 'integer'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'string'],
            'hora_fin' => ['nullable', 'string'],
            'cliente_id' => ['nullable', 'integer', 'exists:users,id'],
            'cliente_nombre' => ['nullable', 'string', 'max:255'],
            'cliente_telefono' => ['nullable', 'string', 'max:50'],
            'metodo_pago' => ['nullable', 'string', 'max:50'],
            'monto_pagado' => ['nullable', 'numeric', 'min:0'],
            'precio' => ['nullable', 'numeric', 'min:0'],
            'token_reserva' => ['nullable', 'string'],
            'aplicar_credito_wallet' => ['nullable', 'boolean'],
        ]);

        $cancha = Cancha::with('complejo')->find($validated['cancha_id']);
        if (!$cancha) {
            return response()->json([
                'error' => 'CANCHA_NOT_FOUND',
                'message' => 'La cancha especificada no fue encontrada en este complejo.',
            ], 404);
        }

        $timezone = $cancha->complejo?->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');
        $fechaCarbon = Carbon::parse($validated['fecha'], $timezone);
        $fechaNormalizada = $fechaCarbon->format('Y-m-d');
        $horaInicioNormalizada = Carbon::parse($validated['hora_inicio'], $timezone)->format('H:i');

        $slotStartDateTime = Carbon::parse($fechaNormalizada . ' ' . $horaInicioNormalizada, $timezone);
        if ($slotStartDateTime->lessThanOrEqualTo(Carbon::now($timezone))) {
            return response()->json([
                'error' => 'PAST_SLOT_NOT_ALLOWED',
                'message' => 'No es posible confirmar un turno en una fecha u horario que ya ha pasado.',
            ], 422);
        }

        // Calculate hora_fin if omitted
        if (!empty($validated['hora_fin'])) {
            $horaFinNormalizada = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
                ->where('dia_semana', $fechaCarbon->dayOfWeek)
                ->first();
            $duracion = $horario?->duracion_turno_minutos ?: 60;
            $horaFinNormalizada = Carbon::parse($validated['fecha'] . ' ' . $horaInicioNormalizada)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);
        $clienteId = $validated['cliente_id'] ?? $user?->id;
        $clienteNombre = !empty($validated['cliente_nombre']) ? trim($validated['cliente_nombre']) : ($user?->name ?? 'Cliente Mostrador');
        $clienteTelefono = !empty($validated['cliente_telefono']) ? trim($validated['cliente_telefono']) : ($user?->telefono ?? null);
        $metodoPago = $validated['metodo_pago'] ?? 'mostrador';
        $precio = $validated['precio'] ?? (float) $cancha->precio_base;
        $tokenReserva = $validated['token_reserva'] ?? null;

        $complejo = $cancha->complejo;
        $tipoCobro = $complejo?->tipo_cobro_reserva ?? 'sena';
        $porcentajeSena = (float) ($complejo?->porcentaje_sena ?? 50.0);

        // Calculate required payment (seña vs full)
        $montoRequerido = $precio;
        if ($tipoCobro === 'sena') {
            $montoRequerido = round(($precio * $porcentajeSena) / 100, 2);
        }

        $montoPagado = isset($validated['monto_pagado']) ? (float) $validated['monto_pagado'] : 0.0;
        $aplicarWallet = (bool) ($validated['aplicar_credito_wallet'] ?? false);

        // If user is simulating payment in dev mode or paying with wallet
        if ($metodoPago === 'simulador_dev') {
            $montoPagado = $montoRequerido;
        } elseif ($metodoPago === 'wallet_credito') {
            $montoPagado = $montoRequerido;
            $aplicarWallet = true;
        }

        if ($aplicarWallet && $user) {
            $saldoDisponible = $this->walletService->obtenerSaldo($user->id, $cancha->complejo_id);
            $aDebitar = min($saldoDisponible, $montoRequerido);
            if ($aDebitar > 0) {
                $this->walletService->debitar(
                    $user->id,
                    $cancha->complejo_id,
                    $aDebitar,
                    'uso_reserva',
                    null,
                    "Pago/Seña para reserva en {$cancha->nombre}"
                );
                $montoPagado = max($montoPagado, $aDebitar);
            }
        }

        $saldoPendiente = max(0.0, round($precio - $montoPagado, 2));
        $estadoPago = 'pendiente';
        if ($saldoPendiente <= 0.0) {
            $estadoPago = 'pagado_total';
        } elseif ($montoPagado > 0.0) {
            $estadoPago = 'senado';
        }

        try {
            $turno = DB::transaction(function () use (
                $cancha,
                $fechaNormalizada,
                $horaInicioNormalizada,
                $horaFinNormalizada,
                $clienteId,
                $clienteNombre,
                $clienteTelefono,
                $metodoPago,
                $precio,
                $montoPagado,
                $saldoPendiente,
                $estadoPago,
                $tokenReserva
            ) {
                // SELECT FOR UPDATE to lock slot row and guarantee ACID consistency
                $existingTurno = Turno::where('cancha_id', $cancha->id)
                    ->where('fecha', $fechaNormalizada)
                    ->where('hora_inicio', $horaInicioNormalizada)
                    ->lockForUpdate()
                    ->first();

                if ($existingTurno && in_array($existingTurno->estado, ['reservado', 'bloqueado'], true)) {
                    return null;
                }

                if ($existingTurno) {
                    $existingTurno->update([
                        'cliente_id' => $clienteId,
                        'cliente_nombre' => $clienteNombre,
                        'cliente_telefono' => $clienteTelefono,
                        'hora_fin' => $horaFinNormalizada,
                        'precio' => $precio,
                        'monto_pagado' => $montoPagado,
                        'saldo_pendiente' => $saldoPendiente,
                        'metodo_pago' => $metodoPago,
                        'estado_pago' => $estadoPago,
                        'estado' => 'reservado',
                        'es_fijo' => false,
                    ]);
                    $turnoConfirmado = $existingTurno;
                } else {
                    $turnoConfirmado = Turno::create([
                        'complejo_id' => $cancha->complejo_id,
                        'cancha_id' => $cancha->id,
                        'cliente_id' => $clienteId,
                        'cliente_nombre' => $clienteNombre,
                        'cliente_telefono' => $clienteTelefono,
                        'fecha' => $fechaNormalizada,
                        'hora_inicio' => $horaInicioNormalizada,
                        'hora_fin' => $horaFinNormalizada,
                        'precio' => $precio,
                        'monto_pagado' => $montoPagado,
                        'saldo_pendiente' => $saldoPendiente,
                        'metodo_pago' => $metodoPago,
                        'estado_pago' => $estadoPago,
                        'estado' => 'reservado',
                        'es_fijo' => false,
                    ]);
                }

                // Release Redis lock upon successful database confirmation
                $this->reservaLockService->liberarBloqueo(
                    $cancha->id,
                    $fechaNormalizada,
                    $horaInicioNormalizada,
                    $tokenReserva
                );

                return $turnoConfirmado;
            });

            if (!$turno) {
                return response()->json([
                    'error' => 'SLOT_ALREADY_RESERVED',
                    'message' => 'El turno seleccionado ya se encuentra confirmado o reservado.',
                ], 409);
            }

            return response()->json([
                'success' => true,
                'message' => 'Turno confirmado y reservado exitosamente.',
                'turno' => $turno->fresh(),
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'RESERVATION_ERROR',
                'message' => 'Error al procesar la reserva: ' . $e->getMessage(),
            ], 500);
        }
    }
}
