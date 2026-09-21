<?php

namespace App\Services;

use App\Models\Complejo;
use App\Models\Turno;

class MarketplaceAttributionService
{
    /**
     * Calcula la comisión aplicable según el origen de la reserva y el plan contratado por el club.
     */
    public function calcularComision(Complejo $complejo, float $precioTurno, string $origen = 'directo'): array
    {
        $origenLimpio = strtolower(trim($origen));

        if ($origenLimpio !== 'marketplace') {
            return [
                'origen' => 'directo',
                'comision_porcentaje' => 0.00,
                'comision_marketplace' => 0.00,
            ];
        }

        // Obtener el porcentaje de comisión configurado en el plan del club
        $plan = $complejo->plan;
        $porcentaje = $plan && $plan->comision_marketplace !== null
            ? (float) $plan->comision_marketplace
            : 5.00; // Default 5%

        $montoComision = round($precioTurno * ($porcentaje / 100.0), 2);

        return [
            'origen' => 'marketplace',
            'comision_porcentaje' => $porcentaje,
            'comision_marketplace' => $montoComision,
        ];
    }
}
