<?php

namespace App\Models;

use Carbon\Carbon;
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
        'user_id',
        'nombre',
        'subdominio',
        'dominio_personalizado',
        'plan_id',
        'estado',
        'latitud',
        'longitud',
        'direccion',
        'ciudad',
        'telefono',
        'deporte_principal',
        'timezone',
        'tipo_negocio_id',
        'tipo_cobro_reserva',
        'porcentaje_sena',
        'monto_sena_fijo',
        'permite_mostrador_publico',
        'horas_limite_cancelacion',
        'hora_inicio_luz',
        'hora_inicio_pico_semana',
        'hora_fin_pico_semana',
        'dias_pico_semana',
        'dias_fin_semana',
        'recordatorio_whatsapp_activo',
        'recordatorio_anticipacion_minutos',
        'suscripcion_estado',
        'suscripcion_trial_vence_at',
        'suscripcion_proximo_vencimiento',
        'suscripcion_gracia_vence_at',
        'plantilla_slug',
        'logo_url',
        'portada_url',
        'color_primario',
        'color_secundario',
        'color_acento',
        'color_fondo',
        'eslogan',
        'descripcion_corta',
        'redes_sociales',
    ];

    protected function casts(): array
    {
        return [
            'latitud' => 'float',
            'longitud' => 'float',
            'porcentaje_sena' => 'decimal:2',
            'monto_sena_fijo' => 'decimal:2',
            'permite_mostrador_publico' => 'boolean',
            'horas_limite_cancelacion' => 'integer',
            'dias_pico_semana' => 'array',
            'dias_fin_semana' => 'array',
            'recordatorio_whatsapp_activo' => 'boolean',
            'recordatorio_anticipacion_minutos' => 'integer',
            'suscripcion_trial_vence_at' => 'datetime',
            'suscripcion_proximo_vencimiento' => 'datetime',
            'suscripcion_gracia_vence_at' => 'datetime',
            'redes_sociales' => 'array',
        ];
    }


    protected static function booted(): void
    {
        static::creating(function (Complejo $complejo) {
            if (empty($complejo->uuid)) {
                $complejo->uuid = (string) Str::uuid();
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function tipoNegocio(): BelongsTo
    {
        return $this->belongsTo(TipoNegocio::class, 'tipo_negocio_id');
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

    public function cajasSesiones(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CajaSesion::class, 'complejo_id');
    }

    public function paginas(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Pagina::class, 'complejo_id');
    }

    public function partidosAbiertos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PartidoAbierto::class, 'complejo_id');
    }

    public function pagosDivididos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(TurnoPagoDividido::class, 'complejo_id');
    }

    public function torneos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Torneo::class, 'complejo_id');
    }

    public function dispositivosIoT(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DispositivoIoT::class, 'complejo_id');
    }

    public function userCreditos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(UserCredito::class, 'complejo_id');
    }

    public function walletMovimientos(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(WalletMovimiento::class, 'complejo_id');
    }

    public function listaEspera(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ListaEspera::class, 'complejo_id');
    }

    public function clientes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Cliente::class, 'complejo_id');
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

    public function facturasClub(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(FacturaClub::class, 'complejo_id');
    }

    /**
     * Determina si el complejo tiene su suscripción activa o en trial vigente.
     */
    public function suscripcionValida(): bool
    {
        if ($this->suscripcion_estado === 'vencida' || $this->suscripcion_estado === 'suspendida') {
            return false;
        }

        if ($this->suscripcion_estado === 'activa') {
            return true;
        }

        if ($this->suscripcion_estado === 'trial') {
            return !$this->suscripcion_trial_vence_at || now()->lte($this->suscripcion_trial_vence_at);
        }

        if ($this->suscripcion_estado === 'gracia') {
            return !$this->suscripcion_gracia_vence_at || now()->lte($this->suscripcion_gracia_vence_at);
        }

        return true;
    }

    /**
     * Determina si el complejo está dentro del período de gracia de 7 días.
     */
    public function estaEnPeriodoDeGracia(): bool
    {
        if ($this->suscripcion_estado === 'gracia') {
            return true;
        }

        return false;
    }

    /**
     * Días restantes del trial o del período de gracia.
     */
    public function diasRestantesSuscripcion(): int
    {
        if ($this->suscripcion_estado === 'trial' && $this->suscripcion_trial_vence_at) {
            return max(0, (int) round(now()->diffInDays($this->suscripcion_trial_vence_at, false)));
        }

        if ($this->suscripcion_estado === 'gracia' && $this->suscripcion_gracia_vence_at) {
            return max(0, (int) round(now()->diffInDays($this->suscripcion_gracia_vence_at, false)));
        }

        if ($this->suscripcion_estado === 'activa' && $this->suscripcion_proximo_vencimiento) {
            return max(0, (int) round(now()->diffInDays($this->suscripcion_proximo_vencimiento, false)));
        }

        return 0;
    }

    /**
     * Determina si una fecha específica corresponde a fin de semana para este complejo.
     */
    public function esFinDeSemana(Carbon|string $fecha): bool
    {
        $dt = is_string($fecha) ? Carbon::parse($fecha) : $fecha->copy();
        $diasFinde = $this->dias_fin_semana ?: [0, 6]; // 0: Domingo, 6: Sábado
        return in_array($dt->dayOfWeek, $diasFinde);
    }

    /**
     * Determina si un horario en un día dado corresponde a horario pico en este complejo.
     */
    public function esHorarioPico(Carbon|string $fecha, string $horaInicio): bool
    {
        $dt = is_string($fecha) ? Carbon::parse($fecha) : $fecha->copy();
        $diasPico = $this->dias_pico_semana ?: [1, 2, 3, 4, 5]; // Lunes a Viernes
        if (!in_array($dt->dayOfWeek, $diasPico)) {
            return false;
        }

        $hInicio = substr(trim($horaInicio), 0, 5);
        $picoInicio = $this->hora_inicio_pico_semana ?: '17:00';
        $picoFin = $this->hora_fin_pico_semana ?: '23:30';

        return ($hInicio >= $picoInicio && $hInicio < $picoFin);
    }

    /**
     * Retorna la configuración de identidad visual, colores y plantilla con defaults seguros.
     */
    public function getBrandingData(): array
    {
        return [
            'plantilla_slug' => $this->plantilla_slug ?: 'booking_direct',
            'logo_url' => $this->logo_url,
            'portada_url' => $this->portada_url,
            'color_primario' => $this->color_primario ?: '#10b981',
            'color_secundario' => $this->color_secundario ?: '#047857',
            'color_acento' => $this->color_acento ?: '#06b6d4',
            'color_fondo' => $this->color_fondo ?: '#020617',
            'eslogan' => $this->eslogan,
            'descripcion_corta' => $this->descripcion_corta,
            'redes_sociales' => is_array($this->redes_sociales) ? $this->redes_sociales : [
                'instagram' => null,
                'facebook' => null,
                'tiktok' => null,
                'youtube' => null,
                'sitio_web' => null,
            ],
        ];
    }
}

