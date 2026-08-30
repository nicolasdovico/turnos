<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Models\WalletMovimiento;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    public function getSaldo(Request $request): JsonResponse
    {
        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return response()->json([
                'saldo' => 0.0,
                'user' => null,
            ], 200);
        }

        $complejoId = $request->query('complejo_id');
        $subdomain = $request->query('subdomain');

        if (!$complejoId && $subdomain) {
            $complejo = Complejo::where('subdominio', $subdomain)->first();
            $complejoId = $complejo?->id;
        }

        if (!$complejoId) {
            return response()->json([
                'error' => 'COMPLEJO_REQUIRED',
                'message' => 'Se requiere el parámetro complejo_id o subdomain.',
            ], 422);
        }

        $saldo = $this->walletService->obtenerSaldo($user->id, (int) $complejoId);

        return response()->json([
            'success' => true,
            'user_id' => $user->id,
            'complejo_id' => (int) $complejoId,
            'saldo' => $saldo,
            'saldo_formateado' => '$' . number_format($saldo, 2, ',', '.'),
        ], 200);
    }

    public function getMovimientos(Request $request): JsonResponse
    {
        $user = auth()->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Debes iniciar sesión para consultar tus movimientos.',
            ], 401);
        }

        $complejoId = $request->query('complejo_id');
        $subdomain = $request->query('subdomain');

        if (!$complejoId && $subdomain) {
            $complejo = Complejo::where('subdominio', $subdomain)->first();
            $complejoId = $complejo?->id;
        }

        $query = WalletMovimiento::where('user_id', $user->id);
        if ($complejoId) {
            $query->where('complejo_id', $complejoId);
        }

        $movimientos = $query->orderBy('created_at', 'desc')->limit(50)->get();

        return response()->json([
            'success' => true,
            'movimientos' => $movimientos,
        ], 200);
    }
}
