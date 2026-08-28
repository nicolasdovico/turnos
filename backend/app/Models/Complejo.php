<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Complejo extends Model
{
    use HasFactory;

    protected $table = 'complejos';

    protected $fillable = [
        'uuid',
        'nombre',
        'subdominio',
        'dominio_personalizado',
        'plan_id',
        'estado',
    ];

    protected static function booted(): void
    {
        static::creating(function (Complejo $complejo) {
            if (empty($complejo->uuid)) {
                $complejo->uuid = (string) Str::uuid();
            }
        });
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function modulosPersonalizados(): BelongsToMany
    {
        return $this->belongsToMany(Modulo::class, 'complejo_modulo')
            ->withPivot('esta_activo', 'valido_hasta')
            ->withTimestamps();
    }

    public function canchas(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Cancha::class, 'complejo_id');
    }

    public function horariosAtencion(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(HorarioAtencion::class, 'complejo_id');
    }

    public function turnos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Turno::class, 'complejo_id');
    }

    public function productos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Producto::class, 'complejo_id');
    }

    public function ventas(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Venta::class, 'complejo_id');
    }


    /**
     * Check if a specific module is enabled for this complejo,
     * considering individual add-on overrides and base plan assignment.
     */
    public function hasModule(string $slug): bool
    {
        // 1. Check custom / individual add-on in complejo_modulo
        $customModule = $this->modulosPersonalizados()->where('slug', $slug)->first();

        if ($customModule) {
            $pivot = $customModule->pivot;
            if (!$pivot->esta_activo) {
                return false;
            }
            if ($pivot->valido_hasta !== null && now()->greaterThan($pivot->valido_hasta)) {
                return false;
            }
            return true;
        }

        // 2. Check base plan
        if ($this->plan) {
            return $this->plan->modulos()->where('slug', $slug)->exists();
        }

        return false;
    }
}
