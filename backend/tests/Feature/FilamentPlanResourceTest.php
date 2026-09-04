<?php

namespace Tests\Feature;

use App\Filament\Resources\PlanResource;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class FilamentPlanResourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\ModuloSeeder::class);
        $this->seed(\Database\Seeders\PlanSeeder::class);
    }

    public function test_admin_can_see_modules_in_plans_table(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@turnos.test',
        ]);

        $this->actingAs($admin);

        Livewire::test(PlanResource\Pages\ListPlans::class)
            ->assertCanSeeTableRecords(Plan::all())
            ->assertTableColumnExists('modulos.nombre')
            ->assertSuccessful();
    }

    public function test_admin_can_edit_plan_and_sync_modules(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@turnos.test',
        ]);

        $this->actingAs($admin);

        $plan = Plan::where('slug', 'bronce')->first();
        $this->assertNotNull($plan);

        $moduloTorneos = Modulo::where('slug', 'torneos')->first();
        $this->assertNotNull($moduloTorneos);

        // Inicialmente bronce no tiene torneos
        $this->assertFalse($plan->modulos->contains('id', $moduloTorneos->id));

        $modulosIds = $plan->modulos->pluck('id')->push($moduloTorneos->id)->map(fn($id) => (string) $id)->all();

        Livewire::test(PlanResource\Pages\EditPlan::class, [
            'record' => $plan->getRouteKey(),
        ])
            ->assertFormExists()
            ->set('data.modulos', $modulosIds)
            ->call('save')
            ->assertHasNoFormErrors();

        $plan->load('modulos');
        $this->assertTrue($plan->modulos->contains('id', $moduloTorneos->id));
    }

    public function test_admin_can_see_plans_in_modulos_table(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@turnos.test',
        ]);

        $this->actingAs($admin);

        Livewire::test(\App\Filament\Resources\ModuloResource\Pages\ListModulos::class)
            ->assertCanSeeTableRecords(Modulo::all())
            ->assertTableColumnExists('planes.nombre')
            ->assertSuccessful();
    }
}
