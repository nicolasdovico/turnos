<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoNegocio extends Model
{
    use HasFactory;

    protected $table = 'tipos_negocio';

    protected $fillable = [
        'nombre',
        'slug',
        'descripcion',
        'esta_activo',
    ];

    protected $casts = [
        'esta_activo' => 'boolean',
    ];

    public function complejos(): HasMany
    {
        return $this->hasMany(Complejo::class, 'tipo_negocio_id');
    }
}
