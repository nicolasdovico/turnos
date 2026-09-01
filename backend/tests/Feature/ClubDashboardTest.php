<?php

namespace Tests\Feature;

use App\Models\Complejo;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);
    }

    public function test_check_is_admin_for_guest_regular_user_and_owner(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@owner.com',
        ]);

        $regularClient = User::factory()->create([
            'name' => 'Cliente Jugador',
            'email' => 'cliente@jugador.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-padel-auth',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // 1. Guest (unauthenticated visitor) -> is_admin: false
        $resGuest = $this->getJson('/api/clubs/nico-padel-auth/is-admin');
        $resGuest->assertStatus(200)
            ->assertJsonPath('is_admin', false)
            ->assertJsonPath('is_authenticated', false);

        // 2. Regular client logged in -> is_admin: false
        $resClient = $this->actingAs($regularClient, 'sanctum')
            ->getJson('/api/clubs/nico-padel-auth/is-admin');
        $resClient->assertStatus(200)
            ->assertJsonPath('is_admin', false)
            ->assertJsonPath('is_authenticated', true);

        // 3. Owner of the club logged in -> is_admin: true
        $resOwner = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clubs/nico-padel-auth/is-admin');
        $resOwner->assertStatus(200)
            ->assertJsonPath('is_admin', true)
            ->assertJsonPath('is_authenticated', true)
            ->assertJsonPath('club_name', 'Nico Pádel Club');
    }

    public function test_get_club_dashboard_data(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@test.com',
        ]);

        $plan = Plan::where('slug', 'oro')->first();

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-padel-dash',
            'plan_id' => $plan->id,
            'deporte_principal' => 'padel',
            'ciudad' => 'Luján',
            'estado' => 'activo',
        ]);

        $response = $this->getJson('/api/clubs/nico-padel-dash/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.complejo.nombre', 'Nico Pádel Club')
            ->assertJsonPath('data.complejo.subdominio', 'nico-padel-dash')
            ->assertJsonPath('data.complejo.owner.name', 'Nicolás Dueño')
            ->assertJsonPath('data.plan.slug', 'oro');
    }

    public function test_store_cancha_from_club_dashboard(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Club Canchas',
            'subdominio' => 'club-canchas',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $payload = [
            'nombre' => 'Cancha 4 Panorámica',
            'superficie' => 'cristal',
            'precio_base' => 9500,
            'techada' => true,
        ];

        $response = $this->postJson('/api/clubs/club-canchas/canchas', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cancha.nombre', 'Cancha 4 Panorámica')
            ->assertJsonPath('cancha.precio_base', '9500.00');

        $this->assertDatabaseHas('canchas', [
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 4 Panorámica',
        ]);
    }

    public function test_club_owner_can_update_payment_and_cancellation_policies(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@owner-policy.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-policy-club',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
            'porcentaje_sena' => 50.00,
            'horas_limite_cancelacion' => 4,
            'tipo_cobro_reserva' => 'sena',
            'permite_mostrador_publico' => true,
        ]);

        $payload = [
            'porcentaje_sena' => 30.00,
            'horas_limite_cancelacion' => 6,
            'tipo_cobro_reserva' => 'sena',
            'permite_mostrador_publico' => false,
            'telefono' => '+54 9 11 9999-8888',
        ];

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-policy-club/configuracion', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('complejo.porcentaje_sena', 30)
            ->assertJsonPath('complejo.horas_limite_cancelacion', 6)
            ->assertJsonPath('complejo.permite_mostrador_publico', false);

        $this->assertDatabaseHas('complejos', [
            'id' => $complejo->id,
            'porcentaje_sena' => 30.00,
            'horas_limite_cancelacion' => 6,
            'permite_mostrador_publico' => false,
        ]);
    }

    public function test_non_owner_cannot_update_club_policies(): void
    {
        $owner = User::factory()->create([
            'name' => 'Dueño Real',
            'email' => 'dueno@real.com',
        ]);

        $intruder = User::factory()->create([
            'name' => 'Otro Usuario',
            'email' => 'otro@usuario.com',
        ]);

        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Privado',
            'subdominio' => 'club-privado',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
            'porcentaje_sena' => 50.00,
        ]);

        $response = $this->actingAs($intruder, 'sanctum')
            ->putJson('/api/clubs/club-privado/configuracion', [
                'porcentaje_sena' => 20.00,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_club_owner_can_update_weekly_business_hours(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@horarios.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-horarios-club',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // Create initial hours for all 7 days
        for ($d = 0; $d <= 6; $d++) {
            \App\Models\HorarioAtencion::create([
                'complejo_id' => $complejo->id,
                'dia_semana' => $d,
                'hora_apertura' => '08:00',
                'hora_cierre' => '23:00',
                'duracion_turno_minutos' => 60,
            ]);
        }

        // Payload: Monday to Friday 09:00 - 22:00 (90 min), Saturday 09:00 - 18:00 (60 min), Sunday Closed
        $payload = [
            'horarios' => [
                ['dia_semana' => 1, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 2, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 3, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 4, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 5, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 6, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '18:00', 'duracion_turno_minutos' => 60],
                ['dia_semana' => 0, 'abierto' => false],
            ],
        ];

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-horarios-club/horarios', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(6, 'horarios');

        // Check DB has Lunes (1) updated
        $this->assertDatabaseHas('horarios_atencion', [
            'complejo_id' => $complejo->id,
            'dia_semana' => 1,
            'hora_apertura' => '09:00:00',
            'hora_cierre' => '22:00:00',
            'duracion_turno_minutos' => 90,
        ]);

        // Check DB does NOT have Domingo (0)
        $this->assertDatabaseMissing('horarios_atencion', [
            'complejo_id' => $complejo->id,
            'dia_semana' => 0,
        ]);
    }

    public function test_non_owner_cannot_update_club_horarios(): void
    {
        $owner = User::factory()->create(['email' => 'owner@club.com']);
        $intruder = User::factory()->create(['email' => 'intruder@club.com']);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Exclusivo',
            'subdominio' => 'club-exclusivo',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($intruder, 'sanctum')
            ->putJson('/api/clubs/club-exclusivo/horarios', [
                'horarios' => [
                    ['dia_semana' => 1, 'abierto' => true, 'hora_apertura' => '10:00', 'hora_cierre' => '20:00'],
                ],
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_validates_opening_time_before_closing_time(): void
    {
        $owner = User::factory()->create(['email' => 'owner2@club.com']);

        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Horas Invalidas',
            'subdominio' => 'club-invalid',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // Apertura 22:00 y Cierre 08:00 (Invalido)
        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/club-invalid/horarios', [
                'horarios' => [
                    ['dia_semana' => 1, 'abierto' => true, 'hora_apertura' => '22:00', 'hora_cierre' => '08:00', 'duracion_turno_minutos' => 60],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
