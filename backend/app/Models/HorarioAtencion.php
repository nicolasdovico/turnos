<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HorarioAtencion extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'horarios_atencion';

    protected $fillable = [
        'complejo_id',
        'dia_semana',
        'hora_apertura',
        'hora_cierre',
        'duracion_turno_minutos',
    ];

    protected function casts(): array
    {
        return [
            'dia_semana' => 'integer',
            'duracion_turno_minutos' => 'integer',
        ];
    }
}
