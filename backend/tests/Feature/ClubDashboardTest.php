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
}
