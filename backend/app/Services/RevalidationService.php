<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class RevalidationService
{
    /**
     * Dispatch an on-demand ISR revalidation request to the Next.js frontend.
     */
    public function revalidateTenantPath(string $subdomain, string $path): bool
    {
        $frontendUrl = rtrim(config('services.frontend.url', env('FRONTEND_URL', 'http://frontend:3000')), '/');
        $secret = config('services.frontend.revalidate_secret', env('REVALIDATE_SECRET_TOKEN', 'turnos-secret-revalidate-token'));

        $endpoint = "{$frontendUrl}/api/revalidate";

        try {
            $response = Http::timeout(3)->post($endpoint, [
                'secret' => $secret,
                'subdomain' => $subdomain,
                'path' => $path,
            ]);

            if ($response->successful()) {
                Log::info("Successfully revalidated path [{$path}] for subdomain [{$subdomain}].");
                return true;
            }

            Log::warning("Revalidation request failed with status [{$response->status()}] for path [{$path}].");
            return false;
        } catch (Throwable $e) {
            Log::error("Error dispatching revalidation request to Next.js: {$e->getMessage()}");
            return false;
        }
    }
}
