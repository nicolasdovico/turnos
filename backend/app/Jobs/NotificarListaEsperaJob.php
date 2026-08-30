<?php

namespace App\Jobs;

use App\Models\Cancha;
use App\Models\ListaEspera;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class NotificarListaEsperaJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $canchaId,
        public string $fecha,
        public string $horaInicio,
        public ?string $horaFin = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $horaFormatted = Carbon::parse($this->horaInicio)->format('H:i');
        $cancha = Cancha::with('complejo')->find($this->canchaId);
        if (!$cancha) {
            return;
        }

        $suscripciones = ListaEspera::where('cancha_id', $this->canchaId)
            ->where('fecha', $this->fecha)
            ->where('hora_inicio', $horaFormatted)
            ->where('notificado', false)
            ->with('user')
            ->get();

        if ($suscripciones->isEmpty()) {
            return;
        }

        $complejoNombre = $cancha->complejo?->nombre ?: 'Tu Club';
        $canchaNombre = $cancha->nombre;

        $title = "¡Turno Disponible en {$complejoNombre}!";
        $body = "Se liberó el turno de las {$horaFormatted} hs en {$canchaNombre}. ¡Aprovechá y reservalo antes que nadie!";

        foreach ($suscripciones as $suscripcion) {
            $user = $suscripcion->user;
            if ($user && $user->fcm_token) {
                try {
                    $notificationService = app(NotificationService::class);
                    $notificationService->sendPushNotification(
                        $user->fcm_token,
                        $title,
                        $body,
                        [
                            'type' => 'turno_disponible',
                            'cancha_id' => (string) $this->canchaId,
                            'fecha' => $this->fecha,
                            'hora_inicio' => $horaFormatted,
                            'subdomain' => (string) ($cancha->complejo?->subdominio ?? ''),
                        ]
                    );
                } catch (\Throwable $e) {
                    Log::warning("Error sending waitlist push notification to user {$user->id}: " . $e->getMessage());
                }
            }

            $suscripcion->update(['notificado' => true]);
        }
    }
}
