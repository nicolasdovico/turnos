<?php

namespace App\Jobs;

use App\Models\Turno;
use App\Services\FCMNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class EnviarRecordatorioTurnoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Turno $turno
    ) {}

    /**
     * Execute the job.
     */
    public function handle(FCMNotificationService $fcmService): array
    {
        // Cargar relaciones necesarias
        $this->turno->loadMissing(['cliente', 'cancha', 'complejo']);

        $cliente = $this->turno->cliente;

        if (!$cliente) {
            Log::warning("EnviarRecordatorioTurnoJob: El turno ID {$this->turno->id} no tiene cliente asignado.");
            return ['status' => 'skipped', 'reason' => 'NO_CLIENT'];
        }

        if (empty($cliente->fcm_token)) {
            Log::warning("EnviarRecordatorioTurnoJob: El cliente ID {$cliente->id} no posee fcm_token registrado.");
            return ['status' => 'skipped', 'reason' => 'NO_FCM_TOKEN'];
        }

        $complejoNombre = $this->turno->complejo?->nombre ?? 'tu club';
        $canchaNombre = $this->turno->cancha?->nombre ?? 'Cancha';
        $horaInicio = substr($this->turno->hora_inicio, 0, 5);

        $title = "⏰ Recordatorio de Turno";
        $body = "¡Tu partido está cerca! Tienes un turno reservado en {$complejoNombre} ({$canchaNombre}) para hoy a las {$horaInicio} hs.";

        $data = [
            'type' => 'turno_reminder',
            'turno_id' => (string) $this->turno->id,
            'cancha_id' => (string) $this->turno->cancha_id,
            'complejo_id' => (string) $this->turno->complejo_id,
            'fecha' => (string) $this->turno->fecha,
            'hora_inicio' => (string) $this->turno->hora_inicio,
        ];

        $resultado = $fcmService->sendPushNotification(
            $cliente->fcm_token,
            $title,
            $body,
            $data
        );

        Log::info("Recordatorio de turno enviado con éxito para turno ID {$this->turno->id} a cliente ID {$cliente->id}");

        return [
            'status' => 'sent',
            'turno_id' => $this->turno->id,
            'cliente_id' => $cliente->id,
            'fcm_response' => $resultado,
        ];
    }
}
