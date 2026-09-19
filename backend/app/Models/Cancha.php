<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'precio_valle',
        'precio_pico',
        'precio_fin_semana',
        'precio_luz_adicional',
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
            'precio_valle' => 'decimal:2',
            'precio_pico' => 'decimal:2',
            'precio_fin_semana' => 'decimal:2',
            'precio_luz_adicional' => 'decimal:2',
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

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class, 'complejo_id');
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
        if (!$this->iluminacion) {
            return false;
        }

        // Si no tiene precio_luz_adicional ni precio_con_luz mayor a precio_base, no cobra luz
        $tieneCostoLuz = ($this->precio_luz_adicional !== null && (float) $this->precio_luz_adicional > 0)
            || (!empty($this->precio_con_luz) && (float) $this->precio_con_luz > 0);

        if (!$tieneCostoLuz) {
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
     * Calcula el recargo de luz artificial para una duración dada.
     */
    public function getRecargoLuz(int $duracionMinutos = 60): float
    {
        if (!$this->iluminacion) {
            return 0.0;
        }

        $baseDuracion = (int) ($this->duracion_minutos ?: 60);

        // 1. Si tiene precio_luz_adicional configurado explícitamente:
        if ($this->precio_luz_adicional !== null && (float) $this->precio_luz_adicional > 0) {
            $adicional = (float) $this->precio_luz_adicional;
            if ($duracionMinutos === $baseDuracion) {
                return $adicional;
            }
            return round(($adicional / $baseDuracion) * $duracionMinutos, 2);
        }

        // 2. Fallback con precio_con_luz legacy:
        if (!empty($this->precio_con_luz) && (float) $this->precio_con_luz > (float) $this->precio_base) {
            $diff = (float) $this->precio_con_luz - (float) $this->precio_base;
            if ($duracionMinutos === $baseDuracion) {
                return round($diff, 2);
            }
            return round(($diff / $baseDuracion) * $duracionMinutos, 2);
        }

        return 0.0;
    }

    /**
     * Determina si el turno cae en horario valle, pico o fin de semana.
     */
    public function determinarTipoFranja(Carbon|string $fecha, string $horaInicio, ?Complejo $complejo = null): string
    {
        $dt = is_string($fecha) ? Carbon::parse($fecha) : $fecha->copy();
        $complejoEfectivo = $complejo ?: $this->complejo;

        // 1. Si el complejo tiene lógica de fin de semana:
        if ($complejoEfectivo ? $complejoEfectivo->esFinDeSemana($dt) : in_array($dt->dayOfWeek, [0, 6])) {
            return 'fin_semana';
        }

        // 2. Si es horario pico:
        if ($complejoEfectivo ? $complejoEfectivo->esHorarioPico($dt, $horaInicio) : ($horaInicio >= '17:00' && $horaInicio < '23:30')) {
            return 'pico';
        }

        // 3. De lo contrario, es horario valle:
        return 'valle';
    }

    /**
     * Obtiene el precio base nominal correspondiente a la franja horaria prorrateado por duración.
     */
    public function getPrecioBaseParaFranja(string $tipoFranja, int $duracionMinutos = 60): float
    {
        $baseDuracion = (int) ($this->duracion_minutos ?: 60);

        // Determinamos el precio nominal según la franja (con fallback transparente a getPrecioParaDuracion):
        if ($tipoFranja === 'pico' && $this->precio_pico !== null && (float) $this->precio_pico > 0) {
            $precioNominal = (float) $this->precio_pico;
        } elseif ($tipoFranja === 'fin_semana' && $this->precio_fin_semana !== null && (float) $this->precio_fin_semana > 0) {
            $precioNominal = (float) $this->precio_fin_semana;
        } elseif ($tipoFranja === 'valle' && $this->precio_valle !== null && (float) $this->precio_valle > 0) {
            $precioNominal = (float) $this->precio_valle;
        } else {
            // Fallback completo a la configuración base y personalizada por duración de la cancha
            return $this->getPrecioParaDuracion($duracionMinutos);
        }

        // Si la duración coincide con la base de la cancha:
        if ($duracionMinutos === $baseDuracion) {
            return $precioNominal;
        }

        // Prorrateo proporcional por duración
        return round(($precioNominal / $baseDuracion) * $duracionMinutos, 2);
    }

    /**
     * Cotiza el turno detallando si aplica luz artificial, precio base, recargo de luz y precio final.
     */
    public function calcularCotizacionTurno(
        int $duracionMinutos,
        Carbon|string $fechaOHoraInicio,
        ?string $horaFinOHoraInicio = null,
        ?string $horaFin = null,
        ?string $horaInicioLuz = '19:00',
        ?Complejo $complejo = null
    ): array {
        // Detectar si el segundo parámetro es una fecha o una hora (retrocompatibilidad)
        if ($fechaOHoraInicio instanceof Carbon || (is_string($fechaOHoraInicio) && preg_match('/^\d{4}-\d{2}-\d{2}/', $fechaOHoraInicio))) {
            $fecha = is_string($fechaOHoraInicio) ? Carbon::parse($fechaOHoraInicio) : $fechaOHoraInicio->copy();
            $horaInicio = (string) $horaFinOHoraInicio;
            $horaFinEfectiva = $horaFin;
            $corteLuzEfectivo = $horaInicioLuz ?: '19:00';
            $complejoEfectivo = $complejo ?: $this->complejo;
        } else {
            // Firma legacy: (duracion, horaInicio, horaFin, horaInicioLuz)
            $fecha = Carbon::today();
            $horaInicio = (string) $fechaOHoraInicio;
            $horaFinEfectiva = $horaFinOHoraInicio;
            $corteLuzEfectivo = $horaFin ?: '19:00';
            $complejoEfectivo = $complejo ?: $this->complejo;
        }

        if ($complejoEfectivo && empty($horaInicioLuz) && !empty($complejoEfectivo->hora_inicio_luz)) {
            $corteLuzEfectivo = $complejoEfectivo->hora_inicio_luz;
        }

        $tipoFranja = $this->determinarTipoFranja($fecha, $horaInicio, $complejoEfectivo);
        $precioBase = $this->getPrecioBaseParaFranja($tipoFranja, $duracionMinutos);

        $nombresFranja = [
            'valle' => 'Horario Promocional (Valle)',
            'pico' => 'Horario Central (Pico)',
            'fin_semana' => 'Fin de Semana',
        ];
        $nombreFranja = $nombresFranja[$tipoFranja] ?? 'Tarifa Estándar';

        // Lógica de iluminación artificial
        $aplicaLuz = $this->requiereLuz($horaInicio, $horaFinEfectiva, $corteLuzEfectivo, $duracionMinutos);

        // Si la cancha es techada y no tiene precio_luz_adicional explícito, no cobra adicional de luz
        if ($this->techada && empty($this->precio_luz_adicional)) {
            $aplicaLuz = false;
        }

        $recargoLuz = $aplicaLuz ? $this->getRecargoLuz($duracionMinutos) : 0.0;
        $precioTotal = round($precioBase + $recargoLuz, 2);

        // Cálculo de seña
        $porcentajeSena = $complejoEfectivo ? (float) ($complejoEfectivo->porcentaje_sena ?? 50) : 50.0;
        $tipoCobro = $complejoEfectivo ? ($complejoEfectivo->tipo_cobro_reserva ?? 'senia') : 'senia';

        if ($tipoCobro === 'total') {
            $montoSena = $precioTotal;
            $montoSaldo = 0.0;
        } elseif ($tipoCobro === 'sin_cobro') {
            $montoSena = 0.0;
            $montoSaldo = $precioTotal;
        } else {
            $montoSena = round(($precioTotal * $porcentajeSena) / 100, 2);
            $montoSaldo = max(0.0, round($precioTotal - $montoSena, 2));
        }

        return [
            'precio' => $precioTotal,
            'precio_total' => $precioTotal,
            'aplica_luz' => $aplicaLuz,
            'precio_base' => $precioBase,
            'recargo_luz' => $recargoLuz,
            'tipo_franja' => $tipoFranja,
            'nombre_franja' => $nombreFranja,
            'porcentaje_sena' => $porcentajeSena,
            'monto_sena' => $montoSena,
            'monto_saldo_restante' => $montoSaldo,
            'precio_con_luz' => (float) ($this->precio_con_luz ?? ($precioBase + $recargoLuz)),
        ];
    }

    /**
     * Obtiene el precio final del turno para la duración y horario dados.
     */
    public function getPrecioParaTurno(
        int $duracionMinutos,
        Carbon|string $fechaOHoraInicio,
        ?string $horaFinOHoraInicio = null,
        ?string $horaFin = null,
        ?string $horaInicioLuz = '19:00',
        ?Complejo $complejo = null
    ): float {
        return $this->calcularCotizacionTurno(
            $duracionMinutos,
            $fechaOHoraInicio,
            $horaFinOHoraInicio,
            $horaFin,
            $horaInicioLuz,
            $complejo
        )['precio_total'];
    }
}

