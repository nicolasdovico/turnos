<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    /**
     * Test health check endpoint returns success when database and redis are operational.
     */
    public function test_health_check_returns_ok_with_database_and_redis(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'services' => [
                    'database',
                    'redis',
                ],
                'timestamp',
            ])
            ->assertJson([
                'status' => 'ok',
                'services' => [
                    'database' => 'connected',
                    'redis' => 'connected',
                ],
            ]);
    }

    /**
     * Test health check reports degraded status when database fails.
     */
    public function test_health_check_handles_database_failure(): void
    {
        DB::shouldReceive('connection->getPdo')
            ->once()
            ->andThrow(new \Exception('Database connection failed'));

        $response = $this->getJson('/api/health');

        $response->assertStatus(503)
            ->assertJson([
                'status' => 'degraded',
            ]);
    }

    /**
     * Test health check reports degraded status when redis fails.
     */
    public function test_health_check_handles_redis_failure(): void
    {
        Redis::shouldReceive('connection->ping')
            ->once()
            ->andThrow(new \Exception('Redis connection failed'));

        $response = $this->getJson('/api/health');

        $response->assertStatus(503)
            ->assertJson([
                'status' => 'degraded',
            ]);
    }
}
