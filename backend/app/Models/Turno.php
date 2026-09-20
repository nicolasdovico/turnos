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
        'club_cliente_id',
        'cliente_nombre',
        'cliente_telefono',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'precio',
        'monto_pagado',
        'saldo_pendiente',
        'metodo_pago',
        'estado_pago',
        'estado',
        'motivo_cancelacion',
        'cancelado_por_user_id',
        'cancelacion_lluvia_id',
        'es_fijo',
        'recordatorio_enviado_at',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'precio' => 'decimal:2',
            'monto_pagado' => 'decimal:2',
            'saldo_pendiente' => 'decimal:2',
            'es_fijo' => 'boolean',
            'recordatorio_enviado_at' => 'datetime',
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

    public function pagosDivididos(): HasMany
    {
        return $this->hasMany(TurnoPagoDividido::class, 'turno_id');
    }

    public function partidoAbierto(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(PartidoAbierto::class, 'turno_id');
    }

    public function walletMovimientos(): HasMany
    {
        return $this->hasMany(WalletMovimiento::class, 'turno_id');
    }

    public function cancelacionLluvia(): BelongsTo
    {
        return $this->belongsTo(CancelacionLluvia::class, 'cancelacion_lluvia_id');
    }

    public function canceladoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelado_por_user_id');
    }

    public function valeCredito(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ValeCredito::class, 'turno_origen_id');
    }

    public function clubCliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'club_cliente_id');
    }
}

