<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Deporte;
use Illuminate\Http\JsonResponse;

class DeporteController extends Controller
{
    /**
     * Retorna el catálogo maestro de deportes activos con sus superficies y configuraciones.
     */
    public function index(): JsonResponse
    {
        $deportes = Deporte::with(['superficiesActivas'])
            ->where('esta_activo', true)
            ->orderBy('orden')
            ->get()
            ->map(function (Deporte $d) {
                return [
                    'id' => $d->id,
                    'nombre' => $d->nombre,
                    'slug' => $d->slug,
                    'icono' => $d->icono,
                    'tiene_paredes' => (bool) $d->tiene_paredes,
                    'duracion_default_minutos' => (int) $d->duracion_default_minutos,
                    'formatos' => $d->formatos ?? [],
                    'paredes' => $d->paredes ?? [],
                    'superficies' => $d->superficiesActivas->map(function ($s) {
                        return [
                            'id' => $s->slug,
                            'superficie_id' => $s->id,
                            'nombre' => $s->nombre,
                            'label' => $s->nombre,
                            'slug' => $s->slug,
                            'descripcion' => $s->descripcion,
                        ];
                    })->values(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $deportes,
        ]);
    }
}
