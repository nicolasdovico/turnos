<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ValeCredito extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'vales_credito';

    protected $fillable = [
        'complejo_id',
        'turno_origen_id',
        'turno_destino_id',
        'user_id_canje',
        'codigo',
        'token_seguro',
        'monto',
        'saldo_restante',
        'cliente_nombre',
        'cliente_telefono',
        'estado',
        'fecha_emision',
        'fecha_vencimiento',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'saldo_restante' => 'decimal:2',
            'fecha_emision' => 'datetime',
            'fecha_vencimiento' => 'datetime',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function turnoOrigen(): BelongsTo
    {
        return $this->belongsTo(Turno::class, 'turno_origen_id');
    }

    public function turnoDestino(): BelongsTo
    {
        return $this->belongsTo(Turno::class, 'turno_destino_id');
    }

    public function usuarioCanje(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id_canje');
    }

    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }

    public function esValido(): bool
    {
        if ($this->estado !== 'activo') {
            return false;
        }

        if ($this->saldo_restante <= 0) {
            return false;
        }

        if ($this->fecha_vencimiento && $this->fecha_vencimiento->isPast()) {
            return false;
        }

        return true;
    }
}
