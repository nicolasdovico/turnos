<?php

namespace App\Services;

use App\Models\Cancha;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class ReservaLockService
{
    public const DEFAULT_TTL_SECONDS = 600; // 10 minutes

    /**
     * Generate the standardized Redis lock key: turno:{cancha_id}:{fecha}:{hora}
     */
    public static function getLockKey(int $canchaId, string $fecha, string $horaInicio): string
    {
        $horaNormalizada = Carbon::parse($horaInicio)->format('H:i');
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        return "turno:{$canchaId}:{$fechaNormalizada}:{$horaNormalizada}";
    }

    /**
     * Legacy Redis lock key: lock:cancha:{cancha_id}:{fecha}:{hora}
     */
    public static function getLegacyLockKey(int $canchaId, string $fecha, string $horaInicio): string
    {
        $horaNormalizada = Carbon::parse($horaInicio)->format('H:i');
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        return "lock:cancha:{$canchaId}:{$fechaNormalizada}:{$horaNormalizada}";
    }

    /**
     * Calculate end time given court, date, start time and optional duration/end time.
     */
    public function calcularHoraFin(Cancha $cancha, string $fecha, string $horaInicio, ?string $horaFin = null, ?int $duracionMinutos = null): string
    {
        if (!empty($horaFin)) {
            return Carbon::parse($horaFin)->format('H:i');
        }

        $fechaCarbon = Carbon::parse($fecha);
        $horaInicioCarbon = Carbon::parse($fecha . ' ' . $horaInicio);

        if (!empty($duracionMinutos) && $duracionMinutos > 0) {
            return $horaInicioCarbon->copy()->addMinutes($duracionMinutos)->format('H:i');
        }

        if (!empty($cancha->duracion_minutos) && $cancha->duracion_minutos > 0) {
            return $horaInicioCarbon->copy()->addMinutes($cancha->duracion_minutos)->format('H:i');
        }

        $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
            ->where('dia_semana', $fechaCarbon->dayOfWeek)
            ->first();

        $duracion = $horario?->duracion_turno_minutos ?: 60;
        return $horaInicioCarbon->copy()->addMinutes($duracion)->format('H:i');
    }

    /**
     * Get all active locks in Redis for a specific court and date.
     *
     * @return array<int, array{cancha_id: int, fecha: string, hora_inicio: string, hora_fin: string, duracion_minutos: int, token: string, user_id: string|int|null, ttl: int}>
     */
    public function obtenerBloqueosActivos(int $canchaId, string $fecha): array
    {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $patterns = [
            "turno:{$canchaId}:{$fechaNormalizada}:*",
            "lock:cancha:{$canchaId}:{$fechaNormalizada}:*",
        ];

        $cancha = null;
        $activeLocks = [];

        foreach ($patterns as $pattern) {
            $keys = Redis::keys($pattern);
            if (empty($keys)) {
                continue;
            }

            foreach ($keys as $fullKey) {
                // Remove Redis prefix if present in returned keys
                $key = $fullKey;
                $prefix = config('database.redis.options.prefix', '');
                if ($prefix && str_starts_with($key, $prefix)) {
                    $key = substr($key, strlen($prefix));
                }

                $ttl = (int) Redis::ttl($key);
                if ($ttl <= 0) {
                    continue;
                }

                $val = Redis::get($key);
                if (!$val) {
                    continue;
                }

                // Parse key to extract default hora_inicio
                $parts = explode(':', $key);
                if (count($parts) < 2) {
                    continue;
                }
                $horaInicioKey = $parts[count($parts) - 2] . ':' . $parts[count($parts) - 1];
                $horaInicioNormalizada = Carbon::parse($horaInicioKey)->format('H:i');

                if (isset($activeLocks[$horaInicioNormalizada])) {
                    continue;
                }

                $decoded = json_decode($val, true);
                if (is_array($decoded) && isset($decoded['hora_inicio'], $decoded['hora_fin'])) {
                    $horaInicio = Carbon::parse($decoded['hora_inicio'])->format('H:i');
                    $horaFin = Carbon::parse($decoded['hora_fin'])->format('H:i');
                    $duracion = isset($decoded['duracion_minutos'])
                        ? (int) $decoded['duracion_minutos']
                        : Carbon::parse($horaInicio)->diffInMinutes(Carbon::parse($horaFin));
                    $token = $decoded['token'] ?? ($decoded['token_reserva'] ?? 'lock-token');
                    $userId = $decoded['user_id'] ?? null;
                } else {
                    // Fallback for simple string token values
                    if (!$cancha) {
                        $cancha = Cancha::find($canchaId);
                    }
                    $horaInicio = $horaInicioNormalizada;
                    $horaFin = $cancha ? $this->calcularHoraFin($cancha, $fechaNormalizada, $horaInicio) : Carbon::parse($horaInicio)->addMinutes(60)->format('H:i');
                    $duracion = Carbon::parse($horaInicio)->diffInMinutes(Carbon::parse($horaFin));
                    $token = (string) $val;
                    $userId = null;
                }

                $activeLocks[$horaInicioNormalizada] = [
                    'cancha_id' => $canchaId,
                    'fecha' => $fechaNormalizada,
                    'hora_inicio' => $horaInicio,
                    'hora_fin' => $horaFin,
                    'duracion_minutos' => $duracion,
                    'token' => $token,
                    'user_id' => $userId,
                    'ttl' => $ttl,
                ];
            }
        }

        return array_values($activeLocks);
    }

    /**
     * Check if a proposed time interval [horaInicio, horaFin) overlaps with any active Redis lock.
     */
    public function haySolapamientoEnBloqueos(
        int $canchaId,
        string $fecha,
        string $horaInicio,
        string $horaFin,
        ?string $excludeToken = null
    ): bool {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $hInicio = Carbon::parse($fechaNormalizada . ' ' . $horaInicio)->format('H:i');
        $hFin = Carbon::parse($fechaNormalizada . ' ' . $horaFin)->format('H:i');

        $activeLocks = $this->obtenerBloqueosActivos($canchaId, $fechaNormalizada);

        foreach ($activeLocks as $lock) {
            if ($excludeToken && $lock['token'] === $excludeToken) {
                continue;
            }

            $lockInicio = $lock['hora_inicio'];
            $lockFin = $lock['hora_fin'];

            // Two intervals [S1, E1) and [S2, E2) overlap iff S1 < E2 and E1 > S2
            if ($lockInicio < $hFin && $lockFin > $hInicio) {
                return true;
            }
        }

        return false;
    }

    /**
     * Attempt to atomically acquire a reservation lock on a court slot.
     */
    public function adquirirBloqueo(
        int $canchaId,
        string $fecha,
        string $horaInicio,
        int|string $userId,
        int $ttlSeconds = self::DEFAULT_TTL_SECONDS,
        ?string $horaFin = null,
        ?int $duracionMinutos = null
    ): ?string {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $horaInicioNormalizada = Carbon::parse($horaInicio)->format('H:i');

        // 1. Verify court exists and is active
        $cancha = Cancha::find($canchaId);
        if (!$cancha || $cancha->estado !== 'activo') {
            return null;
        }

        $horaFinNormalizada = $this->calcularHoraFin($cancha, $fechaNormalizada, $horaInicioNormalizada, $horaFin, $duracionMinutos);
        $duracionEfectiva = Carbon::parse($horaInicioNormalizada)->diffInMinutes(Carbon::parse($horaFinNormalizada));

        // 2. Check if overlaps with any active/confirmed Turno in DB
        $reservaExiste = Turno::where('cancha_id', $canchaId)
            ->where('fecha', $fechaNormalizada)
            ->whereIn('estado', ['reservado', 'bloqueado', 'confirmado', 'completado', 'pagado'])
            ->where('hora_inicio', '<', $horaFinNormalizada)
            ->where('hora_fin', '>', $horaInicioNormalizada)
            ->exists();

        if ($reservaExiste) {
            return null;
        }

        // 3. Check if overlaps with any active Redis lock on this court & date
        if ($this->haySolapamientoEnBloqueos($canchaId, $fechaNormalizada, $horaInicioNormalizada, $horaFinNormalizada)) {
            return null;
        }

        // 4. Atomically persist lock in Redis with metadata
        $tokenReserva = (string) Str::uuid();
        $lockData = [
            'token' => $tokenReserva,
            'cancha_id' => $canchaId,
            'fecha' => $fechaNormalizada,
            'hora_inicio' => $horaInicioNormalizada,
            'hora_fin' => $horaFinNormalizada,
            'duracion_minutos' => $duracionEfectiva,
            'user_id' => $userId,
            'created_at' => Carbon::now()->toIso8601String(),
        ];

        $key = self::getLockKey($canchaId, $fechaNormalizada, $horaInicioNormalizada);
        $legacyKey = self::getLegacyLockKey($canchaId, $fechaNormalizada, $horaInicioNormalizada);

        $encoded = json_encode($lockData);
        $acquired = (bool) Redis::set($key, $encoded, 'EX', $ttlSeconds);
        Redis::set($legacyKey, $tokenReserva, 'EX', $ttlSeconds);

        return $acquired ? $tokenReserva : null;
    }

    /**
     * Release the Redis reservation lock.
     */
    public function liberarBloqueo(
        int $canchaId,
        string $fecha,
        string $horaInicio,
        ?string $token = null
    ): bool {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $horaNormalizada = Carbon::parse($horaInicio)->format('H:i');

        $key = self::getLockKey($canchaId, $fechaNormalizada, $horaNormalizada);
        $legacyKey = self::getLegacyLockKey($canchaId, $fechaNormalizada, $horaNormalizada);

        Redis::del($legacyKey);

        if ($token !== null) {
            $val = Redis::get($key);
            if ($val) {
                $decoded = json_decode($val, true);
                if (is_array($decoded) && isset($decoded['token']) && $decoded['token'] === $token) {
                    return (bool) Redis::del($key);
                } elseif ($val === $token) {
                    return (bool) Redis::del($key);
                }
            }
            return false;
        }

        return (bool) Redis::del($key);
    }

    /**
     * Release any active Redis locks that overlap with a confirmed interval.
     */
    public function liberarBloqueosSolapados(int $canchaId, string $fecha, string $horaInicio, string $horaFin): void
    {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $hInicio = Carbon::parse($fechaNormalizada . ' ' . $horaInicio)->format('H:i');
        $hFin = Carbon::parse($fechaNormalizada . ' ' . $horaFin)->format('H:i');

        $activeLocks = $this->obtenerBloqueosActivos($canchaId, $fechaNormalizada);
        foreach ($activeLocks as $lock) {
            if ($lock['hora_inicio'] < $hFin && $lock['hora_fin'] > $hInicio) {
                $this->liberarBloqueo($canchaId, $fechaNormalizada, $lock['hora_inicio']);
            }
        }
    }

    /**
     * Check if a slot is currently locked in Redis.
     */
    public function estaBloqueado(int $canchaId, string $fecha, string $horaInicio): bool
    {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $horaNormalizada = Carbon::parse($horaInicio)->format('H:i');

        $key = self::getLockKey($canchaId, $fechaNormalizada, $horaNormalizada);
        $legacyKey = self::getLegacyLockKey($canchaId, $fechaNormalizada, $horaNormalizada);

        return (bool) Redis::exists($key) || (bool) Redis::exists($legacyKey);
    }
}
