<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected string $mpSecret = 'mp_test_webhook_secret_key_12345';
    protected string $stripeSecret = 'whsec_test_stripe_secret_key_12345';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.mercadopago.webhook_secret' => $this->mpSecret,
            'services.stripe.webhook_secret' => $this->stripeSecret,
        ]);
    }

    public function test_mercadopago_webhook_valid_signature_confirms_turno(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Padel Club Pro',
            'subdominio' => 'padelclubpro',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 10000,
            'estado' => 'activo',
        ]);

        $cliente = User::factory()->create();

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 10000,
            'estado' => 'pendiente',
            'es_fijo' => false,
        ]);

        $paymentId = 'mp_pay_998877';
        $requestId = 'req_uuid_112233';
        $timestamp = '1700000000';

        // Generar firma HMAC SHA256 válida de Mercado Pago
        $manifest = "id:{$paymentId};request-id:{$requestId};ts:{$timestamp};";
        $signature = hash_hmac('sha256', $manifest, $this->mpSecret);

        $payload = [
            'action' => 'payment.created',
            'data' => [
                'id' => $paymentId,
                'status' => 'approved',
                'metadata' => [
                    'turno_id' => $turno->id,
                ],
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
                    'status' => 'confirmed',
                    'type' => 'turno_completo',
                    'turno_id' => $turno->id,
                    'estado' => 'reservado',
                ],
            ]);

        $this->assertEquals('reservado', $turno->fresh()->estado);
    }

    public function test_mercadopago_webhook_invalid_signature_returns_401(): void
    {
        $response = $this->withHeaders([
            'x-signature' => 'ts=1700000000,v1=invalid_tampered_signature_hash',
            'x-request-id' => 'req_fake',
        ])->postJson('/api/webhooks/mercadopago', [
            'action' => 'payment.created',
            'data' => ['id' => '12345'],
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'error' => 'INVALID_SIGNATURE',
            ]);
    }

    public function test_stripe_webhook_valid_signature_confirms_turno(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Tenis & Padel Center',
            'subdominio' => 'teniscenter',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 2',
            'deporte' => 'tenis',
            'superficie' => 'cemento',
            'techada' => false,
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);

        $cliente = User::factory()->create();

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-02',
            'hora_inicio' => '20:00',
            'hora_fin' => '21:00',
            'precio' => 8000,
            'estado' => 'pendiente',
            'es_fijo' => false,
        ]);

        $payloadArray = [
            'id' => 'evt_test_123',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_session_999',
                    'amount' => 800000,
                    'currency' => 'ars',
                    'metadata' => [
                        'turno_id' => (string) $turno->id,
                    ],
                ],
            ],
        ];

        $rawBody = json_encode($payloadArray);
        $timestamp = '1700000000';
        $signedPayload = "{$timestamp}.{$rawBody}";
        $signature = hash_hmac('sha256', $signedPayload, $this->stripeSecret);

        $response = $this->call(
            'POST',
            '/api/webhooks/stripe',
            [],
            [],
            [],
            [
                'HTTP_STRIPE_SIGNATURE' => "t={$timestamp},v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $rawBody
        );

        $response->assertStatus(200)
            ->assertJson([
                'received' => true,
                'event' => 'checkout.session.completed',
                'result' => [
                    'status' => 'confirmed',
                    'type' => 'turno_completo',
                    'turno_id' => $turno->id,
                    'estado' => 'reservado',
                ],
            ]);

        $this->assertEquals('reservado', $turno->fresh()->estado);
    }

    public function test_stripe_webhook_invalid_signature_returns_400(): void
    {
        $rawBody = json_encode(['type' => 'payment_intent.succeeded']);

        $response = $this->call(
            'POST',
            '/api/webhooks/stripe',
            [],
            [],
            [],
            [
                'HTTP_STRIPE_SIGNATURE' => 't=1700000000,v1=tampered_signature',
                'CONTENT_TYPE' => 'application/json',
            ],
            $rawBody
        );

        $response->assertStatus(400)
            ->assertJson([
                'error' => 'INVALID_SIGNATURE',
            ]);
    }

    public function test_mercadopago_webhook_split_payment_confirms_quota_and_finalizes_turno(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Complejo Split Demo',
            'subdominio' => 'complejosplit',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 3',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 12000,
            'estado' => 'activo',
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'fecha' => '2026-09-03',
            'hora_inicio' => '21:00',
            'hora_fin' => '22:00',
            'precio' => 12000,
            'estado' => 'pendiente',
            'es_fijo' => false,
        ]);

        $tokenPago1 = (string) \Illuminate\Support\Str::uuid();
        $tokenPago2 = (string) \Illuminate\Support\Str::uuid();

        $cuota1 = TurnoPagoDividido::create([
            'complejo_id' => $complejo->id,
            'turno_id' => $turno->id,
            'nombre_jugador' => 'Jugador 1',
            'email_jugador' => 'j1@split.test',
            'monto' => 6000,
            'cuota_numero' => 1,
            'total_cuotas' => 2,
            'token_pago' => $tokenPago1,
            'estado' => 'pendiente',
        ]);

        $cuota2 = TurnoPagoDividido::create([
            'complejo_id' => $complejo->id,
            'turno_id' => $turno->id,
            'nombre_jugador' => 'Jugador 2',
            'email_jugador' => 'j2@split.test',
            'monto' => 6000,
            'cuota_numero' => 2,
            'total_cuotas' => 2,
            'token_pago' => $tokenPago2,
            'estado' => 'pendiente',
        ]);

        // Pagar Cuota 1
        $paymentId1 = 'pay_split_1';
        $reqId1 = 'req_split_1';
        $ts1 = '1700000001';
        $sig1 = hash_hmac('sha256', "id:{$paymentId1};request-id:{$reqId1};ts:{$ts1};", $this->mpSecret);

        $res1 = $this->withHeaders([
            'x-signature' => "ts={$ts1},v1={$sig1}",
            'x-request-id' => $reqId1,
        ])->postJson('/api/webhooks/mercadopago', [
            'action' => 'payment.created',
            'data' => [
                'id' => $paymentId1,
                'status' => 'approved',
                'metadata' => [
                    'token_pago' => $tokenPago1,
                ],
            ],
        ]);

        $res1->assertStatus(200);
        $this->assertEquals('pagado', $cuota1->fresh()->estado);
        $this->assertEquals('pendiente', $turno->fresh()->estado); // Aún falta la cuota 2

        // Pagar Cuota 2
        $paymentId2 = 'pay_split_2';
        $reqId2 = 'req_split_2';
        $ts2 = '1700000002';
        $sig2 = hash_hmac('sha256', "id:{$paymentId2};request-id:{$reqId2};ts:{$ts2};", $this->mpSecret);

        $res2 = $this->withHeaders([
            'x-signature' => "ts={$ts2},v1={$sig2}",
            'x-request-id' => $reqId2,
        ])->postJson('/api/webhooks/mercadopago', [
            'action' => 'payment.created',
            'data' => [
                'id' => $paymentId2,
                'status' => 'approved',
                'metadata' => [
                    'token_pago' => $tokenPago2,
                ],
            ],
        ]);

        $res2->assertStatus(200);
        $this->assertEquals('pagado', $cuota2->fresh()->estado);
        // Al completarse todas las cuotas, el turno se confirma automáticamente
        $this->assertEquals('reservado', $turno->fresh()->estado);
    }
}
