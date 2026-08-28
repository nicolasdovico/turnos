<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use HasFactory;

    protected $table = 'planes';

    protected $fillable = [
        'nombre',
        'slug',
        'precio_mensual',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'precio_mensual' => 'decimal:2',
        ];
    }

    public function modulos(): BelongsToMany
    {
        return $this->belongsToMany(Modulo::class, 'plan_modulo')
            ->withTimestamps();
    }

    public function complejos(): HasMany
    {
        return $this->hasMany(Complejo::class, 'plan_id');
    }
}
