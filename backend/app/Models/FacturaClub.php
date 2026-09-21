<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FacturaClub extends Model
{
    use HasFactory;

    protected $table = 'facturas_club';

    protected $fillable = [
        'uuid',
        'complejo_id',
        'plan_id',
        'periodo',
        'monto_base_plan',
        'canchas_incluidas',
        'canchas_utilizadas',
        'canchas_excedentes',
        'precio_cancha_adicional',
        'monto_canchas_adicionales',
        'monto_comisiones_marketplace',
        'total_turnos_marketplace',
        'monto_descuento',
        'total_usd',
        'tipo_cambio_ars',
        'total_ars',
        'estado',
        'fecha_emision',
        'fecha_vencimiento',
        'fecha_limite_gracia',
        'pagado_at',
        'metodo_pago',
        'gateway_preference_id',
        'gateway_payment_id',
        'comprobante_transferencia_url',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'monto_base_plan' => 'decimal:2',
            'canchas_incluidas' => 'integer',
            'canchas_utilizadas' => 'integer',
            'canchas_excedentes' => 'integer',
            'precio_cancha_adicional' => 'decimal:2',
            'monto_canchas_adicionales' => 'decimal:2',
            'monto_comisiones_marketplace' => 'decimal:2',
            'total_turnos_marketplace' => 'integer',
            'monto_descuento' => 'decimal:2',
            'total_usd' => 'decimal:2',
            'tipo_cambio_ars' => 'decimal:2',
            'total_ars' => 'decimal:2',
            'fecha_emision' => 'date:Y-m-d',
            'fecha_vencimiento' => 'date:Y-m-d',
            'fecha_limite_gracia' => 'date:Y-m-d',
            'pagado_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (FacturaClub $factura) {
            if (empty($factura->uuid)) {
                $factura->uuid = (string) Str::uuid();
            }
        });
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function turnos(): HasMany
    {
        return $this->hasMany(Turno::class, 'factura_club_id');
    }

    public function estaVencida(): bool
    {
        if ($this->estado === 'pagada') {
            return false;
        }

        return $this->fecha_vencimiento && now()->startOfDay()->gt($this->fecha_vencimiento);
    }

    public function estaEnGracia(): bool
    {
        if ($this->estado === 'pagada') {
            return false;
        }

        if (!$this->estaVencida()) {
            return false;
        }

        return $this->fecha_limite_gracia && now()->startOfDay()->lte($this->fecha_limite_gracia);
    }
}
