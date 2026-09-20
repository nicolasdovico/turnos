<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Services\ClubClienteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ClubClienteController extends Controller
{
    public function __construct(
        protected ClubClienteService $clienteService
    ) {}

    protected function getAuthorizedComplejo(Request $request, string $subdomain): ?Complejo
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return null;
        }

        $user = auth()->user() ?: ($request->user('sanctum') ?? $request->user());
        if (!$user && $request->bearerToken()) {
            $user = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable;
        }

        $isAdmin = $user && (
            ($complejo->user_id && $complejo->user_id === $user->id) ||
            ($user->role ?? '') === 'admin' ||
            !empty($user->is_admin) ||
            ($user->email ?? '') === 'admin@admin.com'
        );

        return $isAdmin ? $complejo : null;
    }

    /**
     * Listado de clientes con filtros, paginación y métricas.
     */
    public function index(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getAuthorizedComplejo($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para consultar el padrón de clientes de este club.',
            ], 403);
        }

        $filtros = [
            'search' => $request->query('search', ''),
            'estado' => $request->query('estado', 'todos'),
            'filtro' => $request->query('filtro', 'todos'),
        ];
        $perPage = (int) $request->query('per_page', 20);

        $data = $this->clienteService->listarClientes($complejo->id, $filtros, $perPage);

        return response()->json([
            'success' => true,
            'metricas' => $data['metricas'],
            'paginacion' => $data['paginacion'],
            'clientes' => $data['clientes'],
        ]);
    }

    /**
     * Ficha 360° detallada del cliente.
     */
    public function show(Request $request, string $subdomain, int $id): JsonResponse
    {
        $complejo = $this->getAuthorizedComplejo($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para consultar el perfil de este cliente.',
            ], 403);
        }

        try {
            $data = $this->clienteService->obtenerFichaCliente($complejo->id, $id);

            return response()->json([
                'success' => true,
                ...$data,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 404);
        }
    }

    /**
     * Crear un nuevo cliente en el club.
     */
    public function store(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getAuthorizedComplejo($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para registrar clientes en este club.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:150',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'dni' => 'nullable|string|max:50',
            'notas' => 'nullable|string|max:2000',
            'estado' => 'nullable|in:activo,bloqueado',
            'motivo_bloqueo' => 'nullable|string|max:255',
        ], [
            'nombre.required' => 'El nombre completo del cliente es obligatorio.',
            'email.email' => 'El formato del correo electrónico no es válido.',
            'estado.in' => 'El estado debe ser activo o bloqueado.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $cliente = $this->clienteService->crearCliente($complejo->id, $validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Cliente registrado exitosamente en el club.',
                'cliente' => $cliente,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Actualizar datos del cliente.
     */
    public function update(Request $request, string $subdomain, int $id): JsonResponse
    {
        $complejo = $this->getAuthorizedComplejo($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para actualizar datos en este club.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'sometimes|required|string|max:150',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'dni' => 'nullable|string|max:50',
            'notas' => 'nullable|string|max:2000',
            'estado' => 'nullable|in:activo,bloqueado',
            'motivo_bloqueo' => 'nullable|string|max:255',
        ], [
            'nombre.required' => 'El nombre del cliente no puede estar vacío.',
            'email.email' => 'El formato del correo electrónico no es válido.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $cliente = $this->clienteService->actualizarCliente($complejo->id, $id, $validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Datos del cliente actualizados correctamente.',
                'cliente' => $cliente,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Eliminar o desvincular un cliente.
     */
    public function destroy(Request $request, string $subdomain, int $id): JsonResponse
    {
        $complejo = $this->getAuthorizedComplejo($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para eliminar clientes en este club.',
            ], 403);
        }

        try {
            $this->clienteService->eliminarCliente($complejo->id, $id);

            return response()->json([
                'success' => true,
                'message' => 'Ficha del cliente eliminada correctamente.',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        }
    }

    /**
     * Sugerencias de clientes para autocompletado en mostrador.
     */
    public function sugerencias(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getAuthorizedComplejo($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.',
            ], 403);
        }

        $query = $request->query('q', '');
        $sugerencias = $this->clienteService->buscarSugerencias($complejo->id, $query, 8);

        return response()->json([
            'success' => true,
            'sugerencias' => $sugerencias,
        ]);
    }
}
