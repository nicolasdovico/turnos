<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Services\DisponibilidadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DisponibilidadController extends Controller
{
    public function __construct(
        protected DisponibilidadService $disponibilidadService
    ) {}

    /**
     * Get available slots for a specific court and date.
     */
    public function __invoke(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'fecha' => ['required', 'date_format:Y-m-d'],
            'duracion' => ['nullable', 'integer', 'in:30,60,90,120'],
        ]);

        $cancha = Cancha::find($id);
        if (!$cancha) {
            return response()->json([
                'error' => 'CANCHA_NOT_FOUND',
                'message' => 'La cancha especificada no fue encontrada en este complejo.',
            ], 404);
        }

        $duracion = isset($validated['duracion']) ? (int) $validated['duracion'] : null;

        $esAdmin = false;
        $user = auth('sanctum')->user() ?: (auth()->user() ?: $request->user());
        if (!$user && $request->bearerToken()) {
            $user = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable;
        }

        if ($user) {
            $complejo = \App\Models\Complejo::withoutGlobalScopes()->find($cancha->complejo_id);
            if ($complejo && ($user->id === $complejo->user_id || ($user->role ?? '') === 'admin' || !empty($user->is_admin))) {
                $esAdmin = true;
            }
        }

        $disponibilidad = $this->disponibilidadService->obtenerDisponibilidadCompleta($id, $validated['fecha'], $duracion, $esAdmin);
        $slots = $disponibilidad['slots'];
        $turnosOcupados = $disponibilidad['turnos_ocupados'];
        $turnosRetenidos = $disponibilidad['turnos_retenidos'] ?? [];
        $antiBaches = $disponibilidad['optimizacion_anti_baches'];
        $complejoCerrado = (bool) ($disponibilidad['complejo_cerrado'] ?? false);

        return response()->json([
            'cancha_id' => $id,
            'cancha_nombre' => $cancha->nombre,
            'fecha' => $validated['fecha'],
            'complejo_cerrado' => $complejoCerrado,
            'duracion_minutos' => $duracion ?: ($cancha->duracion_minutos ?: 60),
            'permite_duracion_flexible' => (bool) $cancha->permite_duracion_flexible,
            'anti_baches_activo' => (bool) ($cancha->anti_baches_activo ?? true),
            'duraciones_permitidas' => $cancha->duraciones_permitidas ?: [60, 90, 120],
            'precio_base' => (float) $cancha->precio_base,
            'precio_90_min' => $cancha->precio_90_min !== null ? (float) $cancha->precio_90_min : round((float) $cancha->precio_base * 1.5, 2),
            'precio_120_min' => $cancha->precio_120_min !== null ? (float) $cancha->precio_120_min : round((float) $cancha->precio_base * 2.0, 2),
            'slots_disponibles' => $slots,
            'turnos_ocupados' => $turnosOcupados,
            'turnos_retenidos' => $turnosRetenidos,
            'optimizacion_anti_baches' => $antiBaches,
            'is_admin' => $esAdmin,
            'data' => [
                'slots' => $slots,
                'complejo_cerrado' => $complejoCerrado,
                'turnos_ocupados' => $turnosOcupados,
                'turnos_retenidos' => $turnosRetenidos,
                'duracion_minutos' => $duracion ?: ($cancha->duracion_minutos ?: 60),
                'permite_duracion_flexible' => (bool) $cancha->permite_duracion_flexible,
                'optimizacion_anti_baches' => $antiBaches,
                'is_admin' => $esAdmin,
            ],
        ]);
    }
}
