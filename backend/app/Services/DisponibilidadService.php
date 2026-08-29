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
     * Calculate available slots for a given cancha and date, taking into account court duration and pricing.
     */
    public function obtenerSlotsDisponibles(int $canchaId, string $fecha, ?int $duracionSolicitada = null): array
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

        // Determine effective duration
        if ($duracionSolicitada && in_array($duracionSolicitada, [30, 60, 90, 120], true)) {
            $duracionMinutos = $duracionSolicitada;
        } else {
            $duracionMinutos = $cancha->duracion_minutos ?: ($horario->duracion_turno_minutos ?: 60);
        }

        // Calculate price for this duration
        if ($duracionMinutos === 90) {
            $precio = $cancha->precio_90_min !== null
                ? (float) $cancha->precio_90_min
                : round((float) $cancha->precio_base * 1.5, 2);
        } elseif ($duracionMinutos === 120) {
            $precio = $cancha->precio_120_min !== null
                ? (float) $cancha->precio_120_min
                : round((float) $cancha->precio_base * 2.0, 2);
        } elseif ($duracionMinutos === 30) {
            $precio = round((float) $cancha->precio_base * 0.5, 2);
        } else {
            $precio = (float) $cancha->precio_base;
        }

        $horaApertura = Carbon::parse($fecha . ' ' . $horario->hora_apertura);
        $horaCierre = Carbon::parse($fecha . ' ' . $horario->hora_cierre);

        // Fetch non-available turnos in database (reservado, bloqueado)
        $turnosOcupados = Turno::where('cancha_id', $canchaId)
            ->where('fecha', $fechaCarbon->format('Y-m-d'))
            ->whereIn('estado', ['reservado', 'bloqueado'])
            ->get();

        $slotsDisponibles = [];
        $currentSlotStart = $horaApertura->copy();

        // Step size: if flexible, step by 30 min (for 90 min) or 60 min; if fixed, step by exact duration
        $stepMinutos = $cancha->permite_duracion_flexible ? 60 : $duracionMinutos;

        while ($currentSlotStart->copy()->addMinutes($duracionMinutos)->lessThanOrEqualTo($horaCierre)) {
            $slotEnd = $currentSlotStart->copy()->addMinutes($duracionMinutos);
            $horaInicioFormatted = $currentSlotStart->format('H:i');
            $horaFinFormatted = $slotEnd->format('H:i');

            // 1. Check if overlaps with any occupied turno in DB
            $startTs = $currentSlotStart->timestamp;
            $endTs = $slotEnd->timestamp;

            $estaOcupadoEnDb = $turnosOcupados->contains(function ($t) use ($fecha, $startTs, $endTs) {
                $tInicio = Carbon::parse($fecha . ' ' . $t->hora_inicio)->timestamp;
                $tFin = Carbon::parse($fecha . ' ' . $t->hora_fin)->timestamp;
                return $tInicio < $endTs && $tFin > $startTs;
            });

            // 2. Check if locked in Redis (atomic lock with TTL during checkout)
            $lockKeyLegacy = self::getLockKey($canchaId, $fechaCarbon->format('Y-m-d'), $horaInicioFormatted);
            $lockKeyStandard = ReservaLockService::getLockKey($canchaId, $fechaCarbon->format('Y-m-d'), $horaInicioFormatted);
            $estaBloqueadoEnRedis = (bool) Redis::get($lockKeyLegacy) || (bool) Redis::get($lockKeyStandard);

            if (!$estaOcupadoEnDb && !$estaBloqueadoEnRedis) {
                $slotsDisponibles[] = [
                    'cancha_id' => $canchaId,
                    'fecha' => $fechaCarbon->format('Y-m-d'),
                    'hora_inicio' => $horaInicioFormatted,
                    'hora_fin' => $horaFinFormatted,
                    'duracion_minutos' => $duracionMinutos,
                    'precio' => $precio,
                    'estado' => 'disponible',
                ];
            }

            $currentSlotStart->addMinutes($stepMinutos);
        }

        return $slotsDisponibles;
    }
}
