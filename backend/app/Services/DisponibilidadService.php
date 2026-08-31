<?php

namespace App\Services;

use App\Models\Cancha;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;

class DisponibilidadService
{
    protected ReservaLockService $reservaLockService;

    public function __construct(?ReservaLockService $reservaLockService = null)
    {
        $this->reservaLockService = $reservaLockService ?? app(ReservaLockService::class);
    }

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
     * Calculate full availability along with anti-bache audit details and occupied turnos for club administrators.
     */
    public function obtenerDisponibilidadCompleta(int $canchaId, string $fecha, ?int $duracionSolicitada = null, bool $esAdmin = false): array
    {
        $cancha = Cancha::find($canchaId);
        if (!$cancha || $cancha->estado !== 'activo') {
            return [
                'slots' => [],
                'turnos_ocupados' => [],
                'optimizacion_anti_baches' => [
                    'activa' => false,
                    'total_horarios_protegidos' => 0,
                    'horarios_protegidos' => [],
                ],
            ];
        }

        $timezone = $cancha->complejo?->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');
        $fechaCarbon = Carbon::parse($fecha, $timezone);
        $hoy = Carbon::today($timezone);

        // Si la fecha solicitada es estrictamente anterior a hoy (ayer o antes), no hay disponibilidad
        if ($fechaCarbon->copy()->startOfDay()->lt($hoy)) {
            return [
                'cancha_id' => $canchaId,
                'cancha_nombre' => $cancha->nombre,
                'deporte' => $cancha->deporte,
                'fecha' => $fechaCarbon->format('Y-m-d'),
                'duracion_minutos' => $duracionMinutos ?? 60,
                'permite_duracion_flexible' => (bool) $cancha->permite_duracion_flexible,
                'duraciones_permitidas' => [60, 90, 120],
                'slots' => [],
                'slots_disponibles' => [],
                'turnos_ocupados' => [],
                'optimizacion_anti_baches' => [
                    'activa' => false,
                    'total_horarios_protegidos' => 0,
                    'horarios_protegidos' => [],
                ],
            ];
        }

        $diaSemana = $fechaCarbon->dayOfWeek; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

        $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
            ->where('dia_semana', $diaSemana)
            ->first();

        if (!$horario) {
            return [
                'slots' => [],
                'turnos_ocupados' => [],
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

        $horaApertura = Carbon::parse($fecha . ' ' . $horario->hora_apertura, $timezone);
        $horaCierre = Carbon::parse($fecha . ' ' . $horario->hora_cierre, $timezone);
        $ahora = Carbon::now($timezone);

        // Fetch non-available turnos in database (reservado, bloqueado, confirmado, etc.)
        $turnosOcupados = Turno::with('cliente')
            ->where('cancha_id', $canchaId)
            ->where('fecha', $fechaCarbon->format('Y-m-d'))
            ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
            ->orderBy('hora_inicio', 'asc')
            ->get();

        $activeLocks = $this->reservaLockService->obtenerBloqueosActivos($canchaId, $fechaCarbon->format('Y-m-d'));

        $slotsDisponibles = [];
        $turnosRetenidos = [];
        $horariosProtegidos = [];
        $currentSlotStart = $horaApertura->copy();

        // Step size: if flexible, step by 30 min (for 90 min) or 60 min; if fixed, step by exact duration
        $stepMinutos = $cancha->permite_duracion_flexible ? 30 : $duracionMinutos;
        $antiBachesActivo = $cancha->anti_baches_activo ?? true;

        while ($currentSlotStart->copy()->addMinutes($duracionMinutos)->lessThanOrEqualTo($horaCierre)) {
            $slotEnd = $currentSlotStart->copy()->addMinutes($duracionMinutos);
            $horaInicioFormatted = $currentSlotStart->format('H:i');
            $horaFinFormatted = $slotEnd->format('H:i');

            // 0. Verificación de temporalidad: si el inicio del turno ya pasó (para hoy o fechas pasadas), omitirlo
            if ($currentSlotStart->lessThanOrEqualTo($ahora)) {
                $currentSlotStart->addMinutes($stepMinutos);
                continue;
            }
            $horaFinFormatted = $slotEnd->format('H:i');

            // 1. Check if overlaps with any occupied turno in DB
            $startTs = $currentSlotStart->timestamp;
            $endTs = $slotEnd->timestamp;

            $estaOcupadoEnDb = $turnosOcupados->contains(function ($t) use ($fecha, $startTs, $endTs, $timezone) {
                $tInicio = Carbon::parse($fecha . ' ' . $t->hora_inicio, $timezone)->timestamp;
                $tFin = Carbon::parse($fecha . ' ' . $t->hora_fin, $timezone)->timestamp;
                return $tInicio < $endTs && $tFin > $startTs;
            });

            // 2. Check if overlaps with any active temporary lock in Redis
            $overlappingLock = null;
            foreach ($activeLocks as $lock) {
                $lInicioTs = Carbon::parse($fecha . ' ' . $lock['hora_inicio'], $timezone)->timestamp;
                $lFinTs = Carbon::parse($fecha . ' ' . $lock['hora_fin'], $timezone)->timestamp;
                if ($lInicioTs < $endTs && $lFinTs > $startTs) {
                    $overlappingLock = $lock;
                    break;
                }
            }
            $estaBloqueadoEnRedis = ($overlappingLock !== null);

            if ($estaBloqueadoEnRedis && !$estaOcupadoEnDb && $overlappingLock) {
                $alreadyInRetenidos = collect($turnosRetenidos)->contains(fn ($r) => $r['hora_inicio'] === $overlappingLock['hora_inicio']);
                if (!$alreadyInRetenidos) {
                    $turnosRetenidos[] = [
                        'cancha_id' => $canchaId,
                        'cancha_nombre' => $cancha->nombre,
                        'fecha' => $fechaCarbon->format('Y-m-d'),
                        'hora_inicio' => $overlappingLock['hora_inicio'],
                        'hora_fin' => $overlappingLock['hora_fin'],
                        'duracion_minutos' => $overlappingLock['duracion_minutos'] ?? $duracionMinutos,
                        'precio' => $precio,
                        'ttl_segundos' => $overlappingLock['ttl'] ?? 600,
                        'expira_en_segundos' => $overlappingLock['ttl'] ?? 600,
                        'token_reserva' => $overlappingLock['token'] ?? null,
                        'user_id' => $overlappingLock['user_id'] ?? null,
                        'estado' => 'bloqueado_temporal',
                    ];
                }
            }

            if (!$estaOcupadoEnDb && !$estaBloqueadoEnRedis) {
                // 3. Regla Anti-Baches (Gap Prevention): Verificar si este turno deja un hueco huérfano < 60 min
                $dejaBache = false;
                $motivoBache = null;

                if ($cancha->permite_duracion_flexible && $antiBachesActivo && $turnosOcupados->isNotEmpty()) {
                    // Espacio hacia el próximo turno ocupado o cierre
                    $proximoTurnoTs = $horaCierre->timestamp;
                    foreach ($turnosOcupados as $t) {
                        $tInicio = Carbon::parse($fecha . ' ' . $t->hora_inicio, $timezone)->timestamp;
                        if ($tInicio >= $endTs && $tInicio < $proximoTurnoTs) {
                            $proximoTurnoTs = $tInicio;
                        }
                    }
                    $gapAfterMinutos = (int) (($proximoTurnoTs - $endTs) / 60);

                    // Espacio desde el turno ocupado anterior o apertura
                    $anteriorTurnoFinTs = $horaApertura->timestamp;
                    foreach ($turnosOcupados as $t) {
                        $tFin = Carbon::parse($fecha . ' ' . $t->hora_fin, $timezone)->timestamp;
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
                        'disponible' => true,
                    ];
                }
            }

            $currentSlotStart->addMinutes($stepMinutos);
        }

        // Add all active locks from Redis to turnosRetenidos
        foreach ($activeLocks as $lock) {
            $alreadyInRetenidos = collect($turnosRetenidos)->contains(fn ($r) => $r['hora_inicio'] === $lock['hora_inicio']);
            if (!$alreadyInRetenidos) {
                $turnosRetenidos[] = [
                    'cancha_id' => $canchaId,
                    'cancha_nombre' => $cancha->nombre,
                    'fecha' => $fechaCarbon->format('Y-m-d'),
                    'hora_inicio' => $lock['hora_inicio'],
                    'hora_fin' => $lock['hora_fin'],
                    'duracion_minutos' => $lock['duracion_minutos'] ?? $duracionMinutos,
                    'precio' => $precio,
                    'ttl_segundos' => $lock['ttl'] ?? 600,
                    'expira_en_segundos' => $lock['ttl'] ?? 600,
                    'token_reserva' => $lock['token'] ?? null,
                    'user_id' => $lock['user_id'] ?? null,
                    'estado' => 'bloqueado_temporal',
                ];
            }
        }

        // Formatted occupied turnos list (with client details for admin view)
        $turnosOcupadosData = $turnosOcupados->map(function ($t) use ($esAdmin) {
            $data = [
                'id' => $t->id,
                'cancha_id' => $t->cancha_id,
                'fecha' => is_string($t->fecha) ? $t->fecha : $t->fecha->format('Y-m-d'),
                'hora_inicio' => Carbon::parse($t->hora_inicio)->format('H:i'),
                'hora_fin' => Carbon::parse($t->hora_fin)->format('H:i'),
                'duracion_minutos' => Carbon::parse($t->hora_inicio)->diffInMinutes(Carbon::parse($t->hora_fin)),
                'precio' => (float) $t->precio,
                'metodo_pago' => $t->metodo_pago ?? 'mostrador',
                'estado' => $t->estado,
                'es_fijo' => (bool) $t->es_fijo,
            ];

            if ($esAdmin) {
                $data['cliente_id'] = $t->cliente_id;
                $data['cliente_nombre'] = $t->cliente_nombre ?: ($t->cliente?->name ?: 'Cliente Mostrador');
                $data['cliente_email'] = $t->cliente?->email;
                $data['cliente_telefono'] = $t->cliente_telefono ?: ($t->cliente?->telefono ?: null);
            }

            return $data;
        })->values()->all();

        return [
            'slots' => $slotsDisponibles,
            'turnos_ocupados' => $turnosOcupadosData,
            'turnos_retenidos' => $turnosRetenidos,
            'optimizacion_anti_baches' => [
                'activa' => $antiBachesActivo,
                'total_horarios_protegidos' => count($horariosProtegidos),
                'horarios_protegidos' => $horariosProtegidos,
            ],
        ];
    }
}
