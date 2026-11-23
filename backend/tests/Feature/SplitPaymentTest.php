<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\PartidoAbierto;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SplitPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoPlata;
    protected Complejo $complejoBronce;
    protected Cancha $cancha;
    protected Turno $turno;
    protected User $cliente;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planPlata = Plan::where('slug', 'plata')->firstOrFail(); // Tiene split_payment
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail(); // NO tiene split_payment

        $this->complejoPlata = Complejo::create([
            'nombre' => 'Padel Club Plata',
            'subdominio' => 'padel-plata',
            'plan_id' => $planPlata->id,
            'estado' => 'activo',
        ]);

        $this->complejoBronce = Complejo::create([
            'nombre' => 'Club Bronce Basic',
            'subdominio' => 'bronce-basic',
            'plan_id' => $planBronce->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejoPlata);

        $this->cancha = Cancha::create([
            'nombre' => 'Cancha Central Pádel',
            'deporte' => 'padel',
            'superficie' => 'cristal_sintetico',
            'techada' => true,
            'precio_base' => 12000.00,
            'estado' => 'activo',
        ]);

        $this->cliente = User::factory()->create([
            'name' => 'Marcos Tenista',
            'email' => 'marcos@test.com',
        ]);

        $this->turno = Turno::create([
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'fecha' => now()->addDays(2)->toDateString(),
            'hora_inicio' => '19:00',
            'hora_fin' => '20:30',
            'precio' => 12000.00,
            'estado' => 'disponible',
        ]);
    }

    /**
     * Test fraccionar el total de un turno en cuotas individuales con tokens y checkout links.
     */
    public function test_fraccionar_turno_en_cuotas_con_links_checkout(): void
    {
        $response = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/turnos/{$this->turno->id}/split", [
                'cuotas' => 4,
                'organizador_nombre' => 'Marcos Tenista',
                'organizador_email' => 'marcos@test.com',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Pago dividido generado con éxito.',
                'data' => [
                    'turno_id' => $this->turno->id,
                    'precio_total' => 12000,
                    'total_cuotas' => 4,
                ],
            ]);

        $cuotas = $response->json('data.cuotas');
        $this->assertCount(4, $cuotas);
        $this->assertEquals(3000, $cuotas[0]['monto']);
        $this->assertEquals(3000, $cuotas[1]['monto']);
        $this->assertEquals(3000, $cuotas[2]['monto']);
        $this->assertEquals(3000, $cuotas[3]['monto']);
        $this->assertNotEmpty($cuotas[0]['token_pago']);
        $this->assertStringContainsString('/checkout/split/', $cuotas[0]['checkout_url']);

        // Verificar en base de datos
        app()->instance('currentTenant', $this->complejoPlata);
        $this->assertDatabaseCount('turno_pagos_divididos', 4);
        $this->assertDatabaseHas('turno_pagos_divididos', [
            'turno_id' => $this->turno->id,
            'cuota_numero' => 1,
            'monto' => 3000.00,
            'estado' => 'pendiente',
            'nombre_jugador' => 'Marcos Tenista',
        ]);
    }

    /**
     * Test pago individual de una cuota actualiza su estado pero no confirma el turno si faltan pagos.
     */
    public function test_pago_individual_de_cuota_actualiza_estado(): void
    {
        // 1. Generar split de 4 cuotas
        $splitRes = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/turnos/{$this->turno->id}/split", [
                'cuotas' => 4,
            ]);
        $splitRes->assertStatus(201);
        $cuota1Token = $splitRes->json('data.cuotas.0.token_pago');

        // 2. Pagar cuota 1
        $pagoRes = $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/split-pagos/{$cuota1Token}/pagar", [
                'metodo_pago' => 'tarjeta',
                'nombre_jugador' => 'Jugador 1',
                'email_jugador' => 'jugador1@test.com',
            ]);

        $pagoRes->assertStatus(200)
            ->assertJson([
                'message' => 'Cuota pagada con éxito.',
                'data' => [
                    'cuota' => [
                        'token_pago' => $cuota1Token,
                        'estado' => 'pagado',
                        'metodo_pago' => 'tarjeta',
                    ],
                    'resumen_split' => [
                        'total_cuotas' => 4,
                        'cuotas_pagadas' => 1,
                        'cuotas_pendientes' => 3,
                        'monto_recaudado' => 3000,
                        'completamente_pagado' => false,
                        'turno_confirmado' => false,
                    ],
                ],
            ]);

        // Verificar que el turno siga bloqueado (no disponible ni confirmado aún)
        app()->instance('currentTenant', $this->complejoPlata);
        $this->assertEquals('bloqueado', $this->turno->fresh()->estado);
    }

    /**
     * Test al completar el 100% de los pagos de las cuotas el turno se confirma automáticamente.
     */
    public function test_completar_todos_los_pagos_confirma_el_turno_automaticamente(): void
    {
        $splitRes = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/turnos/{$this->turno->id}/split", [
                'cuotas' => 3,
            ]);
        $splitRes->assertStatus(201);
        $cuotas = $splitRes->json('data.cuotas');

        // Pagar cuota 1 (4000)
        $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/split-pagos/{$cuotas[0]['token_pago']}/pagar", ['metodo_pago' => 'tarjeta'])
            ->assertStatus(200);

        // Pagar cuota 2 (4000)
        $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/split-pagos/{$cuotas[1]['token_pago']}/pagar", ['metodo_pago' => 'mercadopago'])
            ->assertStatus(200);

        $this->assertEquals('bloqueado', $this->turno->fresh()->estado);

        // Pagar cuota 3 (4000) -> Última cuota (verificada por club si es transferencia o pagada por tarjeta)
        $finalRes = $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/split-pagos/{$cuotas[2]['token_pago']}/pagar", [
                'metodo_pago' => 'transferencia',
                'verificado_por_club' => true,
            ]);

        $finalRes->assertStatus(200)
            ->assertJson([
                'data' => [
                    'resumen_split' => [
                        'total_cuotas' => 3,
                        'cuotas_pagadas' => 3,
                        'cuotas_pendientes' => 0,
                        'monto_recaudado' => 12000,
                        'completamente_pagado' => true,
                        'turno_confirmado' => true,
                    ],
                ],
            ]);

        // Verificar que el turno pasó atómicamente a estado 'reservado'
        app()->instance('currentTenant', $this->complejoPlata);
        $this->assertEquals('reservado', $this->turno->fresh()->estado);
    }

    /**
     * Test crear partido abierto directamente especificando cancha, fecha y hora_inicio.
     */
    public function test_crear_partido_abierto_directo_sin_turno_previo(): void
    {
        $fechaFutura = now()->addDays(3)->toDateString();

        $response = $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/partidos-abiertos/crear', [
                'cancha_id' => $this->cancha->id,
                'fecha' => $fechaFutura,
                'hora_inicio' => '18:00',
                'hora_fin' => '19:30',
                'cuotas' => 4,
                'nivel_min' => '5ta',
                'nivel_max' => '4ta',
                'tipo_partido' => 'amistoso',
                'organizador_nombre' => 'Gonzalo Pádel',
                'organizador_email' => 'gonzalo@padel.com',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Convocatoria de partido abierto creada exitosamente.',
            ]);

        $partidoId = $response->json('data.partido_abierto.id');
        $this->assertNotNull($partidoId);

        $this->assertDatabaseHas('partidos_abiertos', [
            'id' => $partidoId,
            'estado' => 'buscando',
            'tipo_partido' => 'amistoso',
        ]);

        $this->assertDatabaseHas('turnos', [
            'cancha_id' => $this->cancha->id,
            'fecha' => $fechaFutura,
            'hora_inicio' => '18:00:00',
            'hora_fin' => '19:30:00',
        ]);
    }

    /**
     * Test creación de Partido Abierto (Matchmaking) y unión de jugadores.
     */
    public function test_crear_partido_abierto_y_unirse_matchmaking(): void
    {
        // 1. Crear split con convocatoria de partido abierto
        $splitRes = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/turnos/{$this->turno->id}/split", [
                'cuotas' => 4,
                'es_partido_abierto' => true,
                'nivel_min' => '4ta',
                'nivel_max' => '5ta',
                'tipo_partido' => 'competitivo',
                'organizador_nombre' => 'Capitán Marcos',
            ]);

        $splitRes->assertStatus(201);
        $partidoId = $splitRes->json('data.partido_abierto.id');
        $this->assertNotNull($partidoId);

        // 2. Listar partidos abiertos
        $listRes = $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->getJson('/api/partidos-abiertos');

        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $partidoId)
            ->assertJsonPath('data.0.estado', 'buscando')
            ->assertJsonPath('data.0.nivel_min', '4ta');

        // 3. Jugador 2 se une al partido
        $joinRes = $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/partidos-abiertos/{$partidoId}/unirse", [
                'nombre_jugador' => 'Lucas Gonzalez',
                'email_jugador' => 'lucas@padel.com',
            ]);

        $joinRes->assertStatus(200)
            ->assertJson([
                'message' => 'Te has unido al partido abierto exitosamente.',
                'data' => [
                    'partido_id' => $partidoId,
                ],
            ]);

        $tokenAsignado = $joinRes->json('data.cuota_asignada.token_pago');
        $this->assertNotEmpty($tokenAsignado);

        // Verificar asignación en DB
        app()->instance('currentTenant', $this->complejoPlata);
        $this->assertDatabaseHas('turno_pagos_divididos', [
            'token_pago' => $tokenAsignado,
            'nombre_jugador' => 'Lucas Gonzalez',
            'estado' => 'pendiente',
        ]);
    }

    /**
     * Test tenant sin módulo split_payment contratado recibe 403 Forbidden.
     */
    public function test_modulo_split_payment_inactivo_retorna_403(): void
    {
        // Complejo Bronce no tiene split_payment
        app()->instance('currentTenant', $this->complejoBronce);
        $canchaBronce = Cancha::create([
            'nombre' => 'Cancha Bronce',
            'deporte' => 'futbol',
            'superficie' => 'sintetico',
            'techada' => false,
            'precio_base' => 8000.00,
            'estado' => 'activo',
        ]);

        $turnoBronce = Turno::create([
            'cancha_id' => $canchaBronce->id,
            'fecha' => '2026-09-02',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 8000.00,
            'estado' => 'disponible',
        ]);

        $response = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->postJson("/api/turnos/{$turnoBronce->id}/split", [
                'cuotas' => 2,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'split_payment',
            ]);
    }

    /**
     * Test cancelar partido abierto y consultar turnos para split.
     */
    public function test_cancelar_partido_abierto_y_turnos_para_split(): void
    {
        app()->instance('currentTenant', $this->complejoPlata);

        // Crear partido abierto
        $split = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/turnos/{$this->turno->id}/split", [
                'cuotas' => 4,
                'es_partido_abierto' => true,
                'tipo_partido' => 'desafio',
            ]);

        $split->assertStatus(201);
        $partidoId = $split->json('data.partido_abierto.id');

        // Cancelar partido abierto
        $cancelResponse = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson("/api/partidos-abiertos/{$partidoId}/cancelar", [
                'motivo' => 'Lluvia repentina',
            ]);

        $cancelResponse->assertStatus(200)
            ->assertJsonPath('data.estado', 'cancelado');

        $this->assertDatabaseHas('partidos_abiertos', [
            'id' => $partidoId,
            'estado' => 'cancelado',
        ]);

        // Consultar turnos disponibles para split
        $turnosResponse = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->getJson('/api/turnos-para-split');

        $turnosResponse->assertStatus(200)
            ->assertJsonStructure(['data']);
    }
}
