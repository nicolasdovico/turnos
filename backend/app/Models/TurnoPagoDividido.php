<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TurnoPagoDividido extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'turno_pagos_divididos';

    protected $fillable = [
        'complejo_id',
        'turno_id',
        'partido_abierto_id',
        'user_id',
        'nombre_jugador',
        'email_jugador',
        'monto',
        'cuota_numero',
        'total_cuotas',
        'token_pago',
        'estado',
        'metodo_pago',
        'pagado_en',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'cuota_numero' => 'integer',
            'total_cuotas' => 'integer',
            'pagado_en' => 'datetime',
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

    public function partidoAbierto(): BelongsTo
    {
        return $this->belongsTo(PartidoAbierto::class, 'partido_abierto_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getCheckoutUrlAttribute(): string
    {
        return url("/checkout/split/{$this->token_pago}");
    }
}
