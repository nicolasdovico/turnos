<?php

namespace Tests\Feature;

use App\Models\Complejo;
use App\Models\EquipoTorneo;
use App\Models\Plan;
use App\Models\Torneo;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TorneoModuleTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoOro;
    protected Complejo $complejoBronce;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail(); // Tiene torneos
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail(); // NO tiene torneos

        $this->complejoOro = Complejo::create([
            'nombre' => 'Complejo Oro Pádel',
            'subdominio' => 'oro-padel',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        $this->complejoBronce = Complejo::create([
            'nombre' => 'Complejo Bronce Basic',
            'subdominio' => 'bronce-basic',
            'plan_id' => $planBronce->id,
            'estado' => 'activo',
        ]);

        $this->admin = User::factory()->create([
            'name' => 'Organizador Torneo',
            'email' => 'organizador@torneo.com',
        ]);
    }

    /**
     * Test ciclo completo de API: crear torneo, inscribir 4 equipos, generar fixture y registrar resultados.
     */
    public function test_ciclo_completo_torneo_api(): void
    {
        // 1. Crear Torneo
        $createRes = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/torneos', [
                'nombre' => 'Grand Slam Pádel Verano',
                'deporte' => 'padel',
                'formato' => 'eliminacion_directa',
                'categoria' => '3ra',
                'max_equipos' => 4,
                'precio_inscripcion' => 20000.00,
            ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.nombre', 'Grand Slam Pádel Verano');

        $torneoId = $createRes->json('data.id');

        // 2. Inscribir 4 Equipos
        for ($i = 1; $i <= 4; $i++) {
            $this->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
                ->postJson("/api/torneos/{$torneoId}/equipos", [
                    'nombre' => "Pareja Pro {$i}",
                    'semilla' => $i,
                ])
                ->assertStatus(201);
        }

        // 3. Generar Fixture
        $fixtureRes = $this->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson("/api/torneos/{$torneoId}/generar-fixture");

        $fixtureRes->assertStatus(200)
            ->assertJsonPath('data.total_partidos', 3);

        // 4. Consultar Bracket
        $bracketRes = $this->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->getJson("/api/torneos/{$torneoId}/bracket");

        $bracketRes->assertStatus(200)
            ->assertJsonStructure(['torneo', 'bracket']);

        // 5. Cargar Resultado de Semifinal 1
        $semi1Id = $bracketRes->json('bracket.0.partidos.0.id');
        $this->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson("/api/torneos/partidos/{$semi1Id}/resultado", [
                'score_local' => 2,
                'score_visitante' => 0,
                'resultado_local' => '6-1, 6-2',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.estado', 'finalizado');
    }

    /**
     * Test tenant sin módulo torneos recibe 403 Forbidden.
     */
    public function test_modulo_torneos_inactivo_retorna_403(): void
    {
        // Complejo Bronce no tiene módulo torneos
        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->postJson('/api/torneos', [
                'nombre' => 'Torneo Prohibido',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'torneos',
            ]);
    }
}
