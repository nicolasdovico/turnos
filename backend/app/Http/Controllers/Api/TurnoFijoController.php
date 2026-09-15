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
            'duracion_minutos' => ['nullable', 'integer', 'in:60,90,120'],
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

        $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
            ->where('dia_semana', $targetDiaSemana)
            ->first();

        $nombresDias = [0 => 'Domingo', 1 => 'Lunes', 2 => 'Martes', 3 => 'Miércoles', 4 => 'Jueves', 5 => 'Viernes', 6 => 'Sábado'];
        $nombreDia = $nombresDias[$targetDiaSemana] ?? "Día {$targetDiaSemana}";

        if (!$horario) {
            return response()->json([
                'error' => 'COMPLEJO_CERRADO',
                'message' => "El club se encuentra cerrado los días {$nombreDia}. No es posible asignar turnos fijos.",
            ], 422);
        }

        if (!empty($validated['duracion_minutos'])) {
            $duracion = (int) $validated['duracion_minutos'];
        } elseif ($cancha->permite_duracion_flexible && !empty($validated['hora_fin'])) {
            $iniMin = Carbon::parse($horaInicioNormalizada)->hour * 60 + Carbon::parse($horaInicioNormalizada)->minute;
            $finMin = Carbon::parse($validated['hora_fin'])->hour * 60 + Carbon::parse($validated['hora_fin'])->minute;
            $duracion = $finMin > $iniMin ? ($finMin - $iniMin) : ($cancha->duracion_minutos ?: 60);
        } else {
            $duracion = $cancha->duracion_minutos ?: ($horario->duracion_turno_minutos ?: 60);
        }

        // Calculate hora_fin if omitted
        if (!empty($validated['hora_fin'])) {
            $horaFinNormalizada = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horaFinNormalizada = Carbon::parse($startDate->format('Y-m-d') . ' ' . $horaInicioNormalizada)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        $horaAperturaFmt = Carbon::parse($horario->hora_apertura)->format('H:i');
        $horaCierreFmt = Carbon::parse($horario->hora_cierre)->format('H:i');

        if ($horaInicioNormalizada < $horaAperturaFmt || $horaFinNormalizada > $horaCierreFmt || $horaInicioNormalizada >= $horaFinNormalizada) {
            return response()->json([
                'error' => 'FUERA_DE_HORARIO',
                'message' => "El horario seleccionado ({$horaInicioNormalizada} a {$horaFinNormalizada} hs) está fuera del horario de atención del club para los días {$nombreDia} ({$horaAperturaFmt} a {$horaCierreFmt} hs).",
            ], 422);
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
                    $conflicto = Turno::withoutGlobalScopes()
                        ->where('cancha_id', $cancha->id)
                        ->where('fecha', $fecha)
                        ->whereNotIn('estado', ['cancelado', 'disponible'])
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
                        $montoPagadoActual = (float) ($existingTurno->monto_pagado ?? 0);
                        $saldoPendienteCalculado = max(0.0, round($precio - $montoPagadoActual, 2));
                        $existingTurno->update([
                            'cliente_id' => $clienteId,
                            'hora_fin' => $horaFinNormalizada,
                            'precio' => $precio,
                            'monto_pagado' => $montoPagadoActual,
                            'saldo_pendiente' => $saldoPendienteCalculado,
                            'estado_pago' => $saldoPendienteCalculado <= 0 && $montoPagadoActual > 0 ? 'pagado_total' : ($montoPagadoActual > 0 ? 'senado' : 'pendiente'),
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
                            'monto_pagado' => 0.00,
                            'saldo_pendiente' => $precio,
                            'estado_pago' => 'pendiente',
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
