<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\ListaEspera;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListaEsperaController extends Controller
{
    public function suscribir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancha_id' => ['required', 'integer', 'exists:canchas,id'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'string'],
            'hora_fin' => ['nullable', 'string'],
        ]);

        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Debes iniciar sesión para suscribirte a la lista de espera.',
            ], 401);
        }

        $cancha = Cancha::with('complejo')->find($validated['cancha_id']);
        $horaInicioFormatted = Carbon::parse($validated['hora_inicio'])->format('H:i');
        $horaFinFormatted = !empty($validated['hora_fin']) ? Carbon::parse($validated['hora_fin'])->format('H:i') : Carbon::parse($horaInicioFormatted)->addHour()->format('H:i');

        $suscripcion = ListaEspera::updateOrCreate(
            [
                'complejo_id' => $cancha->complejo_id,
                'cancha_id' => $cancha->id,
                'fecha' => $validated['fecha'],
                'hora_inicio' => $horaInicioFormatted,
                'user_id' => $user->id,
            ],
            [
                'hora_fin' => $horaFinFormatted,
                'notificado' => false,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => "¡Listo! Te avisaremos de inmediato si se libera el turno de las {$horaInicioFormatted} hs en {$cancha->nombre}.",
            'suscripcion' => $suscripcion,
        ], 200);
    }

    public function desuscribir(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancha_id' => ['required', 'integer'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'string'],
        ]);

        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Debes iniciar sesión.',
            ], 401);
        }

        $horaInicioFormatted = Carbon::parse($validated['hora_inicio'])->format('H:i');

        ListaEspera::where('cancha_id', $validated['cancha_id'])
            ->where('fecha', $validated['fecha'])
            ->where('hora_inicio', $horaInicioFormatted)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Te has desuscrito de la lista de espera.',
        ], 200);
    }

    public function misSuscripciones(Request $request): JsonResponse
    {
        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Debes iniciar sesión.',
            ], 401);
        }

        $suscripciones = ListaEspera::where('user_id', $user->id)
            ->with(['cancha', 'complejo'])
            ->orderBy('fecha', 'asc')
            ->orderBy('hora_inicio', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'suscripciones' => $suscripciones,
        ], 200);
    }
}
