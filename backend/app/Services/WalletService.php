<?php

namespace App\Services;

use App\Models\UserCredito;
use App\Models\WalletMovimiento;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function obtenerSaldo(int $userId, int $complejoId): float
    {
        $credito = UserCredito::withoutGlobalScopes()
            ->where('user_id', $userId)
            ->where('complejo_id', $complejoId)
            ->first();
        return $credito ? (float) $credito->saldo : 0.0;
    }

    public function acreditar(int $userId, int $complejoId, float $monto, string $tipo, ?int $turnoId = null, ?string $descripcion = null): WalletMovimiento
    {
        return DB::transaction(function () use ($userId, $complejoId, $monto, $tipo, $turnoId, $descripcion) {
            $credito = UserCredito::withoutGlobalScopes()->firstOrCreate(
                ['user_id' => $userId, 'complejo_id' => $complejoId],
                ['saldo' => 0.0]
            );
            $credito->increment('saldo', $monto);

            return WalletMovimiento::withoutGlobalScopes()->create([
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
            $credito = UserCredito::withoutGlobalScopes()
                ->where('user_id', $userId)
                ->where('complejo_id', $complejoId)
                ->lockForUpdate()
                ->first();

            if (!$credito || (float) $credito->saldo < $monto) {
                return false;
            }

            $credito->decrement('saldo', $monto);

            WalletMovimiento::withoutGlobalScopes()->create([
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

    public function obtenerMetricasComplejo(int $complejoId): array
    {
        $totalSaldo = (float) UserCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->sum('saldo');

        $clientesConSaldo = UserCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('saldo', '>', 0)
            ->count();

        $totalMovimientos = WalletMovimiento::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->count();

        return [
            'total_saldo' => $totalSaldo,
            'total_saldo_formateado' => '$' . number_format($totalSaldo, 2, ',', '.'),
            'clientes_con_saldo' => $clientesConSaldo,
            'total_movimientos' => $totalMovimientos,
        ];
    }

    public function listarBilleterasComplejo(
        int $complejoId,
        ?string $search = null,
        bool $soloConSaldo = false,
        int $perPage = 20,
        string $orderBy = 'saldo_desc'
    ): array {
        $query = UserCredito::withoutGlobalScopes()
            ->with(['user'])
            ->where('complejo_id', $complejoId);

        if ($soloConSaldo) {
            $query->where('saldo', '>', 0);
        }

        if ($search) {
            $cleanSearch = trim($search);
            $query->whereHas('user', function ($q) use ($cleanSearch) {
                $q->where('name', 'like', "%{$cleanSearch}%")
                    ->orWhere('email', 'like', "%{$cleanSearch}%")
                    ->orWhere('telefono', 'like', "%{$cleanSearch}%");
            });
        }

        switch ($orderBy) {
            case 'saldo_asc':
                $query->orderBy('saldo', 'asc');
                break;
            case 'nombre_asc':
                $query->join('users', 'user_creditos.user_id', '=', 'users.id')
                    ->orderBy('users.name', 'asc')
                    ->select('user_creditos.*');
                break;
            case 'nombre_desc':
                $query->join('users', 'user_creditos.user_id', '=', 'users.id')
                    ->orderBy('users.name', 'desc')
                    ->select('user_creditos.*');
                break;
            case 'recientes':
                $query->orderBy('updated_at', 'desc');
                break;
            case 'saldo_desc':
            default:
                $query->orderBy('saldo', 'desc');
                break;
        }

        $paginated = $query->paginate($perPage);

        // Fetch last movement for each user
        $userIds = $paginated->pluck('user_id')->unique();
        $ultimosMovimientos = WalletMovimiento::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->whereIn('user_id', $userIds)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('user_id')
            ->map(fn ($group) => $group->first());

        $totalMovimientosPorUser = WalletMovimiento::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->whereIn('user_id', $userIds)
            ->select('user_id', DB::raw('count(*) as total'))
            ->groupBy('user_id')
            ->pluck('total', 'user_id');

        $items = $paginated->getCollection()->map(function ($c) use ($ultimosMovimientos, $totalMovimientosPorUser) {
            $lastMov = $ultimosMovimientos->get($c->user_id);
            return [
                'id' => $c->id,
                'user_id' => $c->user_id,
                'user' => [
                    'id' => $c->user?->id,
                    'name' => $c->user?->name ?: 'Cliente Desconocido',
                    'email' => $c->user?->email,
                    'telefono' => $c->user?->telefono,
                    'created_at' => $c->user?->created_at?->format('Y-m-d H:i:s'),
                ],
                'saldo' => (float) $c->saldo,
                'saldo_formateado' => '$' . number_format((float) $c->saldo, 2, ',', '.'),
                'total_movimientos' => (int) ($totalMovimientosPorUser->get($c->user_id) ?? 0),
                'ultimo_movimiento' => $lastMov ? [
                    'id' => $lastMov->id,
                    'monto' => (float) $lastMov->monto,
                    'monto_formateado' => ($lastMov->monto > 0 ? '+' : '') . '$' . number_format((float) $lastMov->monto, 2, ',', '.'),
                    'tipo' => $lastMov->tipo,
                    'descripcion' => $lastMov->descripcion,
                    'created_at' => $lastMov->created_at?->format('Y-m-d H:i:s'),
                ] : null,
                'updated_at' => $c->updated_at?->format('Y-m-d H:i:s'),
            ];
        })->values();

        return [
            'data' => $items,
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];
    }

    public function obtenerMovimientosClienteComplejo(int $userId, int $complejoId, int $limit = 50): array
    {
        $movimientos = WalletMovimiento::withoutGlobalScopes()
            ->with(['turno.cancha'])
            ->where('user_id', $userId)
            ->where('complejo_id', $complejoId)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit($limit)
            ->get();

        return $movimientos->map(function ($m) {
            return [
                'id' => $m->id,
                'monto' => (float) $m->monto,
                'monto_formateado' => ($m->monto > 0 ? '+' : '') . '$' . number_format((float) $m->monto, 2, ',', '.'),
                'tipo' => $m->tipo,
                'descripcion' => $m->descripcion,
                'created_at' => $m->created_at?->format('Y-m-d H:i:s'),
                'created_at_humano' => $m->created_at?->diffForHumans(),
                'turno' => $m->turno ? [
                    'id' => $m->turno->id,
                    'fecha' => $m->turno->fecha ? \Carbon\Carbon::parse($m->turno->fecha)->format('Y-m-d') : null,
                    'hora_inicio' => $m->turno->hora_inicio ? substr($m->turno->hora_inicio, 0, 5) : null,
                    'hora_fin' => $m->turno->hora_fin ? substr($m->turno->hora_fin, 0, 5) : null,
                    'cancha_nombre' => $m->turno->cancha?->nombre,
                ] : null,
            ];
        })->toArray();
    }
}