<?php

namespace App\Console\Commands;

use App\Models\Complejo;
use App\Models\DispositivoIoT;
use App\Services\IoTControlService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SincronizarLucesIoTCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'iot:sincronizar-luces
                            {--complejo= : Filtrar por ID o subdominio de un complejo específico}
                            {--momento= : Fecha y hora personalizada para simulación (formato Y-m-d H:i)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincroniza y emite órdenes de encendido/apagado a dispositivos IoT y luces según los turnos confirmados';

    public function __construct(
        protected IoTControlService $iotControlService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $momentoStr = $this->option('momento');
        $momento = $momentoStr ? Carbon::parse($momentoStr) : Carbon::now();

        $this->info("Iniciando sincronización IoT para el momento: {$momento->format('Y-m-d H:i:s')}");

        $complejoFilter = $this->option('complejo');
        $complejosQuery = Complejo::query()->where('estado', 'activo');

        if ($complejoFilter) {
            if (is_numeric($complejoFilter)) {
                $complejosQuery->where('id', (int) $complejoFilter);
            } else {
                $complejosQuery->where('subdominio', $complejoFilter);
            }
        }

        $complejos = $complejosQuery->get();
        $cambios = [];
        $totalEvaluados = 0;

        foreach ($complejos as $complejo) {
            // Verificar si el complejo tiene contratado el módulo de domótica
            if (!$complejo->hasModule('domotica')) {
                continue;
            }

            $dispositivos = DispositivoIoT::where('complejo_id', $complejo->id)
                ->where('esta_activo', true)
                ->with('cancha')
                ->get();

            foreach ($dispositivos as $dispositivo) {
                $totalEvaluados++;
                $deberiaEstarEncendido = $dispositivo->deberiaEstarEncendido($momento);

                if ($deberiaEstarEncendido && $dispositivo->estado_actual !== 'encendido') {
                    $res = $this->iotControlService->enviarOrden(
                        $dispositivo,
                        'ENCENDER',
                        'Turno reservado en curso o próximo a comenzar'
                    );

                    $cambios[] = [
                        'complejo' => $complejo->nombre,
                        'cancha' => $dispositivo->cancha?->nombre ?? 'N/A',
                        'dispositivo' => $dispositivo->nombre,
                        'orden' => 'ENCENDER 💡',
                        'motivo' => $res['motivo'],
                    ];
                } elseif (!$deberiaEstarEncendido && $dispositivo->estado_actual !== 'apagado') {
                    $res = $this->iotControlService->enviarOrden(
                        $dispositivo,
                        'APAGAR',
                        'Sin turnos activos en la ventana horaria'
                    );

                    $cambios[] = [
                        'complejo' => $complejo->nombre,
                        'cancha' => $dispositivo->cancha?->nombre ?? 'N/A',
                        'dispositivo' => $dispositivo->nombre,
                        'orden' => 'APAGAR 🌑',
                        'motivo' => $res['motivo'],
                    ];
                }
            }
        }

        if (count($cambios) > 0) {
            $this->table(
                ['Complejo', 'Cancha', 'Dispositivo', 'Orden Emitida', 'Motivo'],
                $cambios
            );
            $this->info("Se emitieron " . count($cambios) . " órdenes de control IoT.");
        } else {
            $this->line("Todos los dispositivos ({$totalEvaluados} evaluados) se encuentran en el estado correcto.");
        }

        return Command::SUCCESS;
    }
}
