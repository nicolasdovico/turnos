<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CajaSesion;
use App\Services\CajaService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CajaController extends Controller
{
    public function __construct(
        protected CajaService $cajaService
    ) {}

    /**
     * Open a new cash register shift session.
     */
    public function apertura(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'monto_apertura' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $usuarioId = auth()->id() ?? $request->input('usuario_id', 1);
            $sesion = $this->cajaService->abrirCaja($usuarioId, (float) $validated['monto_apertura']);

            return response()->json([
                'success' => true,
                'message' => 'Sesión de caja abierta exitosamente.',
                'data' => $sesion,
            ], 201);
        } catch (DomainException $e) {
            return response()->json([
                'error' => 'CAJA_ALREADY_OPEN',
                'message' => $e->getMessage(),
            ], 409);
        }
    }

    /**
     * Close cash register session with blind count (arqueo ciego).
     */
    public function cierre(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'caja_sesion_id' => ['nullable', 'integer', 'exists:cajas_sesiones,id'],
            'monto_cierre_declarado' => ['required', 'numeric', 'min:0'],
            'notas_cierre' => ['nullable', 'string'],
        ]);

        $sesionId = $validated['caja_sesion_id'] ?? null;
        if (!$sesionId) {
            $sesionAbierta = CajaSesion::where('estado', 'abierta')->first();
            if (!$sesionAbierta) {
                return response()->json([
                    'error' => 'NO_OPEN_SESSION',
                    'message' => 'No hay ninguna sesión de caja abierta para cerrar.',
                ], 404);
            }
            $sesionId = $sesionAbierta->id;
        }

        try {
            $sesion = $this->cajaService->cerrarCaja(
                $sesionId,
                (float) $validated['monto_cierre_declarado'],
                $validated['notas_cierre'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Sesión de caja cerrada y arqueo completado exitosamente.',
                'data' => $sesion,
            ], 200);
        } catch (DomainException $e) {
            return response()->json([
                'error' => 'CAJA_CLOSE_ERROR',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get daily cash summary report.
     */
    public function resumenDiario(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $resumen = $this->cajaService->obtenerResumenDiario($validated['fecha'] ?? null);

        return response()->json([
            'success' => true,
            'data' => $resumen,
        ], 200);
    }
}
