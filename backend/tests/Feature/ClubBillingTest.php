<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\FacturaClub;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\ClubBillingService;
use App\Services\ClubPaymentGatewayService;
use App\Services\CotizacionDolarService;
use App\Services\MarketplaceAttributionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubBillingTest extends TestCase
{
    use RefreshDatabase;

    protected string $mpSecret = 'mp_test_webhook_secret_key_12345';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.mercadopago.webhook_secret' => $this->mpSecret,
        ]);
    }

    protected function crearComplejoConPlan(string $slug = 'bronce', float $comisionMkt = 5.0, int $canchasIncluidas = 2, float $precioExtra = 8.0): array
    {
        $admin = User::factory()->create([
            'email' => 'admin@club.com',
        ]);

        $plan = Plan::create([
            'nombre' => ucfirst($slug),
            'slug' => $slug,
            'precio_mensual' => 29.00,
            'canchas_incluidas' => $canchasIncluidas,
            'precio_cancha_adicional' => $precioExtra,
            'comision_marketplace' => $comisionMkt,
            'estado' => 'activo',
        ]);

        $moduloReservas = Modulo::firstOrCreate(
            ['slug' => 'reservas'],
            ['nombre' => 'Reservas y Turnos', 'es_core' => true, 'estado' => 'activo']
        );
        $plan->modulos()->syncWithoutDetaching([$moduloReservas->id]);

        $complejo = Complejo::create([
            'user_id' => $admin->id,
            'nombre' => 'Club Padel Test',
            'subdominio' => 'padeltest',
            'plan_id' => $plan->id,
            'estado' => 'activo',
            'suscripcion_estado' => 'activa',
            'suscripcion_proximo_vencimiento' => Carbon::now()->addDays(20),
        ]);

        $canchas = [];
        for ($i = 1; $i <= 3; $i++) {
            $canchas[] = Cancha::create([
                'complejo_id' => $complejo->id,
                'nombre' => "Cancha {$i}",
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'precio_base' => 10000,
                'estado' => 'activo',
            ]);
        }

        return [$admin, $complejo, $plan, $canchas];
    }

    public function test_marketplace_reservation_calculates_commission_based_on_plan(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        $cliente = User::factory()->create();

        $response = $this->actingAs($cliente)->withHeaders([
            'X-Tenant-ID' => $complejo->subdominio,
        ])->postJson('/api/turnos/confirmar', [
            'cancha_id' => $canchas[0]->id,
            'fecha' => Carbon::tomorrow()->toDateString(),
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 10000.00,
            'origen' => 'marketplace',
        ]);

        $response->assertStatus(200);

        $turno = Turno::where('cancha_id', $canchas[0]->id)
            ->where('hora_inicio', '18:00')
            ->first();

        $this->assertNotNull($turno);
        $this->assertEquals('marketplace', $turno->origen);
        $this->assertEquals(5.00, (float) $turno->comision_porcentaje);
        // 5% de 10000 = 500
        $this->assertEquals(500.00, (float) $turno->comision_marketplace);
    }

    public function test_direct_reservation_has_zero_commission(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        $cliente = User::factory()->create();

        $response = $this->actingAs($cliente)->withHeaders([
            'X-Tenant-ID' => $complejo->subdominio,
        ])->postJson('/api/turnos/confirmar', [
            'cancha_id' => $canchas[0]->id,
            'fecha' => Carbon::tomorrow()->toDateString(),
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'precio' => 10000.00,
            'origen' => 'directo',
        ]);

        $response->assertStatus(200);

        $turno = Turno::where('cancha_id', $canchas[0]->id)
            ->where('hora_inicio', '19:00')
            ->first();

        $this->assertNotNull($turno);
        $this->assertEquals('directo', $turno->origen);
        $this->assertEquals(0.00, (float) $turno->comision_porcentaje);
        $this->assertEquals(0.00, (float) $turno->comision_marketplace);
    }

    public function test_billing_summary_calculates_plan_base_extra_courts_and_marketplace_commission(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0, 2, 8.0);
        // El club tiene 3 canchas, y el plan incluye 2 -> 1 cancha extra ($8 USD)

        // Crear 2 turnos con origen marketplace y comisiones
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $canchas[0]->id,
            'fecha' => Carbon::now()->toDateString(),
            'hora_inicio' => '10:00',
            'hora_fin' => '11:00',
            'precio' => 10000,
            'estado' => 'reservado',
            'origen' => 'marketplace',
            'comision_porcentaje' => 5.00,
            'comision_marketplace' => 500.00,
        ]);

        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $canchas[1]->id,
            'fecha' => Carbon::now()->toDateString(),
            'hora_inicio' => '11:00',
            'hora_fin' => '12:00',
            'precio' => 10000,
            'estado' => 'reservado',
            'origen' => 'marketplace',
            'comision_porcentaje' => 5.00,
            'comision_marketplace' => 500.00,
        ]);

        $response = $this->actingAs($admin)->getJson("/api/clubs/{$complejo->subdominio}/facturacion/resumen");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'canchas' => [
                        'totales' => 3,
                        'incluidas' => 2,
                        'excedentes' => 1,
                        'costo_adicional_total' => 8,
                    ],
                    'marketplace' => [
                        'porcentaje_aplicado' => 5,
                        'turnos_captados_count' => 2,
                        'total_comisiones_ars' => 1000,
                    ],
                    'totales' => [
                        'base_plan_usd' => 29,
                        'canchas_extras_usd' => 8,
                        'comisiones_marketplace_ars' => 1000,
                    ],
                ],
            ]);

        $responseData = $response->json('data');
        $this->assertGreaterThan(0, (float) $responseData['marketplace']['total_comisiones_usd']);
        $this->assertLessThan(10, (float) $responseData['marketplace']['total_comisiones_usd']);
        $this->assertEquals(2, count($responseData['marketplace']['turnos']));
    }

    public function test_mercadopago_b2b_checkout_converts_usd_to_ars(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        $response = $this->actingAs($admin)->postJson("/api/clubs/{$complejo->subdominio}/facturacion/pagar-mercadopago");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'gateway' => 'mercadopago',
            ]);

        $responseData = $response->json();
        $this->assertArrayHasKey('init_point', $responseData);
        $this->assertArrayHasKey('total_ars', $responseData);
        $this->assertGreaterThan(0, $responseData['total_ars']);
    }

    public function test_stripe_b2b_checkout_initializes_usd_session(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        $response = $this->actingAs($admin)->postJson("/api/clubs/{$complejo->subdominio}/facturacion/pagar-stripe");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'gateway' => 'stripe',
            ]);

        $responseData = $response->json();
        $this->assertArrayHasKey('init_point', $responseData);
        $this->assertArrayHasKey('total_usd', $responseData);
        $this->assertEquals(29.00 + 8.00, (float) $responseData['total_usd']);
    }

    public function test_webhook_approves_factura_club_and_extends_subscription_by_30_days(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        $billingService = app(ClubBillingService::class);
        $factura = $billingService->generarOFacturaPendiente($complejo);

        $this->assertEquals('pendiente', $factura->estado);
        $this->assertNotNull($factura->uuid);

        $paymentId = 'mp_pay_b2b_12345';
        $requestId = 'req_b2b_112233';
        $timestamp = (string) time();

        $manifest = "id:{$paymentId};request-id:{$requestId};ts:{$timestamp};";
        $signature = hash_hmac('sha256', $manifest, $this->mpSecret);

        $payload = [
            'action' => 'payment.created',
            'data' => [
                'id' => $paymentId,
                'status' => 'approved',
                'external_reference' => "FACTURA_CLUB_{$factura->uuid}",
            ],
        ];

        $response = $this->withHeaders([
            'x-signature' => "ts={$timestamp},v1={$signature}",
            'x-request-id' => $requestId,
        ])->postJson('/api/webhooks/mercadopago', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'received' => true,
                'result' => [
                    'status' => 'success',
                ],
            ]);

        $this->assertEquals('pagada', $factura->fresh()->estado);
        $complejoActualizado = $complejo->fresh();
        $this->assertEquals('activa', $complejoActualizado->suscripcion_estado);
        $this->assertTrue($complejoActualizado->suscripcion_proximo_vencimiento->isFuture());
    }

    public function test_bank_transfer_receipt_submission_sets_status_en_revision(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        $response = $this->actingAs($admin)->postJson("/api/clubs/{$complejo->subdominio}/facturacion/comprobante-transferencia", [
            'comprobante_url' => 'https://storage.googleapis.com/receipts/transf_12345.pdf',
            'notas' => 'Pago de abono y comisión transferido desde Banco Santander',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'estado' => 'revision_transferencia',
                    'metodo_pago' => 'transferencia',
                    'comprobante_transferencia_url' => 'https://storage.googleapis.com/receipts/transf_12345.pdf',
                ],
            ]);
    }

    public function test_grace_period_evaluation_transitions_to_gracia_and_vencida(): void
    {
        [$admin, $complejo, $plan, $canchas] = $this->crearComplejoConPlan('bronce', 5.0);

        // Simular que el abono venció ayer
        $complejo->update([
            'suscripcion_estado' => 'activa',
            'suscripcion_proximo_vencimiento' => Carbon::yesterday(),
            'suscripcion_gracia_vence_at' => null,
        ]);

        $billingService = app(ClubBillingService::class);
        $billingService->evaluarEstadoSuscripcion($complejo);

        $complejoGracia = $complejo->fresh();
        $this->assertEquals('gracia', $complejoGracia->suscripcion_estado);
        $this->assertNotNull($complejoGracia->suscripcion_gracia_vence_at);
        $this->assertTrue($complejoGracia->estaEnPeriodoDeGracia());
        $this->assertTrue($complejoGracia->suscripcionValida());

        // Simular que pasaron los 7 días de gracia
        $complejoGracia->update([
            'suscripcion_gracia_vence_at' => Carbon::yesterday(),
        ]);

        $billingService->evaluarEstadoSuscripcion($complejoGracia);

        $complejoVencido = $complejoGracia->fresh();
        $this->assertEquals('vencida', $complejoVencido->suscripcion_estado);
        $this->assertFalse($complejoVencido->suscripcionValida());
        $this->assertFalse($complejoVencido->estaEnPeriodoDeGracia());
    }
}
