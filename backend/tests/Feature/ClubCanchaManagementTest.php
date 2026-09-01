<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubCanchaManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $this->complejo = Complejo::create([
            'nombre' => 'Club Pádel & Tenis Pro',
            'subdominio' => 'padel-tenis-pro',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-08-31 07:00:00', 'America/Argentina/Buenos_Aires'));
    }

    protected function tearDown(): void
    {
        \Carbon\Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_store_cancha_with_sport_aware_attributes_for_padel(): void
    {
        $payload = [
            'nombre' => 'Cancha 1 - Central Panorámica',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'precio_base' => 10000,
            'precio_con_luz' => 12500,
            'techada' => true,
            'iluminacion' => true,
            'tipo_iluminacion' => 'led',
            'camara_grabacion' => true,
            'marcador_digital' => true,
            'climatizada' => true,
            'tipo_cubierta' => 'indoor',
            'tipo_pared' => 'cristal_panoramico',
            'formato' => 'dobles',
            'estado' => 'activo',
        ];

        $response = $this->postJson('/api/clubs/padel-tenis-pro/canchas', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cancha.nombre', 'Cancha 1 - Central Panorámica')
            ->assertJsonPath('cancha.deporte', 'padel')
            ->assertJsonPath('cancha.tipo_pared', 'cristal_panoramico')
            ->assertJsonPath('cancha.camara_grabacion', true)
            ->assertJsonPath('cancha.precio_con_luz', '12500.00');

        $this->assertDatabaseHas('canchas', [
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 1 - Central Panorámica',
            'tipo_pared' => 'cristal_panoramico',
            'camara_grabacion' => true,
        ]);
    }

    public function test_store_cancha_for_tenis_or_futbol_sanitizes_walls_to_null(): void
    {
        $payload = [
            'nombre' => 'Cancha 2 - Tenis Clay',
            'deporte' => 'tenis',
            'superficie' => 'polvo_ladrillo',
            'precio_base' => 9000,
            'precio_con_luz' => 11000,
            'techada' => false,
            'iluminacion' => true,
            'tipo_pared' => 'cristal_panoramico', // Irrelevant for tennis, should be sanitized
            'formato' => 'single',
            'estado' => 'activo',
        ];

        $response = $this->postJson('/api/clubs/padel-tenis-pro/canchas', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cancha.deporte', 'tenis')
            ->assertJsonPath('cancha.tipo_pared', null);

        $this->assertDatabaseHas('canchas', [
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 2 - Tenis Clay',
            'tipo_pared' => null,
        ]);
    }

    public function test_update_cancha_attributes_and_pricing(): void
    {
        $cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha Original',
            'deporte' => 'padel',
            'superficie' => 'cemento',
            'precio_base' => 8000,
            'techada' => false,
            'estado' => 'activo',
        ]);

        $updatePayload = [
            'nombre' => 'Cancha Renombrada Panorámica',
            'deporte' => 'padel',
            'superficie' => 'sintetico_monofilamento',
            'precio_base' => 12000,
            'precio_con_luz' => 14000,
            'techada' => true,
            'iluminacion' => true,
            'tipo_iluminacion' => 'led',
            'camara_grabacion' => true,
            'marcador_digital' => true,
            'climatizada' => false,
            'tipo_cubierta' => 'indoor',
            'tipo_pared' => 'cristal_panoramico',
            'formato' => 'dobles',
            'estado' => 'mantenimiento',
        ];

        $response = $this->putJson("/api/clubs/padel-tenis-pro/canchas/{$cancha->id}", $updatePayload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cancha.nombre', 'Cancha Renombrada Panorámica')
            ->assertJsonPath('cancha.precio_base', '12000.00')
            ->assertJsonPath('cancha.precio_con_luz', '14000.00')
            ->assertJsonPath('cancha.estado', 'mantenimiento')
            ->assertJsonPath('cancha.camara_grabacion', true);

        $this->assertDatabaseHas('canchas', [
            'id' => $cancha->id,
            'nombre' => 'Cancha Renombrada Panorámica',
            'estado' => 'mantenimiento',
            'superficie' => 'sintetico_monofilamento',
        ]);
    }

    public function test_destroy_cancha_without_turnos_deletes_permanently(): void
    {
        $cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha a Borrar',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);

        $response = $this->deleteJson("/api/clubs/padel-tenis-pro/canchas/{$cancha->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('action', 'deleted');

        $this->assertDatabaseMissing('canchas', [
            'id' => $cancha->id,
        ]);
    }

    public function test_destroy_cancha_with_turnos_marks_it_inactiva(): void
    {
        $user = User::factory()->create();

        $cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha con Reservas',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);

        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $cancha->id,
            'user_id' => $user->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '18:00:00',
            'hora_fin' => '19:00:00',
            'precio' => 8000,
            'estado' => 'confirmado',
        ]);

        $response = $this->deleteJson("/api/clubs/padel-tenis-pro/canchas/{$cancha->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('action', 'deactivated');

        $this->assertDatabaseHas('canchas', [
            'id' => $cancha->id,
            'estado' => 'inactivo',
        ]);
    }

    public function test_dashboard_returns_canchas_sorted_alphabetically_by_name(): void
    {
        Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Zeta Court',
            'deporte' => 'padel',
            'superficie' => 'cemento',
            'precio_base' => 8000,
            'techada' => false,
            'estado' => 'activo',
        ]);

        Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Alpha Court',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'precio_base' => 10000,
            'techada' => true,
            'estado' => 'activo',
        ]);

        Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Beta Court',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 9000,
            'techada' => true,
            'estado' => 'activo',
        ]);

        $response = $this->getJson('/api/clubs/padel-tenis-pro/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $canchas = $response->json('data.canchas');
        $this->assertCount(3, $canchas);
        $this->assertEquals('Alpha Court', $canchas[0]['nombre']);
        $this->assertEquals('Beta Court', $canchas[1]['nombre']);
        $this->assertEquals('Zeta Court', $canchas[2]['nombre']);
    }

    public function test_store_and_update_cancha_with_duration_and_flexible_pricing(): void
    {
        $payload = [
            'nombre' => 'Cancha Pádel 90 min & Flexible',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'precio_base' => 8000,
            'precio_90_min' => 12000,
            'precio_120_min' => 16000,
            'duracion_minutos' => 90,
            'permite_duracion_flexible' => true,
            'duraciones_permitidas' => [60, 90, 120],
            'estado' => 'activo',
        ];

        $response = $this->postJson('/api/clubs/padel-tenis-pro/canchas', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cancha.duracion_minutos', 90)
            ->assertJsonPath('cancha.permite_duracion_flexible', true)
            ->assertJsonPath('cancha.precio_90_min', '12000.00')
            ->assertJsonPath('cancha.precio_120_min', '16000.00');

        $canchaId = $response->json('cancha.id');

        // Create HorarioAtencion for the complex
        \App\Models\HorarioAtencion::create([
            'complejo_id' => $this->complejo->id,
            'dia_semana' => 1, // Lunes
            'hora_apertura' => '08:00:00',
            'hora_cierre' => '12:30:00',
            'duracion_turno_minutos' => 60,
        ]);

        // Test disponibilidad with 90 min query param
        $dispResponse = $this->getJson(
            "/api/canchas/{$canchaId}/disponibilidad?fecha=2026-08-31&duracion=90",
            ['X-Tenant-ID' => 'padel-tenis-pro']
        ); // 2026-08-31 is Monday

        $dispResponse->assertStatus(200)
            ->assertJsonPath('cancha_id', $canchaId)
            ->assertJsonPath('duracion_minutos', 90)
            ->assertJsonPath('permite_duracion_flexible', true)
            ->assertJsonPath('precio_90_min', 12000);

        $slots = $dispResponse->json('slots_disponibles');
        $this->assertNotEmpty($slots);
        $this->assertEquals('08:00', $slots[0]['hora_inicio']);
        $this->assertEquals('09:30', $slots[0]['hora_fin']);
        $this->assertEquals(90, $slots[0]['duracion_minutos']);
        $this->assertEquals(12000, $slots[0]['precio']);
    }

    public function test_anti_baches_rule_prevents_orphan_30min_gaps(): void
    {
        $user = User::factory()->create();

        $cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha Pádel Flexible Anti-Baches',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'precio_base' => 8000,
            'duracion_minutos' => 60,
            'permite_duracion_flexible' => true,
            'anti_baches_activo' => true,
            'estado' => 'activo',
        ]);

        \App\Models\HorarioAtencion::create([
            'complejo_id' => $this->complejo->id,
            'dia_semana' => 2, // Martes
            'hora_apertura' => '16:00:00',
            'hora_cierre' => '22:00:00',
            'duracion_turno_minutos' => 60,
        ]);

        // Create an existing reservation at 20:00 to 21:00
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $cancha->id,
            'user_id' => $user->id,
            'fecha' => '2026-09-01', // Tuesday
            'hora_inicio' => '20:00:00',
            'hora_fin' => '21:00:00',
            'precio' => 8000,
            'estado' => 'confirmado',
        ]);

        // Request 90-minute slots
        $response = $this->getJson(
            "/api/canchas/{$cancha->id}/disponibilidad?fecha=2026-09-01&duracion=90",
            ['X-Tenant-ID' => 'padel-tenis-pro']
        );

        $response->assertStatus(200)
            ->assertJsonPath('anti_baches_activo', true);

        $slots = $response->json('slots_disponibles');
        $antiBaches = $response->json('optimizacion_anti_baches');

        // 18:00 to 19:30 should be BLOCKED because it leaves a 30-min gap (19:30 to 20:00)
        $has1800Slot = collect($slots)->contains(fn ($s) => $s['hora_inicio'] === '18:00' && $s['hora_fin'] === '19:30');
        $this->assertFalse($has1800Slot, 'El horario 18:00-19:30 debió ser bloqueado por dejar 30 min de bache');

        // 18:30 to 20:00 should be AVAILABLE because it finishes exactly at 20:00 (gap = 0 min)
        $has1830Slot = collect($slots)->contains(fn ($s) => $s['hora_inicio'] === '18:30' && $s['hora_fin'] === '20:00');
        $this->assertTrue($has1830Slot, 'El horario 18:30-20:00 debe estar disponible');

        // Anti-baches report should contain the protected slot with reason
        $this->assertGreaterThanOrEqual(1, $antiBaches['total_horarios_protegidos']);
        $hasProtected1800 = collect($antiBaches['horarios_protegidos'])->contains(
            fn ($p) => $p['hora_inicio'] === '18:00' && str_contains($p['motivo'], '30 min')
        );
        $this->assertTrue($hasProtected1800, 'El reporte anti-baches debe informar el motivo del horario 18:00');
    }
}
