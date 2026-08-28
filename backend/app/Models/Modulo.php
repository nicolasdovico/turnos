<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Modulo extends Model
{
    use HasFactory;

    protected $table = 'modulos';

    protected $fillable = [
        'nombre',
        'slug',
        'descripcion',
    ];

    public function planes(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_modulo')
            ->withTimestamps();
    }

    public function complejos(): BelongsToMany
    {
        return $this->belongsToMany(Complejo::class, 'complejo_modulo')
            ->withPivot('esta_activo', 'valido_hasta')
            ->withTimestamps();
    }
}
