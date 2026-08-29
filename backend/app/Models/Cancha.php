<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cancha extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'canchas';

    protected $fillable = [
        'complejo_id',
        'nombre',
        'deporte',
        'superficie',
        'techada',
        'precio_base',
        'precio_con_luz',
        'iluminacion',
        'tipo_iluminacion',
        'camara_grabacion',
        'marcador_digital',
        'climatizada',
        'tipo_cubierta',
        'tipo_pared',
        'formato',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'techada' => 'boolean',
            'iluminacion' => 'boolean',
            'camara_grabacion' => 'boolean',
            'marcador_digital' => 'boolean',
            'climatizada' => 'boolean',
            'precio_base' => 'decimal:2',
            'precio_con_luz' => 'decimal:2',
        ];
    }

    /**
     * Check if the court's sport supports/requires wall attributes.
     */
    public function requiereParedes(): bool
    {
        return in_array(strtolower($this->deporte), ['padel', 'squash', 'racquetball'], true);
    }

    public function turnos(): HasMany
    {
        return $this->hasMany(Turno::class, 'cancha_id');
    }

    public function dispositivosIoT(): HasMany
    {
        return $this->hasMany(DispositivoIoT::class, 'cancha_id');
    }
}
