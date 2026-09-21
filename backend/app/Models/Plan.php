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
        'canchas_incluidas',
        'precio_cancha_adicional',
        'comision_marketplace',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'precio_mensual' => 'decimal:2',
            'canchas_incluidas' => 'integer',
            'precio_cancha_adicional' => 'decimal:2',
            'comision_marketplace' => 'decimal:2',
        ];
    }

    /**
     * Calcula el desglose de costos según la cantidad de canchas que posee el club.
     */
    public function calcularCostoTotal(int $cantidadCanchas): array
    {
        $canchasExcedentes = max(0, $cantidadCanchas - (int) $this->canchas_incluidas);
        $costoAdicional = $canchasExcedentes * (float) $this->precio_cancha_adicional;
        $total = (float) $this->precio_mensual + $costoAdicional;

        return [
            'canchas_incluidas' => (int) $this->canchas_incluidas,
            'canchas_totales' => $cantidadCanchas,
            'canchas_excedentes' => $canchasExcedentes,
            'precio_base' => (float) $this->precio_mensual,
            'precio_cancha_adicional' => (float) $this->precio_cancha_adicional,
            'costo_adicional_total' => $costoAdicional,
            'total_mensual' => $total,
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
