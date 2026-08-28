<?php

namespace Tests\Unit;

use App\Models\Complejo;
use App\Models\EquipoTorneo;
use App\Models\PartidoTorneo;
use App\Models\Plan;
use App\Models\Torneo;
use App\Services\TorneoFixtureService;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FixtureGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected TorneoFixtureService $service;
    protected Complejo $complejo;
    protected Torneo $torneo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $this->service = new TorneoFixtureService();

        $planOro = Plan::where('slug', 'oro')->firstOrFail();
        $this->complejo = Complejo::create([
            'nombre' => 'Club Pádel Master',
            'subdominio' => 'padel-master',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejo);

        $this->torneo = Torneo::create([
            'nombre' => 'Torneo Apertura 4ta Categoría',
            'deporte' => 'padel',
            'formato' => 'eliminacion_directa',
            'categoria' => '4ta',
            'max_equipos' => 8,
            'estado' => 'inscripciones_abiertas',
        ]);
    }

    /**
     * Test generación de llaves de eliminación directa para 4 equipos (Semis y Final).
     */
    public function test_generar_llaves_eliminacion_directa_4_equipos(): void
    {
        // Crear 4 equipos con semillas 1..4
        for ($i = 1; $i <= 4; $i++) {
            EquipoTorneo::create([
                'torneo_id' => $this->torneo->id,
                'nombre' => "Pareja {$i}",
                'semilla' => $i,
                'estado' => 'confirmado',
            ]);
        }

        $resultado = $this->service->generarLlavesEliminacionDirecta($this->torneo);

        $this->assertEquals(4, $resultado['bracket_size']);
        $this->assertEquals(2, $resultado['total_rondas']);
        $this->assertEquals(3, $resultado['total_partidos']); // 2 semifinales + 1 final

        // Verificar partidos en BD
        $partidos = PartidoTorneo::where('torneo_id', $this->torneo->id)->get();
        $this->assertCount(3, $partidos);

        $final = $partidos->where('fase', 'final')->first();
        $this->assertNotNull($final);
        $this->assertNull($final->siguiente_partido_id);
        $this->assertEquals(2, $final->ronda);

        $semis = $partidos->where('fase', 'semifinal')->values();
        $this->assertCount(2, $semis);

        // Semifinal 1: Semilla 1 vs Semilla 4
        $semi1 = $semis->where('posicion_llave', 1)->first();
        $this->assertEquals(EquipoTorneo::where('semilla', 1)->value('id'), $semi1->equipo_local_id);
        $this->assertEquals(EquipoTorneo::where('semilla', 4)->value('id'), $semi1->equipo_visitante_id);
        $this->assertEquals($final->id, $semi1->siguiente_partido_id);

        // Semifinal 2: Semilla 2 vs Semilla 3
        $semi2 = $semis->where('posicion_llave', 2)->first();
        $this->assertEquals(EquipoTorneo::where('semilla', 2)->value('id'), $semi2->equipo_local_id);
        $this->assertEquals(EquipoTorneo::where('semilla', 3)->value('id'), $semi2->equipo_visitante_id);
        $this->assertEquals($final->id, $semi2->siguiente_partido_id);

        $this->assertEquals('en_progreso', $this->torneo->fresh()->estado);
    }

    /**
     * Test generación de llaves de eliminación directa para 8 equipos (Cuartos, Semis y Final).
     */
    public function test_generar_llaves_eliminacion_directa_8_equipos(): void
    {
        for ($i = 1; $i <= 8; $i++) {
            EquipoTorneo::create([
                'torneo_id' => $this->torneo->id,
                'nombre' => "Equipo {$i}",
                'semilla' => $i,
                'estado' => 'confirmado',
            ]);
        }

        $resultado = $this->service->generarLlavesEliminacionDirecta($this->torneo);

        $this->assertEquals(8, $resultado['bracket_size']);
        $this->assertEquals(3, $resultado['total_rondas']);
        $this->assertEquals(7, $resultado['total_partidos']); // 4 cuartos + 2 semifinales + 1 final

        $cuartos = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'cuartos')->get();
        $this->assertCount(4, $cuartos);

        $semis = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'semifinal')->get();
        $this->assertCount(2, $semis);

        $final = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'final')->first();
        $this->assertNotNull($final);

        // Cuartos 1 y 2 apuntan a Semifinal 1
        $semi1 = $semis->where('posicion_llave', 1)->first();
        $this->assertEquals($semi1->id, $cuartos->where('posicion_llave', 1)->first()->siguiente_partido_id);
        $this->assertEquals($semi1->id, $cuartos->where('posicion_llave', 2)->first()->siguiente_partido_id);

        // Cuartos 3 y 4 apuntan a Semifinal 2
        $semi2 = $semis->where('posicion_llave', 2)->first();
        $this->assertEquals($semi2->id, $cuartos->where('posicion_llave', 3)->first()->siguiente_partido_id);
        $this->assertEquals($semi2->id, $cuartos->where('posicion_llave', 4)->first()->siguiente_partido_id);
    }

    /**
     * Test avance automático del ganador a la siguiente ronda del fixture hasta consagrar al campeón.
     */
    public function test_avance_automatico_de_ganador_a_la_siguiente_ronda(): void
    {
        $equipo1 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja Alfa', 'semilla' => 1]);
        $equipo2 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja Beta', 'semilla' => 2]);
        $equipo3 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja Gamma', 'semilla' => 3]);
        $equipo4 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja Delta', 'semilla' => 4]);

        $this->service->generarLlavesEliminacionDirecta($this->torneo);

        $semi1 = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'semifinal')->where('posicion_llave', 1)->first();
        $semi2 = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'semifinal')->where('posicion_llave', 2)->first();
        $final = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'final')->first();

        // 1. Jugar Semifinal 1: Gana Pareja Alfa (Equipo 1)
        $this->service->registrarResultadoPartido($semi1, [
            'score_local' => 2,
            'score_visitante' => 0,
            'resultado_local' => '6-2, 6-3',
        ]);

        // Verificar que Pareja Alfa avanzó a equipo_local de la Final
        $finalActualizada = $final->fresh();
        $this->assertEquals($equipo1->id, $finalActualizada->equipo_local_id);
        $this->assertEquals('eliminado', $equipo4->fresh()->estado);

        // 2. Jugar Semifinal 2: Gana Pareja Gamma (Equipo 3)
        $this->service->registrarResultadoPartido($semi2, [
            'score_local' => 1,
            'score_visitante' => 2,
            'resultado_visitante' => '4-6, 6-4, 7-5',
        ]);

        // Verificar que Pareja Gamma avanzó a equipo_visitante de la Final
        $finalActualizada = $final->fresh();
        $this->assertEquals($equipo3->id, $finalActualizada->equipo_visitante_id);
        $this->assertEquals('eliminado', $equipo2->fresh()->estado);

        // 3. Jugar la Final: Gana Pareja Alfa (Equipo 1)
        $this->service->registrarResultadoPartido($finalActualizada, [
            'score_local' => 2,
            'score_visitante' => 1,
            'resultado_local' => '6-4, 4-6, 6-2',
        ]);

        // Verificar consagración de Campeón y cierre del Torneo
        $this->assertEquals($equipo1->id, $final->fresh()->ganador_id);
        $this->assertEquals('campeon', $equipo1->fresh()->estado);
        $this->assertEquals('eliminado', $equipo3->fresh()->estado);
        $this->assertEquals('finalizado', $this->torneo->fresh()->estado);
    }

    /**
     * Test avance automático por BYE cuando la cantidad de equipos no es potencia exacta de 2.
     */
    public function test_manejo_de_byes_cuando_cantidad_equipos_no_es_potencia_de_2(): void
    {
        // 3 equipos -> Bracket size 4 (1 equipo con BYE)
        $equipo1 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja 1', 'semilla' => 1]);
        $equipo2 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja 2', 'semilla' => 2]);
        $equipo3 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Pareja 3', 'semilla' => 3]);

        $this->service->generarLlavesEliminacionDirecta($this->torneo);

        // Semifinal 1 (Seed 1 vs Seed 4 que no existe): Equipo 1 recibe BYE y pasa directo a la final
        $semi1 = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'semifinal')->where('posicion_llave', 1)->first();
        $this->assertEquals('finalizado', $semi1->estado);
        $this->assertEquals($equipo1->id, $semi1->ganador_id);

        $final = PartidoTorneo::where('torneo_id', $this->torneo->id)->where('fase', 'final')->first();
        $this->assertEquals($equipo1->id, $final->equipo_local_id);
    }

    /**
     * Test cálculo ordenado de la tabla de posiciones por puntos y diferencia de sets.
     */
    public function test_calculo_tabla_de_posiciones(): void
    {
        $eq1 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Equipo Líder', 'puntos' => 9, 'diferencia_sets' => 6]);
        $eq2 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Equipo Segundo', 'puntos' => 6, 'diferencia_sets' => 2]);
        $eq3 = EquipoTorneo::create(['torneo_id' => $this->torneo->id, 'nombre' => 'Equipo Tercero', 'puntos' => 3, 'diferencia_sets' => -1]);

        $tabla = $this->service->calcularTablaPosiciones($this->torneo);

        $this->assertCount(3, $tabla);
        $this->assertEquals('Equipo Líder', $tabla->first()->nombre);
        $this->assertEquals('Equipo Tercero', $tabla->last()->nombre);
    }
}
