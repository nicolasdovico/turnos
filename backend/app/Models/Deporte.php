<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deporte extends Model
{
    use HasFactory;

    protected $table = 'deportes';

    protected $fillable = [
        'nombre',
        'slug',
        'icono',
        'tiene_paredes',
        'duracion_default_minutos',
        'formatos',
        'paredes',
        'orden',
        'esta_activo',
    ];

    protected function casts(): array
    {
        return [
            'tiene_paredes' => 'boolean',
            'duracion_default_minutos' => 'integer',
            'formatos' => 'array',
            'paredes' => 'array',
            'orden' => 'integer',
            'esta_activo' => 'boolean',
        ];
    }

    public function superficies(): HasMany
    {
        return $this->hasMany(Superficie::class)->orderBy('orden');
    }

    public function superficiesActivas(): HasMany
    {
        return $this->hasMany(Superficie::class)->where('esta_activo', true)->orderBy('orden');
    }

    public function canchas(): HasMany
    {
        return $this->hasMany(Cancha::class);
    }

    public function scopeActivo($query)
    {
        return $query->where('esta_activo', true)->orderBy('orden');
    }
}
