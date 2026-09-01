<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Turno;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubDashboardController extends Controller
{
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
}
