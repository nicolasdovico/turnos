<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipoTorneo;
use App\Models\PartidoTorneo;
use App\Models\Torneo;
use App\Services\TorneoFixtureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TorneoController extends Controller
{
    public function __construct(
        protected TorneoFixtureService $fixtureService
    ) {}

    /**
     * GET /api/torneos
     * Listar torneos del club.
     */
    public function index(Request $request): JsonResponse
    {
        $torneos = Torneo::withCount(['equipos', 'partidos'])->latest()->get();

        return response()->json([
            'data' => $torneos,
        ]);
    }

    /**
     * POST /api/torneos
     * Crear un nuevo torneo.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'deporte' => 'nullable|string|in:padel,futbol,tenis',
            'formato' => 'nullable|string|in:eliminacion_directa,todos_contra_todos,fase_grupos',
            'categoria' => 'nullable|string|max:50',
            'max_equipos' => 'nullable|integer|in:4,8,16,32,64',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'precio_inscripcion' => 'nullable|numeric|min:0',
            'reglas' => 'nullable|string',
        ]);

        $torneo = Torneo::create($validated);

        return response()->json([
            'message' => 'Torneo creado con éxito.',
            'data' => $torneo,
        ], 201);
    }

    /**
     * GET /api/torneos/{id}
     * Detalle del torneo con sus equipos inscriptos.
     */
    public function show(int $id): JsonResponse
    {
        $torneo = Torneo::with(['equipos', 'partidos'])->findOrFail($id);

        return response()->json([
            'data' => $torneo,
        ]);
    }

    /**
     * POST /api/torneos/{id}/equipos
     * Inscribir un equipo o pareja en el torneo.
     */
    public function inscribirEquipo(Request $request, int $id): JsonResponse
    {
        $torneo = Torneo::findOrFail($id);

        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'jugador_1_nombre' => 'nullable|string|max:255',
            'jugador_2_nombre' => 'nullable|string|max:255',
            'contacto_email' => 'nullable|email|max:255',
            'contacto_telefono' => 'nullable|string|max:50',
            'semilla' => 'nullable|integer|min:1',
            'capitan_id' => 'nullable|exists:users,id',
        ]);

        if ($torneo->equipos()->count() >= $torneo->max_equipos) {
            return response()->json([
                'error' => 'MAX_TEAMS_REACHED',
                'message' => 'El torneo ha alcanzado el límite máximo de equipos.',
            ], 422);
        }

        $equipo = $torneo->equipos()->create($validated);

        return response()->json([
            'message' => 'Equipo inscripto exitosamente.',
            'data' => $equipo,
        ], 201);
    }

    /**
     * POST /api/torneos/{id}/generar-fixture
     * Genera el cuadro de eliminación directa y las llaves iniciales.
     */
    public function generarFixture(int $id): JsonResponse
    {
        $torneo = Torneo::findOrFail($id);

        $bracket = $this->fixtureService->generarLlavesEliminacionDirecta($torneo);

        return response()->json([
            'message' => 'Fixture y llaves generadas exitosamente.',
            'data' => $bracket,
        ], 200);
    }

    /**
     * GET /api/torneos/{id}/bracket
     * Retorna la estructura visual de las llaves por rondas (cuartos, semis, final).
     */
    public function getBracket(int $id): JsonResponse
    {
        $torneo = Torneo::findOrFail($id);

        $rondas = $this->fixtureService->obtenerEstructuraBracket($torneo);

        return response()->json([
            'torneo' => [
                'id' => $torneo->id,
                'nombre' => $torneo->nombre,
                'estado' => $torneo->estado,
            ],
            'bracket' => $rondas,
        ]);
    }

    /**
     * GET /api/torneos/{id}/tabla-posiciones
     * Retorna la tabla de clasificación ordenada del torneo.
     */
    public function getTablaPosiciones(int $id): JsonResponse
    {
        $torneo = Torneo::findOrFail($id);

        $tabla = $this->fixtureService->calcularTablaPosiciones($torneo);

        return response()->json([
            'torneo' => [
                'id' => $torneo->id,
                'nombre' => $torneo->nombre,
            ],
            'tabla' => $tabla,
        ]);
    }

    /**
     * POST /api/torneos/partidos/{partidoId}/resultado
     * Carga el score de un partido y avanza al ganador a la siguiente ronda.
     */
    public function registrarResultado(Request $request, int $partidoId): JsonResponse
    {
        $validated = $request->validate([
            'score_local' => 'required|integer|min:0',
            'score_visitante' => 'required|integer|min:0',
            'resultado_local' => 'nullable|string|max:50',
            'resultado_visitante' => 'nullable|string|max:50',
            'ganador_id' => 'nullable|exists:equipos_torneo,id',
        ]);

        $partido = PartidoTorneo::findOrFail($partidoId);

        $partidoActualizado = $this->fixtureService->registrarResultadoPartido(
            $partido,
            $validated
        );

        return response()->json([
            'message' => 'Resultado cargado exitosamente.',
            'data' => $partidoActualizado,
        ], 200);
    }
}
