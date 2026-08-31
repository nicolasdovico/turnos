<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use App\Services\ReservaLockService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TurnoFijoController extends Controller
{
    public function __construct(
        protected ReservaLockService $reservaLockService
    ) {}

    /**
     * Generate recurring fixed turnos for N upcoming weeks.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancha_id' => ['required', 'integer'],
            'cliente_id' => ['required', 'integer', 'exists:users,id'],
            'dia_semana' => ['required', 'integer', 'between:0,6'],
            'fecha_inicio' => ['nullable', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'string'],
            'hora_fin' => ['nullable', 'string'],
            'semanas' => ['nullable', 'integer', 'min:1', 'max:52'],
            'precio' => ['nullable', 'numeric', 'min:0'],
        ]);

        $cancha = Cancha::find($validated['cancha_id']);
        if (!$cancha) {
            return response()->json([
                'error' => 'CANCHA_NOT_FOUND',
                'message' => 'La cancha especificada no fue encontrada en este complejo.',
            ], 404);
        }

        $semanas = $validated['semanas'] ?? 4;
        $horaInicioNormalizada = Carbon::parse($validated['hora_inicio'])->format('H:i');
        $targetDiaSemana = (int) $validated['dia_semana'];

        // Determine starting date on target weekday
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

        // Calculate hora_fin if omitted
        if (!empty($validated['hora_fin'])) {
            $horaFinNormalizada = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
                ->where('dia_semana', $targetDiaSemana)
                ->first();
            $duracion = $horario?->duracion_turno_minutos ?: 60;
            $horaFinNormalizada = Carbon::parse($startDate->format('Y-m-d') . ' ' . $horaInicioNormalizada)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        $precio = $validated['precio'] ?? (float) $cancha->precio_base;
        $clienteId = $validated['cliente_id'];

        // Build list of dates for the recurring series
        $fechas = [];
        $currentDate = $startDate->copy();
        for ($i = 0; $i < $semanas; $i++) {
            $fechas[] = $currentDate->format('Y-m-d');
            $currentDate->addWeek();
        }

        try {
            $result = DB::transaction(function () use (
                $cancha,
                $fechas,
                $horaInicioNormalizada,
                $horaFinNormalizada,
                $clienteId,
                $precio
            ) {
                // Pass 1: Verify no conflicts exist across all requested weeks
                foreach ($fechas as $fecha) {
                    $conflicto = Turno::where('cancha_id', $cancha->id)
                        ->where('fecha', $fecha)
                        ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
                        ->where('hora_inicio', '<', $horaFinNormalizada)
                        ->where('hora_fin', '>', $horaInicioNormalizada)
                        ->lockForUpdate()
                        ->first();

                    if ($conflicto) {
                        return [
                            'conflict' => true,
                            'fecha_conflicto' => $fecha,
                        ];
                    }
                }

                // Pass 2: Create or update all recurring slots
                $turnosCreados = [];
                foreach ($fechas as $fecha) {
                    $existingTurno = Turno::where('cancha_id', $cancha->id)
                        ->where('fecha', $fecha)
                        ->where('hora_inicio', $horaInicioNormalizada)
                        ->lockForUpdate()
                        ->first();

                    if ($existingTurno) {
                        $existingTurno->update([
                            'cliente_id' => $clienteId,
                            'hora_fin' => $horaFinNormalizada,
                            'precio' => $precio,
                            'estado' => 'reservado',
                            'es_fijo' => true,
                        ]);
                        $turnosCreados[] = $existingTurno;
                    } else {
                        $turnosCreados[] = Turno::create([
                            'complejo_id' => $cancha->complejo_id,
                            'cancha_id' => $cancha->id,
                            'cliente_id' => $clienteId,
                            'fecha' => $fecha,
                            'hora_inicio' => $horaInicioNormalizada,
                            'hora_fin' => $horaFinNormalizada,
                            'precio' => $precio,
                            'estado' => 'reservado',
                            'es_fijo' => true,
                        ]);
                    }

                    // Release any active Redis lock for this slot
                    $this->reservaLockService->liberarBloqueo(
                        $cancha->id,
                        $fecha,
                        $horaInicioNormalizada
                    );
                }

                return [
                    'conflict' => false,
                    'turnos' => $turnosCreados,
                ];
            });

            if ($result['conflict']) {
                return response()->json([
                    'error' => 'RECURRING_SLOT_CONFLICT',
                    'message' => "Conflicto en la fecha {$result['fecha_conflicto']} {$horaInicioNormalizada}: el turno ya está ocupado.",
                    'fecha_conflicto' => $result['fecha_conflicto'],
                ], 409);
            }

            return response()->json([
                'success' => true,
                'message' => 'Turnos fijos generados exitosamente.',
                'cantidad' => count($result['turnos']),
                'turnos' => $result['turnos'],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'RECURRING_CREATION_ERROR',
                'message' => 'Error al generar turnos fijos: ' . $e->getMessage(),
            ], 500);
        }
    }
}
