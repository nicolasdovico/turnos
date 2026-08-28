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
        ]);

        $cancha = Cancha::find($id);
        if (!$cancha) {
            return response()->json([
                'error' => 'CANCHA_NOT_FOUND',
                'message' => 'La cancha especificada no fue encontrada en este complejo.',
            ], 404);
        }

        $slots = $this->disponibilidadService->obtenerSlotsDisponibles($id, $validated['fecha']);

        return response()->json([
            'cancha_id' => $id,
            'cancha_nombre' => $cancha->nombre,
            'fecha' => $validated['fecha'],
            'slots_disponibles' => $slots,
        ]);
    }
}
