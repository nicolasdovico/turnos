<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartidoAbierto extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'partidos_abiertos';

    protected $fillable = [
        'complejo_id',
        'turno_id',
        'organizador_id',
        'nivel_min',
        'nivel_max',
        'jugadores_requeridos',
        'jugadores_actuales',
        'estado',
        'tipo_partido',
    ];

    protected function casts(): array
    {
        return [
            'jugadores_requeridos' => 'integer',
            'jugadores_actuales' => 'integer',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class, 'turno_id');
    }

    public function organizador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizador_id');
    }

    public function pagosDivididos(): HasMany
    {
        return $this->hasMany(TurnoPagoDividido::class, 'partido_abierto_id');
    }
}
