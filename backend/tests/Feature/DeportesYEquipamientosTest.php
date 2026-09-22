<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Deporte;
use App\Models\Equipamiento;
use App\Models\Plan;
use App\Models\Superficie;
use App\Models\TipoNegocio;
use App\Models\User;
use Database\Seeders\DeportesYEquipamientosSeeder;
use Database\Seeders\PlanSeeder;
use Database\Seeders\TipoNegocioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeportesYEquipamientosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(TipoNegocioSeeder::class);
        $this->seed(PlanSeeder::class);
        $this->seed(DeportesYEquipamientosSeeder::class);
    }

    private function crearClub(string $subdominio, ?User $owner = null): array
    {
        $user = $owner ?: User::factory()->create();
        $plan = Plan::first();
        $tipoNegocio = TipoNegocio::first();

        $complejo = Complejo::create([
            'user_id' => $user->id,
            'nombre' => "Club {$subdominio}",
            'subdominio' => $subdominio,
            'plan_id' => $plan->id,
            'tipo_negocio_id' => $tipoNegocio->id,
            'deporte_principal' => 'padel',
            'suscripcion_estado' => 'activa',
            'suscripcion_proximo_vencimiento' => now()->addMonth(),
        ]);

        return [$user, $complejo];
    }

    public function test_get_deportes_catalog_returns_active_sports_with_surfaces(): void
    {
        $response = $this->getJson('/api/deportes');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['slug' => 'padel', 'nombre' => 'Pádel', 'tiene_paredes' => true])
            ->assertJsonFragment(['slug' => 'tenis', 'nombre' => 'Tenis'])
            ->assertJsonFragment(['slug' => 'sintetico_wpt']);

        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertGreaterThanOrEqual(5, count($data));

        $padel = collect($data)->firstWhere('slug', 'padel');
        $this->assertNotEmpty($padel['superficies']);
        $this->assertNotEmpty($padel['formatos']);
        $this->assertNotEmpty($padel['paredes']);
    }

    public function test_club_equipamientos_endpoint_returns_global_and_own_amenities(): void
    {
        [$user, $complejo] = $this->crearClub('club-test-amenities');

        // Crear un equipamiento propio del club
        $propio = Equipamiento::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Bebedero Frío con Filtro',
            'slug' => 'bebedero-frio-' . $complejo->id,
            'categoria' => 'confort',
            'esta_activo' => true,
        ]);

        // Crear un equipamiento de OTRO club (aislamiento multi-tenant)
        [$otroUser, $otroComplejo] = $this->crearClub('otro-club');
        $otroPropio = Equipamiento::create([
            'complejo_id' => $otroComplejo->id,
            'nombre' => 'Amenity Secreta Otro Club',
            'slug' => 'secreto-' . $otroComplejo->id,
            'categoria' => 'confort',
            'esta_activo' => true,
        ]);

        $response = $this->actingAs($user)->getJson("/api/clubs/{$complejo->subdominio}/equipamientos");

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonFragment(['nombre' => 'Iluminación LED Profesional', 'es_propio' => false])
            ->assertJsonFragment(['nombre' => 'Bebedero Frío con Filtro', 'es_propio' => true])
            ->assertJsonMissing(['nombre' => 'Amenity Secreta Otro Club']);
    }

    public function test_club_admin_can_create_custom_equipamiento(): void
    {
        [$user, $complejo] = $this->crearClub('club-custom-eq');

        $response = $this->actingAs($user)->postJson("/api/clubs/{$complejo->subdominio}/equipamientos", [
            'nombre' => 'Tótem de Hidratación Isotónica',
            'categoria' => 'confort',
            'icono' => 'coffee',
            'descripcion' => 'Bebidas isotónicas y agua fresca ilimitada para jugadores.',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'nombre' => 'Tótem de Hidratación Isotónica',
                    'categoria' => 'confort',
                    'es_propio' => true,
                ],
            ]);

        $this->assertDatabaseHas('equipamientos', [
            'complejo_id' => $complejo->id,
            'nombre' => 'Tótem de Hidratación Isotónica',
        ]);
    }

    public function test_store_and_update_cancha_with_deporte_superficie_and_equipamientos(): void
    {
        [$user, $complejo] = $this->crearClub('club-canchas-rel');

        $deporte = Deporte::where('slug', 'padel')->firstOrFail();
        $superficie = Superficie::where('deporte_id', $deporte->id)->where('slug', 'sintetico_wpt')->firstOrFail();

        $eqLed = Equipamiento::where('slug', 'iluminacion_led')->firstOrFail();
        $eqCamara = Equipamiento::where('slug', 'camara_grabacion')->firstOrFail();

        // 1. Crear Cancha con IDs relacionales y array de equipamientos
        $responseCreate = $this->actingAs($user)->postJson("/api/clubs/{$complejo->subdominio}/canchas", [
            'nombre' => 'Pista Central WPT',
            'deporte_id' => $deporte->id,
            'superficie_id' => $superficie->id,
            'equipamientos_ids' => [$eqLed->id, $eqCamara->id],
            'precio_base' => 12000,
            'duracion_minutos' => 90,
            'tipo_pared' => 'cristal_panoramico',
            'techada' => true,
        ]);

        $responseCreate->assertStatus(201)
            ->assertJson([
                'success' => true,
                'cancha' => [
                    'nombre' => 'Pista Central WPT',
                    'deporte' => 'padel',
                    'deporte_id' => $deporte->id,
                    'superficie' => 'sintetico_wpt',
                    'superficie_id' => $superficie->id,
                ],
            ]);

        $canchaId = $responseCreate->json('cancha.id');
        $this->assertDatabaseHas('cancha_equipamiento', [
            'cancha_id' => $canchaId,
            'equipamiento_id' => $eqLed->id,
        ]);
        $this->assertDatabaseHas('cancha_equipamiento', [
            'cancha_id' => $canchaId,
            'equipamiento_id' => $eqCamara->id,
        ]);

        // 2. Actualizar Cancha modificando equipamientos
        $eqMarcador = Equipamiento::where('slug', 'marcador_digital')->firstOrFail();

        $responseUpdate = $this->actingAs($user)->putJson("/api/clubs/{$complejo->subdominio}/canchas/{$canchaId}", [
            'nombre' => 'Pista Central WPT Pro',
            'precio_base' => 14000,
            'equipamientos_ids' => [$eqMarcador->id],
        ]);

        $responseUpdate->assertStatus(200);

        $this->assertDatabaseMissing('cancha_equipamiento', [
            'cancha_id' => $canchaId,
            'equipamiento_id' => $eqLed->id,
        ]);
        $this->assertDatabaseHas('cancha_equipamiento', [
            'cancha_id' => $canchaId,
            'equipamiento_id' => $eqMarcador->id,
        ]);

        // 3. Verificar que el dashboard del club entrega la cancha con equipamientos cargados
        $responseDashboard = $this->actingAs($user)->getJson("/api/clubs/{$complejo->subdominio}/dashboard");
        $responseDashboard->assertStatus(200)
            ->assertJsonFragment(['nombre' => 'Pista Central WPT Pro']);

        $canchasData = $responseDashboard->json('data.canchas');
        $canchaDashboard = collect($canchasData)->firstWhere('id', $canchaId);
        $this->assertNotEmpty($canchaDashboard['equipamientos']);
        $this->assertEquals('marcador_digital', $canchaDashboard['equipamientos'][0]['slug']);
    }
}
