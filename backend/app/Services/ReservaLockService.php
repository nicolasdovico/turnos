<?php

namespace App\Services;

use App\Models\Cancha;
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
     * Attempt to atomically acquire a reservation lock on a court slot.
     *
     * @param int $canchaId
     * @param string $fecha (YYYY-MM-DD)
     * @param string $horaInicio (HH:MM)
     * @param int|string $userId
     * @param int $ttlSeconds
     * @return string|null Token de reserva si fue exitoso, null si ya está ocupado/bloqueado.
     */
    public function adquirirBloqueo(
        int $canchaId,
        string $fecha,
        string $horaInicio,
        int|string $userId,
        int $ttlSeconds = self::DEFAULT_TTL_SECONDS
    ): ?string {
        $fechaNormalizada = Carbon::parse($fecha)->format('Y-m-d');
        $horaNormalizada = Carbon::parse($horaInicio)->format('H:i');

        // 1. Verify court exists and is active
        $cancha = Cancha::find($canchaId);
        if (!$cancha || $cancha->estado !== 'activo') {
            return null;
        }

        // 2. Check if already reserved or blocked in DB
        $reservaExiste = Turno::where('cancha_id', $canchaId)
            ->where('fecha', $fechaNormalizada)
            ->where('hora_inicio', $horaNormalizada)
            ->whereIn('estado', ['reservado', 'bloqueado'])
            ->exists();

        if ($reservaExiste) {
            return null;
        }

        // 3. Attempt atomic lock in Redis using SET key value EX ttl NX
        $key = self::getLockKey($canchaId, $fechaNormalizada, $horaNormalizada);
        $tokenReserva = (string) Str::uuid();

        $acquired = (bool) Redis::set($key, $tokenReserva, 'EX', $ttlSeconds, 'NX');

        return $acquired ? $tokenReserva : null;
    }

    /**
     * Release the Redis reservation lock.
     *
     * @param int $canchaId
     * @param string $fecha
     * @param string $horaInicio
     * @param string|null $token
     * @return bool
     */
    public function liberarBloqueo(
        int $canchaId,
        string $fecha,
        string $horaInicio,
        ?string $token = null
    ): bool {
        $key = self::getLockKey($canchaId, $fecha, $horaInicio);

        if ($token !== null) {
            $script = 'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
            return (bool) Redis::eval($script, 1, $key, $token);
        }

        return (bool) Redis::del($key);
    }

    /**
     * Check if a slot is currently locked in Redis.
     */
    public function estaBloqueado(int $canchaId, string $fecha, string $horaInicio): bool
    {
        $key = self::getLockKey($canchaId, $fecha, $horaInicio);
        return (bool) Redis::exists($key);
    }
}
