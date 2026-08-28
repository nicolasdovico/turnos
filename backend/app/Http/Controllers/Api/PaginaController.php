<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pagina;
use App\Services\RevalidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaginaController extends Controller
{
    public function __construct(
        protected RevalidationService $revalidationService
    ) {}

    /**
     * List all CMS pages for current tenant.
     */
    public function index(): JsonResponse
    {
        $paginas = Pagina::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $paginas,
        ]);
    }

    /**
     * Get a specific page by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $pagina = Pagina::where('slug', $slug)->first();

        if (!$pagina) {
            return response()->json([
                'error' => 'PAGE_NOT_FOUND',
                'message' => 'La página solicitada no existe.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $pagina,
        ]);
    }

    /**
     * Create a new page and notify Next.js for ISR revalidation.
     */
    public function store(Request $request): JsonResponse
    {
        $tenant = app('currentTenant');

        $validated = $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('paginas', 'slug')->where(fn ($query) => $query->where('complejo_id', $tenant?->id)),
            ],
            'contenido_html' => ['required', 'string'],
            'esta_publicada' => ['nullable', 'boolean'],
        ]);

        $pagina = Pagina::create([
            'titulo' => $validated['titulo'],
            'slug' => $validated['slug'] ?? null,
            'contenido_html' => $validated['contenido_html'],
            'esta_publicada' => $validated['esta_publicada'] ?? true,
        ]);

        if ($tenant) {
            $path = "/tenants/{$tenant->subdominio}/paginas/{$pagina->slug}";
            $this->revalidationService->revalidateTenantPath($tenant->subdominio, $path);
        }

        return response()->json([
            'success' => true,
            'message' => 'Página creada y revalidación disparada.',
            'data' => $pagina,
        ], 201);
    }

    /**
     * Update page and notify Next.js for ISR revalidation.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = app('currentTenant');
        $pagina = Pagina::where('id', $id)->first();

        if (!$pagina) {
            return response()->json([
                'error' => 'PAGE_NOT_FOUND',
                'message' => 'La página no fue encontrada.',
            ], 404);
        }

        $validated = $request->validate([
            'titulo' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('paginas', 'slug')
                    ->where(fn ($query) => $query->where('complejo_id', $tenant?->id))
                    ->ignore($pagina->id),
            ],
            'contenido_html' => ['sometimes', 'required', 'string'],
            'esta_publicada' => ['sometimes', 'boolean'],
        ]);

        $pagina->update($validated);

        if ($tenant) {
            $path = "/tenants/{$tenant->subdominio}/paginas/{$pagina->slug}";
            $this->revalidationService->revalidateTenantPath($tenant->subdominio, $path);
        }

        return response()->json([
            'success' => true,
            'message' => 'Página actualizada exitosamente y revalidación solicitada.',
            'data' => $pagina,
        ]);
    }

    /**
     * Delete page and notify Next.js.
     */
    public function destroy(int $id): JsonResponse
    {
        $tenant = app('currentTenant');
        $pagina = Pagina::where('id', $id)->first();

        if (!$pagina) {
            return response()->json([
                'error' => 'PAGE_NOT_FOUND',
                'message' => 'La página no fue encontrada.',
            ], 404);
        }

        $slug = $pagina->slug;
        $pagina->delete();

        if ($tenant) {
            $path = "/tenants/{$tenant->subdominio}/paginas/{$slug}";
            $this->revalidationService->revalidateTenantPath($tenant->subdominio, $path);
        }

        return response()->json([
            'success' => true,
            'message' => 'Página eliminada exitosamente.',
        ]);
    }

    /**
     * Manual endpoint to trigger on-demand revalidation for a tenant path.
     */
    public function triggerRevalidate(Request $request): JsonResponse
    {
        $tenant = app('currentTenant');

        $validated = $request->validate([
            'path' => ['required', 'string'],
            'subdominio' => ['nullable', 'string'],
        ]);

        $subdomain = $validated['subdominio'] ?? $tenant?->subdominio ?? 'portal';
        $path = $validated['path'];

        $revalidated = $this->revalidationService->revalidateTenantPath($subdomain, $path);

        return response()->json([
            'success' => $revalidated,
            'message' => $revalidated
                ? "Revalidación exitosa para [{$path}]"
                : "No se pudo comunicar la revalidación a Next.js",
            'path' => $path,
            'subdominio' => $subdomain,
        ], $revalidated ? 200 : 502);
    }
}
