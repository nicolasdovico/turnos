<?php

namespace App\Jobs;

use App\Models\Turno;
use App\Services\WhatsAppEvolutionService;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class EnviarRecordatorioWhatsAppJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Turno $turno
    ) {}

    /**
     * Execute the job.
     */
    public function handle(WhatsAppEvolutionService $whatsAppService): array
    {
        $this->turno->loadMissing(['cliente', 'cancha.complejo', 'complejo']);

        if (in_array($this->turno->estado, ['cancelado', 'rechazado', 'anulado'])) {
            Log::info("EnviarRecordatorioWhatsAppJob: El turno ID {$this->turno->id} se encuentra {$this->turno->estado}.");
            return ['status' => 'skipped', 'reason' => 'TURNO_CANCELLED'];
        }

        $telefono = $this->turno->cliente_telefono ?: $this->turno->cliente?->telefono;

        if (empty($telefono)) {
            Log::warning("EnviarRecordatorioWhatsAppJob: El turno ID {$this->turno->id} no tiene teléfono asignado.");
            return ['status' => 'skipped', 'reason' => 'NO_PHONE'];
        }

        // Si ya fue enviado, no reenviar (idempotencia)
        if ($this->turno->recordatorio_enviado_at !== null) {
            Log::info("EnviarRecordatorioWhatsAppJob: El turno ID {$this->turno->id} ya tiene recordatorio enviado.");
            return ['status' => 'skipped', 'reason' => 'ALREADY_SENT'];
        }

        $enviado = $whatsAppService->enviarRecordatorioTurno($this->turno);

        if ($enviado) {
            $this->turno->update(['recordatorio_enviado_at' => Carbon::now()]);
            Log::info("EnviarRecordatorioWhatsAppJob: Recordatorio enviado con éxito para turno ID {$this->turno->id} a teléfono {$telefono}.");
            return [
                'status' => 'sent',
                'turno_id' => $this->turno->id,
                'telefono' => $telefono,
            ];
        }

        Log::warning("EnviarRecordatorioWhatsAppJob: Falló el envío vía Evolution API para turno ID {$this->turno->id}.");
        return [
            'status' => 'failed',
            'turno_id' => $this->turno->id,
            'telefono' => $telefono,
        ];
    }
}
