<?php

namespace App\Console\Commands;

use App\Jobs\EnviarRecordatorioTurnoJob;
use App\Jobs\EnviarRecordatorioWhatsAppJob;
use App\Models\Complejo;
use App\Models\Turno;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class EnviarRecordatoriosTurnosCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'turnos:enviar-recordatorios
                            {--complejo= : Filtrar por ID o subdominio de un complejo específico}
                            {--minutos= : Minutos de anticipación personalizados para evaluar}
                            {--momento= : Fecha y hora personalizada para simulación/testing (formato Y-m-d H:i)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Busca y envía recordatorios por WhatsApp a clientes con turnos próximos según la anticipación configurada';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $momentoStr = $this->option('momento');
        $minutosCustom = $this->option('minutos') ? (int) $this->option('minutos') : null;
        $complejoFilter = $this->option('complejo');

        $this->info("Iniciando escaneo de recordatorios de turnos...");

        $complejosQuery = Complejo::query()->where('estado', 'activo');

        if ($complejoFilter) {
            if (is_numeric($complejoFilter)) {
                $complejosQuery->where('id', (int) $complejoFilter);
            } else {
                $complejosQuery->where('subdominio', $complejoFilter);
            }
        }

        $complejos = $complejosQuery->get();
        $totalRecordatoriosDespachados = 0;

        foreach ($complejos as $complejo) {
            // Si el complejo tiene desactivados los recordatorios y no se especificó un filtro directo, omitir
            if (!$complejo->recordatorio_whatsapp_activo && !$complejoFilter) {
                continue;
            }

            $timezone = $complejo->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');
            $now = $momentoStr ? Carbon::parse($momentoStr, $timezone) : Carbon::now($timezone);
            $anticipacionMinutos = $minutosCustom ?: ($complejo->recordatorio_anticipacion_minutos ?: 120);

            $ventanaInicio = $now->copy();
            $ventanaFin = $now->copy()->addMinutes($anticipacionMinutos);

            $fechaInicio = $ventanaInicio->toDateString();
            $fechaFin = $ventanaFin->toDateString();
            $horaInicio = $ventanaInicio->format('H:i:s');
            $horaFin = $ventanaFin->format('H:i:s');

            $turnosQuery = Turno::withoutGlobalScopes()
                ->where('complejo_id', $complejo->id)
                ->where('estado', 'reservado')
                ->whereNull('recordatorio_enviado_at')
                ->where(function ($q) {
                    $q->whereNotNull('cliente_telefono')
                      ->where('cliente_telefono', '!=', '')
                      ->orWhereHas('cliente', function ($uq) {
                          $uq->whereNotNull('telefono')->where('telefono', '!=', '');
                      });
                });

            if ($fechaInicio === $fechaFin) {
                $turnosQuery->where('fecha', $fechaInicio)
                    ->where('hora_inicio', '>=', $horaInicio)
                    ->where('hora_inicio', '<=', $horaFin);
            } else {
                $turnosQuery->where(function ($q) use ($fechaInicio, $horaInicio, $fechaFin, $horaFin) {
                    $q->where(function ($sub) use ($fechaInicio, $horaInicio) {
                        $sub->where('fecha', $fechaInicio)
                            ->where('hora_inicio', '>=', $horaInicio);
                    })->orWhere(function ($sub) use ($fechaFin, $horaFin) {
                        $sub->where('fecha', $fechaFin)
                            ->where('hora_inicio', '<=', $horaFin);
                    });
                });
            }

            $turnos = $turnosQuery->with(['cliente', 'cancha', 'complejo'])->get();

            foreach ($turnos as $turno) {
                // Despachar Job de WhatsApp
                EnviarRecordatorioWhatsAppJob::dispatch($turno, true);

                // Si el cliente posee fcm_token móvil, despachar también notificación Push
                if ($turno->cliente && !empty($turno->cliente->fcm_token)) {
                    EnviarRecordatorioTurnoJob::dispatch($turno);
                }

                // Marcar preventivamente para evitar duplicaciones en caso de ejecuciones superpuestas
                $turno->update(['recordatorio_enviado_at' => Carbon::now($timezone)]);
                $totalRecordatoriosDespachados++;

                $this->line(" -> Recordatorio encolado para turno #{$turno->id} ({$complejo->nombre} - {$turno->fecha->format('d/m/Y')} {$turno->hora_inicio})");
            }
        }

        $this->info("Proceso finalizado. Total de recordatorios despachados: {$totalRecordatoriosDespachados}");
        Log::info("EnviarRecordatoriosTurnosCommand ejecutado: {$totalRecordatoriosDespachados} turnos notificados.");

        return 0;
    }
}
