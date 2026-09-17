<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use App\Models\User;
use App\Services\ClubReporteService;
use App\Services\ReservaLockService;
use App\Services\WalletService;
use App\Jobs\NotificarListaEsperaJob;
use App\Models\EmailVerification;
use App\Http\Controllers\Api\OtpVerificationController;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClubDashboardController extends Controller
{
    public function __construct(
        protected ReservaLockService $reservaLockService,
        protected WalletService $walletService,
        protected ClubReporteService $reporteService
    ) {}
    /**
     * Verificar si el usuario autenticado es el administrador/dueño del club.
     */
    public function checkAdmin(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'is_admin' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'is_admin' => false,
                'is_authenticated' => false,
            ]);
        }

        $isAdmin = ($complejo->user_id && $complejo->user_id === $user->id) || ($user->role ?? '') === 'admin';

        return response()->json([
            'is_admin' => $isAdmin,
            'is_authenticated' => true,
            'club_name' => $complejo->nombre,
            'owner_id' => $complejo->user_id,
            'user_id' => $user->id,
        ]);
    }

    /**
     * Obtener métricas, canchas, horarios y configuración para el panel del club.
     */
    public function show(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->with([
                'plan.modulos',
                'canchas' => function ($query) {
                    $query->orderBy('nombre', 'asc');
                },
                'horariosAtencion',
                'owner',
                'tipoNegocio'
            ])
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $totalCanchas = $complejo->canchas()->count();
        $totalTurnos = Turno::where('complejo_id', $complejo->id)->count();
        $modulosActivos = $complejo->plan ? $complejo->plan->modulos : [];

        return response()->json([
            'success' => true,
            'data' => [
                'complejo' => [
                    'id' => $complejo->id,
                    'uuid' => $complejo->uuid,
                    'nombre' => $complejo->nombre,
                    'subdominio' => $complejo->subdominio,
                    'tipo_negocio' => $complejo->tipoNegocio ? [
                        'id' => $complejo->tipoNegocio->id,
                        'nombre' => $complejo->tipoNegocio->nombre,
                        'slug' => $complejo->tipoNegocio->slug,
                    ] : null,
                    'deporte_principal' => $complejo->deporte_principal ?? 'padel',
                    'telefono' => $complejo->telefono,
                    'ciudad' => $complejo->ciudad,
                    'direccion' => $complejo->direccion,
                    'estado' => $complejo->estado,
                    'tipo_cobro_reserva' => $complejo->tipo_cobro_reserva ?? 'sena',
                    'porcentaje_sena' => (float) ($complejo->porcentaje_sena ?? 50.00),
                    'monto_sena_fijo' => $complejo->monto_sena_fijo ? (float) $complejo->monto_sena_fijo : null,
                    'horas_limite_cancelacion' => (int) ($complejo->horas_limite_cancelacion ?? 4),
                    'permite_mostrador_publico' => (bool) ($complejo->permite_mostrador_publico ?? true),
                    'created_at' => $complejo->created_at,
                    'owner' => $complejo->owner ? [
                        'id' => $complejo->owner->id,
                        'name' => $complejo->owner->name,
                        'email' => $complejo->owner->email,
                    ] : null,
                ],
                'plan' => $complejo->plan ? [
                    'id' => $complejo->plan->id,
                    'nombre' => $complejo->plan->nombre,
                    'slug' => $complejo->plan->slug,
                    'precio_mensual' => $complejo->plan->precio_mensual,
                    'modulos' => $modulosActivos,
                ] : null,
                'canchas' => $complejo->canchas,
                'horarios_atencion' => $complejo->horariosAtencion,
                'stats' => [
                    'total_canchas' => $totalCanchas,
                    'total_turnos' => $totalTurnos,
                    'modulos_count' => count($modulosActivos),
                ],
                'tipos_negocio' => \App\Models\TipoNegocio::where('esta_activo', true)
                    ->orderBy('id', 'asc')
                    ->get(['id', 'nombre', 'slug']),
            ],
        ]);
    }

    /**
     * Crear una nueva cancha para el club con atributos adaptativos por deporte.
     */
    public function storeCancha(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'deporte' => 'nullable|string|max:50',
            'superficie' => 'nullable|string|max:50',
            'precio_base' => 'required|numeric|min:0',
            'precio_con_luz' => 'nullable|numeric|min:0',
            'techada' => 'boolean',
            'iluminacion' => 'boolean',
            'tipo_iluminacion' => 'nullable|string|max:50',
            'camara_grabacion' => 'boolean',
            'marcador_digital' => 'boolean',
            'climatizada' => 'boolean',
            'tipo_cubierta' => 'nullable|string|max:50',
            'tipo_pared' => 'nullable|string|max:50',
            'formato' => 'nullable|string|max:50',
            'duracion_minutos' => 'nullable|integer|in:30,60,90,120',
            'permite_duracion_flexible' => 'boolean',
            'anti_baches_activo' => 'boolean',
            'duraciones_permitidas' => 'nullable|array',
            'precio_90_min' => 'nullable|numeric|min:0',
            'precio_120_min' => 'nullable|numeric|min:0',
            'estado' => 'nullable|string|in:activo,mantenimiento,inactivo',
        ]);

        $deporte = strtolower($validated['deporte'] ?? ($complejo->deporte_principal ?? 'padel'));
        $requiereParedes = in_array($deporte, ['padel', 'squash', 'racquetball'], true);
        $tipoPared = $requiereParedes ? ($validated['tipo_pared'] ?? null) : null;

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => $validated['nombre'],
            'deporte' => $deporte,
            'superficie' => $validated['superficie'] ?? 'cristal',
            'precio_base' => $validated['precio_base'],
            'precio_con_luz' => $validated['precio_con_luz'] ?? null,
            'techada' => $validated['techada'] ?? false,
            'iluminacion' => $validated['iluminacion'] ?? true,
            'tipo_iluminacion' => $validated['tipo_iluminacion'] ?? 'led',
            'camara_grabacion' => $validated['camara_grabacion'] ?? false,
            'marcador_digital' => $validated['marcador_digital'] ?? false,
            'climatizada' => $validated['climatizada'] ?? false,
            'tipo_cubierta' => $validated['tipo_cubierta'] ?? ($validated['techada'] ?? false ? 'indoor' : 'outdoor'),
            'tipo_pared' => $tipoPared,
            'formato' => $validated['formato'] ?? null,
            'duracion_minutos' => $validated['duracion_minutos'] ?? ($deporte === 'padel' ? 90 : 60),
            'permite_duracion_flexible' => $validated['permite_duracion_flexible'] ?? false,
            'anti_baches_activo' => $validated['anti_baches_activo'] ?? true,
            'duraciones_permitidas' => $validated['duraciones_permitidas'] ?? [60, 90, 120],
            'precio_90_min' => $validated['precio_90_min'] ?? null,
            'precio_120_min' => $validated['precio_120_min'] ?? null,
            'estado' => $validated['estado'] ?? 'activo',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cancha creada exitosamente.',
            'cancha' => $cancha,
        ], 201);
    }

    /**
     * Actualizar una cancha existente con atributos deportivos y configuración de precios.
     */
    public function updateCancha(Request $request, string $subdomain, int $canchaId): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $cancha = Cancha::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('id', $canchaId)
            ->first();

        if (!$cancha) {
            return response()->json([
                'success' => false,
                'message' => 'Cancha no encontrada.',
            ], 404);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'deporte' => 'nullable|string|max:50',
            'superficie' => 'nullable|string|max:50',
            'precio_base' => 'required|numeric|min:0',
            'precio_con_luz' => 'nullable|numeric|min:0',
            'techada' => 'boolean',
            'iluminacion' => 'boolean',
            'tipo_iluminacion' => 'nullable|string|max:50',
            'camara_grabacion' => 'boolean',
            'marcador_digital' => 'boolean',
            'climatizada' => 'boolean',
            'tipo_cubierta' => 'nullable|string|max:50',
            'tipo_pared' => 'nullable|string|max:50',
            'formato' => 'nullable|string|max:50',
            'duracion_minutos' => 'nullable|integer|in:30,60,90,120',
            'permite_duracion_flexible' => 'boolean',
            'anti_baches_activo' => 'boolean',
            'duraciones_permitidas' => 'nullable|array',
            'precio_90_min' => 'nullable|numeric|min:0',
            'precio_120_min' => 'nullable|numeric|min:0',
            'estado' => 'nullable|string|in:activo,mantenimiento,inactivo',
        ]);

        $deporte = strtolower($validated['deporte'] ?? $cancha->deporte);
        $requiereParedes = in_array($deporte, ['padel', 'squash', 'racquetball'], true);
        $tipoPared = $requiereParedes ? ($validated['tipo_pared'] ?? $cancha->tipo_pared) : null;

        $cancha->update([
            'nombre' => $validated['nombre'],
            'deporte' => $deporte,
            'superficie' => $validated['superficie'] ?? $cancha->superficie,
            'precio_base' => $validated['precio_base'],
            'precio_con_luz' => array_key_exists('precio_con_luz', $validated) ? $validated['precio_con_luz'] : $cancha->precio_con_luz,
            'techada' => $validated['techada'] ?? $cancha->techada,
            'iluminacion' => $validated['iluminacion'] ?? $cancha->iluminacion,
            'tipo_iluminacion' => $validated['tipo_iluminacion'] ?? $cancha->tipo_iluminacion,
            'camara_grabacion' => $validated['camara_grabacion'] ?? $cancha->camara_grabacion,
            'marcador_digital' => $validated['marcador_digital'] ?? $cancha->marcador_digital,
            'climatizada' => $validated['climatizada'] ?? $cancha->climatizada,
            'tipo_cubierta' => $validated['tipo_cubierta'] ?? ($validated['techada'] ?? $cancha->techada ? 'indoor' : 'outdoor'),
            'tipo_pared' => $tipoPared,
            'formato' => $validated['formato'] ?? $cancha->formato,
            'duracion_minutos' => $validated['duracion_minutos'] ?? $cancha->duracion_minutos,
            'permite_duracion_flexible' => array_key_exists('permite_duracion_flexible', $validated) ? $validated['permite_duracion_flexible'] : $cancha->permite_duracion_flexible,
            'anti_baches_activo' => array_key_exists('anti_baches_activo', $validated) ? $validated['anti_baches_activo'] : $cancha->anti_baches_activo,
            'duraciones_permitidas' => $validated['duraciones_permitidas'] ?? $cancha->duraciones_permitidas,
            'precio_90_min' => array_key_exists('precio_90_min', $validated) ? $validated['precio_90_min'] : $cancha->precio_90_min,
            'precio_120_min' => array_key_exists('precio_120_min', $validated) ? $validated['precio_120_min'] : $cancha->precio_120_min,
            'estado' => $validated['estado'] ?? $cancha->estado,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cancha actualizada exitosamente.',
            'cancha' => $cancha,
        ]);
    }

    /**
     * Desactivar o eliminar una cancha.
     */
    public function destroyCancha(Request $request, string $subdomain, int $canchaId): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $cancha = Cancha::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('id', $canchaId)
            ->first();

        if (!$cancha) {
            return response()->json([
                'success' => false,
                'message' => 'Cancha no encontrada.',
            ], 404);
        }

        // Check if there are associated turnos
        $hasTurnos = $cancha->turnos()->exists();

        if ($hasTurnos) {
            $cancha->update(['estado' => 'inactivo']);
            return response()->json([
                'success' => true,
                'message' => 'La cancha tiene historial de reservas. Ha sido marcada como inactiva.',
                'action' => 'deactivated',
            ]);
        }

        $cancha->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cancha eliminada exitosamente.',
            'action' => 'deleted',
        ]);
    }

    /**
     * Enviar código OTP a un cliente para registrarlo y crear su cuenta desde el mostrador.
     */
    public function enviarOtpCliente(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'nombre' => 'nullable|string|max:255',
        ]);

        $cleanEmail = Str::lower(trim($validated['email']));
        $nombre = trim($validated['nombre'] ?? '') ?: 'Cliente';

        $existingUser = User::where('email', $cleanEmail)->first();
        if ($existingUser && $existingUser->email_verified_at) {
            return response()->json([
                'success' => true,
                'already_verified' => true,
                'message' => 'El cliente ya cuenta con usuario verificado en el sistema.',
                'user' => [
                    'id' => $existingUser->id,
                    'name' => $existingUser->name,
                    'email' => $existingUser->email,
                ],
            ]);
        }

        // Check 60-second cooldown rate limit
        $lastVerification = EmailVerification::where('email', $cleanEmail)
            ->latest('created_at')
            ->first();

        if ($lastVerification && $lastVerification->created_at->diffInSeconds(now()) < 60) {
            $remaining = 60 - $lastVerification->created_at->diffInSeconds(now());
            return response()->json([
                'success' => false,
                'cooldown' => true,
                'remaining_seconds' => $remaining,
                'message' => "Por favor espera {$remaining} segundos antes de solicitar otro código OTP.",
            ], 429);
        }

        OtpVerificationController::dispatchOtp($cleanEmail, $nombre);

        return response()->json([
            'success' => true,
            'message' => "Código de verificación OTP enviado exitosamente a {$cleanEmail}.",
        ]);
    }

    /**
     * Verificar si un correo electrónico pertenece a un usuario registrado en el sistema y retornar sus datos.
     */
    public function verificarEmailCliente(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $user = auth()->user() ?: ($request->user('sanctum') ?? $request->user());
        if (!$user && $request->bearerToken()) {
            $user = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable;
        }

        $isAdmin = $user && (
            ($complejo->user_id && $complejo->user_id === $user->id) ||
            ($user->role ?? '') === 'admin' ||
            !empty($user->is_admin) ||
            ($user->email ?? '') === 'admin@admin.com'
        );

        if (!$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para consultar clientes en este club.',
            ], 403);
        }

        $email = Str::lower(trim($request->query('email', '')));
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'success' => false,
                'message' => 'El correo electrónico proporcionado no es válido.',
            ], 422);
        }

        $cliente = User::where('email', $email)->first();

        if (!$cliente) {
            return response()->json([
                'success' => true,
                'exists' => false,
                'message' => 'El correo no está registrado en el sistema.',
                'email' => $email,
            ]);
        }

        $saldo = (float) $this->walletService->obtenerSaldo($cliente->id, $complejo->id);

        return response()->json([
            'success' => true,
            'exists' => true,
            'message' => 'Cliente encontrado en el sistema.',
            'cliente' => [
                'id' => $cliente->id,
                'name' => $cliente->name,
                'email' => $cliente->email,
                'telefono' => $cliente->telefono,
                'saldo_billetera' => $saldo,
                'is_verified' => (bool) $cliente->email_verified_at,
            ],
        ]);
    }

    /**
     * Cancelar o liberar un turno por parte del administrador con soporte de reembolso y alta de cliente con OTP.
     */
    public function destroyTurno(Request $request, string $subdomain, int $turnoId): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $turno = Turno::withoutGlobalScopes()
            ->with(['cancha', 'cliente'])
            ->where('complejo_id', $complejo->id)
            ->where('id', $turnoId)
            ->first();

        if (!$turno) {
            return response()->json([
                'success' => false,
                'message' => 'Turno no encontrado.',
            ], 404);
        }

        $montoPagado = (float) ($turno->monto_pagado ?? 0);
        $accionReembolso = $request->input('accion_reembolso', 'billetera'); // 'billetera', 'efectivo', 'ninguno'
        $clienteEmail = $request->input('cliente_email');
        $otpCodigo = $request->input('otp_codigo');
        $nuevoSaldo = null;
        $clienteDestino = null;

        if ($montoPagado > 0 && $accionReembolso === 'billetera') {
            if (!empty($clienteEmail)) {
                $cleanEmail = Str::lower(trim($clienteEmail));
                $userCliente = User::where('email', $cleanEmail)->first();

                if (!$userCliente) {
                    // Dar de alta al nuevo cliente exigiendo validación OTP
                    if (empty($otpCodigo) || strlen(trim($otpCodigo)) !== 6) {
                        return response()->json([
                            'error' => 'OTP_REQUIRED',
                            'message' => 'Se requiere el código OTP de 6 dígitos para dar de alta al cliente y crear su cuenta.',
                        ], 422);
                    }

                    $verification = EmailVerification::where('email', $cleanEmail)
                        ->latest('created_at')
                        ->first();

                    if (!$verification) {
                        return response()->json([
                            'error' => 'OTP_NOT_FOUND',
                            'message' => 'No hay ninguna solicitud de verificación pendiente para este correo. Por favor solicita el código.',
                        ], 422);
                    }

                    if ($verification->isExpired()) {
                        return response()->json([
                            'error' => 'OTP_EXPIRED',
                            'message' => 'El código de verificación OTP ha expirado. Por favor solicita uno nuevo.',
                        ], 422);
                    }

                    if ($verification->intentos >= 5) {
                        return response()->json([
                            'error' => 'MAX_ATTEMPTS',
                            'message' => 'Has superado el límite de intentos permitidos. Por favor solicita un nuevo código.',
                        ], 429);
                    }

                    if ($verification->codigo !== trim($otpCodigo)) {
                        $verification->increment('intentos');
                        $restantes = max(0, 5 - $verification->intentos);
                        return response()->json([
                            'error' => 'INVALID_OTP',
                            'message' => "Código OTP incorrecto. Te quedan {$restantes} intento(s).",
                        ], 422);
                    }

                    // OTP válido: Crear usuario cliente con email verificado
                    $userCliente = User::create([
                        'name' => trim($request->input('cliente_nombre')) ?: ($turno->cliente_nombre ?: 'Cliente Mostrador'),
                        'email' => $cleanEmail,
                        'telefono' => trim($request->input('cliente_telefono')) ?: ($turno->cliente_telefono ?: null),
                        'password' => Hash::make(Str::random(16)),
                        'email_verified_at' => now(),
                    ]);

                    EmailVerification::where('email', $cleanEmail)->delete();
                } elseif (!$userCliente->email_verified_at) {
                    if (empty($otpCodigo) || strlen(trim($otpCodigo)) !== 6) {
                        return response()->json([
                            'error' => 'OTP_REQUIRED',
                            'message' => 'El cliente no está verificado. Se requiere el código OTP de 6 dígitos.',
                        ], 422);
                    }
                    $verification = EmailVerification::where('email', $cleanEmail)->latest('created_at')->first();
                    if ($verification && !$verification->isExpired() && $verification->codigo === trim($otpCodigo)) {
                        $userCliente->email_verified_at = now();
                        $userCliente->save();
                        EmailVerification::where('email', $cleanEmail)->delete();
                    } else {
                        return response()->json([
                            'error' => 'INVALID_OTP',
                            'message' => 'Código OTP inválido o expirado.',
                        ], 422);
                    }
                }

                $clienteDestino = $userCliente;
            } elseif ($turno->cliente_id) {
                $clienteDestino = User::find($turno->cliente_id);
            }

            if (!$clienteDestino) {
                return response()->json([
                    'error' => 'CLIENT_NOT_IDENTIFIED',
                    'message' => 'Para acreditar el saldo en billetera virtual debes indicar el correo electrónico del cliente.',
                ], 422);
            }

            // Asociar el turno al cliente acreditado
            $turno->cliente_id = $clienteDestino->id;

            // Acreditar saldo en la billetera virtual del cliente
            $this->walletService->acreditar(
                $clienteDestino->id,
                $complejo->id,
                $montoPagado,
                'reembolso_cancelacion',
                $turno->id,
                "Reembolso por cancelación de turno {$turno->hora_inicio} hs en {$turno->cancha?->nombre}"
            );

            $nuevoSaldo = $this->walletService->obtenerSaldo($clienteDestino->id, $complejo->id);
            $turno->estado_pago = 'reembolsado';

            // Actualizar en cascada otros turnos del mismo cliente que no tuvieran cliente_id asignado
            Turno::where('complejo_id', $complejo->id)
                ->where('estado', '!=', 'cancelado')
                ->where(function ($q) use ($complejo) {
                    $q->whereNull('cliente_id')
                      ->orWhere('cliente_id', $complejo->user_id);
                })
                ->where(function ($q) use ($clienteDestino) {
                    $applied = false;
                    if ($clienteDestino->telefono) {
                        $q->where('cliente_telefono', $clienteDestino->telefono);
                        $applied = true;
                    }
                    if ($clienteDestino->name) {
                        $applied ? $q->orWhere('cliente_nombre', $clienteDestino->name) : $q->where('cliente_nombre', $clienteDestino->name);
                    }
                })
                ->update(['cliente_id' => $clienteDestino->id]);
        } elseif ($montoPagado > 0 && $accionReembolso === 'efectivo') {
            $turno->estado_pago = 'reembolsado';
        } elseif ($montoPagado > 0) {
            $turno->estado_pago = 'reembolsado';
        }

        $turno->estado = 'cancelado';
        $turno->saldo_pendiente = 0.00;
        $turno->save();

        $fechaStr = is_string($turno->fecha) ? $turno->fecha : $turno->fecha->format('Y-m-d');
        $horaInicioStr = Carbon::parse($turno->hora_inicio)->format('H:i');
        $horaFinStr = $turno->hora_fin ? Carbon::parse($turno->hora_fin)->format('H:i') : null;

        NotificarListaEsperaJob::dispatch(
            $turno->cancha_id,
            $fechaStr,
            $horaInicioStr,
            $horaFinStr
        );

        $mensaje = $montoPagado > 0 && $accionReembolso === 'billetera' && $clienteDestino
            ? "Turno liberado. Se acreditaron $" . number_format($montoPagado, 0, ',', '.') . " en la Billetera Virtual de {$clienteDestino->name} ({$clienteDestino->email})."
            : ($montoPagado > 0 && $accionReembolso === 'efectivo'
                ? "Turno liberado. Devolución de $" . number_format($montoPagado, 0, ',', '.') . " registrada en efectivo."
                : "Turno liberado y cancelado exitosamente.");

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'reembolso' => [
                'monto' => $montoPagado,
                'metodo' => $accionReembolso,
                'cliente_id' => $turno->cliente_id,
                'nuevo_saldo_billetera' => $nuevoSaldo,
            ],
        ]);
    }

    /**
     * Actualizar políticas de cobro de seña, cancelación y configuración general del club.
     */
    public function updateConfiguracion(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para modificar las políticas de este club.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'nombre' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:50',
            'ciudad' => 'nullable|string|max:100',
            'direccion' => 'nullable|string|max:255',
            'deporte_principal' => 'nullable|string|max:50',
            'tipo_negocio_id' => 'nullable|integer|exists:tipos_negocio,id',
            'tipo_cobro_reserva' => 'nullable|string|in:sena,total,ninguno',
            'porcentaje_sena' => 'nullable|numeric|min:10|max:100',
            'monto_sena_fijo' => 'nullable|numeric|min:0',
            'horas_limite_cancelacion' => 'nullable|integer|min:0|max:72',
            'permite_mostrador_publico' => 'nullable|boolean',
        ]);

        $updateData = [];
        foreach ($validated as $key => $value) {
            if ($value !== null) {
                $updateData[$key] = $value;
            }
        }

        if (!empty($updateData)) {
            $complejo->update($updateData);
        }

        $complejo->load('tipoNegocio');

        return response()->json([
            'success' => true,
            'message' => 'Datos y configuración del club actualizados exitosamente.',
            'complejo' => [
                'id' => $complejo->id,
                'uuid' => $complejo->uuid,
                'nombre' => $complejo->nombre,
                'subdominio' => $complejo->subdominio,
                'tipo_negocio' => $complejo->tipoNegocio ? [
                    'id' => $complejo->tipoNegocio->id,
                    'nombre' => $complejo->tipoNegocio->nombre,
                    'slug' => $complejo->tipoNegocio->slug,
                ] : null,
                'deporte_principal' => $complejo->deporte_principal ?? 'padel',
                'telefono' => $complejo->telefono,
                'ciudad' => $complejo->ciudad,
                'direccion' => $complejo->direccion,
                'tipo_cobro_reserva' => $complejo->tipo_cobro_reserva ?? 'sena',
                'porcentaje_sena' => (float) ($complejo->porcentaje_sena ?? 50.00),
                'monto_sena_fijo' => $complejo->monto_sena_fijo ? (float) $complejo->monto_sena_fijo : null,
                'horas_limite_cancelacion' => (int) ($complejo->horas_limite_cancelacion ?? 4),
                'permite_mostrador_publico' => (bool) ($complejo->permite_mostrador_publico ?? true),
            ],
        ]);
    }

    /**
     * Actualizar los horarios de atención semanales del club (abrir/cerrar días, ajustar apertura/cierre y duración).
     */
    public function updateHorarios(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para modificar los horarios de este club.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'horarios' => 'required|array|min:1|max:7',
            'horarios.*.dia_semana' => 'required|integer|min:0|max:6',
            'horarios.*.abierto' => 'required|boolean',
            'horarios.*.hora_apertura' => 'nullable|required_if:horarios.*.abierto,true|string|max:5',
            'horarios.*.hora_cierre' => 'nullable|required_if:horarios.*.abierto,true|string|max:5',
            'horarios.*.duracion_turno_minutos' => 'nullable|integer|in:30,60,90,120',
        ]);

        // Validación de coherencia de horarios para los días abiertos
        foreach ($validated['horarios'] as $item) {
            if (!empty($item['abierto'])) {
                $apertura = $item['hora_apertura'] ?? '08:00';
                $cierre = $item['hora_cierre'] ?? '23:00';
                if ($apertura >= $cierre) {
                    return response()->json([
                        'success' => false,
                        'message' => "Para el día seleccionado, la hora de apertura ({$apertura}) debe ser anterior a la hora de cierre ({$cierre}).",
                    ], 422);
                }
            }
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($complejo, $validated) {
            foreach ($validated['horarios'] as $item) {
                $dia = (int) $item['dia_semana'];
                $abierto = (bool) $item['abierto'];

                if (!$abierto) {
                    \App\Models\HorarioAtencion::where('complejo_id', $complejo->id)
                        ->where('dia_semana', $dia)
                        ->delete();
                } else {
                    \App\Models\HorarioAtencion::updateOrCreate(
                        [
                            'complejo_id' => $complejo->id,
                            'dia_semana' => $dia,
                        ],
                        [
                            'hora_apertura' => $item['hora_apertura'],
                            'hora_cierre' => $item['hora_cierre'],
                            'duracion_turno_minutos' => $item['duracion_turno_minutos'] ?? 60,
                        ]
                    );
                }
            }
        });

        $horariosActualizados = \App\Models\HorarioAtencion::where('complejo_id', $complejo->id)
            ->orderBy('dia_semana', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Horarios de atención actualizados exitosamente.',
            'horarios' => $horariosActualizados,
        ]);
    }

    /**
     * Listar las series de turnos fijos activas del club.
     */
    public function getTurnosFijos(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()->where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos para ver los turnos fijos de este club.'], 403);
            }
        }

        $turnosFijos = Turno::withoutGlobalScopes()
            ->with(['cancha', 'cliente'])
            ->where('complejo_id', $complejo->id)
            ->where('es_fijo', true)
            ->whereIn('estado', ['reservado', 'confirmado', 'completado', 'pagado'])
            ->orderBy('fecha', 'asc')
            ->orderBy('hora_inicio', 'asc')
            ->get();

        $hoy = Carbon::today()->format('Y-m-d');
        $seriesMap = [];

        foreach ($turnosFijos as $t) {
            $fechaCarbon = Carbon::parse($t->fecha);
            $diaSemana = $fechaCarbon->dayOfWeek; // 0=Dom, 1=Lun, ..., 6=Sab
            $horaInicioFmt = Carbon::parse($t->hora_inicio)->format('H:i');
            $clienteKey = $t->cliente_id ? "uid_{$t->cliente_id}" : "nom_" . md5($t->cliente_nombre ?? 'mostrador');
            $serieKey = "{$t->cancha_id}_{$diaSemana}_{$horaInicioFmt}_{$clienteKey}";

            if (!isset($seriesMap[$serieKey])) {
                $seriesMap[$serieKey] = [
                    'id' => $t->id,
                    'cancha_id' => $t->cancha_id,
                    'cancha_nombre' => $t->cancha?->nombre ?? 'Cancha',
                    'deporte' => $t->cancha?->deporte ?? 'padel',
                    'dia_semana' => $diaSemana,
                    'hora_inicio' => $horaInicioFmt,
                    'hora_fin' => Carbon::parse($t->hora_fin)->format('H:i'),
                    'precio' => (float) $t->precio,
                    'cliente_id' => $t->cliente_id,
                    'cliente_nombre' => $t->cliente_nombre ?: ($t->cliente?->name ?: 'Cliente Mostrador'),
                    'cliente_telefono' => $t->cliente_telefono ?: ($t->cliente?->telefono ?: null),
                    'cliente_email' => $t->cliente?->email,
                    'metodo_pago' => $t->metodo_pago ?? 'mostrador',
                    'total_turnos' => 0,
                    'proximas_fechas_count' => 0,
                    'proxima_fecha' => null,
                    'fecha_inicio' => $t->fecha instanceof Carbon ? $t->fecha->format('Y-m-d') : (string) $t->fecha,
                    'fecha_fin' => $t->fecha instanceof Carbon ? $t->fecha->format('Y-m-d') : (string) $t->fecha,
                    'proximas_fechas' => [],
                ];
            }

            $seriesMap[$serieKey]['total_turnos']++;
            $fechaStr = $t->fecha instanceof Carbon ? $t->fecha->format('Y-m-d') : (string) $t->fecha;
            $seriesMap[$serieKey]['fecha_fin'] = $fechaStr;

            if ($fechaStr >= $hoy) {
                $seriesMap[$serieKey]['proximas_fechas_count']++;
                if (!$seriesMap[$serieKey]['proxima_fecha']) {
                    $seriesMap[$serieKey]['proxima_fecha'] = $fechaStr;
                }
                if (count($seriesMap[$serieKey]['proximas_fechas']) < 6) {
                    $seriesMap[$serieKey]['proximas_fechas'][] = [
                        'id' => $t->id,
                        'fecha' => $fechaStr,
                        'hora_inicio' => $horaInicioFmt,
                        'hora_fin' => Carbon::parse($t->hora_fin)->format('H:i'),
                        'estado' => $t->estado,
                        'estado_pago' => $t->estado_pago ?? 'pendiente',
                        'precio' => (float) $t->precio,
                        'monto_pagado' => (float) $t->monto_pagado,
                        'metodo_pago' => $t->metodo_pago ?? 'mostrador',
                    ];
                }
            }
        }

        $series = array_values(array_map(function ($s) {
            $s['requiere_renovacion'] = ($s['proximas_fechas_count'] <= 2);
            $s['dias_restantes_aprox'] = $s['proximas_fechas_count'] * 7;
            return $s;
        }, $seriesMap));

        usort($series, function ($a, $b) {
            $diaA = $a['dia_semana'] === 0 ? 7 : (int) $a['dia_semana'];
            $diaB = $b['dia_semana'] === 0 ? 7 : (int) $b['dia_semana'];
            if ($diaA !== $diaB) {
                return $diaA <=> $diaB;
            }
            if ($a['hora_inicio'] !== $b['hora_inicio']) {
                return strcmp($a['hora_inicio'], $b['hora_inicio']);
            }
            return ($a['cancha_id'] ?? 0) <=> ($b['cancha_id'] ?? 0);
        });

        return response()->json([
            'success' => true,
            'data' => $series,
        ]);
    }

    /**
     * Crear o registrar una nueva serie de turnos fijos (por defecto 26 semanas = 6 meses).
     */
    public function storeTurnoFijo(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()->where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos.'], 403);
            }
        }

        $validated = $request->validate([
            'cancha_id' => 'required|integer|exists:canchas,id',
            'dia_semana' => 'required|integer|between:0,6',
            'hora_inicio' => 'required|string|max:5',
            'hora_fin' => 'nullable|string|max:5',
            'fecha_inicio' => 'nullable|date_format:Y-m-d',
            'duracion_minutos' => 'nullable|integer|in:60,90,120',
            'semanas' => 'nullable|integer|min:1|max:52',
            'precio' => 'nullable|numeric|min:0',
            'cliente_id' => 'nullable|integer|exists:users,id',
            'cliente_nombre' => 'nullable|string|max:255',
            'cliente_telefono' => 'nullable|string|max:50',
            'metodo_pago' => 'nullable|string|in:mostrador,transferencia,billetera,online',
        ]);

        $cancha = Cancha::where('complejo_id', $complejo->id)->find($validated['cancha_id']);
        if (!$cancha) {
            return response()->json(['success' => false, 'message' => 'Cancha no encontrada en este complejo.'], 404);
        }

        $semanas = $validated['semanas'] ?? 26; // 6 meses estándar
        $horaInicio = Carbon::parse($validated['hora_inicio'])->format('H:i');
        $targetDiaSemana = (int) $validated['dia_semana'];

        $horario = HorarioAtencion::where('complejo_id', $complejo->id)
            ->where('dia_semana', $targetDiaSemana)
            ->first();

        $nombresDias = [0 => 'Domingo', 1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado'];
        $nombreDia = $nombresDias[$targetDiaSemana] ?? "Día {$targetDiaSemana}";

        if (!$horario) {
            return response()->json([
                'success' => false,
                'message' => "El club se encuentra cerrado los días {$nombreDia}. No es posible asignar turnos fijos.",
            ], 422);
        }

        if (!empty($validated['fecha_inicio'])) {
            $startDate = Carbon::parse($validated['fecha_inicio']);
            if ($startDate->dayOfWeek !== $targetDiaSemana) {
                $startDate->next($targetDiaSemana);
            }
        } else {
            $startDate = Carbon::today();
            if ($startDate->dayOfWeek !== $targetDiaSemana) {
                $startDate->next($targetDiaSemana);
            }
        }

        if (!empty($validated['duracion_minutos'])) {
            $duracion = (int) $validated['duracion_minutos'];
        } elseif ($cancha->permite_duracion_flexible && !empty($validated['hora_fin'])) {
            $iniMin = Carbon::parse($horaInicio)->hour * 60 + Carbon::parse($horaInicio)->minute;
            $finMin = Carbon::parse($validated['hora_fin'])->hour * 60 + Carbon::parse($validated['hora_fin'])->minute;
            $duracion = $finMin > $iniMin ? ($finMin - $iniMin) : ($cancha->duracion_minutos ?: 60);
        } else {
            $duracion = $cancha->duracion_minutos ?: ($horario->duracion_turno_minutos ?: 60);
        }

        if (!empty($validated['hora_fin'])) {
            $horaFin = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horaFin = Carbon::parse($startDate->format('Y-m-d') . ' ' . $horaInicio)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        $horaAperturaFmt = Carbon::parse($horario->hora_apertura)->format('H:i');
        $horaCierreFmt = Carbon::parse($horario->hora_cierre)->format('H:i');

        if ($horaInicio < $horaAperturaFmt || $horaFin > $horaCierreFmt || $horaInicio >= $horaFin) {
            return response()->json([
                'success' => false,
                'message' => "El horario seleccionado ({$horaInicio} a {$horaFin} hs) está fuera del horario de atención del club para los días {$nombreDia} ({$horaAperturaFmt} a {$horaCierreFmt} hs).",
            ], 422);
        }

        $precio = $validated['precio'] ?? (float) $cancha->precio_base;
        $clienteId = $validated['cliente_id'] ?? null;
        $clienteNombre = $validated['cliente_nombre'] ?? null;
        $clienteTelefono = $validated['cliente_telefono'] ?? null;
        $metodoPago = $validated['metodo_pago'] ?? 'mostrador';

        if ($clienteId && !$clienteNombre) {
            $u = User::find($clienteId);
            $clienteNombre = $u?->name;
            $clienteTelefono = $clienteTelefono ?: $u?->telefono;
        }

        $fechas = [];
        $currentDate = $startDate->copy();
        for ($i = 0; $i < $semanas; $i++) {
            $fechas[] = $currentDate->format('Y-m-d');
            $currentDate->addWeek();
        }

        return DB::transaction(function () use (
            $complejo,
            $cancha,
            $fechas,
            $horaInicio,
            $horaFin,
            $clienteId,
            $clienteNombre,
            $clienteTelefono,
            $precio,
            $metodoPago
        ) {
            // Comprobación de conflictos contra turnos ya asignados (casuales o fijos)
            foreach ($fechas as $f) {
                $conflicto = Turno::withoutGlobalScopes()
                    ->where('cancha_id', $cancha->id)
                    ->where('fecha', $f)
                    ->whereNotIn('estado', ['cancelado', 'disponible'])
                    ->where('hora_inicio', '<', $horaFin)
                    ->where('hora_fin', '>', $horaInicio)
                    ->lockForUpdate()
                    ->first();

                if ($conflicto) {
                    $fechaFmt = Carbon::parse($f)->format('d-m-Y');
                    $horaIniFmt = Carbon::parse($conflicto->hora_inicio)->format('H:i');
                    $horaFinFmt = Carbon::parse($conflicto->hora_fin)->format('H:i');
                    $nombreOcupante = $conflicto->cliente_nombre ?: ($conflicto->cliente?->name ?: 'un cliente');
                    $tipoTurno = $conflicto->es_fijo ? 'turno fijo' : 'reserva casual';

                    return response()->json([
                        'success' => false,
                        'error' => 'RECURRING_SLOT_CONFLICT',
                        'message' => "Conflicto en la fecha {$fechaFmt} ({$horaIniFmt} a {$horaFinFmt} hs): ya existe un turno asignado a {$nombreOcupante} ({$tipoTurno}).",
                        'fecha_conflicto' => $f,
                        'conflicto' => [
                            'fecha' => $f,
                            'fecha_formateada' => $fechaFmt,
                            'hora_inicio' => $horaIniFmt,
                            'hora_fin' => $horaFinFmt,
                            'cliente_nombre' => $nombreOcupante,
                            'tipo' => $tipoTurno,
                        ],
                    ], 409);
                }
            }

            $turnosCreados = [];
            foreach ($fechas as $f) {
                $turno = Turno::withoutGlobalScopes()
                    ->where('cancha_id', $cancha->id)
                    ->where('fecha', $f)
                    ->where('hora_inicio', $horaInicio)
                    ->first();

                if ($turno) {
                    $montoPagadoActual = (float) ($turno->monto_pagado ?? 0);
                    $saldoPendienteCalculado = max(0.0, round($precio - $montoPagadoActual, 2));
                    $turno->update([
                        'complejo_id' => $complejo->id,
                        'cliente_id' => $clienteId,
                        'cliente_nombre' => $clienteNombre,
                        'cliente_telefono' => $clienteTelefono,
                        'hora_fin' => $horaFin,
                        'precio' => $precio,
                        'monto_pagado' => $montoPagadoActual,
                        'saldo_pendiente' => $saldoPendienteCalculado,
                        'estado_pago' => $saldoPendienteCalculado <= 0 && $montoPagadoActual > 0 ? 'pagado_total' : ($montoPagadoActual > 0 ? 'senado' : 'pendiente'),
                        'metodo_pago' => $metodoPago,
                        'estado' => 'reservado',
                        'es_fijo' => true,
                    ]);
                    $turnosCreados[] = $turno;
                } else {
                    $turnosCreados[] = Turno::create([
                        'complejo_id' => $complejo->id,
                        'cancha_id' => $cancha->id,
                        'cliente_id' => $clienteId,
                        'cliente_nombre' => $clienteNombre,
                        'cliente_telefono' => $clienteTelefono,
                        'fecha' => $f,
                        'hora_inicio' => $horaInicio,
                        'hora_fin' => $horaFin,
                        'precio' => $precio,
                        'monto_pagado' => 0.00,
                        'saldo_pendiente' => $precio,
                        'estado_pago' => 'pendiente',
                        'metodo_pago' => $metodoPago,
                        'estado' => 'reservado',
                        'es_fijo' => true,
                    ]);
                }

                $this->reservaLockService->liberarBloqueo($cancha->id, $f, $horaInicio);
            }

            return response()->json([
                'success' => true,
                'message' => 'Turnos fijos generados exitosamente.',
                'cantidad' => count($turnosCreados),
            ], 201);
        });
    }

    /**
     * Verificar disponibilidad para una serie de turnos fijos antes de confirmar.
     */
    public function verificarDisponibilidadTurnoFijo(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $validated = $request->validate([
            'cancha_id' => 'required|integer|exists:canchas,id',
            'dia_semana' => 'required|integer|between:0,6',
            'hora_inicio' => 'required|string|max:5',
            'hora_fin' => 'nullable|string|max:5',
            'duracion_minutos' => 'nullable|integer|in:60,90,120',
            'semanas' => 'nullable|integer|min:1|max:52',
        ]);

        $cancha = Cancha::where('complejo_id', $complejo->id)->find($validated['cancha_id']);
        if (!$cancha) {
            return response()->json(['success' => false, 'message' => 'Cancha no encontrada en este complejo.'], 404);
        }

        $targetDiaSemana = (int) $validated['dia_semana'];
        $nombresDias = [0 => 'Domingo', 1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado'];
        $nombreDia = $nombresDias[$targetDiaSemana] ?? "Día {$targetDiaSemana}";

        $horario = HorarioAtencion::where('complejo_id', $complejo->id)
            ->where('dia_semana', $targetDiaSemana)
            ->first();

        if (!$horario) {
            return response()->json([
                'success' => true,
                'disponible' => false,
                'error' => 'COMPLEJO_CERRADO',
                'message' => "El club se encuentra cerrado los días {$nombreDia}.",
            ]);
        }

        $horaInicio = Carbon::parse($validated['hora_inicio'])->format('H:i');
        $semanas = $validated['semanas'] ?? 26;

        $startDate = Carbon::today();
        if ($startDate->dayOfWeek !== $targetDiaSemana) {
            $startDate->next($targetDiaSemana);
        }

        if (!empty($validated['duracion_minutos'])) {
            $duracion = (int) $validated['duracion_minutos'];
        } elseif ($cancha->permite_duracion_flexible && !empty($validated['hora_fin'])) {
            $iniMin = Carbon::parse($horaInicio)->hour * 60 + Carbon::parse($horaInicio)->minute;
            $finMin = Carbon::parse($validated['hora_fin'])->hour * 60 + Carbon::parse($validated['hora_fin'])->minute;
            $duracion = $finMin > $iniMin ? ($finMin - $iniMin) : ($cancha->duracion_minutos ?: 60);
        } else {
            $duracion = $cancha->duracion_minutos ?: ($horario->duracion_turno_minutos ?: 60);
        }

        if (!empty($validated['hora_fin'])) {
            $horaFin = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horaFin = Carbon::parse($startDate->format('Y-m-d') . ' ' . $horaInicio)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        $horaAperturaFmt = Carbon::parse($horario->hora_apertura)->format('H:i');
        $horaCierreFmt = Carbon::parse($horario->hora_cierre)->format('H:i');

        if ($horaInicio < $horaAperturaFmt || $horaFin > $horaCierreFmt || $horaInicio >= $horaFin) {
            return response()->json([
                'success' => true,
                'disponible' => false,
                'error' => 'FUERA_DE_HORARIO',
                'message' => "El horario seleccionado ({$horaInicio} a {$horaFin} hs) está fuera del horario de atención ({$horaAperturaFmt} a {$horaCierreFmt} hs).",
            ]);
        }

        $fechas = [];
        $currentDate = $startDate->copy();
        for ($i = 0; $i < $semanas; $i++) {
            $fechas[] = $currentDate->format('Y-m-d');
            $currentDate->addWeek();
        }

        foreach ($fechas as $f) {
            $conflicto = Turno::withoutGlobalScopes()
                ->where('cancha_id', $cancha->id)
                ->where('fecha', $f)
                ->whereNotIn('estado', ['cancelado', 'disponible'])
                ->where('hora_inicio', '<', $horaFin)
                ->where('hora_fin', '>', $horaInicio)
                ->first();

            if ($conflicto) {
                $fechaFmt = Carbon::parse($f)->format('d-m-Y');
                $horaIniFmt = Carbon::parse($conflicto->hora_inicio)->format('H:i');
                $horaFinFmt = Carbon::parse($conflicto->hora_fin)->format('H:i');
                $nombreOcupante = $conflicto->cliente_nombre ?: ($conflicto->cliente?->name ?: 'un cliente');
                $tipoTurno = $conflicto->es_fijo ? 'turno fijo' : 'reserva casual';

                return response()->json([
                    'success' => true,
                    'disponible' => false,
                    'error' => 'RECURRING_SLOT_CONFLICT',
                    'message' => "Conflicto en la fecha {$fechaFmt} ({$horaIniFmt} a {$horaFinFmt} hs): ya existe un turno asignado a {$nombreOcupante} ({$tipoTurno}).",
                    'fecha_conflicto' => $f,
                    'conflicto' => [
                        'fecha' => $f,
                        'fecha_formateada' => $fechaFmt,
                        'hora_inicio' => $horaIniFmt,
                        'hora_fin' => $horaFinFmt,
                        'cliente_nombre' => $nombreOcupante,
                        'tipo' => $tipoTurno,
                    ],
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'disponible' => true,
            'semanas' => $semanas,
            'duracion_minutos' => $duracion,
            'hora_inicio' => $horaInicio,
            'hora_fin' => $horaFin,
            'message' => "Horario disponible para las {$semanas} semanas consecutivas.",
        ]);
    }

    /**
     * Renovar una serie de turnos fijos por 26 semanas (6 meses) adicionales.
     */
    public function renovarTurnoFijo(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()->where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos.'], 403);
            }
        }

        $validated = $request->validate([
            'cancha_id' => 'required|integer|exists:canchas,id',
            'dia_semana' => 'required|integer|between:0,6',
            'hora_inicio' => 'required|string|max:5',
            'hora_fin' => 'nullable|string|max:5',
            'cliente_id' => 'nullable|integer',
            'cliente_nombre' => 'nullable|string|max:255',
            'semanas' => 'nullable|integer|min:1|max:52',
            'precio' => 'nullable|numeric|min:0',
        ]);

        $semanas = $validated['semanas'] ?? 26;
        $horaInicio = Carbon::parse($validated['hora_inicio'])->format('H:i');

        $query = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('cancha_id', $validated['cancha_id'])
            ->where('hora_inicio', $horaInicio)
            ->where('es_fijo', true)
            ->whereIn('estado', ['reservado', 'confirmado', 'completado', 'pagado']);

        if (!empty($validated['cliente_id'])) {
            $query->where('cliente_id', $validated['cliente_id']);
        } elseif (!empty($validated['cliente_nombre'])) {
            $query->where('cliente_nombre', $validated['cliente_nombre']);
        }

        $lastTurno = $query->orderBy('fecha', 'desc')->first();

        if ($lastTurno) {
            $startDate = Carbon::parse($lastTurno->fecha)->addWeek();
            $horaFin = $validated['hora_fin'] ?? Carbon::parse($lastTurno->hora_fin)->format('H:i');
            $precio = $validated['precio'] ?? (float) $lastTurno->precio;
            $clienteId = $lastTurno->cliente_id;
            $clienteNombre = $lastTurno->cliente_nombre;
            $clienteTelefono = $lastTurno->cliente_telefono;
            $metodoPago = $lastTurno->metodo_pago ?? 'mostrador';
        } else {
            $startDate = Carbon::today()->next((int) $validated['dia_semana']);
            $cancha = Cancha::find($validated['cancha_id']);
            $horaFin = $validated['hora_fin'] ?? Carbon::parse($validated['hora_inicio'])->addMinutes($cancha->duracion_minutos ?: 60)->format('H:i');
            $precio = $validated['precio'] ?? (float) $cancha->precio_base;
            $clienteId = $validated['cliente_id'] ?? null;
            $clienteNombre = $validated['cliente_nombre'] ?? null;
            $clienteTelefono = null;
            $metodoPago = 'mostrador';
        }

        $fechas = [];
        $currentDate = $startDate->copy();
        for ($i = 0; $i < $semanas; $i++) {
            $fechas[] = $currentDate->format('Y-m-d');
            $currentDate->addWeek();
        }

        return DB::transaction(function () use (
            $complejo,
            $validated,
            $fechas,
            $horaInicio,
            $horaFin,
            $clienteId,
            $clienteNombre,
            $clienteTelefono,
            $precio,
            $metodoPago,
            $semanas
        ) {
            $canchaId = $validated['cancha_id'];

            foreach ($fechas as $f) {
                $conflicto = Turno::withoutGlobalScopes()
                    ->where('cancha_id', $canchaId)
                    ->where('fecha', $f)
                    ->whereNotIn('estado', ['cancelado', 'disponible'])
                    ->where('hora_inicio', '<', $horaFin)
                    ->where('hora_fin', '>', $horaInicio)
                    ->lockForUpdate()
                    ->first();

                if ($conflicto) {
                    $fechaFmt = Carbon::parse($f)->format('d-m-Y');
                    $horaIniFmt = Carbon::parse($conflicto->hora_inicio)->format('H:i');
                    $horaFinFmt = Carbon::parse($conflicto->hora_fin)->format('H:i');
                    $nombreOcupante = $conflicto->cliente_nombre ?: ($conflicto->cliente?->name ?: 'un cliente');
                    $tipoTurno = $conflicto->es_fijo ? 'turno fijo' : 'reserva casual';

                    return response()->json([
                        'success' => false,
                        'error' => 'RECURRING_SLOT_CONFLICT',
                        'message' => "Conflicto al renovar en la fecha {$fechaFmt} ({$horaIniFmt} a {$horaFinFmt} hs): ya existe un turno asignado a {$nombreOcupante} ({$tipoTurno}).",
                        'fecha_conflicto' => $f,
                        'conflicto' => [
                            'fecha' => $f,
                            'fecha_formateada' => $fechaFmt,
                            'hora_inicio' => $horaIniFmt,
                            'hora_fin' => $horaFinFmt,
                            'cliente_nombre' => $nombreOcupante,
                            'tipo' => $tipoTurno,
                        ],
                    ], 409);
                }
            }

            $turnosNuevos = [];
            foreach ($fechas as $f) {
                $turnosNuevos[] = Turno::create([
                    'complejo_id' => $complejo->id,
                    'cancha_id' => $canchaId,
                    'cliente_id' => $clienteId,
                    'cliente_nombre' => $clienteNombre,
                    'cliente_telefono' => $clienteTelefono,
                    'fecha' => $f,
                    'hora_inicio' => $horaInicio,
                    'hora_fin' => $horaFin,
                    'precio' => $precio,
                    'monto_pagado' => 0.00,
                    'saldo_pendiente' => $precio,
                    'estado_pago' => 'pendiente',
                    'metodo_pago' => $metodoPago,
                    'estado' => 'reservado',
                    'es_fijo' => true,
                ]);

                $this->reservaLockService->liberarBloqueo($canchaId, $f, $horaInicio);
            }

            return response()->json([
                'success' => true,
                'message' => "Turno fijo renovado exitosamente por {$semanas} semanas más.",
                'cantidad_nuevos' => count($turnosNuevos),
            ]);
        });
    }

    /**
     * Liberar únicamente la fecha puntual de un turno fijo (conserva las demás semanas).
     */
    public function liberarFechaPuntual(Request $request, string $subdomain, int $turnoId): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()->where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos.'], 403);
            }
        }

        $turno = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->find($turnoId);

        if (!$turno) {
            return response()->json(['success' => false, 'message' => 'Turno no encontrado.'], 404);
        }

        $canchaId = $turno->cancha_id;
        $fecha = is_string($turno->fecha) ? $turno->fecha : $turno->fecha->format('Y-m-d');
        $horaInicio = Carbon::parse($turno->hora_inicio)->format('H:i');

        $horaFin = $turno->hora_fin ? Carbon::parse($turno->hora_fin)->format('H:i') : null;
        $turno->delete();

        $this->reservaLockService->liberarBloqueo($canchaId, $fecha, $horaInicio);

        NotificarListaEsperaJob::dispatch(
            $canchaId,
            $fecha,
            $horaInicio,
            $horaFin
        );

        return response()->json([
            'success' => true,
            'message' => 'Fecha puntual liberada exitosamente. El horario vuelve a estar disponible para reservas.',
        ]);
    }

    /**
     * Dar de baja una serie de turnos fijos completa a futuro.
     */
    public function destroySerieTurnoFijo(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()->where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos.'], 403);
            }
        }

        $validated = $request->validate([
            'cancha_id' => 'required|integer',
            'dia_semana' => 'required|integer|between:0,6',
            'hora_inicio' => 'required|string',
            'cliente_id' => 'nullable|integer',
            'cliente_nombre' => 'nullable|string',
        ]);

        $horaInicio = Carbon::parse($validated['hora_inicio'])->format('H:i');
        $hoy = Carbon::today()->format('Y-m-d');

        $query = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('cancha_id', $validated['cancha_id'])
            ->where('hora_inicio', $horaInicio)
            ->where('fecha', '>=', $hoy)
            ->where('es_fijo', true);

        if (!empty($validated['cliente_id'])) {
            $query->where('cliente_id', $validated['cliente_id']);
        } elseif (!empty($validated['cliente_nombre'])) {
            $query->where('cliente_nombre', $validated['cliente_nombre']);
        }

        $count = $query->count();
        $query->delete();

        return response()->json([
            'success' => true,
            'message' => "Serie de turnos fijos dada de baja exitosamente ({$count} fechas futuras canceladas).",
            'turnos_cancelados' => $count,
        ]);
    }

    /**
     * Registrar el pago de un turno (mostrador, transferencia, billetera, online).
     */
    public function registrarPagoTurno(Request $request, string $subdomain, int $turnoId): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()->where('subdominio', $cleanSubdomain)->first();
        if (!$complejo) {
            return response()->json(['success' => false, 'message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum');
        if ($user) {
            $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
            $isAdmin = ($user->role ?? '') === 'admin';
            if (!$isOwner && !$isAdmin) {
                return response()->json(['success' => false, 'message' => 'No tienes permisos.'], 403);
            }
        }

        $turno = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->find($turnoId);

        if (!$turno) {
            return response()->json(['success' => false, 'message' => 'Turno no encontrado.'], 404);
        }

        $validated = $request->validate([
            'metodo_pago' => 'required|string|in:mostrador,transferencia,billetera,online',
            'monto' => 'nullable|numeric|min:0',
            'estado_pago' => 'nullable|string|in:pagado,pagado_total,sena_pagada,senado,pendiente',
        ]);

        $precioTurno = (float) $turno->precio;
        $montoCobrado = isset($validated['monto']) ? (float) $validated['monto'] : $precioTurno;
        $metodoPago = $validated['metodo_pago'];

        $montoPagadoAnterior = (float) ($turno->monto_pagado ?? 0);

        // Si el monto cobrado es igual o mayor al precio total del turno
        if ($montoCobrado >= $precioTurno) {
            $montoPagadoTotal = $montoCobrado;
        } else {
            // Si el cobro es parcial o acumulado
            $montoPagadoTotal = min($precioTurno, $montoPagadoAnterior + $montoCobrado);
        }

        $saldoPendiente = max(0.0, round($precioTurno - $montoPagadoTotal, 2));
        $estadoPago = $validated['estado_pago'] ?? ($saldoPendiente <= 0 ? 'pagado' : 'senado');
        if ($saldoPendiente <= 0 && $estadoPago === 'senado') {
            $estadoPago = 'pagado';
        }

        if ($metodoPago === 'billetera') {
            if (!$turno->cliente_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Para pagar con Billetera Virtual, el turno debe estar asignado a un usuario registrado.',
                ], 422);
            }

            $debitado = $this->walletService->debitar(
                $turno->cliente_id,
                $complejo->id,
                $montoCobrado,
                'pago_turno',
                $turno->id,
                "Pago de turno {$turno->fecha} {$turno->hora_inicio}"
            );

            if (!$debitado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Saldo insuficiente en la billetera virtual del cliente.',
                ], 422);
            }
        }

        $turno->update([
            'metodo_pago' => $metodoPago,
            'monto_pagado' => $montoPagadoTotal,
            'saldo_pendiente' => $saldoPendiente,
            'estado_pago' => $estadoPago,
            'estado' => $estadoPago === 'pagado' ? 'pagado' : 'confirmado',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado exitosamente.',
            'turno_id' => $turno->id,
            'metodo_pago' => $turno->metodo_pago,
            'monto_pagado' => (float) $turno->monto_pagado,
            'saldo_pendiente' => (float) $turno->saldo_pendiente,
            'estado_pago' => $turno->estado_pago,
        ]);
    }

    /**
     * Buscar usuarios registrados en la base de datos para autocompletar titulares de turnos.
     */
    public function buscarUsuarios(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json(['message' => 'Complejo no encontrado.'], 404);
        }

        $user = $request->user('sanctum') ?? $request->user();
        if (!$user || ($complejo->user_id !== $user->id && $user->email !== 'admin@admin.com')) {
            return response()->json(['message' => 'No autorizado para gestionar este club.'], 403);
        }

        $q = trim($request->query('q', ''));

        $query = User::select('id', 'name', 'email', 'telefono');

        if (!empty($q)) {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('telefono', 'like', "%{$q}%");
            });
        }

        $usuarios = $query->orderBy('name', 'asc')->limit(20)->get();

        return response()->json([
            'success' => true,
            'data' => $usuarios,
        ]);
    }

    /**
     * Obtener el resumen diario y métricas financieras de turnos para el panel del club.
     */
    public function resumenDiario(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $user = $request->user('sanctum');
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
            ], 401);
        }

        $isAdmin = ($complejo->user_id && $complejo->user_id === $user->id) || ($user->role ?? '') === 'admin' || $user->email === 'admin@admin.com';
        if (!$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos de administrador para este club.',
            ], 403);
        }

        $fechaDesde = $request->query('fecha_desde');
        $fechaHasta = $request->query('fecha_hasta');
        $canchaId = $request->query('cancha_id') ? (int) $request->query('cancha_id') : null;

        $resumen = $this->reporteService->obtenerResumenDiario(
            $complejo,
            $fechaDesde,
            $fechaHasta,
            $canchaId
        );

        return response()->json([
            'success' => true,
            'data' => $resumen,
        ]);
    }
}

