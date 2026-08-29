<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GeolocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplejoController extends Controller
{
    public function __construct(
        protected GeolocationService $geolocationService
    ) {}

    /**
     * Endpoint para buscar complejos deportivos cercanos a una ubicación GPS.
     * GET /api/complejos/cercanos?lat=-34.6037&lng=-58.3816&radio_km=15&deporte=padel
     */
    public function cercanos(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radio_km' => 'nullable|numeric|min:0.5|max:500',
            'deporte' => 'nullable|string',
        ]);

        $lat = (float) $validated['lat'];
        $lng = (float) $validated['lng'];
        $radioKm = isset($validated['radio_km']) ? (float) $validated['radio_km'] : 20.0;
        $deporte = $validated['deporte'] ?? null;

        $complejos = $this->geolocationService->buscarComplejosCercanos(
            $lat,
            $lng,
            $radioKm,
            $deporte
        );

        return response()->json([
            'data' => $complejos,
            'total' => $complejos->count(),
            'lat_origen' => $lat,
            'lng_origen' => $lng,
            'radio_km' => $radioKm,
        ]);
    }

    /**
     * Endpoint para registrar o actualizar el token FCM del usuario autenticado.
     * POST /api/auth/fcm-token
     */
    public function updateFcmToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fcm_token' => 'required|string',
        ]);

        $user = $request->user();
        $user->update([
            'fcm_token' => $validated['fcm_token'],
        ]);

        return response()->json([
            'message' => 'Token FCM actualizado correctamente',
            'fcm_token' => $user->fcm_token,
        ]);
    }
}
