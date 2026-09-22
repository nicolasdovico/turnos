<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Superficie extends Model
{
    use HasFactory;

    protected $table = 'superficies';

    protected $fillable = [
        'deporte_id',
        'nombre',
        'slug',
        'descripcion',
        'orden',
        'esta_activo',
    ];

    protected function casts(): array
    {
        return [
            'orden' => 'integer',
            'esta_activo' => 'boolean',
        ];
    }

    public function deporte(): BelongsTo
    {
        return $this->belongsTo(Deporte::class);
    }

    public function canchas(): HasMany
    {
        return $this->hasMany(Cancha::class);
    }

    public function scopeActivo($query)
    {
        return $query->where('esta_activo', true)->orderBy('orden');
    }
}
