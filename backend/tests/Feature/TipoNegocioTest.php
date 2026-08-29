<?php

namespace Tests\Feature;

use App\Models\Complejo;
use App\Models\Plan;
use App\Models\TipoNegocio;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TipoNegocioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed basic planes and tipos de negocio
        $this->seed(\Database\Seeders\TipoNegocioSeeder::class);
        $this->seed(\Database\Seeders\ModuloSeeder::class);
        $this->seed(\Database\Seeders\PlanSeeder::class);
    }

    public function test_get_tipos_negocio_returns_active_business_types(): void
    {
        $response = $this->getJson('/api/tipos-negocio');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'nombre', 'slug', 'descripcion', 'esta_activo'],
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, count($response->json('data')));
    }

    public function test_register_complex_with_selected_tipo_negocio_id(): void
    {
        $tipoComplejo = TipoNegocio::where('slug', 'complejo')->firstOrFail();
        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $payload = [
            'nombre_admin' => 'Carlos Complejo',
            'email_admin' => 'carlos@complejocentral.com',
            'password_admin' => 'Password123!',
            'nombre_club' => 'Complejo Deportivo Central',
            'subdominio' => 'complejo-central',
            'plan_slug' => 'oro',
            'tipo_negocio_id' => $tipoComplejo->id,
            'deporte_principal' => 'futbol',
        ];

        $response = $this->postJson('/api/clubs/registro', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $complejo = Complejo::where('subdominio', 'complejo-central')->first();
        $this->assertNotNull($complejo);
        $this->assertEquals($tipoComplejo->id, $complejo->tipo_negocio_id);
        $this->assertEquals('Complejo', $complejo->tipoNegocio->nombre);
        $this->assertEquals('complejo', $complejo->tipoNegocio->slug);
    }

    public function test_register_club_with_selected_tipo_negocio_slug(): void
    {
        $tipoClub = TipoNegocio::where('slug', 'club')->firstOrFail();

        $payload = [
            'nombre_admin' => 'Mario Club',
            'email_admin' => 'mario@clubsocial.com',
            'password_admin' => 'Password123!',
            'nombre_club' => 'Club Social y Deportivo',
            'subdominio' => 'club-social',
            'plan_slug' => 'bronce',
            'tipo_negocio_slug' => 'club',
        ];

        $response = $this->postJson('/api/clubs/registro', $payload);

        $response->assertStatus(201);

        $complejo = Complejo::where('subdominio', 'club-social')->first();
        $this->assertNotNull($complejo);
        $this->assertEquals($tipoClub->id, $complejo->tipo_negocio_id);
        $this->assertEquals('Club', $complejo->tipoNegocio->nombre);
    }

    public function test_dashboard_returns_tipo_negocio_data(): void
    {
        $user = User::factory()->create();
        $tipoComplejo = TipoNegocio::where('slug', 'complejo')->firstOrFail();
        $plan = Plan::where('slug', 'plata')->firstOrFail();

        $complejo = Complejo::create([
            'user_id' => $user->id,
            'nombre' => 'Complejo Norte',
            'subdominio' => 'complejo-norte',
            'plan_id' => $plan->id,
            'tipo_negocio_id' => $tipoComplejo->id,
            'estado' => 'activo',
        ]);

        $response = $this->getJson('/api/clubs/complejo-norte/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('data.complejo.tipo_negocio.slug', 'complejo')
            ->assertJsonPath('data.complejo.tipo_negocio.nombre', 'Complejo');
    }
}
