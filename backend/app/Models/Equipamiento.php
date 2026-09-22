<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Equipamiento extends Model
{
    use HasFactory;

    protected $table = 'equipamientos';

    protected $fillable = [
        'complejo_id',
        'nombre',
        'slug',
        'icono',
        'categoria',
        'descripcion',
        'aplica_a_deportes',
        'orden',
        'esta_activo',
    ];

    protected function casts(): array
    {
        return [
            'aplica_a_deportes' => 'array',
            'orden' => 'integer',
            'esta_activo' => 'boolean',
        ];
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }

    public function canchas(): BelongsToMany
    {
        return $this->belongsToMany(Cancha::class, 'cancha_equipamiento')
            ->withPivot('valor_adicional')
            ->withTimestamps();
    }

    public function scopeGlobales($query)
    {
        return $query->whereNull('complejo_id')->where('esta_activo', true)->orderBy('orden');
    }

    public function scopeParaComplejo($query, ?int $complejoId)
    {
        return $query->where(function ($q) use ($complejoId) {
            $q->whereNull('complejo_id');
            if ($complejoId) {
                $q->orWhere('complejo_id', $complejoId);
            }
        })
        ->where('esta_activo', true)
        ->orderBy('orden');
    }
}
