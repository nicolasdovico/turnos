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
     * Obtener métricas, canchas, horarios y configuración para el panel del club.
     */
    public function show(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->with(['plan.modulos', 'canchas', 'horariosAtencion', 'owner'])
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
                    'deporte_principal' => $complejo->deporte_principal ?? 'padel',
                    'telefono' => $complejo->telefono,
                    'ciudad' => $complejo->ciudad,
                    'direccion' => $complejo->direccion,
                    'estado' => $complejo->estado,
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
     * Crear una nueva cancha para el club.
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
            'techada' => 'boolean',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => $validated['nombre'],
            'deporte' => $validated['deporte'] ?? ($complejo->deporte_principal ?? 'padel'),
            'superficie' => $validated['superficie'] ?? 'cristal',
            'precio_base' => $validated['precio_base'],
            'techada' => $validated['techada'] ?? false,
            'estado' => 'activo',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cancha creada exitosamente.',
            'cancha' => $cancha,
        ], 201);
    }
}
