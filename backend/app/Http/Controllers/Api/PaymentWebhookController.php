<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    public function __construct(
        protected PaymentWebhookService $webhookService
    ) {}

    /**
     * Webhook receptor de notificaciones de pago de Mercado Pago.
     * POST /api/webhooks/mercadopago
     */
    public function handleMercadoPago(Request $request): JsonResponse
    {
        // 1. Validar firma criptográfica HMAC SHA256
        if (!$this->webhookService->validateMercadoPagoSignature($request)) {
            return response()->json([
                'error' => 'INVALID_SIGNATURE',
                'message' => 'Firma criptográfica x-signature de Mercado Pago inválida.',
            ], 401);
        }

        $payload = $request->all();
        Log::info('MercadoPago Webhook recibido exitosamente:', $payload);

        // 2. Extraer datos de la transacción
        $action = $payload['action'] ?? $payload['type'] ?? 'payment';
        $status = $payload['data']['status'] ?? $payload['status'] ?? 'approved';
        $metadata = $payload['data']['metadata'] ?? $payload['metadata'] ?? [];

        // Soporte para external_reference serializado en JSON o ID directo
        if (!empty($payload['data']['external_reference']) && empty($metadata['turno_id']) && empty($metadata['token_pago'])) {
            $extRef = $payload['data']['external_reference'];
            $decoded = json_decode($extRef, true);
            if (is_array($decoded)) {
                $metadata = array_merge($metadata, $decoded);
            } elseif (is_numeric($extRef)) {
                $metadata['turno_id'] = (int) $extRef;
            } else {
                $metadata['token_pago'] = $extRef;
            }
        }

        $paymentData = array_merge($payload['data'] ?? [], [
            'metadata' => $metadata,
            'status' => $status,
        ]);

        // 3. Confirmación atómica si el pago fue aprobado
        $result = ['status' => 'acknowledged'];
        if (in_array($status, ['approved', 'closed'], true)) {
            $result = $this->webhookService->processApprovedPayment($paymentData, 'mercadopago');
        }

        return response()->json([
            'received' => true,
            'action' => $action,
            'result' => $result,
        ], 200);
    }

    /**
     * Webhook receptor de notificaciones de pago de Stripe.
     * POST /api/webhooks/stripe
     */
    public function handleStripe(Request $request): JsonResponse
    {
        // 1. Validar firma criptográfica Stripe-Signature
        if (!$this->webhookService->validateStripeSignature($request)) {
            return response()->json([
                'error' => 'INVALID_SIGNATURE',
                'message' => 'Firma criptográfica Stripe-Signature inválida.',
            ], 400);
        }

        $payload = $request->all();
        $eventType = $payload['type'] ?? 'payment_intent.succeeded';
        Log::info("Stripe Webhook recibido [{$eventType}]:", $payload);

        $object = $payload['data']['object'] ?? [];
        $metadata = $object['metadata'] ?? [];

        $paymentData = [
            'id' => $object['id'] ?? null,
            'amount' => $object['amount'] ?? null,
            'currency' => $object['currency'] ?? 'usd',
            'metadata' => $metadata,
            'turno_id' => $metadata['turno_id'] ?? null,
            'token_pago' => $metadata['token_pago'] ?? null,
            'token_reserva' => $metadata['token_reserva'] ?? null,
        ];

        // 2. Procesar eventos de pago aprobado
        $approvedEventTypes = [
            'checkout.session.completed',
            'payment_intent.succeeded',
            'charge.succeeded',
        ];

        $result = ['status' => 'acknowledged'];
        if (in_array($eventType, $approvedEventTypes, true)) {
            $result = $this->webhookService->processApprovedPayment($paymentData, 'stripe');
        }

        return response()->json([
            'received' => true,
            'event' => $eventType,
            'result' => $result,
        ], 200);
    }
}
