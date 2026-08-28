<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CajaSesion extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'cajas_sesiones';

    protected $fillable = [
        'complejo_id',
        'usuario_id',
        'monto_apertura',
        'fecha_apertura',
        'monto_cierre_declarado',
        'fecha_cierre',
        'total_ventas_efectivo',
        'total_ventas_digitales',
        'total_ingresos_turnos',
        'total_esperado_efectivo',
        'diferencia',
        'notas_cierre',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'monto_apertura' => 'decimal:2',
            'monto_cierre_declarado' => 'decimal:2',
            'total_ventas_efectivo' => 'decimal:2',
            'total_ventas_digitales' => 'decimal:2',
            'total_ingresos_turnos' => 'decimal:2',
            'total_esperado_efectivo' => 'decimal:2',
            'diferencia' => 'decimal:2',
            'fecha_apertura' => 'datetime',
            'fecha_cierre' => 'datetime',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
