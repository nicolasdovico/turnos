<?php

namespace App\Services;

use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentWebhookService
{
    public function __construct(
        protected ReservaLockService $reservaLockService
    ) {}

    /**
     * Valida la firma criptográfica del webhook de Mercado Pago (HMAC SHA256).
     * Header x-signature: ts=1690000000,v1=hash_hex_string
     * Manifest: id:[data.id];request-id:[x-request-id];ts:[ts];
     */
    public function validateMercadoPagoSignature(Request $request): bool
    {
        $signatureHeader = $request->header('x-signature');
        $requestId = $request->header('x-request-id') ?? $request->input('request_id', '');
        $dataId = $request->input('data.id') ?? $request->query('data.id') ?? $request->input('id', '');

        if (!$signatureHeader) {
            Log::warning('MercadoPago Webhook: Encabezado x-signature ausente.');
            return false;
        }

        $parts = explode(',', $signatureHeader);
        $ts = null;
        $v1 = null;

        foreach ($parts as $part) {
            $keyValue = explode('=', trim($part), 2);
            if (count($keyValue) === 2) {
                if ($keyValue[0] === 'ts') {
                    $ts = $keyValue[1];
                } elseif ($keyValue[0] === 'v1') {
                    $v1 = $keyValue[1];
                }
            }
        }

        if (!$ts || !$v1) {
            Log::warning('MercadoPago Webhook: Formato de x-signature inválido.');
            return false;
        }

        $secret = config('services.mercadopago.webhook_secret', 'mp_test_webhook_secret_key_12345');
        $manifest = "id:{$dataId};request-id:{$requestId};ts:{$ts};";
        $calculatedHash = hash_hmac('sha256', $manifest, $secret);

        return hash_equals($calculatedHash, $v1);
    }

    /**
     * Valida la firma criptográfica del webhook de Stripe (HMAC SHA256).
     * Header Stripe-Signature: t=1690000000,v1=hash_hex_string
     * Signed Payload: [t].[raw_payload]
     */
    public function validateStripeSignature(Request $request): bool
    {
        $signatureHeader = $request->header('Stripe-Signature') ?? $request->header('stripe-signature');
        if (!$signatureHeader) {
            Log::warning('Stripe Webhook: Encabezado Stripe-Signature ausente.');
            return false;
        }

        $parts = explode(',', $signatureHeader);
        $timestamp = null;
        $v1Signatures = [];

        foreach ($parts as $part) {
            $keyValue = explode('=', trim($part), 2);
            if (count($keyValue) === 2) {
                if ($keyValue[0] === 't') {
                    $timestamp = $keyValue[1];
                } elseif ($keyValue[0] === 'v1') {
                    $v1Signatures[] = $keyValue[1];
                }
            }
        }

        if (!$timestamp || empty($v1Signatures)) {
            Log::warning('Stripe Webhook: Formato de Stripe-Signature inválido.');
            return false;
        }

        $secret = config('services.stripe.webhook_secret', 'whsec_test_stripe_secret_key_12345');
        $rawPayload = $request->getContent();
        $signedPayload = "{$timestamp}.{$rawPayload}";
        $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

        foreach ($v1Signatures as $signature) {
            if (hash_equals($expectedSignature, $signature)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Procesa de forma transaccional y atómica la confirmación de la reserva o cuota de pago.
     */
    public function processApprovedPayment(array $paymentData, string $gateway): array
    {
        return DB::transaction(function () use ($paymentData, $gateway) {
            $turnoId = $paymentData['turno_id'] ?? $paymentData['metadata']['turno_id'] ?? null;
            $tokenPago = $paymentData['token_pago'] ?? $paymentData['metadata']['token_pago'] ?? null;
            $tokenReserva = $paymentData['token_reserva'] ?? $paymentData['metadata']['token_reserva'] ?? null;

            // 1. Caso: Pago individual de cuota Split Payment
            if ($tokenPago) {
                $pagoDividido = TurnoPagoDividido::where('token_pago', $tokenPago)
                    ->lockForUpdate()
                    ->first();

                if (!$pagoDividido) {
                    return [
                        'status' => 'not_found',
                        'message' => 'Cuota de pago dividido no encontrada',
                    ];
                }

                if ($pagoDividido->estado !== 'pagado') {
                    $pagoDividido->update([
                        'estado' => 'pagado',
                        'metodo_pago' => $gateway,
                        'pagado_en' => now(),
                    ]);
                }

                // Verificar si se completaron todas las cuotas del turno
                $turno = Turno::find($pagoDividido->turno_id);
                if ($turno) {
                    $cuotasPendientes = TurnoPagoDividido::where('turno_id', $turno->id)
                        ->where('estado', '!=', 'pagado')
                        ->count();

                    if ($cuotasPendientes === 0 && $turno->estado !== 'reservado') {
                        $turno->update([
                            'estado' => 'reservado',
                        ]);

                        // Liberar bloqueo Redis si existiese
                        $this->reservaLockService->liberarBloqueo(
                            $turno->cancha_id,
                            Carbon::parse($turno->fecha)->format('Y-m-d'),
                            substr($turno->hora_inicio, 0, 5),
                            $tokenReserva
                        );
                    }
                }

                return [
                    'status' => 'confirmed',
                    'type' => 'split_payment',
                    'pago_dividido_id' => $pagoDividido->id,
                    'turno_id' => $turno?->id,
                    'turno_estado' => $turno?->fresh()->estado,
                ];
            }

            // 2. Caso: Pago directo de turno completo
            if ($turnoId) {
                $turno = Turno::where('id', $turnoId)->lockForUpdate()->first();

                if (!$turno) {
                    return [
                        'status' => 'not_found',
                        'message' => "Turno con ID {$turnoId} no encontrado",
                    ];
                }

                if ($turno->estado !== 'reservado') {
                    $turno->update([
                        'estado' => 'reservado',
                    ]);

                    // Liberar bloqueo Redis
                    $this->reservaLockService->liberarBloqueo(
                        $turno->cancha_id,
                        Carbon::parse($turno->fecha)->format('Y-m-d'),
                        substr($turno->hora_inicio, 0, 5),
                        $tokenReserva
                    );
                }

                return [
                    'status' => 'confirmed',
                    'type' => 'turno_completo',
                    'turno_id' => $turno->id,
                    'estado' => 'reservado',
                ];
            }

            return [
                'status' => 'ignored',
                'message' => 'El evento de pago no contenía referencias de turno_id ni token_pago',
            ];
        });
    }
}
