<?php

namespace App\Services;

use App\Models\CajaSesion;
use App\Models\Turno;
use App\Models\Venta;
use Carbon\Carbon;
use DomainException;
use Illuminate\Support\Facades\DB;

class CajaService
{
    /**
     * Open a new cash register session for a user in the current tenant.
     */
    public function abrirCaja(int $usuarioId, float $montoApertura): CajaSesion
    {
        $sesionAbierta = CajaSesion::where('estado', 'abierta')->first();
        if ($sesionAbierta) {
            throw new DomainException('Ya existe una sesión de caja abierta para este complejo.');
        }

        return CajaSesion::create([
            'usuario_id' => $usuarioId,
            'monto_apertura' => $montoApertura,
            'fecha_apertura' => now(),
            'estado' => 'abierta',
        ]);
    }

    /**
     * Close a cash register session performing a blind count calculation.
     */
    public function cerrarCaja(
        int $cajaSesionId,
        float $montoCierreDeclarado,
        ?string $notas = null
    ): CajaSesion {
        return DB::transaction(function () use ($cajaSesionId, $montoCierreDeclarado, $notas) {
            $sesion = CajaSesion::where('id', $cajaSesionId)->lockForUpdate()->first();
            if (!$sesion) {
                throw new DomainException('La sesión de caja no fue encontrada.');
            }

            if ($sesion->estado !== 'abierta') {
                throw new DomainException('La sesión de caja ya se encuentra cerrada.');
            }

            $ahora = now();

            // Calculate POS sales during session
            $totalVentasEfectivo = (float) Venta::where('created_at', '>=', $sesion->fecha_apertura)
                ->where('created_at', '<=', $ahora)
                ->where('estado', 'completada')
                ->where('tipo_pago', 'efectivo')
                ->sum('total');

            $totalVentasDigitales = (float) Venta::where('created_at', '>=', $sesion->fecha_apertura)
                ->where('created_at', '<=', $ahora)
                ->where('estado', 'completada')
                ->where('tipo_pago', '!=', 'efectivo')
                ->sum('total');

            // Calculate court reservations confirmed during session
            $totalIngresosTurnos = (float) Turno::where('created_at', '>=', $sesion->fecha_apertura)
                ->where('created_at', '<=', $ahora)
                ->where('estado', 'reservado')
                ->sum('precio');

            $totalEsperadoEfectivo = round((float) $sesion->monto_apertura + $totalVentasEfectivo, 2);
            $diferencia = round($montoCierreDeclarado - $totalEsperadoEfectivo, 2);

            $sesion->update([
                'monto_cierre_declarado' => $montoCierreDeclarado,
                'fecha_cierre' => $ahora,
                'total_ventas_efectivo' => $totalVentasEfectivo,
                'total_ventas_digitales' => $totalVentasDigitales,
                'total_ingresos_turnos' => $totalIngresosTurnos,
                'total_esperado_efectivo' => $totalEsperadoEfectivo,
                'diferencia' => $diferencia,
                'notas_cierre' => $notas,
                'estado' => 'cerrada',
            ]);

            return $sesion->fresh();
        });
    }

    /**
     * Get aggregated daily cash summary.
     */
    public function obtenerResumenDiario(?string $fecha = null): array
    {
        $fechaCarbon = $fecha ? Carbon::parse($fecha) : Carbon::today();
        $fechaInicio = $fechaCarbon->copy()->startOfDay();
        $fechaFin = $fechaCarbon->copy()->endOfDay();

        $sesiones = CajaSesion::whereBetween('fecha_apertura', [$fechaInicio, $fechaFin])
            ->with('usuario')
            ->orderBy('fecha_apertura', 'desc')
            ->get();

        $totalVentasEfectivo = (float) Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])
            ->where('estado', 'completada')
            ->where('tipo_pago', 'efectivo')
            ->sum('total');

        $totalVentasDigitales = (float) Venta::whereBetween('created_at', [$fechaInicio, $fechaFin])
            ->where('estado', 'completada')
            ->where('tipo_pago', '!=', 'efectivo')
            ->sum('total');

        $totalTurnos = (float) Turno::whereBetween('created_at', [$fechaInicio, $fechaFin])
            ->where('estado', 'reservado')
            ->sum('precio');

        $totalAperturas = (float) $sesiones->sum('monto_apertura');
        $totalDeclarado = (float) $sesiones->where('estado', 'cerrada')->sum('monto_cierre_declarado');
        $totalDiferencias = (float) $sesiones->where('estado', 'cerrada')->sum('diferencia');

        return [
            'fecha' => $fechaCarbon->format('Y-m-d'),
            'total_ingresos_brutos' => round($totalVentasEfectivo + $totalVentasDigitales + $totalTurnos, 2),
            'total_ventas_pos' => round($totalVentasEfectivo + $totalVentasDigitales, 2),
            'total_ventas_efectivo' => round($totalVentasEfectivo, 2),
            'total_ventas_digitales' => round($totalVentasDigitales, 2),
            'total_turnos_reservados' => round($totalTurnos, 2),
            'total_aperturas' => round($totalAperturas, 2),
            'total_declarado_cierre' => round($totalDeclarado, 2),
            'total_diferencia_neta' => round($totalDiferencias, 2),
            'cantidad_sesiones' => $sesiones->count(),
            'sesiones' => $sesiones,
        ];
    }
}
