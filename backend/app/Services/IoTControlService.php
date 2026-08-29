<?php

namespace App\Services;

use App\Models\DispositivoIoT;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IoTControlService
{
    /**
     * Envía una orden de control (ENCENDER / APAGAR) al actuador o relé IoT.
     *
     * @param  DispositivoIoT  $dispositivo  Dispositivo de iluminación o relé
     * @param  string          $accion       'ENCENDER' o 'APAGAR'
     * @param  string|null     $motivo       Razón de la emisión de la orden
     * @return array                         Resultado de la emisión
     */
    public function enviarOrden(
        DispositivoIoT $dispositivo,
        string $accion,
        ?string $motivo = null
    ): array {
        $accion = strtoupper($accion);
        if (!in_array($accion, ['ENCENDER', 'APAGAR'], true)) {
            throw new \InvalidArgumentException("Acción IoT inválida: {$accion}. Debe ser ENCENDER o APAGAR.");
        }

        $nuevoEstado = ($accion === 'ENCENDER') ? 'encendido' : 'apagado';
        $timestamp = now();

        Log::info("IoT Control Dispatch [{$accion}]:", [
            'dispositivo_id' => $dispositivo->id,
            'nombre' => $dispositivo->nombre,
            'cancha_id' => $dispositivo->cancha_id,
            'nuevo_estado' => $nuevoEstado,
            'motivo' => $motivo,
            'topic_mqtt' => $dispositivo->topic_mqtt,
            'endpoint_url' => $dispositivo->endpoint_url,
        ]);

        // Si el dispositivo tiene configurado un endpoint Webhook HTTP REST
        if ($dispositivo->endpoint_url && !app()->environment('testing')) {
            try {
                $client = Http::timeout(3);
                if ($dispositivo->token_api) {
                    $client = $client->withToken($dispositivo->token_api);
                }

                $client->post($dispositivo->endpoint_url, [
                    'device_id' => $dispositivo->id,
                    'command' => $accion,
                    'state' => $nuevoEstado,
                    'timestamp' => $timestamp->toIso8601String(),
                ]);
            } catch (\Throwable $e) {
                Log::error("Error contactando endpoint IoT del dispositivo {$dispositivo->id}: " . $e->getMessage());
            }
        }

        // Actualizar el estado en la base de datos
        $dispositivo->update([
            'estado_actual' => $nuevoEstado,
            'ultimo_cambio_estado' => $timestamp,
        ]);

        return [
            'success' => true,
            'dispositivo_id' => $dispositivo->id,
            'nombre' => $dispositivo->nombre,
            'cancha_id' => $dispositivo->cancha_id,
            'accion' => $accion,
            'estado_actual' => $nuevoEstado,
            'motivo' => $motivo,
            'timestamp' => $timestamp->toIso8601String(),
        ];
    }
}
