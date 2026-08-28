<?php

namespace App\Services;

use App\Models\EquipoTorneo;
use App\Models\PartidoTorneo;
use App\Models\Torneo;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TorneoFixtureService
{
    /**
     * Nombres de fases según la cantidad de partidos por ronda.
     */
    protected array $fasesPorPartidos = [
        1 => 'final',
        2 => 'semifinal',
        4 => 'cuartos',
        8 => 'octavos',
        16 => 'dieciseisavos',
        32 => 'treintaidosavos',
    ];

    /**
     * Genera el cuadro completo de llaves de Eliminación Directa para un torneo.
     */
    public function generarLlavesEliminacionDirecta(Torneo $torneo): array
    {
        $equipos = $torneo->equipos()
            ->whereIn('estado', ['confirmado', 'inscripto'])
            ->orderBy('semilla')
            ->orderBy('id')
            ->get();

        $numEquipos = $equipos->count();

        if ($numEquipos < 2) {
            throw ValidationException::withMessages([
                'equipos' => ['Se requieren al menos 2 equipos confirmados para generar el fixture.'],
            ]);
        }

        return DB::transaction(function () use ($torneo, $equipos, $numEquipos) {
            // Limpiar partidos previos si el torneo está iniciando
            $torneo->partidos()->delete();

            // Calcular tamaño del bracket (potencia de 2 más cercana: 2, 4, 8, 16, 32)
            $bracketSize = 2;
            while ($bracketSize < $numEquipos) {
                $bracketSize *= 2;
            }

            $totalRondas = (int) log($bracketSize, 2);

            // 1. Crear la estructura del bracket desde la Final hacia la Ronda 1
            // $partidosPorRonda[ronda][posicion_llave] = PartidoTorneo
            $partidosPorRonda = [];

            for ($ronda = $totalRondas; $ronda >= 1; $ronda--) {
                $partidosEnRonda = (int) pow(2, $totalRondas - $ronda);
                $nombreFase = $this->fasesPorPartidos[$partidosEnRonda] ?? "ronda_{$ronda}";

                for ($pos = 1; $pos <= $partidosEnRonda; $pos++) {
                    $siguientePartidoId = null;
                    if ($ronda < $totalRondas) {
                        $posSiguiente = (int) ceil($pos / 2);
                        $siguientePartidoId = $partidosPorRonda[$ronda + 1][$posSiguiente]->id ?? null;
                    }

                    $partido = PartidoTorneo::create([
                        'complejo_id' => $torneo->complejo_id,
                        'torneo_id' => $torneo->id,
                        'fase' => $nombreFase,
                        'ronda' => $ronda,
                        'posicion_llave' => $pos,
                        'siguiente_partido_id' => $siguientePartidoId,
                        'estado' => 'pendiente',
                    ]);

                    $partidosPorRonda[$ronda][$pos] = $partido;
                }
            }

            // 2. Sembrado de equipos en la Ronda 1
            $seedingPairs = $this->obtenerEmparejamientosSembrado($bracketSize);
            $partidosRonda1 = $partidosPorRonda[1];

            foreach ($seedingPairs as $posicion => $par) {
                $partido = $partidosRonda1[$posicion + 1] ?? null;
                if (!$partido) continue;

                $seedLocal = $par[0];
                $seedVisitante = $par[1];

                $equipoLocal = $equipos->get($seedLocal - 1);
                $equipoVisitante = $equipos->get($seedVisitante - 1);

                $partido->equipo_local_id = $equipoLocal?->id;
                $partido->equipo_visitante_id = $equipoVisitante?->id;

                // Si hay un BYE (solo un equipo presente en la llave), avanza automáticamente
                if ($equipoLocal && !$equipoVisitante) {
                    $partido->ganador_id = $equipoLocal->id;
                    $partido->estado = 'finalizado';
                    $partido->resultado_local = 'BYE';
                    $partido->save();
                    $this->avanzarGanador($partido, $equipoLocal->id);
                } elseif (!$equipoLocal && $equipoVisitante) {
                    $partido->ganador_id = $equipoVisitante->id;
                    $partido->estado = 'finalizado';
                    $partido->resultado_visitante = 'BYE';
                    $partido->save();
                    $this->avanzarGanador($partido, $equipoVisitante->id);
                } else {
                    $partido->save();
                }
            }

            $torneo->estado = 'en_progreso';
            $torneo->save();

            return [
                'torneo_id' => $torneo->id,
                'formato' => 'eliminacion_directa',
                'bracket_size' => $bracketSize,
                'total_rondas' => $totalRondas,
                'total_partidos' => $torneo->partidos()->count(),
                'rondas' => $this->obtenerEstructuraBracket($torneo),
            ];
        });
    }

    /**
     * Registra el resultado de un partido y avanza al ganador a la siguiente ronda del fixture.
     */
    public function registrarResultadoPartido(PartidoTorneo $partido, array $datos): PartidoTorneo
    {
        return DB::transaction(function () use ($partido, $datos) {
            $partidoBloqueado = PartidoTorneo::where('id', $partido->id)
                ->lockForUpdate()
                ->firstOrFail();

            $scoreLocal = (int) ($datos['score_local'] ?? 0);
            $scoreVisitante = (int) ($datos['score_visitante'] ?? 0);

            if ($scoreLocal === $scoreVisitante && empty($datos['ganador_id'])) {
                throw ValidationException::withMessages([
                    'score' => ['En eliminación directa no se admiten empates sin definir un ganador.'],
                ]);
            }

            $ganadorId = $datos['ganador_id'] ?? ($scoreLocal > $scoreVisitante ? $partidoBloqueado->equipo_local_id : $partidoBloqueado->equipo_visitante_id);
            $perdedorId = ($ganadorId === $partidoBloqueado->equipo_local_id) ? $partidoBloqueado->equipo_visitante_id : $partidoBloqueado->equipo_local_id;

            $partidoBloqueado->score_local = $scoreLocal;
            $partidoBloqueado->score_visitante = $scoreVisitante;
            $partidoBloqueado->resultado_local = $datos['resultado_local'] ?? (string) $scoreLocal;
            $partidoBloqueado->resultado_visitante = $datos['resultado_visitante'] ?? (string) $scoreVisitante;
            $partidoBloqueado->ganador_id = $ganadorId;
            $partidoBloqueado->estado = 'finalizado';
            $partidoBloqueado->save();

            // Actualizar estadísticas de equipos (para tablas y balances)
            $this->actualizarEstadisticasEquipo($partidoBloqueado->equipoLocal, $scoreLocal, $scoreVisitante, $ganadorId === $partidoBloqueado->equipo_local_id);
            $this->actualizarEstadisticasEquipo($partidoBloqueado->equipoVisitante, $scoreVisitante, $scoreLocal, $ganadorId === $partidoBloqueado->equipo_visitante_id);

            // Marcar equipo eliminado
            if ($perdedorId && $partidoBloqueado->torneo->formato === 'eliminacion_directa') {
                EquipoTorneo::where('id', $perdedorId)->update(['estado' => 'eliminado']);
            }

            // Si tiene siguiente partido en la llave, avanzar al ganador
            if ($partidoBloqueado->siguiente_partido_id) {
                $this->avanzarGanador($partidoBloqueado, $ganadorId);
            }

            // Si es la Final, proclamar campeón y finalizar torneo
            if ($partidoBloqueado->fase === 'final' && $ganadorId) {
                EquipoTorneo::where('id', $ganadorId)->update(['estado' => 'campeon']);
                $partidoBloqueado->torneo->update(['estado' => 'finalizado']);
            }

            return $partidoBloqueado->fresh(['equipoLocal', 'equipoVisitante', 'ganador', 'siguientePartido']);
        });
    }

    /**
     * Avanza al equipo ganador a la posición correspondiente en la siguiente ronda.
     */
    protected function avanzarGanador(PartidoTorneo $partido, int $ganadorId): void
    {
        if (!$partido->siguiente_partido_id) return;

        $siguiente = PartidoTorneo::where('id', $partido->siguiente_partido_id)
            ->lockForUpdate()
            ->first();

        if ($siguiente) {
            // Posición impar va a local, par va a visitante
            if ($partido->posicion_llave % 2 === 1) {
                $siguiente->equipo_local_id = $ganadorId;
            } else {
                $siguiente->equipo_visitante_id = $ganadorId;
            }
            $siguiente->save();
        }
    }

    /**
     * Calcula y retorna la tabla de posiciones clasificada de un torneo.
     */
    public function calcularTablaPosiciones(Torneo $torneo): Collection
    {
        return $torneo->equipos()
            ->orderByDesc('puntos')
            ->orderByDesc('diferencia_sets')
            ->orderByDesc('sets_favor')
            ->orderByDesc('partidos_ganados')
            ->get();
    }

    /**
     * Obtiene la estructura visual del cuadro de llaves agrupada por rondas.
     */
    public function obtenerEstructuraBracket(Torneo $torneo): array
    {
        $partidos = $torneo->partidos()
            ->with(['equipoLocal', 'equipoVisitante', 'ganador', 'cancha'])
            ->orderBy('ronda')
            ->orderBy('posicion_llave')
            ->get();

        return $partidos->groupBy('fase')->map(function ($partidosFase, $fase) {
            return [
                'fase' => $fase,
                'partidos' => $partidosFase->map(fn ($p) => [
                    'id' => $p->id,
                    'ronda' => $p->ronda,
                    'posicion_llave' => $p->posicion_llave,
                    'siguiente_partido_id' => $p->siguiente_partido_id,
                    'equipo_local' => $p->equipoLocal ? [
                        'id' => $p->equipoLocal->id,
                        'nombre' => $p->equipoLocal->nombre,
                        'semilla' => $p->equipoLocal->semilla,
                    ] : null,
                    'equipo_visitante' => $p->equipoVisitante ? [
                        'id' => $p->equipoVisitante->id,
                        'nombre' => $p->equipoVisitante->nombre,
                        'semilla' => $p->equipoVisitante->semilla,
                    ] : null,
                    'ganador_id' => $p->ganador_id,
                    'score_local' => $p->score_local,
                    'score_visitante' => $p->score_visitante,
                    'resultado_local' => $p->resultado_local,
                    'resultado_visitante' => $p->resultado_visitante,
                    'estado' => $p->estado,
                ])->values(),
            ];
        })->values()->toArray();
    }

    /**
     * Genera emparejamientos de siembra clásicos para un tamaño de cuadro (1 vs N, etc.)
     */
    protected function obtenerEmparejamientosSembrado(int $bracketSize): array
    {
        if ($bracketSize === 2) {
            return [[1, 2]];
        }

        if ($bracketSize === 4) {
            return [
                [1, 4],
                [2, 3],
            ];
        }

        if ($bracketSize === 8) {
            return [
                [1, 8],
                [4, 5],
                [2, 7],
                [3, 6],
            ];
        }

        if ($bracketSize === 16) {
            return [
                [1, 16], [8, 9], [4, 13], [5, 12],
                [2, 15], [7, 10], [3, 14], [6, 11],
            ];
        }

        // Algoritmo genérico para tamaños mayores
        $pairs = [[1, 2]];
        while (count($pairs) * 2 <= $bracketSize / 2) {
            $nextPairs = [];
            $sum = count($pairs) * 4 + 1;
            foreach ($pairs as $pair) {
                $nextPairs[] = [$pair[0], $sum - $pair[0]];
                $nextPairs[] = [$pair[1], $sum - $pair[1]];
            }
            $pairs = $nextPairs;
        }

        return $pairs;
    }

    /**
     * Actualiza métricas de clasificación de un equipo tras un partido.
     */
    protected function actualizarEstadisticasEquipo(?EquipoTorneo $equipo, int $scoreAFavor, int $scoreEnContra, bool $esGanador): void
    {
        if (!$equipo) return;

        $equipo->partidos_jugados += 1;
        $equipo->sets_favor += $scoreAFavor;
        $equipo->sets_contra += $scoreEnContra;
        $equipo->diferencia_sets = $equipo->sets_favor - $equipo->sets_contra;

        if ($esGanador) {
            $equipo->partidos_ganados += 1;
            $equipo->puntos += 3; // 3 puntos por victoria
        } elseif ($scoreAFavor === $scoreEnContra) {
            $equipo->partidos_empatados += 1;
            $equipo->puntos += 1; // 1 punto por empate
        } else {
            $equipo->partidos_perdidos += 1;
        }

        $equipo->save();
    }
}
