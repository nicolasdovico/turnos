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
        'duracion_minutos',
        'permite_duracion_flexible',
        'anti_baches_activo',
        'duraciones_permitidas',
        'precio_90_min',
        'precio_120_min',
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
            'duracion_minutos' => 'integer',
            'permite_duracion_flexible' => 'boolean',
            'anti_baches_activo' => 'boolean',
            'duraciones_permitidas' => 'array',
            'precio_base' => 'decimal:2',
            'precio_con_luz' => 'decimal:2',
            'precio_90_min' => 'decimal:2',
            'precio_120_min' => 'decimal:2',
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
