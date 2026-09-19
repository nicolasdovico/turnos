<?php

namespace App\Jobs;

use App\Models\Turno;
use App\Services\WhatsAppEvolutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class NotificarCancelacionLluviaWhatsAppJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Turno $turno,
        public string $tipoReembolso = 'billetera',
        public ?float $monto = null,
        public ?string $linkVale = null,
        public ?string $codigoVale = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(WhatsAppEvolutionService $whatsAppService): array
    {
        $this->turno->loadMissing(['cliente', 'cancha.complejo', 'complejo']);

        $enviado = $whatsAppService->enviarCancelacionLluvia(
            $this->turno,
            $this->tipoReembolso,
            $this->monto,
            $this->linkVale,
            $this->codigoVale
        );

        if ($enviado) {
            Log::info("NotificarCancelacionLluviaWhatsAppJob: Notificación enviada con éxito para turno ID {$this->turno->id}.");
            return [
                'status' => 'sent',
                'turno_id' => $this->turno->id,
            ];
        }

        Log::warning("NotificarCancelacionLluviaWhatsAppJob: Falló el envío para turno ID {$this->turno->id}.");
        return [
            'status' => 'failed',
            'turno_id' => $this->turno->id,
        ];
    }
}
