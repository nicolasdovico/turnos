<?php

namespace App\Services;

use App\Models\UserCredito;
use App\Models\WalletMovimiento;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function obtenerSaldo(int $userId, int $complejoId): float
    {
        $credito = UserCredito::where('user_id', $userId)
            ->where('complejo_id', $complejoId)
            ->first();
        return $credito ? (float) $credito->saldo : 0.0;
    }

    public function acreditar(int $userId, int $complejoId, float $monto, string $tipo, ?int $turnoId = null, ?string $descripcion = null): WalletMovimiento
    {
        return DB::transaction(function () use ($userId, $complejoId, $monto, $tipo, $turnoId, $descripcion) {
            $credito = UserCredito::firstOrCreate(
                ['user_id' => $userId, 'complejo_id' => $complejoId],
                ['saldo' => 0.0]
            );
            $credito->increment('saldo', $monto);

            return WalletMovimiento::create([
                'user_id' => $userId,
                'complejo_id' => $complejoId,
                'turno_id' => $turnoId,
                'monto' => $monto,
                'tipo' => $tipo,
                'descripcion' => $descripcion,
            ]);
        });
    }

    public function debitar(int $userId, int $complejoId, float $monto, string $tipo, ?int $turnoId = null, ?string $descripcion = null): bool
    {
        return DB::transaction(function () use ($userId, $complejoId, $monto, $tipo, $turnoId, $descripcion) {
            $credito = UserCredito::where('user_id', $userId)
                ->where('complejo_id', $complejoId)
                ->lockForUpdate()
                ->first();

            if (!$credito || (float) $credito->saldo < $monto) {
                return false;
            }

            $credito->decrement('saldo', $monto);

            WalletMovimiento::create([
                'user_id' => $userId,
                'complejo_id' => $complejoId,
                'turno_id' => $turnoId,
                'monto' => -$monto,
                'tipo' => $tipo,
                'descripcion' => $descripcion,
            ]);

            return true;
        });
    }
}