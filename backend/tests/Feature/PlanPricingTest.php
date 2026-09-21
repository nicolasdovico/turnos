<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanPricingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\ModuloSeeder::class);
        $this->seed(\Database\Seeders\PlanSeeder::class);
    }

    public function test_plan_model_calculates_total_costs_with_court_quotas()
    {
        $planBronce = Plan::where('slug', 'bronce')->first();
        $this->assertEquals(2, $planBronce->canchas_incluidas);
        $this->assertEquals(8.00, $planBronce->precio_cancha_adicional);

        // 2 canchas: Dentro del cupo base
        $costo2 = $planBronce->calcularCostoTotal(2);
        $this->assertEquals(2, $costo2['canchas_incluidas']);
        $this->assertEquals(0, $costo2['canchas_excedentes']);
        $this->assertEquals(0, $costo2['costo_adicional_total']);
        $this->assertEquals(29.00, $costo2['total_mensual']);

        // 3 canchas: 1 excedente
        $costo3 = $planBronce->calcularCostoTotal(3);
        $this->assertEquals(1, $costo3['canchas_excedentes']);
        $this->assertEquals(8.00, $costo3['costo_adicional_total']);
        $this->assertEquals(37.00, $costo3['total_mensual']);

        // 5 canchas: 3 excedentes (3 * 8 = 24)
        $costo5 = $planBronce->calcularCostoTotal(5);
        $this->assertEquals(3, $costo5['canchas_excedentes']);
        $this->assertEquals(24.00, $costo5['costo_adicional_total']);
        $this->assertEquals(53.00, $costo5['total_mensual']);
    }

    public function test_get_planes_endpoint_exposes_canchas_pricing_data()
    {
        $response = $this->getJson('/api/planes');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'nombre',
                    'slug',
                    'precio_mensual',
                    'canchas_incluidas',
                    'precio_cancha_adicional',
                    'modulos',
                ],
            ],
        ]);

        $data = $response->json('data');
        $bronce = collect($data)->firstWhere('slug', 'bronce');
        $plata = collect($data)->firstWhere('slug', 'plata');
        $oro = collect($data)->firstWhere('slug', 'oro');

        $this->assertEquals(2, $bronce['canchas_incluidas']);
        $this->assertEquals(8.00, $bronce['precio_cancha_adicional']);

        $this->assertEquals(4, $plata['canchas_incluidas']);
        $this->assertEquals(10.00, $plata['precio_cancha_adicional']);

        $this->assertEquals(6, $oro['canchas_incluidas']);
        $this->assertEquals(12.00, $oro['precio_cancha_adicional']);
    }

    public function test_club_dashboard_returns_plan_court_quota_metrics()
    {
        $plan = Plan::where('slug', 'bronce')->first();
        $user = User::factory()->create();

        $complejo = Complejo::create([
            'nombre' => 'Club Las Heras',
            'subdominio' => 'las-heras',
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'estado' => 'activo',
        ]);

        // Create 1 cancha
        Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);

        $response = $this->getJson("/api/clubs/{$complejo->subdominio}/dashboard");
        $response->assertStatus(200);

        $planData = $response->json('data.plan');
        $this->assertEquals(2, $planData['canchas_incluidas']);
        $this->assertEquals(8.00, $planData['precio_cancha_adicional']);
        $this->assertEquals(1, $planData['canchas_utilizadas']);
        $this->assertEquals(1, $planData['canchas_disponibles_cupo']);
        $this->assertEquals(0, $planData['canchas_excedentes']);
        $this->assertEquals(29.00, $planData['costo_total_mensual']);
    }

    public function test_store_cancha_validates_quota_and_requires_confirmation_for_extra_court()
    {
        $plan = Plan::where('slug', 'bronce')->first(); // cupo: 2 canchas
        $user = User::factory()->create();

        $complejo = Complejo::create([
            'nombre' => 'Padel Test Quota',
            'subdominio' => 'test-quota',
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'estado' => 'activo',
        ]);

        // Crear 2 canchas (llega al cupo máximo de 2)
        Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);
        Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 2',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);

        // Intentar crear la 3ra cancha sin aceptar cargo adicional -> 422
        $resExtraReject = $this->postJson("/api/clubs/{$complejo->subdominio}/canchas", [
            'nombre' => 'Cancha 3 Excedente',
            'deporte' => 'padel',
            'precio_base' => 10000,
        ]);

        $resExtraReject->assertStatus(422);
        $resExtraReject->assertJson([
            'success' => false,
            'code' => 'REQUIRES_EXTRA_COURT_CONFIRMATION',
            'canchas_incluidas' => 2,
            'canchas_actuales' => 2,
            'precio_cancha_adicional' => 8.00,
            'nuevo_costo_adicional' => 8.00,
            'nuevo_total_mensual' => 37.00,
            'data' => [
                'canchas_incluidas' => 2,
                'canchas_actuales' => 2,
                'precio_cancha_adicional' => 8.00,
                'nuevo_costo_adicional' => 8.00,
                'nuevo_total_mensual' => 37.00,
            ],
        ]);

        // Intentar crear la 3ra cancha con acepta_cargo_adicional: true -> 201 Creada
        $resExtraAccept = $this->postJson("/api/clubs/{$complejo->subdominio}/canchas", [
            'nombre' => 'Cancha 3 Excedente',
            'deporte' => 'padel',
            'precio_base' => 10000,
            'acepta_cargo_adicional' => true,
        ]);

        $resExtraAccept->assertStatus(201);
        $this->assertEquals(3, Cancha::where('complejo_id', $complejo->id)->count());

        // Verificar que el dashboard ahora refleja 1 cancha excedente y nuevo costo mensual
        $resDash = $this->getJson("/api/clubs/{$complejo->subdominio}/dashboard");
        $resDash->assertStatus(200);
        $planData = $resDash->json('data.plan');
        $this->assertEquals(3, $planData['canchas_utilizadas']);
        $this->assertEquals(0, $planData['canchas_disponibles_cupo']);
        $this->assertEquals(1, $planData['canchas_excedentes']);
        $this->assertEquals(8.00, $planData['costo_adicional_total']);
        $this->assertEquals(37.00, $planData['costo_total_mensual']);
    }
}
