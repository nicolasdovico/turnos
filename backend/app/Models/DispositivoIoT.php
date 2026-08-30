<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DispositivoIoT extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'dispositivos_iot';

    protected $fillable = [
        'complejo_id',
        'cancha_id',
        'nombre',
        'tipo',
        'ip_address',
        'topic_mqtt',
        'token_api',
        'endpoint_url',
        'minutos_antelacion_encendido',
        'minutos_gracia_apagado',
        'estado_actual',
        'ultimo_cambio_estado',
        'esta_activo',
    ];

    protected function casts(): array
    {
        return [
            'minutos_antelacion_encendido' => 'integer',
            'minutos_gracia_apagado' => 'integer',
            'esta_activo' => 'boolean',
            'ultimo_cambio_estado' => 'datetime',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function cancha(): BelongsTo
    {
        return $this->belongsTo(Cancha::class, 'cancha_id');
    }

    /**
     * Determina si el dispositivo (luces/relay) debería estar encendido en un momento determinado
     * según los turnos confirmados ('reservado') de la cancha asociada.
     */
    public function deberiaEstarEncendido(?Carbon $momento = null): bool
    {
        if (!$this->esta_activo || !$this->cancha_id) {
            return false;
        }

        $timezone = $this->complejo?->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');
        $momento = $momento ?: Carbon::now($timezone);
        $fecha = $momento->format('Y-m-d');

        // Buscar turnos reservados para la cancha en el día
        $turnos = Turno::where('cancha_id', $this->cancha_id)
            ->where('fecha', $fecha)
            ->where('estado', 'reservado')
            ->get();

        foreach ($turnos as $turno) {
            $horaInicio = substr($turno->hora_inicio, 0, 5);
            $horaFin = substr($turno->hora_fin, 0, 5);

            $inicioVentana = Carbon::parse("{$fecha} {$horaInicio}", $timezone)
                ->subMinutes($this->minutos_antelacion_encendido);

            $finVentana = Carbon::parse("{$fecha} {$horaFin}", $timezone)
                ->addMinutes($this->minutos_gracia_apagado);

            if ($momento->betweenIncluded($inicioVentana, $finVentana)) {
                return true;
            }
        }

        return false;
    }
}
