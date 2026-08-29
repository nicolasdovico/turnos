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
     * Calculate available slots for a given cancha and date, taking into account court duration, pricing and anti-bache optimization.
     */
    public function obtenerSlotsDisponibles(int $canchaId, string $fecha, ?int $duracionSolicitada = null): array
    {
        return $this->obtenerDisponibilidadCompleta($canchaId, $fecha, $duracionSolicitada)['slots'];
    }

    /**
     * Calculate full availability along with anti-bache audit details for club administrators.
     */
    public function obtenerDisponibilidadCompleta(int $canchaId, string $fecha, ?int $duracionSolicitada = null): array
    {
        $cancha = Cancha::find($canchaId);
        if (!$cancha || $cancha->estado !== 'activo') {
            return [
                'slots' => [],
                'optimizacion_anti_baches' => [
                    'activa' => false,
                    'total_horarios_protegidos' => 0,
                    'horarios_protegidos' => [],
                ],
            ];
        }

        $fechaCarbon = Carbon::parse($fecha);
        $diaSemana = $fechaCarbon->dayOfWeek; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

        $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
            ->where('dia_semana', $diaSemana)
            ->first();

        if (!$horario) {
            return [
                'slots' => [],
                'optimizacion_anti_baches' => [
                    'activa' => false,
                    'total_horarios_protegidos' => 0,
                    'horarios_protegidos' => [],
                ],
            ];
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

        // Fetch non-available turnos in database (reservado, bloqueado, confirmado, etc.)
        $turnosOcupados = Turno::where('cancha_id', $canchaId)
            ->where('fecha', $fechaCarbon->format('Y-m-d'))
            ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
            ->get();

        $slotsDisponibles = [];
        $horariosProtegidos = [];
        $currentSlotStart = $horaApertura->copy();

        // Step size: if flexible, step by 30 min (for 90 min) or 60 min; if fixed, step by exact duration
        $stepMinutos = $cancha->permite_duracion_flexible ? 30 : $duracionMinutos;
        $antiBachesActivo = $cancha->anti_baches_activo ?? true;

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
                // 3. Regla Anti-Baches (Gap Prevention): Verificar si este turno deja un hueco huérfano < 60 min
                $dejaBache = false;
                $motivoBache = null;

                if ($cancha->permite_duracion_flexible && $antiBachesActivo && $turnosOcupados->isNotEmpty()) {
                    // Espacio hacia el próximo turno ocupado o cierre
                    $proximoTurnoTs = $horaCierre->timestamp;
                    foreach ($turnosOcupados as $t) {
                        $tInicio = Carbon::parse($fecha . ' ' . $t->hora_inicio)->timestamp;
                        if ($tInicio >= $endTs && $tInicio < $proximoTurnoTs) {
                            $proximoTurnoTs = $tInicio;
                        }
                    }
                    $gapAfterMinutos = (int) (($proximoTurnoTs - $endTs) / 60);

                    // Espacio desde el turno ocupado anterior o apertura
                    $anteriorTurnoFinTs = $horaApertura->timestamp;
                    foreach ($turnosOcupados as $t) {
                        $tFin = Carbon::parse($fecha . ' ' . $t->hora_fin)->timestamp;
                        if ($tFin <= $startTs && $tFin > $anteriorTurnoFinTs) {
                            $anteriorTurnoFinTs = $tFin;
                        }
                    }
                    $gapBeforeMinutos = (int) (($startTs - $anteriorTurnoFinTs) / 60);

                    if ($gapAfterMinutos > 0 && $gapAfterMinutos < 60) {
                        $dejaBache = true;
                        $horaProxima = Carbon::createFromTimestamp($proximoTurnoTs)->format('H:i');
                        $motivoBache = "Dejaría un hueco muerto de {$gapAfterMinutos} min ({$horaFinFormatted} a {$horaProxima})";
                    } elseif ($gapBeforeMinutos > 0 && $gapBeforeMinutos < 60) {
                        $dejaBache = true;
                        $horaAnterior = Carbon::createFromTimestamp($anteriorTurnoFinTs)->format('H:i');
                        $motivoBache = "Dejaría un hueco muerto de {$gapBeforeMinutos} min ({$horaAnterior} a {$horaInicioFormatted})";
                    }
                }

                if ($dejaBache) {
                    $horariosProtegidos[] = [
                        'hora_inicio' => $horaInicioFormatted,
                        'hora_fin' => $horaFinFormatted,
                        'duracion_minutos' => $duracionMinutos,
                        'motivo' => $motivoBache,
                    ];
                } else {
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
            }

            $currentSlotStart->addMinutes($stepMinutos);
        }

        return [
            'slots' => $slotsDisponibles,
            'optimizacion_anti_baches' => [
                'activa' => $antiBachesActivo,
                'total_horarios_protegidos' => count($horariosProtegidos),
                'horarios_protegidos' => $horariosProtegidos,
            ],
        ];
    }
}
