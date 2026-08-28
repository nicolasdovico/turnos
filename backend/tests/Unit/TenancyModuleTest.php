<?php

namespace Tests\Unit;

use App\Models\Complejo;
use App\Models\Modulo;
use App\Models\Plan;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenancyModuleTest extends TestCase
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

    /**
     * Test plans have their expected seeded modules.
     */
    public function test_plans_have_correct_default_modules(): void
    {
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();
        $this->assertTrue($planBronce->modulos->contains('slug', 'reservas'));
        $this->assertTrue($planBronce->modulos->contains('slug', 'cms_web'));
        $this->assertFalse($planBronce->modulos->contains('slug', 'torneos'));

        $planPlata = Plan::where('slug', 'plata')->firstOrFail();
        $this->assertTrue($planPlata->modulos->contains('slug', 'pos_buffet'));
        $this->assertTrue($planPlata->modulos->contains('slug', 'turnos_fijos'));
        $this->assertFalse($planPlata->modulos->contains('slug', 'domotica'));

        $planOro = Plan::where('slug', 'oro')->firstOrFail();
        $this->assertCount(7, $planOro->modulos);
        $this->assertTrue($planOro->modulos->contains('slug', 'domotica'));
        $this->assertTrue($planOro->modulos->contains('slug', 'torneos'));
    }

    /**
     * Test complejo automatically gets a UUID on creation.
     */
    public function test_complejo_generates_uuid_automatically(): void
    {
        $plan = Plan::where('slug', 'bronce')->firstOrFail();
        $complejo = Complejo::create([
            'nombre' => 'Club San Martin',
            'subdominio' => 'sanmartin',
            'plan_id' => $plan->id,
            'estado' => 'activo',
        ]);

        $this->assertNotEmpty($complejo->uuid);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $complejo->uuid);
    }

    /**
     * Test complejo inherits module permissions from its plan.
     */
    public function test_complejo_resolves_modules_from_plan(): void
    {
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();
        $complejo = Complejo::create([
            'nombre' => 'Padel Center',
            'subdominio' => 'padelcenter',
            'plan_id' => $planBronce->id,
        ]);

        $this->assertTrue($complejo->hasModule('reservas'));
        $this->assertTrue($complejo->hasModule('cms_web'));
        $this->assertFalse($complejo->hasModule('torneos'));
        $this->assertFalse($complejo->hasModule('domotica'));
    }

    /**
     * Test individual module add-on in complejo_modulo.
     */
    public function test_complejo_can_have_individual_addon_modules(): void
    {
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();
        $moduloTorneos = Modulo::where('slug', 'torneos')->firstOrFail();

        $complejo = Complejo::create([
            'nombre' => 'Padel Center Addon',
            'subdominio' => 'padelcenter-addon',
            'plan_id' => $planBronce->id,
        ]);

        $this->assertFalse($complejo->hasModule('torneos'));

        // Attach torneos as an individual add-on
        $complejo->modulosPersonalizados()->attach($moduloTorneos->id, [
            'esta_activo' => true,
            'valido_hasta' => null,
        ]);

        $this->assertTrue($complejo->fresh()->hasModule('torneos'));
    }

    /**
     * Test inactive add-on module is not available.
     */
    public function test_inactive_addon_module_is_disabled(): void
    {
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();
        $moduloTorneos = Modulo::where('slug', 'torneos')->firstOrFail();

        $complejo = Complejo::create([
            'nombre' => 'Club Inactivo Addon',
            'subdominio' => 'inactivo-addon',
            'plan_id' => $planBronce->id,
        ]);

        $complejo->modulosPersonalizados()->attach($moduloTorneos->id, [
            'esta_activo' => false,
            'valido_hasta' => null,
        ]);

        $this->assertFalse($complejo->fresh()->hasModule('torneos'));
    }

    /**
     * Test expired add-on module is not available, while future expiration is valid.
     */
    public function test_addon_module_expiration_logic(): void
    {
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();
        $moduloTorneos = Modulo::where('slug', 'torneos')->firstOrFail();
        $moduloDomotica = Modulo::where('slug', 'domotica')->firstOrFail();

        $complejo = Complejo::create([
            'nombre' => 'Club Expired Addon',
            'subdominio' => 'expired-addon',
            'plan_id' => $planBronce->id,
        ]);

        // Expired module
        $complejo->modulosPersonalizados()->attach($moduloTorneos->id, [
            'esta_activo' => true,
            'valido_hasta' => now()->subDay(),
        ]);

        // Valid future module
        $complejo->modulosPersonalizados()->attach($moduloDomotica->id, [
            'esta_activo' => true,
            'valido_hasta' => now()->addDays(30),
        ]);

        $complejoFresh = $complejo->fresh();
        $this->assertFalse($complejoFresh->hasModule('torneos'));
        $this->assertTrue($complejoFresh->hasModule('domotica'));
    }
}
