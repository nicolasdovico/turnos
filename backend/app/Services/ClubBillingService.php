<?php

namespace App\Services;

use App\Models\Complejo;
use App\Models\FacturaClub;
use App\Models\Turno;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ClubBillingService
{
    public function __construct(
        protected CotizacionDolarService $cotizacionDolarService
    ) {}

    /**
     * Obtiene el resumen de facturación y estado de suscripción del club para el período actual.
     */
    public function obtenerResumenFacturacion(Complejo $complejo): array
    {
        $plan = $complejo->plan;
        $totalCanchas = $complejo->canchas()->count();
        $costoDetalle = $plan ? $plan->calcularCostoTotal($totalCanchas) : [
            'canchas_incluidas' => 2,
            'canchas_totales' => $totalCanchas,
            'canchas_excedentes' => 0,
            'precio_base' => 0.0,
            'precio_cancha_adicional' => 0.0,
            'costo_adicional_total' => 0.0,
            'total_mensual' => 0.0,
        ];

        // Turnos de marketplace no facturados en el período actual
        $periodoActual = now()->format('Y-m');
        $queryMarketplaceNoFacturado = Turno::where('complejo_id', $complejo->id)
            ->where('origen', 'marketplace')
            ->where('estado', '!=', 'cancelado')
            ->whereNull('factura_club_id');

        $turnosMarketplaceCount = (int) $queryMarketplaceNoFacturado->count();
        $totalComisionesMarketplaceArs = (float) $queryMarketplaceNoFacturado->sum('comision_marketplace');

        // Total USD estimado del período
        $basePlan = (float) ($plan?->precio_mensual ?? 0.0);
        $costoExtras = (float) ($costoDetalle['costo_adicional_total'] ?? 0.0);

        // Cotización del dólar para unificar comisiones de turnos (ARS) con abono SaaS (USD)
        $tipoCambio = $this->cotizacionDolarService->obtenerCotizacion();
        $comisionesMarketplaceUsd = $tipoCambio > 0
            ? round($totalComisionesMarketplaceArs / $tipoCambio, 2)
            : 0.0;

        $totalEstimadoUsd = round($basePlan + $costoExtras + $comisionesMarketplaceUsd, 2);

        // Conversión a ARS para checkout local
        $subtotalSaaSArs = round(($basePlan + $costoExtras) * $tipoCambio, 2);
        $totalEstimadoArs = round($subtotalSaaSArs + $totalComisionesMarketplaceArs, 2);

        // Factura pendiente activa si existe
        $facturaPendiente = FacturaClub::where('complejo_id', $complejo->id)
            ->whereIn('estado', ['pendiente', 'revision_transferencia'])
            ->latest('id')
            ->first();

        // Evaluación de estado de suscripción y días de gracia
        $estadoSuscripcion = $complejo->suscripcion_estado ?: 'trial';
        $diasRestantes = $complejo->diasRestantesSuscripcion();
        $enGracia = $complejo->estaEnPeriodoDeGracia();

        return [
            'periodo_actual' => $periodoActual,
            'plan' => $plan ? [
                'id' => $plan->id,
                'nombre' => $plan->nombre,
                'slug' => $plan->slug,
                'precio_mensual' => $basePlan,
                'canchas_incluidas' => (int) $plan->canchas_incluidas,
                'precio_cancha_adicional' => (float) $plan->precio_cancha_adicional,
                'comision_marketplace_pct' => (float) ($plan->comision_marketplace ?? 5.0),
            ] : null,
            'canchas' => [
                'totales' => $totalCanchas,
                'incluidas' => (int) ($costoDetalle['canchas_incluidas'] ?? 2),
                'excedentes' => (int) ($costoDetalle['canchas_excedentes'] ?? 0),
                'costo_adicional_total' => $costoExtras,
            ],
            'marketplace' => [
                'turnos_captados_count' => $turnosMarketplaceCount,
                'total_comisiones_ars' => $totalComisionesMarketplaceArs,
                'total_comisiones_usd' => $comisionesMarketplaceUsd,
                'porcentaje_aplicado' => (float) ($plan?->comision_marketplace ?? 5.0),
                'turnos' => (clone $queryMarketplaceNoFacturado)->select('id', 'fecha', 'hora_inicio', 'precio', 'comision_porcentaje', 'comision_marketplace')->get(),
            ],
            'totales' => [
                'base_plan_usd' => $basePlan,
                'canchas_extras_usd' => $costoExtras,
                'comisiones_marketplace_usd' => $comisionesMarketplaceUsd,
                'comisiones_marketplace_ars' => $totalComisionesMarketplaceArs,
                'total_usd' => $totalEstimadoUsd,
                'tipo_cambio_ars' => $tipoCambio,
                'total_ars' => $totalEstimadoArs,
            ],
            'suscripcion' => [
                'estado' => $estadoSuscripcion, // trial, activa, gracia, vencida
                'es_valida' => $complejo->suscripcionValida(),
                'en_gracia' => $enGracia,
                'dias_restantes' => $diasRestantes,
                'trial_vence_at' => $complejo->suscripcion_trial_vence_at?->format('Y-m-d H:i:s'),
                'proximo_vencimiento' => $complejo->suscripcion_proximo_vencimiento?->format('Y-m-d H:i:s'),
                'gracia_vence_at' => $complejo->suscripcion_gracia_vence_at?->format('Y-m-d H:i:s'),
                'dias_gracia_configurados' => 7,
            ],
            'factura_pendiente' => $facturaPendiente ? [
                'id' => $facturaPendiente->id,
                'uuid' => $facturaPendiente->uuid,
                'periodo' => $facturaPendiente->periodo,
                'total_usd' => (float) $facturaPendiente->total_usd,
                'total_ars' => (float) $facturaPendiente->total_ars,
                'estado' => $facturaPendiente->estado,
                'fecha_vencimiento' => $facturaPendiente->fecha_vencimiento?->format('Y-m-d'),
                'fecha_limite_gracia' => $facturaPendiente->fecha_limite_gracia?->format('Y-m-d'),
                'esta_vencida' => $facturaPendiente->estaVencida(),
                'esta_en_gracia' => $facturaPendiente->estaEnGracia(),
            ] : null,
        ];
    }

    /**
     * Genera o recupera la factura consolidada de un club para el período especificado.
     */
    public function generarOFacturaPendiente(Complejo $complejo, ?string $periodo = null): FacturaClub
    {
        $periodo = $periodo ?: now()->format('Y-m');

        return DB::transaction(function () use ($complejo, $periodo) {
            $plan = $complejo->plan;
            $totalCanchas = $complejo->canchas()->count();
            $costoDetalle = $plan ? $plan->calcularCostoTotal($totalCanchas) : [
                'canchas_incluidas' => 2,
                'canchas_excedentes' => 0,
                'precio_base' => 0.0,
                'precio_cancha_adicional' => 0.0,
                'costo_adicional_total' => 0.0,
            ];

            // Buscar si ya existe factura pendiente para este período
            $factura = FacturaClub::where('complejo_id', $complejo->id)
                ->where('periodo', $periodo)
                ->whereIn('estado', ['pendiente', 'revision_transferencia'])
                ->lockForUpdate()
                ->first();

            // Turnos de marketplace no facturados
            $turnosMarketplaceQuery = Turno::where('complejo_id', $complejo->id)
                ->where('origen', 'marketplace')
                ->where('estado', '!=', 'cancelado')
                ->where(function ($q) use ($factura) {
                    $q->whereNull('factura_club_id');
                    if ($factura) {
                        $q->orWhere('factura_club_id', $factura->id);
                    }
                });

            $totalTurnosMkt = (int) $turnosMarketplaceQuery->count();
            $montoComisionesMktArs = (float) $turnosMarketplaceQuery->sum('comision_marketplace');

            $basePlan = (float) ($plan?->precio_mensual ?? 0.0);
            $costoExtras = (float) ($costoDetalle['costo_adicional_total'] ?? 0.0);

            $tipoCambio = $this->cotizacionDolarService->obtenerCotizacion();
            $montoComisionesMktUsd = $tipoCambio > 0 ? round($montoComisionesMktArs / $tipoCambio, 2) : 0.0;
            $totalUsd = round($basePlan + $costoExtras + $montoComisionesMktUsd, 2);

            $subtotalSaaSArs = round(($basePlan + $costoExtras) * $tipoCambio, 2);
            $totalArs = round($subtotalSaaSArs + $montoComisionesMktArs, 2);

            $fechaEmision = now()->startOfDay();
            $fechaVencimiento = now()->startOfDay()->addDays(5);
            $fechaLimiteGracia = $fechaVencimiento->copy()->addDays(7); // 7 días de gracia oficial

            if ($factura) {
                $factura->update([
                    'plan_id' => $plan?->id,
                    'monto_base_plan' => $basePlan,
                    'canchas_incluidas' => (int) ($costoDetalle['canchas_incluidas'] ?? 2),
                    'canchas_utilizadas' => $totalCanchas,
                    'canchas_excedentes' => (int) ($costoDetalle['canchas_excedentes'] ?? 0),
                    'precio_cancha_adicional' => (float) ($costoDetalle['precio_cancha_adicional'] ?? 0.0),
                    'monto_canchas_adicionales' => $costoExtras,
                    'monto_comisiones_marketplace' => $montoComisionesMktUsd,
                    'total_turnos_marketplace' => $totalTurnosMkt,
                    'total_usd' => $totalUsd,
                    'tipo_cambio_ars' => $tipoCambio,
                    'total_ars' => $totalArs,
                ]);
            } else {
                $factura = FacturaClub::create([
                    'complejo_id' => $complejo->id,
                    'plan_id' => $plan?->id,
                    'periodo' => $periodo,
                    'monto_base_plan' => $basePlan,
                    'canchas_incluidas' => (int) ($costoDetalle['canchas_incluidas'] ?? 2),
                    'canchas_utilizadas' => $totalCanchas,
                    'canchas_excedentes' => (int) ($costoDetalle['canchas_excedentes'] ?? 0),
                    'precio_cancha_adicional' => (float) ($costoDetalle['precio_cancha_adicional'] ?? 0.0),
                    'monto_canchas_adicionales' => $costoExtras,
                    'monto_comisiones_marketplace' => $montoComisionesMktUsd,
                    'total_turnos_marketplace' => $totalTurnosMkt,
                    'total_usd' => $totalUsd,
                    'tipo_cambio_ars' => $tipoCambio,
                    'total_ars' => $totalArs,
                    'estado' => 'pendiente',
                    'fecha_emision' => $fechaEmision,
                    'fecha_vencimiento' => $fechaVencimiento,
                    'fecha_limite_gracia' => $fechaLimiteGracia,
                ]);
            }

            // Asociar turnos de marketplace a esta factura
            Turno::where('complejo_id', $complejo->id)
                ->where('origen', 'marketplace')
                ->where('estado', '!=', 'cancelado')
                ->whereNull('factura_club_id')
                ->update(['factura_club_id' => $factura->id]);

            return $factura;
        });
    }

    /**
     * Evalúa y actualiza los estados de suscripción según vencimientos y períodos de gracia.
     */
    public function evaluarEstadoSuscripcion(Complejo $complejo): string
    {
        // 1. Si está en trial y aún no venció
        if ($complejo->suscripcion_estado === 'trial') {
            if ($complejo->suscripcion_trial_vence_at && now()->gt($complejo->suscripcion_trial_vence_at)) {
                // El trial venció. Otorgamos 7 días de gracia para regularizar
                $complejo->update([
                    'suscripcion_estado' => 'gracia',
                    'suscripcion_gracia_vence_at' => now()->addDays(7),
                ]);
                return 'gracia';
            }
            return 'trial';
        }

        // 2. Si está en gracia y expiró el plazo de 7 días
        if ($complejo->suscripcion_estado === 'gracia') {
            if ($complejo->suscripcion_gracia_vence_at && now()->gt($complejo->suscripcion_gracia_vence_at)) {
                $complejo->update(['suscripcion_estado' => 'vencida']);
                return 'vencida';
            }
            return 'gracia';
        }

        // 3. Si está activa pero superó el próximo vencimiento
        if ($complejo->suscripcion_estado === 'activa') {
            if ($complejo->suscripcion_proximo_vencimiento && now()->gt($complejo->suscripcion_proximo_vencimiento)) {
                // Entra en período de gracia de 7 días
                $complejo->update([
                    'suscripcion_estado' => 'gracia',
                    'suscripcion_gracia_vence_at' => now()->addDays(7),
                ]);
                return 'gracia';
            }
            return 'activa';
        }

        return $complejo->suscripcion_estado ?: 'trial';
    }
}
