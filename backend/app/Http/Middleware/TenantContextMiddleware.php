<?php

namespace App\Http\Middleware;

use App\Models\Complejo;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantContextMiddleware
{
    /**
     * Handle an incoming request and resolve active tenant context.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = null;

        // 1. Resolve from X-Tenant-ID header if provided
        $tenantHeader = $request->header('X-Tenant-ID');
        if ($tenantHeader !== null && $tenantHeader !== '') {
            $tenant = $this->resolveByHeader((string) $tenantHeader);

            if (!$tenant) {
                return response()->json([
                    'error' => 'TENANT_NOT_FOUND',
                    'message' => 'El complejo especificado en la cabecera no fue encontrado.',
                ], 404);
            }
        }

        // 2. If not resolved from header, resolve from Host (custom domain or subdomain)
        if (!$tenant) {
            $tenant = $this->resolveByHost($request->getHost());
        }

        // 3. Bind or clear tenant in container and request
        if ($tenant) {
            app()->instance('currentTenant', $tenant);
            $request->attributes->set('tenant', $tenant);
        } else {
            if (app()->bound('currentTenant')) {
                app()->forgetInstance('currentTenant');
            }
            $request->attributes->remove('tenant');
        }

        return $next($request);
    }

    /**
     * Resolve tenant from header by ID, UUID or subdomain.
     */
    protected function resolveByHeader(string $identifier): ?Complejo
    {
        if (is_numeric($identifier)) {
            $tenant = Complejo::find((int) $identifier);
            if ($tenant) {
                return $tenant;
            }
        }

        if (\Illuminate\Support\Str::isUuid($identifier)) {
            $tenant = Complejo::where('uuid', $identifier)->first();
            if ($tenant) {
                return $tenant;
            }
        }

        return Complejo::where('subdominio', $identifier)->first();
    }

    /**
     * Resolve tenant by host domain or subdomain.
     */
    protected function resolveByHost(string $host): ?Complejo
    {
        // Check custom domain
        $tenant = Complejo::where('dominio_personalizado', $host)->first();
        if ($tenant) {
            return $tenant;
        }

        // Check subdomain
        $parts = explode('.', $host);
        if (count($parts) >= 2) {
            $subdomain = strtolower($parts[0]);
            $reserved = ['api', 'www', 'admin', 'app', 'localhost', '127', '0'];

            if (!in_array($subdomain, $reserved, true)) {
                return Complejo::where('subdominio', $subdomain)->first();
            }
        }

        return null;
    }
}
