<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Services\CancelacionLluviaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CancelacionLluviaController extends Controller
{
    public function __construct(
        protected CancelacionLluviaService $cancelacionService
    ) {}

    /**
     * Previsualizar el impacto de la cancelación climática.
     */
    public function preview(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->resolverComplejoYValidarAdmin($request, $subdomain);
        if ($complejo instanceof JsonResponse) {
            return $complejo;
        }

        $validated = $request->validate([
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_desde' => ['nullable', 'string'],
            'canchas_ids' => ['nullable', 'array'],
            'canchas_ids.*' => ['integer'],
            'solo_descubiertas' => ['nullable', 'boolean'],
        ]);

        $impacto = $this->cancelacionService->previsualizarImpacto($complejo, $validated);

        return response()->json($impacto);
    }

    /**
     * Ejecutar la cancelación masiva por lluvia.
     */
    public function ejecutar(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->resolverComplejoYValidarAdmin($request, $subdomain);
        if ($complejo instanceof JsonResponse) {
            return $complejo;
        }

        $user = $this->getAuthenticatedUser($request);

        $validated = $request->validate([
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_desde' => ['nullable', 'string'],
            'canchas_ids' => ['required', 'array', 'min:1'],
            'canchas_ids.*' => ['integer'],
            'notificar_whatsapp' => ['nullable', 'boolean'],
            'bloquear_grilla' => ['nullable', 'boolean'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ]);

        $resultado = $this->cancelacionService->ejecutarCancelacionMasiva($complejo, $user, $validated);

        return response()->json($resultado);
    }

    /**
     * Resuelve el complejo por subdominio y verifica permisos de administrador.
     */
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

        $user = $this->getAuthenticatedUser($request);
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

    protected function getAuthenticatedUser(Request $request)
    {
        return $request->user('sanctum')
            ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null)
            ?: auth()->user();
    }
}
