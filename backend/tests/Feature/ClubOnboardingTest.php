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

class ClubOnboardingTest extends TestCase
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

    public function test_check_subdomain_validation(): void
    {
        // 1. Subdomain available
        $res = $this->getJson('/api/clubs/check-subdomain?subdomain=club-nuevo-2026');
        $res->assertStatus(200)
            ->assertJsonPath('available', true)
            ->assertJsonPath('subdominio', 'club-nuevo-2026');

        // 2. Reserved subdomain
        $resReserved = $this->getJson('/api/clubs/check-subdomain?subdomain=admin');
        $resReserved->assertStatus(422)
            ->assertJsonPath('available', false);

        // 3. Existing subdomain
        Complejo::create([
            'nombre' => 'Club Existente',
            'subdominio' => 'club-existente',
            'plan_id' => Plan::first()->id,
            'estado' => 'activo',
        ]);

        $resExists = $this->getJson('/api/clubs/check-subdomain?subdomain=club-existente');
        $resExists->assertStatus(200)
            ->assertJsonPath('available', false);
    }

    public function test_registrar_club_unified_guest_creates_account_and_club(): void
    {
        $payload = [
            'nombre_admin' => 'Martín Palermo',
            'email_admin' => 'martin@palermopadel.com',
            'password_admin' => 'SuperPassword123!',
            'nombre_club' => 'Palermo Pádel Center',
            'subdominio' => 'palermo-padel',
            'plan_slug' => 'oro',
            'deporte_principal' => 'padel',
            'telefono' => '+54 11 4444-5555',
            'ciudad' => 'Buenos Aires',
            'direccion' => 'Av. Santa Fe 3000',
            'canchas' => [
                ['nombre' => 'Cancha 1 (Panorámica)', 'deporte' => 'padel', 'tipo_superficie' => 'cristal', 'precio' => 10000],
                ['nombre' => 'Cancha 2 (Sintético)', 'deporte' => 'padel', 'tipo_superficie' => 'sintetico', 'precio' => 8500],
            ],
        ];

        $response = $this->postJson('/api/clubs/registro', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['token', 'user', 'complejo', 'subdomain_url'])
            ->assertJsonPath('complejo.subdominio', 'palermo-padel')
            ->assertJsonPath('complejo.nombre', 'Palermo Pádel Center');

        // Verify User was created
        $user = User::where('email', 'martin@palermopadel.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('Martín Palermo', $user->name);

        // Verify Complejo was created and linked
        $complejo = Complejo::where('subdominio', 'palermo-padel')->first();
        $this->assertNotNull($complejo);
        $this->assertEquals($user->id, $complejo->user_id);
        $this->assertEquals('oro', $complejo->plan->slug);

        // Verify HorariosAtencion (7 days created)
        $this->assertCount(7, $complejo->horariosAtencion);

        // Verify Canchas (2 created)
        $this->assertCount(2, $complejo->canchas);
    }

    public function test_registrar_club_authenticated_existing_user(): void
    {
        $existingUser = User::factory()->create([
            'name' => 'Dueño Existente',
            'email' => 'dueno@existente.com',
        ]);

        $payload = [
            'nombre_club' => 'Segundo Club Deportivo',
            'subdominio' => 'segundo-club',
            'plan_slug' => 'plata',
            'deporte_principal' => 'tenis',
            'ciudad' => 'Rosario',
        ];

        $response = $this->actingAs($existingUser, 'sanctum')
            ->postJson('/api/clubs/registro', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.email', 'dueno@existente.com')
            ->assertJsonPath('complejo.subdominio', 'segundo-club');

        $complejo = Complejo::where('subdominio', 'segundo-club')->first();
        $this->assertNotNull($complejo);
        $this->assertEquals($existingUser->id, $complejo->user_id);
        // Created 1 default court when no courts passed
        $this->assertCount(1, $complejo->canchas);
    }

    public function test_registrar_club_validates_duplicate_subdomain_and_invalid_plan(): void
    {
        Complejo::create([
            'nombre' => 'Club Alpha',
            'subdominio' => 'club-alpha',
            'plan_id' => Plan::first()->id,
            'estado' => 'activo',
        ]);

        $payload = [
            'nombre_admin' => 'Juan Perez',
            'email_admin' => 'juan@test.com',
            'password_admin' => 'password123',
            'nombre_club' => 'Otro Club',
            'subdominio' => 'club-alpha', // Duplicate!
            'plan_slug' => 'plan_inexistente',
        ];

        $response = $this->postJson('/api/clubs/registro', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['subdominio', 'plan_slug']);
    }

    public function test_get_planes_endpoint(): void
    {
        $res = $this->getJson('/api/planes');
        $res->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'nombre', 'slug', 'precio_mensual', 'modulos']]]);
    }
}
