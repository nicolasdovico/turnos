<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Scopes\TenantScope;
use App\Models\Turno;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CanchaTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoA;
    protected Complejo $complejoB;
    protected User $cliente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejoA = Complejo::create([
            'nombre' => 'Complejo Deportivo Norte',
            'subdominio' => 'norte',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        $this->complejoB = Complejo::create([
            'nombre' => 'Complejo Deportivo Sur',
            'subdominio' => 'sur',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        $this->cliente = User::factory()->create([
            'name' => 'Juan Perez',
            'email' => 'juan@example.com',
        ]);
    }

    /**
     * Test Cancha creation auto-assigns complejo_id and queries are isolated by tenant.
     */
    public function test_cancha_tenant_isolation(): void
    {
        // Set tenant A
        app()->instance('currentTenant', $this->complejoA);

        $canchaA1 = Cancha::create([
            'nombre' => 'Cancha Futbol 5 - A',
            'deporte' => 'futbol',
            'superficie' => 'sintetico',
            'techada' => false,
            'precio_base' => 15000.00,
            'estado' => 'activo',
        ]);

        $canchaA2 = Cancha::create([
            'nombre' => 'Cancha Padel 1 - A',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 12000.00,
            'estado' => 'activo',
        ]);

        $this->assertEquals($this->complejoA->id, $canchaA1->complejo_id);
        $this->assertEquals($this->complejoA->id, $canchaA2->complejo_id);

        // Set tenant B
        app()->instance('currentTenant', $this->complejoB);

        $canchaB1 = Cancha::create([
            'nombre' => 'Cancha Tenis 1 - B',
            'deporte' => 'tenis',
            'superficie' => 'polvo_ladrillo',
            'techada' => false,
            'precio_base' => 18000.00,
            'estado' => 'activo',
        ]);

        $this->assertEquals($this->complejoB->id, $canchaB1->complejo_id);

        // Queries under Tenant B only return Tenant B canchas
        $canchasTenantB = Cancha::all();
        $this->assertCount(1, $canchasTenantB);
        $this->assertEquals('Cancha Tenis 1 - B', $canchasTenantB->first()->nombre);

        // Switch back to Tenant A
        app()->instance('currentTenant', $this->complejoA);
        $canchasTenantA = Cancha::all();
        $this->assertCount(2, $canchasTenantA);
        $this->assertTrue($canchasTenantA->contains('id', $canchaA1->id));
        $this->assertTrue($canchasTenantA->contains('id', $canchaA2->id));
        $this->assertFalse($canchasTenantA->contains('id', $canchaB1->id));

        // Global query without scope returns all 3 canchas
        $allCanchas = Cancha::withoutGlobalScope(TenantScope::class)->get();
        $this->assertCount(3, $allCanchas);
    }

    /**
     * Test HorariosAtencion are isolated by active tenant.
     */
    public function test_horarios_atencion_tenant_isolation(): void
    {
        // Tenant A: Open 08:00 - 23:00 on Mondays (1)
        app()->instance('currentTenant', $this->complejoA);
        $horarioA = HorarioAtencion::create([
            'dia_semana' => 1,
            'hora_apertura' => '08:00',
            'hora_cierre' => '23:00',
            'duracion_turno_minutos' => 60,
        ]);

        // Tenant B: Open 14:00 - 00:00 on Mondays (1)
        app()->instance('currentTenant', $this->complejoB);
        $horarioB = HorarioAtencion::create([
            'dia_semana' => 1,
            'hora_apertura' => '14:00',
            'hora_cierre' => '00:00',
            'duracion_turno_minutos' => 90,
        ]);

        // Under Tenant B
        $horariosB = HorarioAtencion::all();
        $this->assertCount(1, $horariosB);
        $this->assertEquals(90, $horariosB->first()->duracion_turno_minutos);

        // Switch to Tenant A
        app()->instance('currentTenant', $this->complejoA);
        $horariosA = HorarioAtencion::all();
        $this->assertCount(1, $horariosA);
        $this->assertEquals(60, $horariosA->first()->duracion_turno_minutos);
    }

    /**
     * Test Turnos are isolated by tenant and relationships are properly resolved.
     */
    public function test_turnos_tenant_isolation_and_relationships(): void
    {
        // Set Tenant A
        app()->instance('currentTenant', $this->complejoA);

        $canchaA = Cancha::create([
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 10000.00,
        ]);

        $turnoA = Turno::create([
            'cancha_id' => $canchaA->id,
            'cliente_id' => $this->cliente->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:30',
            'precio' => 10000.00,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        // Set Tenant B
        app()->instance('currentTenant', $this->complejoB);

        $canchaB = Cancha::create([
            'nombre' => 'Cancha Sur 1',
            'deporte' => 'futbol',
            'superficie' => 'sintetico',
            'techada' => false,
            'precio_base' => 15000.00,
        ]);

        $turnoB = Turno::create([
            'cancha_id' => $canchaB->id,
            'cliente_id' => null,
            'fecha' => '2026-09-01',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 15000.00,
            'estado' => 'disponible',
            'es_fijo' => false,
        ]);

        // Tenant B only sees Turno B
        $turnosB = Turno::all();
        $this->assertCount(1, $turnosB);
        $this->assertEquals($turnoB->id, $turnosB->first()->id);

        // Switch to Tenant A
        app()->instance('currentTenant', $this->complejoA);
        $turnosA = Turno::all();
        $this->assertCount(1, $turnosA);
        $this->assertEquals($turnoA->id, $turnosA->first()->id);

        // Check relationships on Turno A
        $this->assertEquals($canchaA->id, $turnoA->cancha->id);
        $this->assertEquals($this->cliente->id, $turnoA->cliente->id);
        $this->assertEquals($this->complejoA->id, $turnoA->complejo->id);
        $this->assertTrue($canchaA->turnos->contains('id', $turnoA->id));
        $this->assertTrue($this->complejoA->canchas->contains('id', $canchaA->id));
        $this->assertTrue($this->complejoA->turnos->contains('id', $turnoA->id));
    }
}
