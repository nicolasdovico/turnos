<?php

namespace App\Services;

use App\Models\Complejo;
use App\Models\FacturaClub;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClubPaymentGatewayService
{
    public function __construct(
        protected CotizacionDolarService $cotizacionDolarService
    ) {}

    /**
     * Genera la preferencia de pago en Mercado Pago en ARS (con conversión automática).
     */
    public function crearPreferenciaMercadoPago(FacturaClub $factura, ?string $backUrl = null): array
    {
        $complejo = $factura->complejo;
        $mpAccessToken = config('services.mercadopago.access_token');

        // Asegurar conversión a ARS si aún no está calculada
        if (!$factura->total_ars || (float) $factura->total_ars <= 0) {
            $conversion = $this->cotizacionDolarService->convertirUsdAPesos((float) $factura->total_usd);
            $factura->update([
                'tipo_cambio_ars' => $conversion['tipo_cambio'],
                'total_ars' => $conversion['monto_ars'],
            ]);
        }

        $totalArs = (float) $factura->total_ars;
        $externalRef = "FACTURA_CLUB_{$factura->uuid}";
        $titulo = "Abono Mensual Turnos.com - {$complejo->nombre} ({$factura->periodo})";

        // Si hay token real de MP en producción
        if ($mpAccessToken && !str_starts_with($mpAccessToken, 'test_mock') && !app()->environment('testing')) {
            try {
                $payload = [
                    'items' => [
                        [
                            'id' => "plan_{$factura->plan_id}",
                            'title' => $titulo,
                            'description' => "Abono mensual de software SaaS, canchas y comisiones marketplace",
                            'quantity' => 1,
                            'currency_id' => 'ARS',
                            'unit_price' => $totalArs,
                        ],
                    ],
                    'external_reference' => $externalRef,
                    'back_urls' => [
                        'success' => $backUrl ?: "http://{$complejo->subdominio}.localhost:8080/panel?pago=exitoso",
                        'pending' => $backUrl ?: "http://{$complejo->subdominio}.localhost:8080/panel?pago=pendiente",
                        'failure' => $backUrl ?: "http://{$complejo->subdominio}.localhost:8080/panel?pago=fallido",
                    ],
                    'auto_return' => 'approved',
                    'notification_url' => config('app.url') . "/api/webhooks/mercadopago",
                ];

                $response = Http::withToken($mpAccessToken)
                    ->timeout(8)
                    ->post('https://api.mercadopago.com/checkout/preferences', $payload);

                if ($response->successful()) {
                    $resData = $response->json();
                    $prefId = $resData['id'] ?? null;
                    $initPoint = $resData['init_point'] ?? ($resData['sandbox_init_point'] ?? null);

                    $factura->update(['gateway_preference_id' => $prefId]);

                    return [
                        'success' => true,
                        'gateway' => 'mercadopago',
                        'preference_id' => $prefId,
                        'init_point' => $initPoint,
                        'total_ars' => $totalArs,
                        'tipo_cambio' => (float) $factura->tipo_cambio_ars,
                    ];
                }
            } catch (\Throwable $e) {
                Log::error("ClubPaymentGatewayService: Error al generar preferencia MP: " . $e->getMessage());
            }
        }

        // Mock / Entorno de desarrollo seguro
        $mockPrefId = "mp_pref_{$factura->uuid}";
        $mockInitPoint = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id={$mockPrefId}";
        $factura->update(['gateway_preference_id' => $mockPrefId]);

        return [
            'success' => true,
            'gateway' => 'mercadopago',
            'preference_id' => $mockPrefId,
            'init_point' => $mockInitPoint,
            'total_ars' => $totalArs,
            'tipo_cambio' => (float) $factura->tipo_cambio_ars,
            'is_mock' => true,
        ];
    }

    /**
     * Genera la sesión de pago con Stripe en USD para cobros internacionales.
     */
    public function crearCheckoutStripe(FacturaClub $factura, ?string $backUrl = null): array
    {
        $complejo = $factura->complejo;
        $stripeSecret = config('services.stripe.secret_key');
        $externalRef = "FACTURA_CLUB_{$factura->uuid}";
        $totalUsd = (float) $factura->total_usd;

        if ($stripeSecret && !str_starts_with($stripeSecret, 'whsec_') && !app()->environment('testing')) {
            try {
                $response = Http::withBasicAuth($stripeSecret, '')
                    ->asForm()
                    ->timeout(8)
                    ->post('https://api.stripe.com/v1/checkout/sessions', [
                        'payment_method_types' => ['card'],
                        'client_reference_id' => $externalRef,
                        'line_items' => [
                            [
                                'price_data' => [
                                    'currency' => 'usd',
                                    'unit_amount' => (int) round($totalUsd * 100),
                                    'product_data' => [
                                        'name' => "Abono Turnos.com - {$complejo->nombre} ({$factura->periodo})",
                                    ],
                                ],
                                'quantity' => 1,
                            ],
                        ],
                        'mode' => 'payment',
                        'success_url' => $backUrl ? "{$backUrl}?pago=stripe_ok" : "http://{$complejo->subdominio}.localhost:8080/panel?pago=stripe_ok",
                        'cancel_url' => $backUrl ? "{$backUrl}?pago=stripe_cancel" : "http://{$complejo->subdominio}.localhost:8080/panel?pago=stripe_cancel",
                    ]);

                if ($response->successful()) {
                    $sessionData = $response->json();
                    $sessionId = $sessionData['id'] ?? null;
                    $url = $sessionData['url'] ?? null;

                    $factura->update(['gateway_preference_id' => $sessionId]);

                    return [
                        'success' => true,
                        'gateway' => 'stripe',
                        'session_id' => $sessionId,
                        'init_point' => $url,
                        'total_usd' => $totalUsd,
                    ];
                }
            } catch (\Throwable $e) {
                Log::error("ClubPaymentGatewayService: Error al generar sesión Stripe: " . $e->getMessage());
            }
        }

        // Mock Stripe Checkout
        $mockSessionId = "cs_test_{$factura->uuid}";
        $mockUrl = "https://checkout.stripe.com/c/pay/{$mockSessionId}";
        $factura->update(['gateway_preference_id' => $mockSessionId]);

        return [
            'success' => true,
            'gateway' => 'stripe',
            'session_id' => $mockSessionId,
            'init_point' => $mockUrl,
            'total_usd' => $totalUsd,
            'is_mock' => true,
        ];
    }

    /**
     * Registra la carga de comprobante de transferencia bancaria para revisión manual del superadmin.
     */
    public function registrarComprobanteTransferencia(FacturaClub $factura, string $comprobanteUrl, ?string $notas = null): FacturaClub
    {
        $factura->update([
            'estado' => 'revision_transferencia',
            'metodo_pago' => 'transferencia',
            'comprobante_transferencia_url' => $comprobanteUrl,
            'notas' => $notas,
        ]);

        return $factura;
    }

    /**
     * Procesa de forma atómica la confirmación de pago de una factura B2B y extiende la suscripción.
     */
    public function procesarPagoAprobado(FacturaClub $factura, string $gateway, ?string $paymentId = null): array
    {
        return DB::transaction(function () use ($factura, $gateway, $paymentId) {
            $factura = FacturaClub::where('id', $factura->id)->lockForUpdate()->first();
            $complejo = Complejo::where('id', $factura->complejo_id)->lockForUpdate()->first();

            if ($factura->estado === 'pagada') {
                return [
                    'status' => 'already_paid',
                    'message' => 'La factura ya se encontraba pagada previamente.',
                ];
            }

            // Marcar factura pagada
            $factura->update([
                'estado' => 'pagada',
                'pagado_at' => now(),
                'metodo_pago' => $gateway,
                'gateway_payment_id' => $paymentId ?: $factura->gateway_payment_id,
            ]);

            // Extender vigencia de suscripción por 30 días adicionales
            // Si la fecha actual de vencimiento está dentro de la ventana del ciclo vigente (hasta 35 días a futuro),
            // sumamos 30 días a dicha fecha. Si no tiene fecha, está vencida o supera un ciclo regular, se calculan 30 días desde hoy.
            $fechaBaseVencimiento = ($complejo->suscripcion_proximo_vencimiento 
                && $complejo->suscripcion_proximo_vencimiento->isFuture()
                && $complejo->suscripcion_proximo_vencimiento->diffInDays(now()) <= 35)
                ? $complejo->suscripcion_proximo_vencimiento
                : now();

            $nuevoVencimiento = $fechaBaseVencimiento->copy()->addDays(30);

            $complejo->update([
                'suscripcion_estado' => 'activa',
                'suscripcion_proximo_vencimiento' => $nuevoVencimiento,
                'suscripcion_gracia_vence_at' => null, // Purgar estado de gracia
            ]);

            Log::info("ClubPaymentGatewayService: Factura {$factura->uuid} pagada vía {$gateway}. Suscripción de {$complejo->nombre} extendida hasta {$nuevoVencimiento->format('Y-m-d')}");

            return [
                'status' => 'success',
                'message' => 'Pago confirmado exitosamente. La suscripción del club ha sido renovada por 30 días.',
                'proximo_vencimiento' => $nuevoVencimiento->format('Y-m-d H:i:s'),
            ];
        });
    }

    /**
     * Marca manualmente una factura como pagada (e.g. desde Filament Superadmin por transferencia bancaria).
     */
    public function marcarFacturaPagada(FacturaClub $factura, string $gateway = 'transferencia_bancaria', ?string $notas = null): array
    {
        if ($notas) {
            $factura->update([
                'notas' => trim(($factura->notas ? $factura->notas . "\n" : '') . $notas),
            ]);
        }

        return $this->procesarPagoAprobado($factura, $gateway, null);
    }
}
