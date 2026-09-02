<?php

namespace App\Services;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Turno;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ClubReporteService
{
    /**
     * Genera el resumen diario y financiero de turnos para un club.
     *
     * @param  Complejo  $complejo
     * @param  string|null  $fechaDesde  (YYYY-MM-DD)
     * @param  string|null  $fechaHasta  (YYYY-MM-DD)
     * @param  int|null  $canchaId
     * @return array
     */
    public function obtenerResumenDiario(
        Complejo $complejo,
        ?string $fechaDesde = null,
        ?string $fechaHasta = null,
        ?int $canchaId = null
    ): array {
        // Validar y normalizar rango de fechas
        $hoy = Carbon::today()->format('Y-m-d');
        $inicio = $fechaDesde ? Carbon::parse($fechaDesde)->startOfDay() : Carbon::parse($hoy)->startOfMonth();
        $fin = $fechaHasta ? Carbon::parse($fechaHasta)->endOfDay() : Carbon::parse($hoy)->endOfMonth();

        if ($inicio->gt($fin)) {
            $temp = $inicio;
            $inicio = $fin->copy()->startOfDay();
            $fin = $temp->copy()->endOfDay();
        }

        $strDesde = $inicio->format('Y-m-d');
        $strHasta = $fin->format('Y-m-d');

        // Canchas del complejo
        $canchasQuery = Cancha::where('complejo_id', $complejo->id);
        if ($canchaId) {
            $canchasQuery->where('id', $canchaId);
        }
        $canchas = $canchasQuery->get();
        $canchasCount = max(1, $canchas->count());

        // Horarios de atención configurados (para cálculo de ocupación)
        $horarios = HorarioAtencion::where('complejo_id', $complejo->id)->get();

        // Consulta de turnos
        $turnosQuery = Turno::where('complejo_id', $complejo->id)
            ->whereBetween('fecha', [$strDesde, $strHasta])
            ->whereNotIn('estado', ['cancelado', 'rechazado', 'anulado'])
            ->with(['cancha']);

        if ($canchaId) {
            $turnosQuery->where('cancha_id', $canchaId);
        }

        $turnos = $turnosQuery->orderBy('fecha', 'asc')
            ->orderBy('hora_inicio', 'asc')
            ->get();

        $turnosPorFecha = $turnos->groupBy(function ($t) {
            return Carbon::parse($t->fecha)->format('Y-m-d');
        });

        $periodo = CarbonPeriod::create($strDesde, $strHasta);
        $diasResumen = [];

        $diasNombres = [
            0 => 'Domingo',
            1 => 'Lunes',
            2 => 'Martes',
            3 => 'Miércoles',
            4 => 'Jueves',
            5 => 'Viernes',
            6 => 'Sábado',
        ];

        $globalFacturado = 0.0;
        $globalCobrado = 0.0;
        $globalSaldoPendiente = 0.0;
        $globalTurnosCount = 0;
        $globalTurnosFijosCount = 0;
        $globalMinutosOcupados = 0;
        $globalMinutosDisponibles = 0;

        $metodosTotales = [
            'mostrador' => 0.0,
            'transferencia' => 0.0,
            'online' => 0.0,
            'billetera' => 0.0,
            'otro' => 0.0,
        ];

        $totalesPorCancha = [];
        foreach ($canchas as $c) {
            $totalesPorCancha[$c->id] = [
                'cancha_id' => $c->id,
                'nombre' => $c->nombre,
                'deporte' => $c->deporte,
                'turnos' => 0,
                'total_facturado' => 0.0,
                'total_cobrado' => 0.0,
                'saldo_pendiente' => 0.0,
            ];
        }

        foreach ($periodo as $dateObj) {
            $fechaStr = $dateObj->format('Y-m-d');
            $diaSemana = $dateObj->dayOfWeek; // 0 (Domingo) - 6 (Sábado)
            $turnosDelDia = $turnosPorFecha->get($fechaStr, collect());

            $montoTotalDia = 0.0;
            $montoCobradoDia = 0.0;
            $saldoPendienteDia = 0.0;
            $fijosDia = 0;
            $minutosOcupadosDia = 0;

            $desgloseMetodosDia = [
                'mostrador' => 0.0,
                'transferencia' => 0.0,
                'online' => 0.0,
                'billetera' => 0.0,
                'otro' => 0.0,
            ];

            $listaTurnosFormateada = [];

            foreach ($turnosDelDia as $t) {
                $precio = (float) ($t->precio ?? 0);
                $montoPagado = (float) ($t->monto_pagado ?? 0);
                $saldoPend = $t->saldo_pendiente !== null
                    ? (float) $t->saldo_pendiente
                    : max(0.0, $precio - $montoPagado);

                $montoTotalDia += $precio;
                $montoCobradoDia += $montoPagado;
                $saldoPendienteDia += $saldoPend;

                $esFijo = !empty($t->es_fijo) || !empty($t->turno_fijo_serie_id);
                if ($esFijo) {
                    $fijosDia++;
                    $globalTurnosFijosCount++;
                }

                $metodo = strtolower((string) ($t->metodo_pago ?? 'mostrador'));
                if (!isset($desgloseMetodosDia[$metodo])) {
                    $metodo = 'otro';
                }
                $desgloseMetodosDia[$metodo] += $montoPagado;
                $metodosTotales[$metodo] += $montoPagado;

                // Minutos de duración
                $inicioTurno = Carbon::parse($t->hora_inicio);
                $finTurno = Carbon::parse($t->hora_fin);
                $duracionMin = max(30, $inicioTurno->diffInMinutes($finTurno));
                $minutosOcupadosDia += $duracionMin;

                // Totales por cancha
                if (isset($totalesPorCancha[$t->cancha_id])) {
                    $totalesPorCancha[$t->cancha_id]['turnos']++;
                    $totalesPorCancha[$t->cancha_id]['total_facturado'] += $precio;
                    $totalesPorCancha[$t->cancha_id]['total_cobrado'] += $montoPagado;
                    $totalesPorCancha[$t->cancha_id]['saldo_pendiente'] += $saldoPend;
                }

                $listaTurnosFormateada[] = [
                    'id' => $t->id,
                    'cancha_id' => $t->cancha_id,
                    'cancha_nombre' => $t->cancha ? $t->cancha->nombre : 'Cancha',
                    'cliente_nombre' => $t->cliente_nombre ?: ($t->user ? $t->user->name : 'Cliente Mostrador'),
                    'cliente_telefono' => $t->cliente_telefono ?: ($t->user ? $t->user->telefono : null),
                    'hora_inicio' => substr((string) $t->hora_inicio, 0, 5),
                    'hora_fin' => substr((string) $t->hora_fin, 0, 5),
                    'duracion_minutos' => $duracionMin,
                    'precio' => $precio,
                    'monto_pagado' => $montoPagado,
                    'saldo_pendiente' => $saldoPend,
                    'estado_pago' => $t->estado_pago ?? ($saldoPend <= 0 ? 'pagado_total' : 'pendiente'),
                    'metodo_pago' => $t->metodo_pago ?? 'mostrador',
                    'es_fijo' => $esFijo,
                    'estado' => $t->estado ?? 'reservado',
                ];
            }

            // Capacidad y ocupación del día
            $horarioDia = $horarios->firstWhere('dia_semana', $diaSemana);
            $minutosDisponiblesDia = 0;
            if ($horarioDia && $horarioDia->activo && $horarioDia->hora_apertura && $horarioDia->hora_cierre) {
                $apertura = Carbon::parse($horarioDia->hora_apertura);
                $cierre = Carbon::parse($horarioDia->hora_cierre);
                $minutosApertura = max(0, $apertura->diffInMinutes($cierre));
                $minutosDisponiblesDia = $minutosApertura * $canchasCount;
            } else {
                // Fallback estándar 14 horas por cancha si no hay horario configurado
                $minutosDisponiblesDia = 14 * 60 * $canchasCount;
            }

            $ocupacionPorcentaje = $minutosDisponiblesDia > 0
                ? min(100.0, round(($minutosOcupadosDia / $minutosDisponiblesDia) * 100, 1))
                : 0.0;

            $globalMinutosOcupados += $minutosOcupadosDia;
            $globalMinutosDisponibles += $minutosDisponiblesDia;

            $estadoCobro = 'sin_turnos';
            if ($turnosDelDia->count() > 0) {
                $estadoCobro = $saldoPendienteDia <= 0 ? 'al_dia' : 'pendiente';
            }

            $globalFacturado += $montoTotalDia;
            $globalCobrado += $montoCobradoDia;
            $globalSaldoPendiente += $saldoPendienteDia;
            $globalTurnosCount += $turnosDelDia->count();

            $diasResumen[] = [
                'fecha' => $fechaStr,
                'dia_semana_numero' => $diaSemana,
                'dia_nombre' => $diasNombres[$diaSemana] ?? '',
                'total_turnos' => $turnosDelDia->count(),
                'turnos_fijos' => $fijosDia,
                'monto_total' => $montoTotalDia,
                'monto_cobrado' => $montoCobradoDia,
                'saldo_pendiente' => $saldoPendienteDia,
                'estado_cobro' => $estadoCobro,
                'ocupacion_porcentaje' => $ocupacionPorcentaje,
                'minutos_ocupados' => $minutosOcupadosDia,
                'minutos_disponibles' => $minutosDisponiblesDia,
                'desglose_metodos' => $desgloseMetodosDia,
                'turnos' => $listaTurnosFormateada,
            ];
        }

        $ocupacionPromedio = $globalMinutosDisponibles > 0
            ? min(100.0, round(($globalMinutosOcupados / $globalMinutosDisponibles) * 100, 1))
            : 0.0;

        return [
            'periodo' => [
                'fecha_desde' => $strDesde,
                'fecha_hasta' => $strHasta,
                'total_dias' => count($diasResumen),
                'cancha_id' => $canchaId,
            ],
            'kpis' => [
                'total_facturado' => $globalFacturado,
                'total_cobrado' => $globalCobrado,
                'total_saldo_pendiente' => $globalSaldoPendiente,
                'total_turnos' => $globalTurnosCount,
                'total_turnos_fijos' => $globalTurnosFijosCount,
                'ocupacion_promedio' => $ocupacionPromedio,
                'porcentaje_cobrado' => $globalFacturado > 0 ? round(($globalCobrado / $globalFacturado) * 100, 1) : 100.0,
            ],
            'dias' => $diasResumen,
            'canchas' => array_values($totalesPorCancha),
            'metodos_pago' => $metodosTotales,
        ];
    }
}
