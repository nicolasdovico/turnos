<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Venta extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'ventas';

    protected $fillable = [
        'complejo_id',
        'turno_id',
        'usuario_id',
        'cliente_id',
        'numero_comprobante',
        'tipo_pago',
        'subtotal',
        'descuento',
        'total',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'descuento' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }

    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(VentaItem::class);
    }
}
