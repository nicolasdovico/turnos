<?php

namespace App\Http\Middleware;

use App\Models\Complejo;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTenantModule
{
    /**
     * Handle an incoming request and check if tenant has the requested module enabled.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $tenant = app()->bound('currentTenant') ? app('currentTenant') : null;

        if (!$tenant || !($tenant instanceof Complejo)) {
            return response()->json([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => $module,
                'message' => 'Se requiere el contexto de un complejo deportivo activo.',
            ], 403);
        }

        if (!$tenant->hasModule($module)) {
            return response()->json([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => $module,
            ], 403);
        }

        return $next($request);
    }
}
