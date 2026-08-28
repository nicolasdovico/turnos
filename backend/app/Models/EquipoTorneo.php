<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipoTorneo extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'equipos_torneo';

    protected $fillable = [
        'complejo_id',
        'torneo_id',
        'capitan_id',
        'nombre',
        'jugador_1_nombre',
        'jugador_2_nombre',
        'contacto_email',
        'contacto_telefono',
        'semilla',
        'puntos',
        'partidos_jugados',
        'partidos_ganados',
        'partidos_empatados',
        'partidos_perdidos',
        'sets_favor',
        'sets_contra',
        'diferencia_sets',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'semilla' => 'integer',
            'puntos' => 'integer',
            'partidos_jugados' => 'integer',
            'partidos_ganados' => 'integer',
            'partidos_empatados' => 'integer',
            'partidos_perdidos' => 'integer',
            'sets_favor' => 'integer',
            'sets_contra' => 'integer',
            'diferencia_sets' => 'integer',
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

    public function capitan(): BelongsTo
    {
        return $this->belongsTo(User::class, 'capitan_id');
    }
}
