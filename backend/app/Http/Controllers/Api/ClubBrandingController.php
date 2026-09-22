<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Services\ClubTemplateRegistry;
use App\Services\RevalidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ClubBrandingController extends Controller
{
    public function __construct(
        protected RevalidationService $revalidationService
    ) {}

    /**
     * Helper para verificar si el usuario autenticado tiene permisos de administración sobre el club.
     */
    protected function getComplejoForAdmin(Request $request, string $subdomain): ?Complejo
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return null;
        }

        $user = $request->user('sanctum');
        if (!$user) {
            return null;
        }

        $isOwner = $complejo->user_id && $complejo->user_id === $user->id;
        $isAdmin = ($user->role ?? '') === 'admin';

        if (!$isOwner && !$isAdmin) {
            return null;
        }

        return $complejo;
    }

    /**
     * GET /api/clubs/{subdomain}/branding
     * Retorna la identidad visual, colores, plantilla activa y enlaces de navegación del club.
     * Acceso público con soporte de caché en Redis (1 hora).
     */
    public function show(Request $request, string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $cacheKey = "tenant:branding:{$cleanSubdomain}";

        // 1. Intentar responder desde la caché de Redis
        try {
            $cached = Redis::get($cacheKey);
            if ($cached) {
                $decoded = json_decode($cached, true);
                if (is_array($decoded)) {
                    return response()->json([
                        'success' => true,
                        'source' => 'cache',
                        'data' => $decoded,
                    ]);
                }
            }
        } catch (\Throwable $e) {
            // Continuar sin caché si Redis no está disponible
        }

        // 2. Consultar base de datos
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'Complejo deportivo no encontrado.',
            ], 404);
        }

        $branding = $complejo->getBrandingData();
        $plantillaMeta = ClubTemplateRegistry::get($branding['plantilla_slug'])
            ?? ClubTemplateRegistry::get(ClubTemplateRegistry::defaultSlug());

        // 3. Páginas para menús de navegación
        $headerPages = $complejo->paginas()
            ->where('esta_publicada', true)
            ->where('mostrar_en_header', true)
            ->orderBy('orden', 'asc')
            ->orderBy('titulo', 'asc')
            ->get(['id', 'titulo', 'slug', 'orden']);

        $footerPages = $complejo->paginas()
            ->where('esta_publicada', true)
            ->where('mostrar_en_footer', true)
            ->orderBy('orden', 'asc')
            ->orderBy('titulo', 'asc')
            ->get(['id', 'titulo', 'slug', 'orden']);

        $payload = [
            'complejo_id' => $complejo->id,
            'uuid' => $complejo->uuid,
            'subdominio' => $complejo->subdominio,
            'nombre' => $complejo->nombre,
            'deporte_principal' => $complejo->deporte_principal,
            'ciudad' => $complejo->ciudad,
            'direccion' => $complejo->direccion,
            'telefono' => $complejo->telefono,
            'latitud' => $complejo->latitud !== null ? (float) $complejo->latitud : null,
            'longitud' => $complejo->longitud !== null ? (float) $complejo->longitud : null,
            'branding' => $branding,
            'plantilla' => $plantillaMeta,
            'navegacion' => [
                'header' => $headerPages,
                'footer' => $footerPages,
            ],
        ];

        // 4. Guardar en Redis con TTL de 3600 segundos (1 hora)
        try {
            Redis::setex($cacheKey, 3600, json_encode($payload));
        } catch (\Throwable $e) {
            // Ignorar errores de escritura en caché
        }

        return response()->json([
            'success' => true,
            'source' => 'database',
            'data' => $payload,
        ]);
    }

    /**
     * GET /api/clubs/{subdomain}/branding/templates
     * Retorna el catálogo completo de plantillas registradas y cuál tiene activa el club.
     */
    public function templates(string $subdomain): JsonResponse
    {
        $cleanSubdomain = strtolower(trim($subdomain));

        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        $activeSlug = $complejo?->plantilla_slug ?: ClubTemplateRegistry::defaultSlug();

        return response()->json([
            'success' => true,
            'data' => [
                'plantilla_activa' => $activeSlug,
                'plantillas' => array_values(ClubTemplateRegistry::all()),
            ],
        ]);
    }

    /**
     * PUT /api/clubs/{subdomain}/branding
     * Actualiza la identidad visual, colores HEX, plantilla y redes sociales del club.
     * Invalida la caché de Redis y dispara revalidación on-demand hacia Next.js.
     */
    public function update(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para modificar el diseño de este club.',
            ], 403);
        }

        $hexRegex = '/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/';
        $validSlugs = implode(',', ClubTemplateRegistry::slugs());

        $validated = $request->validate([
            'plantilla_slug' => ['sometimes', 'required', 'string', "in:{$validSlugs}"],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'portada_url' => ['nullable', 'string', 'max:500'],
            'color_primario' => ['nullable', 'string', "regex:{$hexRegex}"],
            'color_secundario' => ['nullable', 'string', "regex:{$hexRegex}"],
            'color_acento' => ['nullable', 'string', "regex:{$hexRegex}"],
            'color_fondo' => ['nullable', 'string', "regex:{$hexRegex}"],
            'eslogan' => ['nullable', 'string', 'max:255'],
            'descripcion_corta' => ['nullable', 'string', 'max:1000'],
            'redes_sociales' => ['nullable', 'array'],
            'redes_sociales.instagram' => ['nullable', 'string', 'max:255'],
            'redes_sociales.facebook' => ['nullable', 'string', 'max:255'],
            'redes_sociales.tiktok' => ['nullable', 'string', 'max:255'],
            'redes_sociales.youtube' => ['nullable', 'string', 'max:255'],
            'redes_sociales.sitio_web' => ['nullable', 'string', 'max:255'],
        ], [
            'color_primario.regex' => 'El color primario debe ser un código HEX válido (ej: #10b981).',
            'color_secundario.regex' => 'El color secundario debe ser un código HEX válido (ej: #047857).',
            'color_acento.regex' => 'El color de acento debe ser un código HEX válido (ej: #06b6d4).',
            'color_fondo.regex' => 'El color de fondo debe ser un código HEX válido (ej: #020617).',
            'plantilla_slug.in' => "La plantilla seleccionada no es válida. Opciones: {$validSlugs}.",
        ]);

        $updateData = [];
        foreach ($validated as $key => $value) {
            $updateData[$key] = $value;
        }

        $complejo->update($updateData);

        // 1. Invalidar caché en Redis
        $cleanSubdomain = strtolower(trim($subdomain));
        try {
            Redis::del("tenant:branding:{$cleanSubdomain}");
        } catch (\Throwable $e) {
            // Ignorar
        }

        // 2. Disparar revalidación on-demand hacia Next.js
        $revalidated = $this->revalidationService->revalidateTenantPath($cleanSubdomain, '/');

        return response()->json([
            'success' => true,
            'message' => 'Identidad de marca y plantilla actualizadas exitosamente.',
            'revalidated' => $revalidated,
            'data' => [
                'branding' => $complejo->getBrandingData(),
                'plantilla' => ClubTemplateRegistry::get($complejo->plantilla_slug),
            ],
        ]);
    }

    /**
     * POST /api/clubs/{subdomain}/branding/upload
     * Subida directa de imágenes para logo o banner de portada.
     */
    public function upload(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);

        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para subir imágenes a este club.',
            ], 403);
        }

        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpeg,png,webp,svg,jpg', 'max:4096'],
            'tipo' => ['required', 'string', 'in:logo,portada'],
            'actualizar_directo' => ['nullable', 'boolean'],
        ], [
            'file.max' => 'La imagen no puede superar los 4MB.',
            'file.mimes' => 'El formato debe ser JPEG, PNG, WEBP o SVG.',
            'tipo.in' => 'El tipo de asset debe ser "logo" o "portada".',
        ]);

        $file = $request->file('file');
        $tipo = $request->input('tipo');
        $extension = $file->getClientOriginalExtension() ?: 'webp';
        $filename = "{$tipo}_" . Str::random(12) . ".{$extension}";
        $cleanSubdomain = strtolower(trim($subdomain));

        $path = "tenants/{$cleanSubdomain}/branding/{$filename}";
        Storage::disk('public')->put($path, file_get_contents($file));

        $publicUrl = Storage::disk('public')->url($path);

        // Si se pide actualizar directo en el club (default true)
        $actualizarDirecto = $request->boolean('actualizar_directo', true);
        if ($actualizarDirecto) {
            if ($tipo === 'logo') {
                $complejo->update(['logo_url' => $publicUrl]);
            } elseif ($tipo === 'portada') {
                $complejo->update(['portada_url' => $publicUrl]);
            }

            try {
                Redis::del("tenant:branding:{$cleanSubdomain}");
            } catch (\Throwable $e) {}

            $this->revalidationService->revalidateTenantPath($cleanSubdomain, '/');
        }

        return response()->json([
            'success' => true,
            'message' => 'Imagen subida exitosamente.',
            'url' => $publicUrl,
            'tipo' => $tipo,
            'branding' => $complejo->getBrandingData(),
        ], 201);
    }
}
