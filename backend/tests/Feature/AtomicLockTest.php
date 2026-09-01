<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\DisponibilidadService;
use App\Services\ReservaLockService;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class AtomicLockTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected Cancha $cancha;
    protected User $userA;
    protected User $userB;
    protected string $fecha = '2026-09-01'; // Tuesday
    protected ReservaLockService $lockService;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $this->lockService = app(ReservaLockService::class);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejo = Complejo::create([
            'nombre' => 'Club Atletico Padel',
            'subdominio' => 'atletico',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejo);

        $this->cancha = Cancha::create([
            'nombre' => 'Cancha Central',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 15000.00,
            'estado' => 'activo',
        ]);

        // Tuesday schedule (day 2): 08:00 - 22:00
        HorarioAtencion::create([
            'dia_semana' => 2,
            'hora_apertura' => '08:00',
            'hora_cierre' => '22:00',
            'duracion_turno_minutos' => 60,
        ]);

        $this->userA = User::factory()->create(['name' => 'Usuario A', 'email' => 'a@example.com']);
        $this->userB = User::factory()->create(['name' => 'Usuario B', 'email' => 'b@example.com']);

        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-09-01 07:00:00', 'America/Argentina/Buenos_Aires'));
    }

    protected function tearDown(): void
    {
        \Carbon\Carbon::setTestNow();
        Redis::flushdb();
        parent::tearDown();
    }

    /**
     * Test concurrent race condition: only the first request acquires the lock, second gets 409 Conflict.
     */
    public function test_concurrent_requests_only_one_acquires_lock(): void
    {
        $payload = [
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fecha,
            'hora_inicio' => '19:00',
        ];

        // First user locks slot
        $responseA = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', $payload);

        $responseA->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '19:00',
                'expira_en_segundos' => 600,
            ])
            ->assertJsonStructure(['token_reserva']);

        $tokenReserva = $responseA->json('token_reserva');
        $this->assertNotEmpty($tokenReserva);

        // Second user attempts to lock the exact same slot -> 409 Conflict
        $responseB = $this->actingAs($this->userB)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', $payload);

        $responseB->assertStatus(409)
            ->assertJson([
                'error' => 'TURNO_ALREADY_LOCKED',
            ]);
    }

    /**
     * Test Redis lock key format and TTL expiration time.
     */
    public function test_redis_lock_key_and_ttl(): void
    {
        $payload = [
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fecha,
            'hora_inicio' => '20:00',
        ];

        $response = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', $payload);

        $response->assertStatus(200);

        $key = ReservaLockService::getLockKey($this->cancha->id, $this->fecha, '20:00');
        $this->assertTrue((bool) Redis::exists($key));

        $ttl = Redis::ttl($key);
        $this->assertGreaterThan(0, $ttl);
        $this->assertLessThanOrEqual(600, $ttl);
    }

    /**
     * Test releasing the lock allows another user to acquire it.
     */
    public function test_lock_release_allows_subsequent_acquisition(): void
    {
        $payload = [
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fecha,
            'hora_inicio' => '18:00',
        ];

        // User A acquires lock
        $responseA = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', $payload);

        $responseA->assertStatus(200);
        $token = $responseA->json('token_reserva');

        // User A releases lock
        $released = $this->lockService->liberarBloqueo($this->cancha->id, $this->fecha, '18:00', $token);
        $this->assertTrue($released);

        // User B can now acquire the lock
        $responseB = $this->actingAs($this->userB)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', $payload);

        $responseB->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    /**
     * Test slot with active DB reservation cannot be locked and returns 409.
     */
    public function test_cannot_lock_already_reserved_db_slot(): void
    {
        Turno::create([
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fecha,
            'hora_inicio' => '17:00',
            'hora_fin' => '18:00',
            'precio' => 15000.00,
            'estado' => 'reservado',
        ]);

        $payload = [
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fecha,
            'hora_inicio' => '17:00',
        ];

        $response = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', $payload);

        $response->assertStatus(409)
            ->assertJson([
                'error' => 'TURNO_ALREADY_LOCKED',
            ]);
    }

    /**
     * Test locking slot affects availability endpoint.
     */
    public function test_locked_slot_disappears_from_availability_endpoint(): void
    {
        // Check availability before lock: contains 19:00
        $dispResponseBefore = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha={$this->fecha}");
        $dispResponseBefore->assertStatus(200);
        $slotsBefore = array_column($dispResponseBefore->json('slots_disponibles'), 'hora_inicio');
        $this->assertContains('19:00', $slotsBefore);

        // Lock 19:00
        $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '19:00',
            ])->assertStatus(200);

        // Check availability after lock: 19:00 should NOT be present
        $dispResponseAfter = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha={$this->fecha}");
        $dispResponseAfter->assertStatus(200);
        $slotsAfter = array_column($dispResponseAfter->json('slots_disponibles'), 'hora_inicio');
        $this->assertNotContains('19:00', $slotsAfter);
    }

    /**
     * Test interval overlap prevention when locking slots with different durations (e.g. 90 min vs 60/90 min).
     */
    public function test_prevents_overlapping_locks_with_different_durations(): void
    {
        // Allow flexible duration on court
        $this->cancha->update([
            'permite_duracion_flexible' => true,
            'duracion_minutos' => 60,
        ]);

        // User A locks 09:00 to 10:30 (90 minutes)
        $responseA = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '09:00',
                'hora_fin' => '10:30',
                'duracion_minutos' => 90,
            ]);

        $responseA->assertStatus(200)
            ->assertJson(['success' => true]);

        // User B attempts to lock 09:30 to 11:00 (overlaps with [09:00, 10:30)) -> 409 Conflict
        $responseB = $this->actingAs($this->userB)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '09:30',
                'hora_fin' => '11:00',
                'duracion_minutos' => 90,
            ]);

        $responseB->assertStatus(409)
            ->assertJson(['error' => 'TURNO_ALREADY_LOCKED']);

        // User B attempts to lock 10:00 to 11:00 (overlaps with [09:00, 10:30)) -> 409 Conflict
        $responseB2 = $this->actingAs($this->userB)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '10:00',
                'hora_fin' => '11:00',
                'duracion_minutos' => 60,
            ]);

        $responseB2->assertStatus(409)
            ->assertJson(['error' => 'TURNO_ALREADY_LOCKED']);

        // User B attempts to lock 10:30 to 12:00 (does NOT overlap with [09:00, 10:30)) -> 200 OK
        $responseB3 = $this->actingAs($this->userB)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '10:30',
                'hora_fin' => '12:00',
                'duracion_minutos' => 90,
            ]);

        $responseB3->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    /**
     * Test availability endpoint hides all slots overlapping with an active temporary lock.
     */
    public function test_availability_hides_all_overlapping_slots_for_active_lock(): void
    {
        $this->cancha->update([
            'permite_duracion_flexible' => true,
            'duracion_minutos' => 60,
        ]);

        // User A locks 09:00 to 10:30 (90 min)
        $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '09:00',
                'hora_fin' => '10:30',
                'duracion_minutos' => 90,
            ])->assertStatus(200);

        // Fetch 90 min availability
        $dispResponse = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha={$this->fecha}&duracion=90");

        $dispResponse->assertStatus(200);
        $slots = array_column($dispResponse->json('slots_disponibles'), 'hora_inicio');

        // 09:00, 09:30, 10:00 must NOT be available because they overlap with [09:00, 10:30)
        $this->assertNotContains('09:00', $slots);
        $this->assertNotContains('09:30', $slots);
        $this->assertNotContains('10:00', $slots);

        // 10:30 must be available
        $this->assertContains('10:30', $slots);
    }

    /**
     * Test confirming reservation rejects overlapping turnos in database.
     */
    public function test_cannot_confirm_slot_overlapping_with_existing_db_turno(): void
    {
        // Existing confirmed turno from 14:00 to 15:30
        Turno::create([
            'cancha_id' => $this->cancha->id,
            'fecha' => $this->fecha,
            'hora_inicio' => '14:00',
            'hora_fin' => '15:30',
            'precio' => 15000.00,
            'estado' => 'reservado',
        ]);

        // Try to confirm turno starting at 14:30 to 16:00 (overlaps with [14:00, 15:30))
        $response = $this->actingAs($this->userB)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $this->fecha,
                'hora_inicio' => '14:30',
                'hora_fin' => '16:00',
            ]);

        $response->assertStatus(409)
            ->assertJson(['error' => 'SLOT_ALREADY_RESERVED']);
    }
}
