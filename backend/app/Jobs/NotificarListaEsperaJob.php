<?php

namespace App\Jobs;

use App\Models\Cancha;
use App\Models\ListaEspera;
use App\Services\FCMNotificationService;
use App\Services\WhatsAppEvolutionService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
        $cancha = Cancha::withoutGlobalScopes()->with('complejo')->find($this->canchaId);
        if (!$cancha) {
            Log::warning("NotificarListaEsperaJob: Cancha {$this->canchaId} no encontrada.");
            return;
        }

        $suscripciones = ListaEspera::withoutGlobalScopes()
            ->where('cancha_id', $this->canchaId)
            ->where('fecha', $this->fecha)
            ->where(function ($q) use ($horaFormatted) {
                $q->where('hora_inicio', $horaFormatted)
                  ->orWhere('hora_inicio', $horaFormatted . ':00');
            })
            ->where('notificado', false)
            ->with('user')
            ->get();

        if ($suscripciones->isEmpty()) {
            Log::info("NotificarListaEsperaJob: Sin suscriptores pendientes para cancha {$this->canchaId}, fecha {$this->fecha}, hora {$horaFormatted}.");
            return;
        }

        $horaFinCalculada = $this->horaFin ?: Carbon::parse($horaFormatted)->addHour()->format('H:i');
        $complejoNombre = $cancha->complejo?->nombre ?: 'Tu Club';
        $canchaNombre = $cancha->nombre;
        $subdominio = (string) ($cancha->complejo?->subdominio ?? '');
        $fechaFormateada = Carbon::parse($this->fecha)->format('d/m/Y');

        $frontendHost = env('FRONTEND_URL', 'http://localhost:8080');
        if ($subdominio && $subdominio !== 'app' && !str_contains($frontendHost, $subdominio)) {
            $parsed = parse_url($frontendHost);
            $host = $parsed['host'] ?? 'localhost';
            $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
            $scheme = $parsed['scheme'] ?? 'http';
            $reservaUrl = "{$scheme}://{$subdominio}.{$host}{$port}/?fecha={$this->fecha}&cancha={$cancha->id}";
        } else {
            $reservaUrl = "{$frontendHost}/?fecha={$this->fecha}&cancha={$cancha->id}";
        }

        $title = "¡Turno Disponible en {$complejoNombre}!";
        $body = "Se liberó el turno de las {$horaFormatted} hs en {$canchaNombre}. ¡Aprovechá y reservalo antes que nadie!";

        foreach ($suscripciones as $suscripcion) {
            $user = $suscripcion->user;
            if (!$user) {
                $suscripcion->update(['notificado' => true]);
                continue;
            }

            // 1. Notificación por Correo Electrónico (Mailpit / SMTP)
            if (!empty($user->email)) {
                try {
                    Mail::to($user->email)->send(
                        new \App\Mail\TurnoLiberadoMail(
                            nombreUsuario: $user->name ?: 'Jugador',
                            complejoNombre: $complejoNombre,
                            canchaNombre: $canchaNombre,
                            fecha: $fechaFormateada,
                            horaInicio: $horaFormatted,
                            horaFin: $horaFinCalculada,
                            reservaUrl: $reservaUrl
                        )
                    );
                    Log::info("Email de lista de espera enviado con éxito a {$user->email}");
                } catch (\Throwable $e) {
                    Log::warning("Error enviando email de lista de espera al usuario {$user->id} ({$user->email}): " . $e->getMessage());
                }
            }

            // 2. Notificación por WhatsApp Gratis (Evolution API)
            if (!empty($user->telefono)) {
                try {
                    $whatsAppService = app(WhatsAppEvolutionService::class);
                    $whatsAppService->enviarMensajeTurnoLiberado(
                        user: $user,
                        cancha: $cancha,
                        fecha: $this->fecha,
                        horaInicio: $horaFormatted,
                        horaFin: $horaFinCalculada
                    );
                } catch (\Throwable $e) {
                    Log::warning("Error enviando WhatsApp de lista de espera al usuario {$user->id}: " . $e->getMessage());
                }
            }

            // 3. Notificación Push Móvil Nativa (FCM)
            if ($user->fcm_token) {
                try {
                    $fcmService = app(FCMNotificationService::class);
                    $fcmService->sendPushNotification(
                        $user->fcm_token,
                        $title,
                        $body,
                        [
                            'type' => 'turno_disponible',
                            'cancha_id' => (string) $this->canchaId,
                            'fecha' => $this->fecha,
                            'hora_inicio' => $horaFormatted,
                            'subdomain' => $subdominio,
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
