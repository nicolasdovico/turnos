<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use App\Models\User;
use App\Services\ReservaLockService;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClubDashboardController extends Controller
{
    public function __construct(
        protected ReservaLockService $reservaLockService,
        protected WalletService $walletService
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
     * Cancelar o liberar un turno por parte del administrador.
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
            ->where('complejo_id', $complejo->id)
            ->where('id', $turnoId)
            ->first();

        if (!$turno) {
            return response()->json([
                'success' => false,
                'message' => 'Turno no encontrado.',
            ], 404);
        }

        $turno->update(['estado' => 'cancelado']);

        return response()->json([
            'success' => true,
            'message' => 'Turno liberado y cancelado exitosamente.',
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

        return response()->json([
            'success' => true,
            'message' => 'Políticas y configuración del club actualizadas exitosamente.',
            'complejo' => [
                'id' => $complejo->id,
                'nombre' => $complejo->nombre,
                'subdominio' => $complejo->subdominio,
                'tipo_cobro_reserva' => $complejo->tipo_cobro_reserva ?? 'sena',
                'porcentaje_sena' => (float) ($complejo->porcentaje_sena ?? 50.00),
                'monto_sena_fijo' => $complejo->monto_sena_fijo ? (float) $complejo->monto_sena_fijo : null,
                'horas_limite_cancelacion' => (int) ($complejo->horas_limite_cancelacion ?? 4),
                'permite_mostrador_publico' => (bool) ($complejo->permite_mostrador_publico ?? true),
                'telefono' => $complejo->telefono,
                'ciudad' => $complejo->ciudad,
                'direccion' => $complejo->direccion,
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

        if (!empty($validated['hora_fin'])) {
            $horaFin = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horario = HorarioAtencion::where('complejo_id', $complejo->id)
                ->where('dia_semana', $targetDiaSemana)
                ->first();
            $duracion = $cancha->duracion_minutos ?: ($horario?->duracion_turno_minutos ?: 60);
            $horaFin = Carbon::parse($startDate->format('Y-m-d') . ' ' . $horaInicio)
                ->addMinutes($duracion)
                ->format('H:i');
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
            // Comprobación de conflictos
            foreach ($fechas as $f) {
                $conflicto = Turno::withoutGlobalScopes()
                    ->where('cancha_id', $cancha->id)
                    ->where('fecha', $f)
                    ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
                    ->where('hora_inicio', '<', $horaFin)
                    ->where('hora_fin', '>', $horaInicio)
                    ->lockForUpdate()
                    ->first();

                if ($conflicto) {
                    return response()->json([
                        'success' => false,
                        'error' => 'RECURRING_SLOT_CONFLICT',
                        'message' => "Conflicto en la fecha {$f} {$horaInicio}: el horario ya se encuentra ocupado.",
                        'fecha_conflicto' => $f,
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
                    $turno->update([
                        'complejo_id' => $complejo->id,
                        'cliente_id' => $clienteId,
                        'cliente_nombre' => $clienteNombre,
                        'cliente_telefono' => $clienteTelefono,
                        'hora_fin' => $horaFin,
                        'precio' => $precio,
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
                    ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
                    ->where('hora_inicio', '<', $horaFin)
                    ->where('hora_fin', '>', $horaInicio)
                    ->lockForUpdate()
                    ->first();

                if ($conflicto) {
                    return response()->json([
                        'success' => false,
                        'error' => 'RECURRING_SLOT_CONFLICT',
                        'message' => "Conflicto en la fecha {$f} {$horaInicio}: el horario ya se encuentra ocupado.",
                        'fecha_conflicto' => $f,
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

        $turno->delete();

        $this->reservaLockService->liberarBloqueo($canchaId, $fecha, $horaInicio);

        try {
            \App\Models\ListaEspera::where('cancha_id', $canchaId)
                ->where('fecha', $fecha)
                ->where('hora_inicio', $horaInicio)
                ->where('notificado', false)
                ->update(['notificado' => true]);
        } catch (\Throwable $e) {}

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
            'estado_pago' => 'nullable|string|in:pagado,sena_pagada,pendiente',
        ]);

        $monto = isset($validated['monto']) ? (float) $validated['monto'] : (float) $turno->precio;
        $metodoPago = $validated['metodo_pago'];
        $estadoPago = $validated['estado_pago'] ?? 'pagado';

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
                $monto,
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
            'monto_pagado' => $monto,
            'saldo_pendiente' => max(0, (float) $turno->precio - $monto),
            'estado_pago' => $estadoPago,
            'estado' => 'confirmado',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado exitosamente.',
            'turno_id' => $turno->id,
            'metodo_pago' => $turno->metodo_pago,
            'monto_pagado' => (float) $turno->monto_pagado,
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
}

