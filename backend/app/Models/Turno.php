<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Turno extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'turnos';

    protected $fillable = [
        'complejo_id',
        'cancha_id',
        'cliente_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'precio',
        'estado',
        'es_fijo',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'precio' => 'decimal:2',
            'es_fijo' => 'boolean',
        ];
    }

    public function cancha(): BelongsTo
    {
        return $this->belongsTo(Cancha::class, 'cancha_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_id');
    }

    public function ventas(): HasMany
    {
        return $this->hasMany(Venta::class);
    }
}

