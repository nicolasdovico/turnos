<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'productos';

    protected $fillable = [
        'complejo_id',
        'nombre',
        'codigo_barra',
        'categoria',
        'precio_costo',
        'precio_venta',
        'stock_actual',
        'stock_minimo',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'precio_costo' => 'decimal:2',
            'precio_venta' => 'decimal:2',
            'stock_actual' => 'integer',
            'stock_minimo' => 'integer',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }

    public function ventaItems(): HasMany
    {
        return $this->hasMany(VentaItem::class);
    }
}
