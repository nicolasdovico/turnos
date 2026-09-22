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

    protected $appends = [
        'numero_factura',
    ];

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

    public function getNumeroFacturaAttribute(): string
    {
        return 'FC-' . str_pad((string) ($this->id ?? 1), 6, '0', STR_PAD_LEFT);
    }

    public function getFechaPagoAttribute()
    {
        return $this->pagado_at;
    }

    public function setFechaPagoAttribute($value): void
    {
        $this->attributes['pagado_at'] = $value;
    }

    public function getComprobanteTransferenciaNotasAttribute()
    {
        return $this->notas;
    }

    public function setComprobanteTransferenciaNotasAttribute($value): void
    {
        $this->attributes['notas'] = $value;
    }

    public function getFechaGraciaVencimientoAttribute()
    {
        return $this->fecha_limite_gracia;
    }

    public function getMontoPlanBaseUsdAttribute()
    {
        return $this->monto_base_plan;
    }

    public function getCanchasTotalesAttribute()
    {
        return $this->canchas_utilizadas;
    }

    public function getCanchasIncluidasPlanAttribute()
    {
        return $this->canchas_incluidas;
    }

    public function getPrecioUnitarioCanchaExtraUsdAttribute()
    {
        return $this->precio_cancha_adicional;
    }

    public function getMontoCanchasExtrasUsdAttribute()
    {
        return $this->monto_canchas_adicionales;
    }

    public function getCantidadTurnosMarketplaceAttribute()
    {
        return $this->total_turnos_marketplace;
    }

    public function getMontoComisionesMarketplaceUsdAttribute()
    {
        return $this->monto_comisiones_marketplace;
    }

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
