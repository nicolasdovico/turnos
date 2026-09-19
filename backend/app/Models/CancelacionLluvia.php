<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CancelacionLluvia extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'cancelaciones_lluvia';

    protected $fillable = [
        'complejo_id',
        'user_id',
        'fecha',
        'hora_desde',
        'hora_hasta',
        'solo_descubiertas',
        'canchas_afectadas_ids',
        'total_turnos_cancelados',
        'total_clientes_afectados',
        'total_monto_reembolsado',
        'metodo_reembolso',
        'notificaciones_whatsapp_enviadas',
        'bloquear_grilla_restante',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'solo_descubiertas' => 'boolean',
            'canchas_afectadas_ids' => 'array',
            'total_turnos_cancelados' => 'integer',
            'total_clientes_afectados' => 'integer',
            'total_monto_reembolsado' => 'decimal:2',
            'notificaciones_whatsapp_enviadas' => 'integer',
            'bloquear_grilla_restante' => 'boolean',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function turnos(): HasMany
    {
        return $this->hasMany(Turno::class, 'cancelacion_lluvia_id');
    }
}
