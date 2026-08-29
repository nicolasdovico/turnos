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
        $disponibilidad = $this->disponibilidadService->obtenerDisponibilidadCompleta($id, $validated['fecha'], $duracion);
        $slots = $disponibilidad['slots'];
        $antiBaches = $disponibilidad['optimizacion_anti_baches'];

        return response()->json([
            'cancha_id' => $id,
            'cancha_nombre' => $cancha->nombre,
            'fecha' => $validated['fecha'],
            'duracion_minutos' => $duracion ?: ($cancha->duracion_minutos ?: 60),
            'permite_duracion_flexible' => (bool) $cancha->permite_duracion_flexible,
            'anti_baches_activo' => (bool) ($cancha->anti_baches_activo ?? true),
            'duraciones_permitidas' => $cancha->duraciones_permitidas ?: [60, 90, 120],
            'precio_base' => (float) $cancha->precio_base,
            'precio_90_min' => $cancha->precio_90_min !== null ? (float) $cancha->precio_90_min : round((float) $cancha->precio_base * 1.5, 2),
            'precio_120_min' => $cancha->precio_120_min !== null ? (float) $cancha->precio_120_min : round((float) $cancha->precio_base * 2.0, 2),
            'slots_disponibles' => $slots,
            'optimizacion_anti_baches' => $antiBaches,
            'data' => [
                'slots' => $slots,
                'duracion_minutos' => $duracion ?: ($cancha->duracion_minutos ?: 60),
                'permite_duracion_flexible' => (bool) $cancha->permite_duracion_flexible,
                'optimizacion_anti_baches' => $antiBaches,
            ],
        ]);
    }
}
