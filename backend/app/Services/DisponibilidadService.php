<?php

namespace App\Services;

use App\Models\Cancha;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;

class DisponibilidadService
{
    /**
     * Generate the Redis lock key for a specific slot.
     */
    public static function getLockKey(int $canchaId, string $fecha, string $horaInicio): string
    {
        $horaNormalizada = Carbon::parse($horaInicio)->format('H:i');
        return "lock:cancha:{$canchaId}:{$fecha}:{$horaNormalizada}";
    }

    /**
     * Calculate available slots for a given cancha and date.
     */
    public function obtenerSlotsDisponibles(int $canchaId, string $fecha): array
    {
        $cancha = Cancha::find($canchaId);
        if (!$cancha || $cancha->estado !== 'activo') {
            return [];
        }

        $fechaCarbon = Carbon::parse($fecha);
        $diaSemana = $fechaCarbon->dayOfWeek; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

        $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
            ->where('dia_semana', $diaSemana)
            ->first();

        if (!$horario) {
            return [];
        }

        $duracionMinutos = $horario->duracion_turno_minutos ?: 60;
        $horaApertura = Carbon::parse($fecha . ' ' . $horario->hora_apertura);
        $horaCierre = Carbon::parse($fecha . ' ' . $horario->hora_cierre);

        // Fetch non-available turnos in database (reservado, bloqueado)
        $turnosOcupados = Turno::where('cancha_id', $canchaId)
            ->where('fecha', $fechaCarbon->format('Y-m-d'))
            ->whereIn('estado', ['reservado', 'bloqueado'])
            ->get()
            ->keyBy(fn ($t) => Carbon::parse($t->hora_inicio)->format('H:i'));

        $slotsDisponibles = [];
        $currentSlotStart = $horaApertura->copy();

        while ($currentSlotStart->copy()->addMinutes($duracionMinutos)->lessThanOrEqualTo($horaCierre)) {
            $slotEnd = $currentSlotStart->copy()->addMinutes($duracionMinutos);
            $horaInicioFormatted = $currentSlotStart->format('H:i');
            $horaFinFormatted = $slotEnd->format('H:i');

            // 1. Check if occupied in DB
            $estaOcupadoEnDb = $turnosOcupados->has($horaInicioFormatted);

            // 2. Check if locked in Redis (atomic lock with TTL during checkout)
            $lockKey = self::getLockKey($canchaId, $fechaCarbon->format('Y-m-d'), $horaInicioFormatted);
            $estaBloqueadoEnRedis = (bool) Redis::get($lockKey);

            if (!$estaOcupadoEnDb && !$estaBloqueadoEnRedis) {
                $slotsDisponibles[] = [
                    'cancha_id' => $canchaId,
                    'fecha' => $fechaCarbon->format('Y-m-d'),
                    'hora_inicio' => $horaInicioFormatted,
                    'hora_fin' => $horaFinFormatted,
                    'precio' => (float) $cancha->precio_base,
                    'estado' => 'disponible',
                ];
            }

            $currentSlotStart->addMinutes($duracionMinutos);
        }

        return $slotsDisponibles;
    }
}
