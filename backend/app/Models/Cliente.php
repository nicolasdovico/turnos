<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'clientes';

    protected $fillable = [
        'complejo_id',
        'user_id',
        'nombre',
        'telefono',
        'email',
        'dni',
        'notas',
        'estado',
        'motivo_bloqueo',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function turnos(): HasMany
    {
        return $this->hasMany(Turno::class, 'club_cliente_id');
    }

    /**
     * Obtener saldo actual en la billetera virtual del club si tiene cuenta vinculada.
     */
    public function getSaldoBilleteraAttribute(): float
    {
        if (!$this->user_id) {
            return 0.00;
        }

        $credito = UserCredito::withoutGlobalScopes()
            ->where('complejo_id', $this->complejo_id)
            ->where('user_id', $this->user_id)
            ->first();

        return $credito ? (float) $credito->saldo : 0.00;
    }

    /**
     * Obtener vales de crédito activos emitidos para este cliente.
     */
    public function valesActivos()
    {
        return ValeCredito::withoutGlobalScopes()
            ->where('complejo_id', $this->complejo_id)
            ->where('estado', 'activo')
            ->where(function ($q) {
                if ($this->user_id) {
                    $q->where('user_id_canje', $this->user_id);
                }
                if (!empty($this->telefono)) {
                    $q->orWhere('cliente_telefono', $this->telefono);
                }
            });
    }
}
