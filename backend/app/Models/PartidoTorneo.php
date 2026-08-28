<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartidoTorneo extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'partidos_torneo';

    protected $fillable = [
        'complejo_id',
        'torneo_id',
        'turno_id',
        'cancha_id',
        'fase',
        'ronda',
        'posicion_llave',
        'siguiente_partido_id',
        'equipo_local_id',
        'equipo_visitante_id',
        'ganador_id',
        'fecha',
        'hora',
        'resultado_local',
        'resultado_visitante',
        'score_local',
        'score_visitante',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'ronda' => 'integer',
            'posicion_llave' => 'integer',
            'score_local' => 'integer',
            'score_visitante' => 'integer',
            'fecha' => 'date:Y-m-d',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function torneo(): BelongsTo
    {
        return $this->belongsTo(Torneo::class, 'torneo_id');
    }

    public function cancha(): BelongsTo
    {
        return $this->belongsTo(Cancha::class, 'cancha_id');
    }

    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class, 'turno_id');
    }

    public function equipoLocal(): BelongsTo
    {
        return $this->belongsTo(EquipoTorneo::class, 'equipo_local_id');
    }

    public function equipoVisitante(): BelongsTo
    {
        return $this->belongsTo(EquipoTorneo::class, 'equipo_visitante_id');
    }

    public function ganador(): BelongsTo
    {
        return $this->belongsTo(EquipoTorneo::class, 'ganador_id');
    }

    public function siguientePartido(): BelongsTo
    {
        return $this->belongsTo(PartidoTorneo::class, 'siguiente_partido_id');
    }
}
