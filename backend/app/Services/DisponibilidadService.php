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
    protected WalletService $walletService;

    public function __construct(
        ?ReservaLockService $reservaLockService = null,
        ?WalletService $walletService = null
    ) {
        $this->reservaLockService = $reservaLockService ?? app(ReservaLockService::class);
        $this->walletService = $walletService ?? app(WalletService::class);
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
    public function obtenerDisponibilidadCompleta(int $canchaId, string $fecha, ?int $duracionSolicitada = null, bool $esAdmin = false, ?int $currentUserId = null): array
    {
        $cancha = Cancha::with('complejo')->find($canchaId);
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
                'complejo_cerrado' => true,
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

        $horaInicioLuz = $cancha->complejo?->hora_inicio_luz ?? '19:00';

        $horaApertura = Carbon::parse($fecha . ' ' . $horario->hora_apertura, $timezone);
        $horaCierre = Carbon::parse($fecha . ' ' . $horario->hora_cierre, $timezone);
        $ahora = Carbon::now($timezone);

        // Fetch non-available turnos in database (reservado, bloqueado, confirmado, etc. o cancelado por lluvia)
        $turnosOcupados = Turno::with('cliente')
            ->where('cancha_id', $canchaId)
            ->where('fecha', $fechaCarbon->format('Y-m-d'))
            ->where(function ($q) {
                $q->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
                  ->orWhere(function ($sub) {
                      $sub->where('estado', 'cancelado')
                          ->where('motivo_cancelacion', 'lluvia');
                  });
            })
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

            $cotizacionSlot = $cancha->calcularCotizacionTurno(
                $duracionMinutos,
                $fechaCarbon,
                $horaInicioFormatted,
                $horaFinFormatted,
                $horaInicioLuz,
                $cancha->complejo
            );
            $precioSlot = $cotizacionSlot['precio_total'];

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
                    $durLock = $overlappingLock['duracion_minutos'] ?? $duracionMinutos;
                    $cotLock = $cancha->calcularCotizacionTurno(
                        $durLock,
                        $fechaCarbon,
                        $overlappingLock['hora_inicio'],
                        $overlappingLock['hora_fin'],
                        $horaInicioLuz,
                        $cancha->complejo
                    );
                    $turnosRetenidos[] = [
                        'cancha_id' => $canchaId,
                        'cancha_nombre' => $cancha->nombre,
                        'fecha' => $fechaCarbon->format('Y-m-d'),
                        'hora_inicio' => $overlappingLock['hora_inicio'],
                        'hora_fin' => $overlappingLock['hora_fin'],
                        'duracion_minutos' => $durLock,
                        'precio' => $cotLock['precio_total'],
                        'tarifa_con_luz' => $cotLock['aplica_luz'],
                        'precio_base' => $cotLock['precio_base'],
                        'recargo_luz' => $cotLock['recargo_luz'],
                        'tipo_franja' => $cotLock['tipo_franja'],
                        'nombre_franja' => $cotLock['nombre_franja'],
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

                if ($cancha->permite_duracion_flexible && $antiBachesActivo) {
                    // Combinar turnos ocupados en DB y bloqueos activos de Redis como intervalos ocupados
                    $occupiedIntervals = [];
                    foreach ($turnosOcupados as $t) {
                        $occupiedIntervals[] = [
                            'startTs' => Carbon::parse($fecha . ' ' . $t->hora_inicio, $timezone)->timestamp,
                            'endTs' => Carbon::parse($fecha . ' ' . $t->hora_fin, $timezone)->timestamp,
                        ];
                    }
                    foreach ($activeLocks as $lock) {
                        $occupiedIntervals[] = [
                            'startTs' => Carbon::parse($fecha . ' ' . $lock['hora_inicio'], $timezone)->timestamp,
                            'endTs' => Carbon::parse($fecha . ' ' . $lock['hora_fin'], $timezone)->timestamp,
                        ];
                    }

                    // Espacio hacia el próximo turno ocupado o cierre
                    $proximoTurnoTs = $horaCierre->timestamp;
                    foreach ($occupiedIntervals as $interval) {
                        $tInicio = $interval['startTs'];
                        if ($tInicio >= $endTs && $tInicio < $proximoTurnoTs) {
                            $proximoTurnoTs = $tInicio;
                        }
                    }
                    $gapAfterMinutos = (int) (($proximoTurnoTs - $endTs) / 60);

                    // Espacio desde el turno ocupado anterior o apertura
                    $anteriorTurnoFinTs = $horaApertura->timestamp;
                    foreach ($occupiedIntervals as $interval) {
                        $tFin = $interval['endTs'];
                        if ($tFin <= $startTs && $tFin > $anteriorTurnoFinTs) {
                            $anteriorTurnoFinTs = $tFin;
                        }
                    }
                    $gapBeforeMinutos = (int) (($startTs - $anteriorTurnoFinTs) / 60);

                    if ($gapAfterMinutos > 0 && $gapAfterMinutos < 60) {
                        $dejaBache = true;
                        $horaProxima = Carbon::createFromTimestamp($proximoTurnoTs, $timezone)->format('H:i');
                        $motivoBache = "Dejaría un hueco muerto de {$gapAfterMinutos} min ({$horaFinFormatted} a {$horaProxima})";
                    } elseif ($gapBeforeMinutos > 0 && $gapBeforeMinutos < 60) {
                        $dejaBache = true;
                        $horaAnterior = Carbon::createFromTimestamp($anteriorTurnoFinTs, $timezone)->format('H:i');
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
                        'precio' => $precioSlot,
                        'tarifa_con_luz' => $cotizacionSlot['aplica_luz'],
                        'precio_base' => $cotizacionSlot['precio_base'],
                        'recargo_luz' => $cotizacionSlot['recargo_luz'],
                        'tipo_franja' => $cotizacionSlot['tipo_franja'],
                        'nombre_franja' => $cotizacionSlot['nombre_franja'],
                        'porcentaje_sena' => $cotizacionSlot['porcentaje_sena'],
                        'monto_sena' => $cotizacionSlot['monto_sena'],
                        'estado' => 'disponible',
                        'disponible' => true,
                    ];
                }
            }

            $currentSlotStart->addMinutes($stepMinutos);
        }

        // Add all active locks from Redis to turnosRetenidos ONLY if they are not already occupied in DB
        foreach ($activeLocks as $lock) {
            $lInicioTs = Carbon::parse($fecha . ' ' . $lock['hora_inicio'], $timezone)->timestamp;
            $lFinTs = Carbon::parse($fecha . ' ' . $lock['hora_fin'], $timezone)->timestamp;

            $estaOcupadoEnDbParaLock = $turnosOcupados->contains(function ($t) use ($fecha, $lInicioTs, $lFinTs, $timezone) {
                $tInicio = Carbon::parse($fecha . ' ' . $t->hora_inicio, $timezone)->timestamp;
                $tFin = Carbon::parse($fecha . ' ' . $t->hora_fin, $timezone)->timestamp;
                return $tInicio < $lFinTs && $tFin > $lInicioTs;
            });

            if ($estaOcupadoEnDbParaLock) {
                // Stale lock in Redis for an already confirmed turno in DB; purge it immediately
                $this->reservaLockService->liberarBloqueo($canchaId, $fechaCarbon->format('Y-m-d'), $lock['hora_inicio']);
                continue;
            }

            $alreadyInRetenidos = collect($turnosRetenidos)->contains(fn ($r) => $r['hora_inicio'] === $lock['hora_inicio']);
            if (!$alreadyInRetenidos) {
                $durLock = $lock['duracion_minutos'] ?? $duracionMinutos;
                $cotLock = $cancha->calcularCotizacionTurno(
                    $durLock,
                    $fechaCarbon,
                    $lock['hora_inicio'],
                    $lock['hora_fin'],
                    $horaInicioLuz,
                    $cancha->complejo
                );
                $turnosRetenidos[] = [
                    'cancha_id' => $canchaId,
                    'cancha_nombre' => $cancha->nombre,
                    'fecha' => $fechaCarbon->format('Y-m-d'),
                    'hora_inicio' => $lock['hora_inicio'],
                    'hora_fin' => $lock['hora_fin'],
                    'duracion_minutos' => $durLock,
                    'precio' => $cotLock['precio_total'],
                    'tarifa_con_luz' => $cotLock['aplica_luz'],
                    'precio_base' => $cotLock['precio_base'],
                    'recargo_luz' => $cotLock['recargo_luz'],
                    'tipo_franja' => $cotLock['tipo_franja'],
                    'nombre_franja' => $cotLock['nombre_franja'],
                    'ttl_segundos' => $lock['ttl'] ?? 600,
                    'expira_en_segundos' => $lock['ttl'] ?? 600,
                    'token_reserva' => $lock['token'] ?? null,
                    'user_id' => $lock['user_id'] ?? null,
                    'estado' => 'bloqueado_temporal',
                ];

            }
        }

        // Formatted occupied turnos list (with client details for admin view and current user view)
        $turnosOcupadosData = $turnosOcupados->map(function ($t) use ($cancha, $esAdmin, $currentUserId, $fechaCarbon) {
            $isLluvia = ($t->motivo_cancelacion === 'lluvia');
            $isBloqueado = ($t->estado === 'bloqueado');
            $isCancelado = ($t->estado === 'cancelado');
            $precio = (float) $t->precio;
            $montoPagado = (float) ($t->monto_pagado ?? 0);

            if ($isLluvia || $isBloqueado || $isCancelado) {
                $saldoPendiente = 0.0;
                $estadoPago = $montoPagado > 0 ? ($t->estado_pago ?: 'reembolsado') : 'cancelado';
                if ($isBloqueado || $isCancelado) {
                    $precio = 0.0;
                }
            } elseif (in_array($t->estado_pago, ['pagado', 'pagado_total']) || in_array($t->estado, ['pagado', 'completado'])) {
                $saldoPendiente = 0.0;
                $estadoPago = $t->estado_pago ?: 'pagado';
            } else {
                $saldoCalculado = max(0.0, round($precio - $montoPagado, 2));
                if ($t->saldo_pendiente !== null && (float) $t->saldo_pendiente > 0) {
                    $saldoPendiente = (float) $t->saldo_pendiente;
                } else {
                    $saldoPendiente = $saldoCalculado;
                }
                $estadoPago = $t->estado_pago;
                if (!$estadoPago || ($estadoPago === 'pagado_total' && $saldoPendiente > 0 && $montoPagado <= 0)) {
                    if ($saldoPendiente <= 0 && $montoPagado > 0) {
                        $estadoPago = 'pagado_total';
                    } elseif ($montoPagado > 0) {
                        $estadoPago = 'senado';
                    } else {
                        $estadoPago = 'pendiente';
                    }
                }
            }

            $fechaTurno = $t->fecha ? Carbon::parse($t->fecha)->format('Y-m-d') : $fechaCarbon->format('Y-m-d');

            $data = [
                'id' => $t->id,
                'cancha_id' => $cancha->id,
                'cancha_nombre' => $cancha->nombre,
                'fecha' => $fechaTurno,
                'hora_inicio' => Carbon::parse($t->hora_inicio)->format('H:i'),
                'hora_fin' => $t->hora_fin ? Carbon::parse($t->hora_fin)->format('H:i') : null,
                'duracion_minutos' => $t->duracion_minutos ?: $cancha->duracion_minutos,
                'precio' => $precio,
                'monto_pagado' => $montoPagado,
                'saldo_pendiente' => $saldoPendiente,
                'estado' => $t->estado,
                'estado_pago' => $estadoPago,
                'motivo_cancelacion' => $t->motivo_cancelacion,
                'metodo_pago' => $t->metodo_pago ?: 'mostrador',
                'es_fijo' => (bool) $t->es_fijo,
            ];

            $userModel = $currentUserId ? \App\Models\User::find($currentUserId) : null;
            $isMine = $currentUserId && (
                ((int) $t->cliente_id === (int) $currentUserId) ||
                ($userModel && $t->cliente_email && strtolower(trim($t->cliente_email)) === strtolower(trim($userModel->email)))
            );

            if ($esAdmin || $isMine) {
                $data['cliente_id'] = $t->cliente_id;
                $data['cliente_nombre'] = $t->cliente_nombre ?: ($t->cliente?->name ?: 'Cliente Mostrador');
                $data['cliente_email'] = $t->cliente?->email ?: $t->cliente_email;
                $data['cliente_telefono'] = $t->cliente_telefono ?: ($t->cliente?->telefono ?: null);
                $data['cliente_saldo_billetera'] = $t->cliente_id
                    ? (float) $this->walletService->obtenerSaldo((int) $t->cliente_id, (int) $cancha->complejo_id)
                    : 0.0;
                if ($isMine) {
                    $data['is_mine'] = true;
                }
            }

            return $data;
        })->values()->all();

        $suscripcionSuspendida = (bool) ($cancha->complejo && !$cancha->complejo->suscripcionValida());

        return [
            'slots' => $slotsDisponibles,
            'turnos_ocupados' => $turnosOcupadosData,
            'turnos_retenidos' => $turnosRetenidos,
            'hora_inicio_luz' => $horaInicioLuz,
            'complejo_cerrado' => false,
            'suscripcion_suspendida' => $suscripcionSuspendida,
            'optimizacion_anti_baches' => [
                'activa' => $antiBachesActivo,
                'total_horarios_protegidos' => count($horariosProtegidos),
                'horarios_protegidos' => $horariosProtegidos,
            ],
        ];
    }
}
