<?php

namespace Tests\Feature;

use App\Filament\Resources\FacturaClubResource;
use App\Models\Complejo;
use App\Models\FacturaClub;
use App\Models\Plan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class FilamentFacturaClubResourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PlanSeeder::class);
    }

    public function test_admin_can_see_and_execute_aprobar_pago_action_in_edit_page(): void
    {
        $admin = User::factory()->create([
            'email' => 'superadmin@turnos.test',
        ]);

        $this->actingAs($admin);

        $plan = Plan::where('slug', 'bronce')->firstOrFail();

        $complejo = Complejo::create([
            'user_id' => $admin->id,
            'nombre' => 'Club Test Factura',
            'subdominio' => 'club-test-factura',
            'plan_id' => $plan->id,
            'estado' => 'activo',
            'suscripcion_estado' => 'gracia',
            'suscripcion_vence_at' => Carbon::today()->subDays(2),
            'gracia_vence_at' => Carbon::today()->addDays(5),
        ]);

        $factura = FacturaClub::create([
            'complejo_id' => $complejo->id,
            'plan_id' => $plan->id,
            'numero_factura' => 'FC-2026-TEST-001',
            'periodo' => Carbon::today()->format('Y-m'),
            'monto_plan_base_usd' => 29.00,
            'canchas_totales' => 2,
            'canchas_incluidas_plan' => 2,
            'canchas_excedentes' => 0,
            'precio_unitario_cancha_extra_usd' => 8.00,
            'monto_canchas_extras_usd' => 0.00,
            'cantidad_turnos_marketplace' => 0,
            'monto_comisiones_marketplace_usd' => 0.00,
            'total_usd' => 29.00,
            'tipo_cambio_ars' => 1500.00,
            'total_ars' => 43500.00,
            'estado' => 'en_revision',
            'metodo_pago' => 'transferencia_bancaria',
            'fecha_emision' => Carbon::today(),
            'fecha_vencimiento' => Carbon::today()->addDays(5),
            'comprobante_transferencia_url' => 'https://ejemplo.com/comprobante123.jpg',
            'comprobante_transferencia_notas' => 'Transferencia realizada desde cuenta Banco Galicia',
        ]);

        // Verificar que en la página de edición existe y es visible la acción aprobarTransferencia
        Livewire::test(FacturaClubResource\Pages\EditFacturaClub::class, [
            'record' => $factura->getRouteKey(),
        ])
            ->assertSuccessful()
            ->assertActionExists('aprobarTransferencia')
            ->assertActionVisible('aprobarTransferencia')
            ->callAction('aprobarTransferencia')
            ->assertHasNoActionErrors();

        // Verificar en BD que la factura cambió a pagada
        $factura->refresh();
        $this->assertEquals('pagada', $factura->estado);
        $this->assertEquals('transferencia_bancaria', $factura->metodo_pago);
        $this->assertNotNull($factura->pagado_at);

        // Verificar que la suscripción del club fue renovada a activa y extendida
        $complejo->refresh();
        $this->assertEquals('activa', $complejo->suscripcion_estado);
        $this->assertNull($complejo->suscripcion_gracia_vence_at);
        $this->assertTrue(Carbon::parse($complejo->suscripcion_proximo_vencimiento)->isFuture());

        // Al recargar la página con la factura pagada, la acción ya no debe estar visible
        Livewire::test(FacturaClubResource\Pages\EditFacturaClub::class, [
            'record' => $factura->getRouteKey(),
        ])
            ->assertActionHidden('aprobarTransferencia');
    }

    public function test_admin_can_approve_payment_from_table_action_in_list_page(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin_list@turnos.test',
        ]);

        $this->actingAs($admin);

        $plan = Plan::where('slug', 'bronce')->firstOrFail();

        $complejo = Complejo::create([
            'user_id' => $admin->id,
            'nombre' => 'Club List Test',
            'subdominio' => 'club-list-test',
            'plan_id' => $plan->id,
            'estado' => 'activo',
            'suscripcion_estado' => 'pendiente',
        ]);

        $factura = FacturaClub::create([
            'complejo_id' => $complejo->id,
            'plan_id' => $plan->id,
            'periodo' => Carbon::today()->format('Y-m'),
            'monto_base_plan' => 29.00,
            'total_usd' => 29.00,
            'estado' => 'en_revision',
            'fecha_emision' => Carbon::today(),
            'fecha_vencimiento' => Carbon::today()->addDays(5),
            'comprobante_transferencia_url' => 'https://ejemplo.com/comp_list.png',
        ]);

        Livewire::test(FacturaClubResource\Pages\ListFacturasClub::class)
            ->assertTableActionExists('aprobarTransferencia')
            ->assertTableActionVisible('aprobarTransferencia', $factura)
            ->callTableAction('aprobarTransferencia', $factura)
            ->assertHasNoTableActionErrors();

        $factura->refresh();
        $this->assertEquals('pagada', $factura->estado);
        $this->assertEquals('transferencia_bancaria', $factura->metodo_pago);
        $this->assertNotNull($factura->pagado_at);
    }
}
