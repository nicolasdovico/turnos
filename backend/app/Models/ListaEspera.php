<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListaEspera extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'lista_espera';

    protected $fillable = [
        'complejo_id',
        'cancha_id',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'user_id',
        'notificado',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'notificado' => 'boolean',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }

    public function cancha(): BelongsTo
    {
        return $this->belongsTo(Cancha::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
