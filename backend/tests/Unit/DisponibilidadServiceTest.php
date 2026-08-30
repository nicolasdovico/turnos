<?php

namespace Tests\Unit;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Services\DisponibilidadService;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class DisponibilidadServiceTest extends TestCase
{
    use RefreshDatabase;

    protected DisponibilidadService $service;
    protected Complejo $complejo;
    protected Cancha $cancha;
    protected string $fechaLunes = '2026-08-31'; // A Monday (dia_semana = 1)
    protected string $fechaDomingo = '2026-08-30'; // A Sunday (dia_semana = 0)

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $this->service = app(DisponibilidadService::class);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejo = Complejo::create([
            'nombre' => 'Club Padel Pro',
            'subdominio' => 'padelpro',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejo);

        $this->cancha = Cancha::create([
            'nombre' => 'Cancha 1 Panoramica',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 12000.00,
            'estado' => 'activo',
        ]);

        // Monday schedule: 08:00 to 12:00, 60-minute duration (Slots: 08:00, 09:00, 10:00, 11:00)
        HorarioAtencion::create([
            'dia_semana' => 1, // Lunes
            'hora_apertura' => '08:00',
            'hora_cierre' => '12:00',
            'duracion_turno_minutos' => 60,
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    /**
     * Test returns all slots when no reservations or locks exist.
     */
    public function test_obtener_slots_disponibles_sin_reservas(): void
    {
        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaLunes);

        $this->assertCount(4, $slots);
        $this->assertEquals(['08:00', '09:00', '10:00', '11:00'], array_column($slots, 'hora_inicio'));
        $this->assertEquals(['09:00', '10:00', '11:00', '12:00'], array_column($slots, 'hora_fin'));
        $this->assertEquals(12000.00, $slots[0]['precio']);
        $this->assertEquals('disponible', $slots[0]['estado']);
    }

    /**
     * Test active database reservation excludes the slot from available list.
     */
    public function test_slot_ocupado_por_reserva_en_db_se_excluye(): void
    {
        Turno::create([
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fechaLunes,
            'hora_inicio' => '09:00',
            'hora_fin' => '10:00',
            'precio' => 12000.00,
            'estado' => 'reservado',
        ]);

        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaLunes);

        $this->assertCount(3, $slots);
        $this->assertEquals(['08:00', '10:00', '11:00'], array_column($slots, 'hora_inicio'));
    }

    /**
     * Test temporary Redis lock excludes the slot from available list.
     */
    public function test_slot_bloqueado_en_redis_se_excluye(): void
    {
        $lockKey = DisponibilidadService::getLockKey($this->cancha->id, $this->fechaLunes, '10:00');
        Redis::setex($lockKey, 600, 'session_123');

        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaLunes);

        $this->assertCount(3, $slots);
        $this->assertEquals(['08:00', '09:00', '11:00'], array_column($slots, 'hora_inicio'));

        // Clean up Redis key
        Redis::del($lockKey);
    }

    /**
     * Test combination of DB reservations and Redis locks.
     */
    public function test_slots_ocupados_en_db_y_redis_simultaneamente(): void
    {
        // 09:00 reserved in DB
        Turno::create([
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fechaLunes,
            'hora_inicio' => '09:00',
            'hora_fin' => '10:00',
            'precio' => 12000.00,
            'estado' => 'reservado',
        ]);

        // 10:00 locked in Redis
        $lockKey = DisponibilidadService::getLockKey($this->cancha->id, $this->fechaLunes, '10:00');
        Redis::setex($lockKey, 600, 'session_456');

        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaLunes);

        $this->assertCount(2, $slots);
        $this->assertEquals(['08:00', '11:00'], array_column($slots, 'hora_inicio'));

        // Clean up Redis key
        Redis::del($lockKey);
    }

    /**
     * Test cancelled reservation keeps slot available.
     */
    public function test_turno_cancelado_permanece_disponible(): void
    {
        Turno::create([
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fechaLunes,
            'hora_inicio' => '08:00',
            'hora_fin' => '09:00',
            'precio' => 12000.00,
            'estado' => 'cancelado',
        ]);

        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaLunes);

        $this->assertCount(4, $slots);
        $this->assertEquals(['08:00', '09:00', '10:00', '11:00'], array_column($slots, 'hora_inicio'));
    }

    /**
     * Test closed day returns empty array.
     */
    public function test_dia_sin_horario_de_atencion_retorna_vacio(): void
    {
        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaDomingo);

        $this->assertEmpty($slots);
    }

    /**
     * Test inactive court returns empty array.
     */
    public function test_cancha_inactiva_retorna_vacio(): void
    {
        $this->cancha->update(['estado' => 'mantenimiento']);

        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $this->fechaLunes);

        $this->assertEmpty($slots);
    }

    /**
     * Test API endpoint GET /api/canchas/{id}/disponibilidad.
     */
    public function test_endpoint_canchas_disponibilidad(): void
    {
        $response = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha={$this->fechaLunes}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'cancha_id',
                'cancha_nombre',
                'fecha',
                'slots_disponibles' => [
                    '*' => [
                        'cancha_id',
                        'fecha',
                        'hora_inicio',
                        'hora_fin',
                        'precio',
                        'estado',
                    ],
                ],
            ])
            ->assertJson([
                'cancha_id' => $this->cancha->id,
                'cancha_nombre' => 'Cancha 1 Panoramica',
                'fecha' => $this->fechaLunes,
            ]);

        $this->assertCount(4, $response->json('slots_disponibles'));
    }

    /**
     * Test past date (yesterday or earlier) returns empty available slots.
     */
    public function test_fecha_pasada_retorna_slots_vacios(): void
    {
        $fechaPasada = '2020-01-06'; // A past Monday
        $slots = $this->service->obtenerSlotsDisponibles($this->cancha->id, $fechaPasada);

        $this->assertEmpty($slots);

        $response = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha={$fechaPasada}");

        $response->assertStatus(200);
        $this->assertEmpty($response->json('slots_disponibles'));
    }

    /**
     * Test locking or confirming a past slot returns 422 Unprocessable Entity.
     */
    public function test_bloqueo_y_confirmacion_rechaza_horarios_pasados(): void
    {
        $fechaPasada = '2020-01-06';

        // 1. Bloqueo temporal en el pasado
        $lockRes = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $fechaPasada,
                'hora_inicio' => '10:00',
            ]);

        $lockRes->assertStatus(422)
            ->assertJson([
                'error' => 'PAST_SLOT_NOT_ALLOWED',
            ]);

        // 2. Confirmación directa en el pasado
        $confirmRes = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $fechaPasada,
                'hora_inicio' => '10:00',
                'hora_fin' => '11:00',
                'cliente_nombre' => 'Jugador Pasado',
            ]);

        $confirmRes->assertStatus(422)
            ->assertJson([
                'error' => 'PAST_SLOT_NOT_ALLOWED',
            ]);
    }
}
