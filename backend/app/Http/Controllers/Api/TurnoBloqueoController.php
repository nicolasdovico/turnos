<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Services\ReservaLockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TurnoBloqueoController extends Controller
{
    public function __construct(
        protected ReservaLockService $reservaLockService
    ) {}

    /**
     * Handle temporary atomic locking of a court slot.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancha_id' => ['required', 'integer'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'string'],
        ]);

        $cancha = Cancha::find($validated['cancha_id']);
        if (!$cancha) {
            return response()->json([
                'error' => 'CANCHA_NOT_FOUND',
                'message' => 'La cancha especificada no fue encontrada en este complejo.',
            ], 404);
        }

        $slotStartDateTime = \Carbon\Carbon::parse($validated['fecha'] . ' ' . $validated['hora_inicio']);
        if ($slotStartDateTime->isPast()) {
            return response()->json([
                'error' => 'PAST_SLOT_NOT_ALLOWED',
                'message' => 'No es posible reservar o bloquear un horario que ya ha pasado.',
            ], 422);
        }

        $userId = auth()->id() ?? $request->input('user_id') ?? 'guest_' . Str::random(10);

        $tokenReserva = $this->reservaLockService->adquirirBloqueo(
            $validated['cancha_id'],
            $validated['fecha'],
            $validated['hora_inicio'],
            $userId,
            ReservaLockService::DEFAULT_TTL_SECONDS
        );

        if (!$tokenReserva) {
            return response()->json([
                'error' => 'TURNO_ALREADY_LOCKED',
                'message' => 'El turno seleccionado ya no está disponible o se encuentra retenido por otro usuario.',
            ], 409);
        }

        return response()->json([
            'success' => true,
            'message' => 'Turno bloqueado temporalmente para checkout.',
            'token_reserva' => $tokenReserva,
            'expira_en_segundos' => ReservaLockService::DEFAULT_TTL_SECONDS,
            'cancha_id' => $validated['cancha_id'],
            'fecha' => $validated['fecha'],
            'hora_inicio' => $validated['hora_inicio'],
        ], 200);
    }
}
