<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Torneo extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'torneos';

    protected $fillable = [
        'complejo_id',
        'nombre',
        'slug',
        'deporte',
        'formato',
        'categoria',
        'max_equipos',
        'fecha_inicio',
        'fecha_fin',
        'precio_inscripcion',
        'estado',
        'reglas',
    ];

    protected function casts(): array
    {
        return [
            'precio_inscripcion' => 'decimal:2',
            'fecha_inicio' => 'date:Y-m-d',
            'fecha_fin' => 'date:Y-m-d',
            'max_equipos' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Torneo $torneo) {
            if (empty($torneo->slug)) {
                $torneo->slug = Str::slug($torneo->nombre) . '-' . Str::random(5);
            }
        });
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function equipos(): HasMany
    {
        return $this->hasMany(EquipoTorneo::class, 'torneo_id');
    }

    public function partidos(): HasMany
    {
        return $this->hasMany(PartidoTorneo::class, 'torneo_id');
    }
}
