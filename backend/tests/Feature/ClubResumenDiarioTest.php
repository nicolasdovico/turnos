<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubResumenDiarioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);
    }

    public function test_club_owner_can_get_resumen_diario_with_accurate_kpis_and_breakdown(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@padelpro.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Pádel Pro Arena',
            'subdominio' => 'padel-pro-resumen',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // Horarios: Abre de 08:00 a 22:00 (14 horas / 840 min disponibles por día)
        for ($dia = 0; $dia <= 6; $dia++) {
            HorarioAtencion::create([
                'complejo_id' => $complejo->id,
                'dia_semana' => $dia,
                'hora_apertura' => '08:00:00',
                'hora_cierre' => '22:00:00',
                'duracion_turno_minutos' => 60,
                'activo' => true,
            ]);
        }

        $cancha1 = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1 Panorámica',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'precio_base' => 10000,
            'activa' => true,
        ]);

        $cancha2 = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 2 Cristal',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 12000,
            'activa' => true,
        ]);

        // Día 1 (2026-09-01): 2 turnos
        // Turno 1: Totalmente pagado en mostrador ($10.000)
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha1->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '18:00:00',
            'hora_fin' => '19:30:00',
            'precio' => 10000,
            'monto_pagado' => 10000,
            'saldo_pendiente' => 0,
            'estado_pago' => 'pagado_total',
            'metodo_pago' => 'mostrador',
            'cliente_nombre' => 'Franco Armani',
            'cliente_telefono' => '+5491112345678',
            'estado' => 'reservado',
        ]);

        // Turno 2: Coronado con Seña ($6.000 pagado online, resta $6.000)
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha2->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '20:00:00',
            'hora_fin' => '21:30:00',
            'precio' => 12000,
            'monto_pagado' => 6000,
            'saldo_pendiente' => 6000,
            'estado_pago' => 'senado',
            'metodo_pago' => 'online',
            'cliente_nombre' => 'Enzo Pérez',
            'cliente_telefono' => '+5491187654321',
            'estado' => 'reservado',
        ]);

        // Día 2 (2026-09-02): 1 turno
        // Turno 3: Pendiente de cobro en mostrador ($10.000)
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha1->id,
            'fecha' => '2026-09-02',
            'hora_inicio' => '19:00:00',
            'hora_fin' => '20:00:00',
            'precio' => 10000,
            'monto_pagado' => 0,
            'saldo_pendiente' => 10000,
            'estado_pago' => 'pendiente',
            'metodo_pago' => 'mostrador',
            'cliente_nombre' => 'Julián Álvarez',
            'cliente_telefono' => '+5491199998888',
            'estado' => 'reservado',
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clubs/padel-pro-resumen/resumen-diario?fecha_desde=2026-09-01&fecha_hasta=2026-09-02');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kpis.total_facturado', 32000)
            ->assertJsonPath('data.kpis.total_cobrado', 16000)
            ->assertJsonPath('data.kpis.total_saldo_pendiente', 16000)
            ->assertJsonPath('data.kpis.total_turnos', 3);

        $dias = $response->json('data.dias');
        $this->assertCount(2, $dias);

        // Verificar Día 1 (2026-09-01)
        $dia1 = collect($dias)->firstWhere('fecha', '2026-09-01');
        $this->assertNotNull($dia1);
        $this->assertEquals(2, $dia1['total_turnos']);
        $this->assertEquals(22000, $dia1['monto_total']);
        $this->assertEquals(16000, $dia1['monto_cobrado']);
        $this->assertEquals(6000, $dia1['saldo_pendiente']);
        $this->assertEquals('pendiente', $dia1['estado_cobro']);
        $this->assertCount(2, $dia1['turnos']);

        // Verificar Día 2 (2026-09-02)
        $dia2 = collect($dias)->firstWhere('fecha', '2026-09-02');
        $this->assertNotNull($dia2);
        $this->assertEquals(1, $dia2['total_turnos']);
        $this->assertEquals(10000, $dia2['monto_total']);
        $this->assertEquals(0, $dia2['monto_cobrado']);
        $this->assertEquals(10000, $dia2['saldo_pendiente']);
        $this->assertEquals('pendiente', $dia2['estado_cobro']);
        $this->assertCount(1, $dia2['turnos']);
    }

    public function test_non_owner_and_guests_cannot_access_resumen_diario(): void
    {
        $owner = User::factory()->create([
            'email' => 'owner@club.com',
        ]);
        $unauthorizedUser = User::factory()->create([
            'email' => 'other@club.com',
        ]);

        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Exclusivo',
            'subdominio' => 'club-exclusivo',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // 1. Guest -> 401 Unauthorized o 403
        $resGuest = $this->getJson('/api/clubs/club-exclusivo/resumen-diario');
        $this->assertTrue(in_array($resGuest->status(), [401, 403]));

        // 2. Non-owner -> 403 Forbidden
        $resOther = $this->actingAs($unauthorizedUser, 'sanctum')
            ->getJson('/api/clubs/club-exclusivo/resumen-diario');
        $resOther->assertStatus(403);
    }

    public function test_filter_resumen_diario_by_specific_court(): void
    {
        $owner = User::factory()->create(['email' => 'boss@padel.com']);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Pádel Center',
            'subdominio' => 'padel-center-filter',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $cancha1 = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'precio_base' => 10000,
            'activa' => true,
        ]);

        $cancha2 = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 2',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 15000,
            'activa' => true,
        ]);

        // Turno en Cancha 1
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha1->id,
            'fecha' => '2026-09-05',
            'hora_inicio' => '10:00:00',
            'hora_fin' => '11:00:00',
            'precio' => 10000,
            'monto_pagado' => 10000,
            'saldo_pendiente' => 0,
            'estado_pago' => 'pagado_total',
            'metodo_pago' => 'mostrador',
            'estado' => 'reservado',
        ]);

        // Turno en Cancha 2
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha2->id,
            'fecha' => '2026-09-05',
            'hora_inicio' => '10:00:00',
            'hora_fin' => '11:00:00',
            'precio' => 15000,
            'monto_pagado' => 15000,
            'saldo_pendiente' => 0,
            'estado_pago' => 'pagado_total',
            'metodo_pago' => 'transferencia',
            'estado' => 'reservado',
        ]);

        // Filtrar exclusivamente por Cancha 1
        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/clubs/padel-center-filter/resumen-diario?fecha_desde=2026-09-05&fecha_hasta=2026-09-05&cancha_id={$cancha1->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.kpis.total_facturado', 10000)
            ->assertJsonPath('data.kpis.total_turnos', 1);

        $dias = $response->json('data.dias');
        $this->assertCount(1, $dias);
        $this->assertCount(1, $dias[0]['turnos']);
        $this->assertEquals($cancha1->id, $dias[0]['turnos'][0]['cancha_id']);
    }
}
