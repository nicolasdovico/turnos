<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Plan;
use App\Models\Producto;
use App\Models\Turno;
use App\Models\User;
use App\Services\POSService;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class CajaSessionTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected Complejo $otroComplejo;
    protected User $cajero;
    protected User $cliente;
    protected Cancha $cancha;
    protected Producto $producto;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejo = Complejo::create([
            'nombre' => 'Club Central Padel',
            'subdominio' => 'central-padel',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        $this->otroComplejo = Complejo::create([
            'nombre' => 'Club Norte Padel',
            'subdominio' => 'norte-padel',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejo);

        $this->cajero = User::factory()->create(['name' => 'Cajero Turno Manana', 'email' => 'cajero.manana@example.com']);
        $this->cliente = User::factory()->create(['name' => 'Jugador 1', 'email' => 'jugador1@example.com']);

        $this->cancha = Cancha::create([
            'nombre' => 'Cancha 1 Panoramica',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 12000.00,
            'estado' => 'activo',
        ]);

        $this->producto = Producto::create([
            'nombre' => 'Pelotas Padel Tubo x3',
            'categoria' => 'equipamiento',
            'precio_costo' => 5000.00,
            'precio_venta' => 8500.00,
            'stock_actual' => 30,
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    /**
     * Test successful cash register opening.
     */
    public function test_apertura_caja_exitosa(): void
    {
        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/apertura', [
                'monto_apertura' => 5000.00,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'complejo_id' => $this->complejo->id,
                    'usuario_id' => $this->cajero->id,
                    'monto_apertura' => '5000.00',
                    'estado' => 'abierta',
                ],
            ]);

        app()->instance('currentTenant', $this->complejo);
        $this->assertDatabaseHas('cajas_sesiones', [
            'complejo_id' => $this->complejo->id,
            'monto_apertura' => '5000.00',
            'estado' => 'abierta',
        ]);
    }

    /**
     * Test cannot open two concurrent sessions in the same complex.
     */
    public function test_no_permite_multiples_cajas_abiertas(): void
    {
        // First opening
        $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/apertura', ['monto_apertura' => 5000.00])
            ->assertStatus(201);

        // Second opening attempt -> 409 Conflict
        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/apertura', ['monto_apertura' => 3000.00]);

        $response->assertStatus(409)
            ->assertJson([
                'error' => 'CAJA_ALREADY_OPEN',
            ]);
    }

    /**
     * Test full cycle: opening, sales in cash & digital, court revenue, and blind count closure with difference calculation.
     */
    public function test_ciclo_completo_cobros_y_arqueo_ciego(): void
    {
        // 1. Open cash session with 10,000 opening float
        $aperturaResp = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/apertura', ['monto_apertura' => 10000.00]);
        $aperturaResp->assertStatus(201);
        $sesionId = $aperturaResp->json('data.id');

        // 2. Process POS Sale 1: Cash ($8,500)
        $posService = app(POSService::class);
        $posService->procesarVenta([
            'complejo_id' => $this->complejo->id,
            'tipo_pago' => 'efectivo',
            'usuario_id' => $this->cajero->id,
        ], [
            ['producto_id' => $this->producto->id, 'cantidad' => 1],
        ]);

        // 3. Process POS Sale 2: Digital / Transfer ($17,000)
        $posService->procesarVenta([
            'complejo_id' => $this->complejo->id,
            'tipo_pago' => 'transferencia',
            'usuario_id' => $this->cajero->id,
        ], [
            ['producto_id' => $this->producto->id, 'cantidad' => 2],
        ]);

        // 4. Confirm a court booking ($12,000)
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'fecha' => '2026-09-05',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 12000.00,
            'estado' => 'reservado',
        ]);

        // Expected cash in drawer: 10,000 (opening) + 8,500 (POS cash) = 18,500
        // Blind count: Cashier physically counts and declares $18,700 (Sobrante: +$200)
        $cierreResp = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/cierre', [
                'caja_sesion_id' => $sesionId,
                'monto_cierre_declarado' => 18700.00,
                'notas_cierre' => 'Sobrante de propinas $200',
            ]);

        $cierreResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $sesionId,
                    'monto_apertura' => '10000.00',
                    'monto_cierre_declarado' => '18700.00',
                    'total_ventas_efectivo' => '8500.00',
                    'total_ventas_digitales' => '17000.00',
                    'total_ingresos_turnos' => '12000.00',
                    'total_esperado_efectivo' => '18500.00',
                    'diferencia' => '200.00',
                    'estado' => 'cerrada',
                ],
            ]);

        // Verify DB update
        app()->instance('currentTenant', $this->complejo);
        $this->assertDatabaseHas('cajas_sesiones', [
            'id' => $sesionId,
            'estado' => 'cerrada',
            'diferencia' => '200.00',
        ]);
    }

    /**
     * Test daily cash summary report endpoint.
     */
    public function test_resumen_diario_caja(): void
    {
        // Open and close session
        $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/apertura', ['monto_apertura' => 5000.00]);

        $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/cierre', [
                'monto_cierre_declarado' => 5000.00,
            ]);

        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson('/api/caja/resumen-diario');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'fecha',
                    'total_ingresos_brutos',
                    'total_ventas_pos',
                    'total_ventas_efectivo',
                    'total_ventas_digitales',
                    'total_turnos_reservados',
                    'total_aperturas',
                    'total_declarado_cierre',
                    'total_diferencia_neta',
                    'cantidad_sesiones',
                    'sesiones',
                ],
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'cantidad_sesiones' => 1,
                    'total_aperturas' => 5000.00,
                    'total_declarado_cierre' => 5000.00,
                    'total_diferencia_neta' => 0.00,
                ],
            ]);
    }

    /**
     * Test multi-tenant isolation for cash sessions.
     */
    public function test_aislamiento_cajas_por_tenant(): void
    {
        // Open session in Tenant 1
        $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/caja/apertura', ['monto_apertura' => 5000.00])
            ->assertStatus(201);

        // Tenant 2 can also open its own session without conflict
        $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->otroComplejo->uuid)
            ->postJson('/api/caja/apertura', ['monto_apertura' => 8000.00])
            ->assertStatus(201);

        // Daily summary for Tenant 1 has 1 session with 5000 opening
        $resp1 = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->getJson('/api/caja/resumen-diario');

        $resp1->assertStatus(200)
            ->assertJson([
                'data' => [
                    'cantidad_sesiones' => 1,
                    'total_aperturas' => 5000.00,
                ],
            ]);

        // Daily summary for Tenant 2 has 1 session with 8000 opening
        $resp2 = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->otroComplejo->uuid)
            ->getJson('/api/caja/resumen-diario');

        $resp2->assertStatus(200)
            ->assertJson([
                'data' => [
                    'cantidad_sesiones' => 1,
                    'total_aperturas' => 8000.00,
                ],
            ]);
    }
}
