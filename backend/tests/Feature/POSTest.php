<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Plan;
use App\Models\Producto;
use App\Models\Turno;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class POSTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoOro;
    protected Complejo $complejoBronce;
    protected User $cajero;
    protected User $cliente;
    protected Producto $gatorade;
    protected Producto $empanada;
    protected Cancha $cancha;
    protected Turno $turno;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail(); // Has pos_buffet
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail(); // Does NOT have pos_buffet

        $this->complejoOro = Complejo::create([
            'nombre' => 'Club Padel Oro Center',
            'subdominio' => 'oro-center',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        $this->complejoBronce = Complejo::create([
            'nombre' => 'Club Simple Bronce',
            'subdominio' => 'simple-bronce',
            'plan_id' => $planBronce->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejoOro);

        $this->cajero = User::factory()->create(['name' => 'Cajero Mostrador', 'email' => 'cajero@example.com']);
        $this->cliente = User::factory()->create(['name' => 'Jugador Frecuente', 'email' => 'jugador@example.com']);

        $this->gatorade = Producto::create([
            'nombre' => 'Gatorade Blue 500ml',
            'categoria' => 'bebidas',
            'precio_costo' => 1000.00,
            'precio_venta' => 2500.00,
            'stock_actual' => 20,
            'stock_minimo' => 5,
        ]);

        $this->empanada = Producto::create([
            'nombre' => 'Empanada Carne Suave',
            'categoria' => 'alimentos',
            'precio_costo' => 800.00,
            'precio_venta' => 1800.00,
            'stock_actual' => 15,
            'stock_minimo' => 4,
        ]);

        $this->cancha = Cancha::create([
            'nombre' => 'Cancha Cristal 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 14000.00,
            'estado' => 'activo',
        ]);

        $this->turno = Turno::create([
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'fecha' => '2026-09-02',
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'precio' => 14000.00,
            'estado' => 'reservado',
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    /**
     * Test direct POS sale with stock deduction.
     */
    public function test_venta_directa_pos_descuenta_stock(): void
    {
        $payload = [
            'cliente_id' => $this->cliente->id,
            'tipo_pago' => 'efectivo',
            'items' => [
                [
                    'producto_id' => $this->gatorade->id,
                    'cantidad' => 2, // 2 * 2500 = 5000
                ],
                [
                    'producto_id' => $this->empanada->id,
                    'cantidad' => 3, // 3 * 1800 = 5400
                ],
            ],
        ];

        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/pos/ventas', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'complejo_id' => $this->complejoOro->id,
                    'subtotal' => '10400.00',
                    'total' => '10400.00',
                    'tipo_pago' => 'efectivo',
                    'estado' => 'completada',
                ],
            ]);

        // Verify stock reduced in DB
        $this->assertEquals(18, $this->gatorade->fresh()->stock_actual);
        $this->assertEquals(12, $this->empanada->fresh()->stock_actual);

        // Verify Venta and VentaItems in DB
        app()->instance('currentTenant', $this->complejoOro);
        $this->assertDatabaseHas('ventas', [
            'complejo_id' => $this->complejoOro->id,
            'total' => '10400.00',
            'tipo_pago' => 'efectivo',
        ]);
    }

    /**
     * Test consumption / comanda linked to an active court session.
     */
    public function test_comanda_asociada_a_turno(): void
    {
        $payload = [
            'tipo_pago' => 'cuenta_turno',
            'items' => [
                [
                    'producto_id' => $this->gatorade->id,
                    'cantidad' => 4, // 4 * 2500 = 10000
                ],
            ],
        ];

        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson("/api/turnos/{$this->turno->id}/consumos", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'turno_id' => $this->turno->id,
                    'cliente_id' => $this->cliente->id,
                    'total' => '10000.00',
                    'tipo_pago' => 'cuenta_turno',
                ],
            ]);

        // Stock decreased
        $this->assertEquals(16, $this->gatorade->fresh()->stock_actual);

        // Check relationship in Turno
        app()->instance('currentTenant', $this->complejoOro);
        $this->assertCount(1, $this->turno->fresh()->ventas);
        $this->assertEquals('10000.00', $this->turno->fresh()->ventas->first()->total);
    }

    /**
     * Test insufficient stock aborts sale with 422 error and preserves stock.
     */
    public function test_stock_insuficiente_rechaza_venta(): void
    {
        $payload = [
            'items' => [
                [
                    'producto_id' => $this->gatorade->id,
                    'cantidad' => 25, // only 20 in stock
                ],
            ],
        ];

        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/pos/ventas', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'error' => 'INSUFFICIENT_STOCK',
            ]);

        // Stock remains untouched
        $this->assertEquals(20, $this->gatorade->fresh()->stock_actual);
    }

    /**
     * Test tenant without pos_buffet module receives 403 Forbidden.
     */
    public function test_modulo_pos_buffet_inactivo_retorna_403(): void
    {
        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/pos/productos');

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'pos_buffet',
            ]);
    }

    /**
     * Test product catalog isolation between tenants.
     */
    public function test_aislamiento_productos_pos_por_tenant(): void
    {
        app()->instance('currentTenant', $this->complejoBronce);
        Producto::create([
            'nombre' => 'Agua Mineral Bronce',
            'categoria' => 'bebidas',
            'precio_costo' => 500.00,
            'precio_venta' => 1200.00,
            'stock_actual' => 50,
        ]);

        app()->instance('currentTenant', $this->complejoOro);

        $response = $this->actingAs($this->cajero)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->getJson('/api/pos/productos');

        $response->assertStatus(200);
        $nombres = array_column($response->json('data'), 'nombre');

        $this->assertContains('Gatorade Blue 500ml', $nombres);
        $this->assertContains('Empanada Carne Suave', $nombres);
        $this->assertNotContains('Agua Mineral Bronce', $nombres);
    }
}
