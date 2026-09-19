<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Models\ValeCredito;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ValeCreditoController extends Controller
{
    public function __construct(
        protected WalletService $walletService
    ) {}

    /**
     * Consultar información pública del vale mediante su token seguro.
     */
    public function showPublico(Request $request, string $token): JsonResponse
    {
        $vale = ValeCredito::withoutGlobalScopes()
            ->where('token_seguro', $token)
            ->with(['complejo', 'turnoOrigen.cancha'])
            ->first();

        if (!$vale) {
            return response()->json([
                'error' => 'VALE_NOT_FOUND',
                'message' => 'El vale digital no existe o el enlace es inválido.',
            ], 404);
        }

        $turno = $vale->turnoOrigen;
        $cancha = $turno?->cancha;
        $complejo = $vale->complejo;

        return response()->json([
            'id' => $vale->id,
            'codigo' => $vale->codigo,
            'token_seguro' => $vale->token_seguro,
            'monto' => (float) $vale->monto,
            'saldo_restante' => (float) $vale->saldo_restante,
            'cliente_nombre' => $vale->cliente_nombre,
            'cliente_telefono' => $vale->cliente_telefono,
            'estado' => $vale->estado,
            'es_valido' => $vale->esValido(),
            'fecha_emision' => $vale->fecha_emision ? Carbon::parse($vale->fecha_emision)->format('d/m/Y') : null,
            'fecha_vencimiento' => $vale->fecha_vencimiento ? Carbon::parse($vale->fecha_vencimiento)->format('d/m/Y') : null,
            'complejo' => [
                'id' => $complejo?->id,
                'nombre' => $complejo?->nombre,
                'subdominio' => $complejo?->subdominio,
                'logo_url' => $complejo?->logo_url,
                'telefono' => $complejo?->telefono,
            ],
            'turno_origen' => $turno ? [
                'id' => $turno->id,
                'fecha' => $turno->fecha instanceof Carbon ? $turno->fecha->format('d/m/Y') : (string) $turno->fecha,
                'hora_inicio' => substr($turno->hora_inicio, 0, 5),
                'hora_fin' => $turno->hora_fin ? substr($turno->hora_fin, 0, 5) : '',
                'cancha_nombre' => $cancha?->nombre ?: 'Cancha',
                'deporte' => $cancha?->deporte ?: 'Deporte',
            ] : null,
        ]);
    }

    /**
     * Permite a un usuario autenticado transferir el saldo del vale a su billetera virtual.
     */
    public function canjearBilletera(Request $request, string $token): JsonResponse
    {
        $user = $request->user('sanctum')
            ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null)
            ?: auth()->user();

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Iniciá sesión o registrate para acreditar este saldo en tu cuenta.',
            ], 401);
        }

        return DB::transaction(function () use ($token, $user) {
            $vale = ValeCredito::withoutGlobalScopes()
                ->where('token_seguro', $token)
                ->lockForUpdate()
                ->first();

            if (!$vale || !$vale->esValido()) {
                return response()->json([
                    'error' => 'VALE_NOT_VALID',
                    'message' => 'El vale digital no está activo o ya ha sido canjeado.',
                ], 400);
            }

            $saldo = (float) $vale->saldo_restante;

            // Acreditar saldo en la billetera virtual del cliente
            $this->walletService->acreditar(
                $user->id,
                $vale->complejo_id,
                $saldo,
                'canje_vale_lluvia',
                $vale->turno_origen_id,
                "Canje de Vale de Lluvia {$vale->codigo}"
            );

            // Actualizar estado del vale
            $vale->update([
                'estado' => 'transferido_billetera',
                'user_id_canje' => $user->id,
                'saldo_restante' => 0.0,
            ]);

            return response()->json([
                'success' => true,
                'message' => "¡Excelente! Se han acreditado $" . number_format($saldo, 2, ',', '.') . " en tu Billetera Virtual.",
                'monto_acreditado' => $saldo,
                'nuevo_saldo_billetera' => $this->walletService->obtenerSaldo($user->id, $vale->complejo_id),
            ]);
        });
    }

    /**
     * Listar vales emitidos para el administrador del club.
     */
    public function index(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->resolverComplejoYValidarAdmin($request, $subdomain);
        if ($complejo instanceof JsonResponse) {
            return $complejo;
        }

        $query = ValeCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->with(['turnoOrigen.cancha'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        }

        if ($request->filled('q')) {
            $q = trim($request->input('q'));
            $query->where(function ($sub) use ($q) {
                $sub->where('codigo', 'ilike', "%{$q}%")
                    ->orWhere('cliente_nombre', 'ilike', "%{$q}%")
                    ->orWhere('cliente_telefono', 'ilike', "%{$q}%");
            });
        }

        $vales = $query->limit(100)->get();

        return response()->json([
            'data' => $vales->map(function (ValeCredito $v) {
                return [
                    'id' => $v->id,
                    'codigo' => $v->codigo,
                    'token_seguro' => $v->token_seguro,
                    'monto' => (float) $v->monto,
                    'saldo_restante' => (float) $v->saldo_restante,
                    'cliente_nombre' => $v->cliente_nombre,
                    'cliente_telefono' => $v->cliente_telefono,
                    'estado' => $v->estado,
                    'fecha_emision' => $v->fecha_emision ? Carbon::parse($v->fecha_emision)->format('d/m/Y H:i') : null,
                    'fecha_vencimiento' => $v->fecha_vencimiento ? Carbon::parse($v->fecha_vencimiento)->format('d/m/Y') : null,
                    'turno_original' => $v->turnoOrigen ? [
                        'fecha' => $v->turnoOrigen->fecha instanceof Carbon ? $v->turnoOrigen->fecha->format('d/m/Y') : (string) $v->turnoOrigen->fecha,
                        'hora' => substr($v->turnoOrigen->hora_inicio, 0, 5),
                        'cancha' => $v->turnoOrigen->cancha?->nombre ?: 'Cancha',
                    ] : null,
                ];
            }),
        ]);
    }

    /**
     * Registrar reembolso en efectivo o transferencia en mostrador.
     */
    public function reembolsarEfectivo(Request $request, string $subdomain, int $id): JsonResponse
    {
        $complejo = $this->resolverComplejoYValidarAdmin($request, $subdomain);
        if ($complejo instanceof JsonResponse) {
            return $complejo;
        }

        $vale = ValeCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejo->id)
            ->where('id', $id)
            ->first();

        if (!$vale) {
            return response()->json(['error' => 'NOT_FOUND', 'message' => 'Vale no encontrado.'], 404);
        }

        if ($vale->estado !== 'activo') {
            return response()->json([
                'error' => 'NOT_ACTIVE',
                'message' => 'Este vale ya no está activo (estado actual: ' . $vale->estado . ').',
            ], 400);
        }

        $monto = (float) $vale->saldo_restante;

        $vale->update([
            'estado' => 'reembolsado_efectivo',
            'saldo_restante' => 0.0,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Se registró la devolución de $" . number_format($monto, 2, ',', '.') . " en efectivo/caja.",
            'monto_devuelto' => $monto,
        ]);
    }

    protected function resolverComplejoYValidarAdmin(Request $request, string $subdomain): Complejo|JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'error' => 'COMPLEJO_NOT_FOUND',
                'message' => 'Complejo no encontrado.',
            ], 404);
        }

        $user = $request->user('sanctum')
            ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null)
            ?: auth()->user();

        if (!$user) {
            return response()->json([
                'error' => 'UNAUTHENTICATED',
                'message' => 'Debes iniciar sesión para realizar esta operación.',
            ], 401);
        }

        $isAdmin = ($complejo->user_id && $complejo->user_id === $user->id) || ($user->role ?? '') === 'admin';
        if (!$isAdmin) {
            return response()->json([
                'error' => 'UNAUTHORIZED',
                'message' => 'No tienes permisos de administrador sobre este club.',
            ], 403);
        }

        return $complejo;
    }
}
