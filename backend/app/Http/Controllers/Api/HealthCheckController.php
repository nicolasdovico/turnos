<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    /**
     * Check application, database and redis health status.
     */
    public function __invoke(): JsonResponse
    {
        $dbStatus = 'disconnected';
        $redisStatus = 'disconnected';
        $isHealthy = true;

        try {
            DB::connection()->getPdo();
            $dbStatus = 'connected';
        } catch (Exception $e) {
            $isHealthy = false;
            $dbStatus = 'error: ' . $e->getMessage();
        }

        try {
            Redis::connection()->ping();
            $redisStatus = 'connected';
        } catch (Exception $e) {
            $isHealthy = false;
            $redisStatus = 'error: ' . $e->getMessage();
        }

        $statusCode = $isHealthy ? 200 : 503;

        return response()->json([
            'status' => $isHealthy ? 'ok' : 'degraded',
            'services' => [
                'database' => $dbStatus,
                'redis' => $redisStatus,
            ],
            'timestamp' => now()->toIso8601String(),
        ], $statusCode);
    }
}
