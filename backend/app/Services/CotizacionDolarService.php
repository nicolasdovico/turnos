<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CotizacionDolarService
{
    /**
     * Tasa de cambio por defecto ante fallas de conectividad externa.
     */
    protected float $fallbackRate;

    public function __construct()
    {
        $this->fallbackRate = (float) config('services.dolar.fallback_rate', 1350.00);
    }

    /**
     * Obtiene la cotización del dólar en ARS (con caché de 60 minutos y fallback seguro).
     */
    public function obtenerCotizacion(): float
    {
        return Cache::remember('cotizacion_dolar_b2b_ars', 3600, function () {
            try {
                // Intento 1: DolarApi Oficial
                $response = Http::timeout(4)->get('https://dolarapi.com/v1/dolares/oficial');
                if ($response->successful()) {
                    $data = $response->json();
                    $venta = (float) ($data['venta'] ?? 0);
                    if ($venta > 0) {
                        Log::info("CotizacionDolarService: DolarApi Oficial obtenido exitosamente: {$venta}");
                        return $venta;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("CotizacionDolarService: Error al consultar DolarApi: " . $e->getMessage());
            }

            try {
                // Intento 2: Bluelytics Oficial
                $response = Http::timeout(4)->get('https://api.bluelytics.com.ar/v2/latest');
                if ($response->successful()) {
                    $data = $response->json();
                    $venta = (float) ($data['oficial']['value_sell'] ?? 0);
                    if ($venta > 0) {
                        Log::info("CotizacionDolarService: Bluelytics Oficial obtenido exitosamente: {$venta}");
                        return $venta;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("CotizacionDolarService: Error al consultar Bluelytics: " . $e->getMessage());
            }

            Log::warning("CotizacionDolarService: Usando cotización fallback de {$this->fallbackRate} ARS");
            return $this->fallbackRate;
        });
    }

    /**
     * Convierte un monto en USD a ARS.
     */
    public function convertirUsdAPesos(float $montoUsd): array
    {
        $tasa = $this->obtenerCotizacion();
        $totalArs = round($montoUsd * $tasa, 2);

        return [
            'monto_usd' => $montoUsd,
            'tipo_cambio' => $tasa,
            'monto_ars' => $totalArs,
        ];
    }
}
