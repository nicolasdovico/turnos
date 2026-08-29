<?php

namespace App\Services;

use App\Models\Complejo;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GeolocationService
{
    /**
     * Radio de la Tierra en kilómetros.
     */
    public const EARTH_RADIUS_KM = 6371;

    /**
     * Calcula la distancia en kilómetros entre dos coordenadas geográficas mediante la fórmula de Haversine.
     */
    public function calcularDistanciaHaversine(
        float $lat1,
        float $lon1,
        float $lat2,
        float $lon2
    ): float {
        $lat1Rad = deg2rad($lat1);
        $lon1Rad = deg2rad($lon1);
        $lat2Rad = deg2rad($lat2);
        $lon2Rad = deg2rad($lon2);

        $deltaLat = $lat2Rad - $lat1Rad;
        $deltaLon = $lon2Rad - $lon1Rad;

        $a = sin($deltaLat / 2) ** 2 +
             cos($lat1Rad) * cos($lat2Rad) * (sin($deltaLon / 2) ** 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round(self::EARTH_RADIUS_KM * $c, 2);
    }

    /**
     * Busca complejos deportivos dentro de un radio en kilómetros a partir de coordenadas GPS.
     */
    public function buscarComplejosCercanos(
        float $latitud,
        float $longitud,
        float $radioKm = 20.0,
        ?string $deporte = null
    ): Collection {
        // Query base sobre complejos activos con coordenadas válidas
        $query = Complejo::query()
            ->where('estado', 'activo')
            ->whereNotNull('latitud')
            ->whereNotNull('longitud')
            ->with(['canchas' => function ($q) {
                $q->where('estado', 'activo');
            }]);

        if ($deporte) {
            $query->whereHas('canchas', function ($q) use ($deporte) {
                $q->where('deporte', $deporte)->where('estado', 'activo');
            });
        }

        // Obtener complejos y computar distancia espacial
        $complejos = $query->get();

        $resultados = $complejos->map(function (Complejo $complejo) use ($latitud, $longitud) {
            $distancia = $this->calcularDistanciaHaversine(
                $latitud,
                $longitud,
                (float) $complejo->latitud,
                (float) $complejo->longitud
            );

            $complejo->distancia_km = $distancia;
            $complejo->deportes_disponibles = $complejo->canchas->pluck('deporte')->unique()->values();

            return $complejo;
        })
        ->filter(function (Complejo $complejo) use ($radioKm) {
            return $complejo->distancia_km <= $radioKm;
        })
        ->sortBy('distancia_km')
        ->values();

        return $resultados;
    }
}
