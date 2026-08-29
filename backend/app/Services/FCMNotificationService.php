<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FCMNotificationService
{
    /**
     * URL de la API de Firebase Cloud Messaging.
     */
    protected string $fcmUrl;
    protected ?string $serverKey;

    public function __construct()
    {
        $this->fcmUrl = config('services.fcm.url', 'https://fcm.googleapis.com/fcm/send');
        $this->serverKey = config('services.fcm.server_key', env('FCM_SERVER_KEY', 'mock_fcm_key_123'));
    }

    /**
     * Envía una notificación Push vía Firebase Cloud Messaging a un dispositivo.
     *
     * @param  string  $fcmToken  Token de registro FCM del dispositivo
     * @param  string  $title     Título de la notificación
     * @param  string  $body      Cuerpo del mensaje
     * @param  array   $data      Payload adicional
     * @return array              Resultado de la operación
     */
    public function sendPushNotification(
        string $fcmToken,
        string $title,
        string $body,
        array $data = []
    ): array {
        $payload = [
            'to' => $fcmToken,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => 1,
            ],
            'data' => array_merge($data, [
                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                'timestamp' => now()->toIso8601String(),
            ]),
            'priority' => 'high',
        ];

        // En entornos de testing o si se utiliza mock key, simular envío exitoso
        if (app()->environment('testing') || $this->serverKey === 'mock_fcm_key_123') {
            Log::info('FCM Push Notification Simulado:', [
                'to' => $fcmToken,
                'title' => $title,
                'body' => $body,
            ]);

            return [
                'multicast_id' => rand(1000000, 9999999),
                'success' => 1,
                'failure' => 0,
                'canonical_ids' => 0,
                'results' => [
                    ['message_id' => 'mock_msg_' . uniqid()],
                ],
            ];
        }

        $response = Http::withHeaders([
            'Authorization' => 'key=' . $this->serverKey,
            'Content-Type' => 'application/json',
        ])->post($this->fcmUrl, $payload);

        return $response->json() ?? ['success' => 0, 'failure' => 1];
    }
}
