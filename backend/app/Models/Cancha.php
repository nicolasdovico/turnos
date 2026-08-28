<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cancha extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'canchas';

    protected $fillable = [
        'complejo_id',
        'nombre',
        'deporte',
        'superficie',
        'techada',
        'precio_base',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'techada' => 'boolean',
            'precio_base' => 'decimal:2',
        ];
    }

    public function turnos(): HasMany
    {
        return $this->hasMany(Turno::class, 'cancha_id');
    }
}
