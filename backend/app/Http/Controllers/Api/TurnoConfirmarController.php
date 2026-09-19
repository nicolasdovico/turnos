<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\EmailVerification;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use App\Models\User;
use App\Rules\ValidPhoneNumber;
use App\Services\ReservaLockService;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
            'cliente_telefono' => ['nullable', 'string', 'max:50', new ValidPhoneNumber()],
            'cliente_email' => ['nullable', 'string', 'email', 'max:255'],
            'codigo_otp' => ['nullable', 'string', 'size:6'],
            'metodo_pago' => ['nullable', 'string', 'max:50'],
            'monto_pagado' => ['nullable', 'numeric', 'min:0'],
            'precio' => ['nullable', 'numeric', 'min:0'],
            'token_reserva' => ['nullable', 'string'],
            'aplicar_credito_wallet' => ['nullable', 'boolean'],
            'modalidad_pago' => ['nullable', 'string', 'in:sena,total,ninguno,sin_cobro,pendiente'],
            'pago_completo' => ['nullable', 'boolean'],
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
            $duracion = $cancha->duracion_minutos ?: ($horario?->duracion_turno_minutos ?: 60);
            $horaFinNormalizada = Carbon::parse($validated['fecha'] . ' ' . $horaInicioNormalizada)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);
        $complejo = $cancha->complejo;
        $tipoCobro = $complejo?->tipo_cobro_reserva ?? 'sena';
        $porcentajeSena = (float) ($complejo?->porcentaje_sena ?? 50.0);

        // Check if caller is club admin or owner
        $esAdminClub = false;
        if ($user) {
            $esAdminClub = (($user->role ?? '') === 'admin') || (!empty($user->is_admin)) || ($complejo && $complejo->user_id === $user->id) || ($user->email ?? '') === 'admin@admin.com';
        }

        if ($esAdminClub) {
            $cleanEmail = !empty($validated['cliente_email']) ? Str::lower(trim($validated['cliente_email'])) : null;
            $codigoOtp = !empty($validated['codigo_otp']) ? trim($validated['codigo_otp']) : null;

            if (!empty($validated['cliente_id'])) {
                $clienteId = $validated['cliente_id'];
            } elseif ($cleanEmail) {
                $foundUser = User::where('email', $cleanEmail)->first();
                if ($foundUser) {
                    if ($codigoOtp && !$foundUser->email_verified_at) {
                        $verification = EmailVerification::where('email', $cleanEmail)->latest('created_at')->first();
                        if (!$verification || $verification->isExpired()) {
                            return response()->json([
                                'error' => 'OTP_EXPIRED',
                                'message' => 'El código OTP ha expirado o no existe. Solicita uno nuevo.',
                            ], 422);
                        }
                        if ($verification->intentos >= 5) {
                            return response()->json([
                                'error' => 'OTP_MAX_ATTEMPTS',
                                'message' => 'Has superado el límite de intentos permitidos para este código.',
                            ], 429);
                        }
                        if ($verification->codigo !== $codigoOtp) {
                            $verification->increment('intentos');
                            $restantes = max(0, 5 - $verification->intentos);
                            return response()->json([
                                'error' => 'INVALID_OTP',
                                'message' => "Código OTP incorrecto. Te quedan {$restantes} intento(s).",
                            ], 422);
                        }
                        $foundUser->email_verified_at = now();
                        $foundUser->save();
                        EmailVerification::where('email', $cleanEmail)->delete();
                    }
                    $clienteId = $foundUser->id;
                    if (empty($validated['cliente_nombre'])) {
                        $validated['cliente_nombre'] = $foundUser->name;
                    }
                    if (empty($validated['cliente_telefono']) && $foundUser->telefono) {
                        $validated['cliente_telefono'] = $foundUser->telefono;
                    }
                } elseif ($codigoOtp) {
                    // Register client on the fly with OTP
                    $verification = EmailVerification::where('email', $cleanEmail)->latest('created_at')->first();
                    if (!$verification || $verification->isExpired()) {
                        return response()->json([
                            'error' => 'OTP_EXPIRED',
                            'message' => 'El código OTP ha expirado o no existe. Solicita uno nuevo.',
                        ], 422);
                    }
                    if ($verification->intentos >= 5) {
                        return response()->json([
                            'error' => 'OTP_MAX_ATTEMPTS',
                            'message' => 'Has superado el límite de intentos permitidos para este código.',
                        ], 429);
                    }
                    if ($verification->codigo !== $codigoOtp) {
                        $verification->increment('intentos');
                        $restantes = max(0, 5 - $verification->intentos);
                        return response()->json([
                            'error' => 'INVALID_OTP',
                            'message' => "Código OTP incorrecto. Te quedan {$restantes} intento(s).",
                        ], 422);
                    }

                    $newUser = User::create([
                        'name' => trim($validated['cliente_nombre'] ?? '') ?: 'Cliente Mostrador',
                        'email' => $cleanEmail,
                        'telefono' => trim($validated['cliente_telefono'] ?? '') ?: null,
                        'password' => Hash::make(Str::random(16)),
                        'email_verified_at' => now(),
                    ]);
                    EmailVerification::where('email', $cleanEmail)->delete();
                    $clienteId = $newUser->id;
                } else {
                    $clienteId = null;
                }
            } else {
                $clienteId = null;
            }
            $clienteNombre = !empty($validated['cliente_nombre']) ? trim($validated['cliente_nombre']) : 'Cliente Mostrador';
            $clienteTelefono = !empty($validated['cliente_telefono']) ? trim($validated['cliente_telefono']) : null;
        } else {
            $clienteId = $validated['cliente_id'] ?? $user?->id;
            $clienteNombre = !empty($validated['cliente_nombre']) ? trim($validated['cliente_nombre']) : ($user?->name ?? 'Cliente Mostrador');
            $clienteTelefono = !empty($validated['cliente_telefono']) ? trim($validated['cliente_telefono']) : ($user?->telefono ?? null);
        }

        if (!$esAdminClub && isset($validated['metodo_pago']) && $validated['metodo_pago'] === 'mostrador') {
            return response()->json([
                'error' => 'METODO_PAGO_INVALIDO',
                'message' => 'Para reservas online no está permitido el pago en mostrador. Debe abonar la seña mediante tarjeta online o saldo en billetera virtual.',
            ], 422);
        }

        $metodoPago = $validated['metodo_pago'] ?? ($esAdminClub ? 'mostrador' : 'online');
        $horaInicioCarbon = Carbon::parse($fechaNormalizada . ' ' . $horaInicioNormalizada);
        $horaFinCarbon = Carbon::parse($fechaNormalizada . ' ' . $horaFinNormalizada);
        $duracionCalculada = (int) $horaInicioCarbon->diffInMinutes($horaFinCarbon);
        $duracionEfectiva = $duracionCalculada > 0 ? $duracionCalculada : (int) ($cancha->duracion_minutos ?: 60);
        $horaInicioLuz = $complejo?->hora_inicio_luz ?? '19:00';
        $cotizacion = $cancha->calcularCotizacionTurno(
            $duracionEfectiva,
            $fechaCarbon,
            $horaInicioNormalizada,
            $horaFinNormalizada,
            $horaInicioLuz,
            $complejo
        );
        $precioCalculado = $cotizacion['precio_total'];

        $precio = isset($validated['precio']) && is_numeric($validated['precio'])
            ? (float) $validated['precio']
            : $precioCalculado;
        $tokenReserva = $validated['token_reserva'] ?? null;

        // Calculate required payment (seña vs full vs none)
        $esModoSena = in_array($tipoCobro, ['sena', 'sena_obligatoria', 'sena_minima', 'flexible']);
        $montoSena = $esModoSena ? round(($precio * $porcentajeSena) / 100, 2) : $precio;

        $modalidadPago = $validated['modalidad_pago'] ?? null;
        $esSinCobro = $modalidadPago === 'ninguno' || $modalidadPago === 'sin_cobro' || $modalidadPago === 'pendiente' || ($metodoPago === 'pendiente' && $esAdminClub);

        if (!$esAdminClub && $esSinCobro && $esModoSena) {
            return response()->json([
                'error' => 'SENA_OBLIGATORIA',
                'message' => 'Para reservas online se requiere abonar la seña fijada por el complejo.',
            ], 422);
        }

        $quierePagarTotal = !empty($validated['pago_completo'])
            || $modalidadPago === 'total'
            || (!$esModoSena && !$esSinCobro);

        if ($esSinCobro) {
            $montoRequerido = 0.0;
            $metodoPago = 'pendiente';
        } else {
            if ($metodoPago === 'pendiente') {
                $metodoPago = $esAdminClub ? 'mostrador' : 'online';
            }
            if ($quierePagarTotal) {
                $montoRequerido = $precio;
            } else {
                $montoRequerido = $montoSena;
            }
        }

        $montoPagado = 0.0;
        $aplicarWallet = (bool) ($validated['aplicar_credito_wallet'] ?? false);

        if (isset($validated['monto_pagado'])) {
            $montoPagado = (float) $validated['monto_pagado'];
        } elseif ($esSinCobro) {
            $montoPagado = 0.0;
        } elseif ($esAdminClub && $metodoPago === 'mostrador') {
            // Admin desk booking with cash/counter payment: respect explicit modalidad_pago if given
            $montoPagado = ($modalidadPago === 'sena') ? $montoSena : $precio;
        } elseif ($metodoPago === 'wallet_credito') {
            $montoPagado = $montoRequerido;
            $aplicarWallet = true;
        } elseif ($metodoPago === 'simulador_dev' || $metodoPago === 'online' || $metodoPago === 'tarjeta' || $metodoPago === 'mercadopago' || $metodoPago === 'transferencia') {
            $montoPagado = $montoRequerido;
        }

        $walletUserId = $esAdminClub ? $clienteId : $user?->id;
        if ($aplicarWallet && $walletUserId) {
            $saldoDisponible = $this->walletService->obtenerSaldo($walletUserId, $cancha->complejo_id);
            $aDebitar = min($saldoDisponible, $montoRequerido);
            if ($aDebitar > 0) {
                $this->walletService->debitar(
                    $walletUserId,
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
        if ($saldoPendiente <= 0.0 && $montoPagado > 0.0) {
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
                // SELECT FOR UPDATE: Check if any overlapping reserved/confirmed turno already exists
                $overlappingTurno = Turno::where('cancha_id', $cancha->id)
                    ->where('fecha', $fechaNormalizada)
                    ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
                    ->where('hora_inicio', '<', $horaFinNormalizada)
                    ->where('hora_fin', '>', $horaInicioNormalizada)
                    ->lockForUpdate()
                    ->first();

                if ($overlappingTurno) {
                    return null;
                }

                $existingTurno = Turno::where('cancha_id', $cancha->id)
                    ->where('fecha', $fechaNormalizada)
                    ->where('hora_inicio', $horaInicioNormalizada)
                    ->lockForUpdate()
                    ->first();

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
                    $horaInicioNormalizada
                );

                $this->reservaLockService->liberarBloqueosSolapados(
                    $cancha->id,
                    $fechaNormalizada,
                    $horaInicioNormalizada,
                    $horaFinNormalizada
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
