<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Carbon\Carbon;
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

    /**
     * Calcula el precio del turno según la duración en minutos y la configuración de la cancha.
     */
    public function getPrecioParaDuracion(int $duracionMinutos): float
    {
        $baseDuracion = (int) ($this->duracion_minutos ?: 60);
        $precioBase = (float) $this->precio_base;

        // 1. Si la duración solicitada coincide con la duración estándar de la cancha:
        if ($duracionMinutos === $baseDuracion) {
            if ($duracionMinutos === 90 && $this->precio_90_min !== null) {
                return (float) $this->precio_90_min;
            }
            if ($duracionMinutos === 120 && $this->precio_120_min !== null) {
                return (float) $this->precio_120_min;
            }
            return $precioBase;
        }

        // 2. Si tiene tarifa explícita configurada para 90 o 120 minutos:
        if ($duracionMinutos === 90 && $this->precio_90_min !== null) {
            return (float) $this->precio_90_min;
        }
        if ($duracionMinutos === 120 && $this->precio_120_min !== null) {
            return (float) $this->precio_120_min;
        }

        // 3. Prorrateo si la cancha base es de 90 minutos:
        if ($baseDuracion === 90) {
            if ($duracionMinutos === 60) {
                return round(($precioBase / 90) * 60, 2);
            }
            if ($duracionMinutos === 120) {
                return round(($precioBase / 90) * 120, 2);
            }
        }

        // 4. Prorrateo estándar para canchas base de 60 minutos:
        if ($duracionMinutos === 90) {
            return round($precioBase * 1.5, 2);
        }
        if ($duracionMinutos === 120) {
            return round($precioBase * 2.0, 2);
        }
        if ($duracionMinutos === 30) {
            return round($precioBase * 0.5, 2);
        }

        return $precioBase;
    }

    /**
     * Calcula el precio del turno con luz artificial según la duración en minutos.
     */
    public function getPrecioConLuzParaDuracion(int $duracionMinutos): float
    {
        if (empty($this->precio_con_luz) || (float) $this->precio_con_luz <= 0) {
            return $this->getPrecioParaDuracion($duracionMinutos);
        }

        $baseDuracion = (int) ($this->duracion_minutos ?: 60);
        $precioLuz = (float) $this->precio_con_luz;

        // Si la duración solicitada coincide con la duración base:
        if ($duracionMinutos === $baseDuracion) {
            return $precioLuz;
        }

        // Prorrateo si la base es de 90 minutos:
        if ($baseDuracion === 90) {
            if ($duracionMinutos === 60) {
                return round(($precioLuz / 90) * 60, 2);
            }
            if ($duracionMinutos === 120) {
                return round(($precioLuz / 90) * 120, 2);
            }
        }

        // Prorrateo estándar para canchas base de 60 minutos:
        if ($duracionMinutos === 90) {
            return round($precioLuz * 1.5, 2);
        }
        if ($duracionMinutos === 120) {
            return round($precioLuz * 2.0, 2);
        }
        if ($duracionMinutos === 30) {
            return round($precioLuz * 0.5, 2);
        }

        return $precioLuz;
    }

    /**
     * Determina si el horario del turno requiere iluminación artificial según la hora de corte.
     * Regla estándar: Se aplica tarifa con luz si el turno finaliza después de la hora de corte (hora_fin > hora_inicio_luz)
     * o si inicia a partir de la hora de corte (hora_inicio >= hora_inicio_luz).
     */
    public function requiereLuz(string $horaInicio, ?string $horaFin = null, ?string $horaInicioLuz = '19:00', int $duracionMinutos = 60): bool
    {
        if (!$this->iluminacion || empty($this->precio_con_luz) || (float) $this->precio_con_luz <= 0) {
            return false;
        }

        $corte = $horaInicioLuz ?: '19:00';
        $hInicio = substr(trim($horaInicio), 0, 5);

        if (!$horaFin) {
            try {
                $horaFin = Carbon::createFromFormat('H:i', $hInicio)->addMinutes($duracionMinutos)->format('H:i');
            } catch (\Throwable $e) {
                $horaFin = null;
            }
        }

        if ($horaFin) {
            $hFin = substr(trim($horaFin), 0, 5);
            return ($hFin > $corte) || ($hInicio >= $corte);
        }

        return $hInicio >= $corte;
    }

    /**
     * Cotiza el turno detallando si aplica luz artificial, precio base, recargo de luz y precio final.
     */
    public function calcularCotizacionTurno(int $duracionMinutos, string $horaInicio, ?string $horaFin = null, ?string $horaInicioLuz = '19:00'): array
    {
        $precioBase = $this->getPrecioParaDuracion($duracionMinutos);
        $aplicaLuz = $this->requiereLuz($horaInicio, $horaFin, $horaInicioLuz, $duracionMinutos);

        if ($aplicaLuz) {
            $precioFinal = $this->getPrecioConLuzParaDuracion($duracionMinutos);
            $recargoLuz = max(0.0, round($precioFinal - $precioBase, 2));
        } else {
            $precioFinal = $precioBase;
            $recargoLuz = 0.0;
        }

        return [
            'precio' => $precioFinal,
            'aplica_luz' => $aplicaLuz,
            'precio_base' => $precioBase,
            'precio_con_luz' => (float) ($this->precio_con_luz ?? 0),
            'recargo_luz' => $recargoLuz,
        ];
    }

    /**
     * Obtiene el precio final del turno para la duración y horario dados.
     */
    public function getPrecioParaTurno(int $duracionMinutos, string $horaInicio, ?string $horaFin = null, ?string $horaInicioLuz = '19:00'): float
    {
        return $this->calcularCotizacionTurno($duracionMinutos, $horaInicio, $horaFin, $horaInicioLuz)['precio'];
    }
}
