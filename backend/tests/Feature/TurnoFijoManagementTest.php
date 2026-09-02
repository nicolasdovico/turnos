<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\TipoNegocio;
use App\Models\Turno;
use App\Models\User;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurnoFijoManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected User $owner;
    protected User $client;
    protected Cancha $cancha;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::create(2026, 9, 1, 10, 0, 0)); // Tuesday 10:00

        // Ensure module and plan exist
        $moduloReservas = Modulo::firstOrCreate(['slug' => 'reservas'], ['nombre' => 'Reservas']);
        $moduloTurnosFijos = Modulo::firstOrCreate(['slug' => 'turnos_fijos'], ['nombre' => 'Turnos Fijos']);
        
        $plan = Plan::firstOrCreate(
            ['slug' => 'oro'],
            ['nombre' => 'Oro', 'precio_mensual' => 25000, 'estado' => 'activo']
        );
        $plan->modulos()->syncWithoutDetaching([$moduloReservas->id, $moduloTurnosFijos->id]);

        $tipoNegocio = TipoNegocio::firstOrCreate(['slug' => 'club'], ['nombre' => 'Club Deportivo', 'esta_activo' => true]);

        $this->owner = User::factory()->create([
            'email' => 'owner@turnosfijos.com',
        ]);

        $this->client = User::factory()->create([
            'name' => 'Juan Perez',
            'email' => 'juan@cliente.com',
            'telefono' => '1122334455',
        ]);

        $this->complejo = Complejo::create([
            'user_id' => $this->owner->id,
            'plan_id' => $plan->id,
            'tipo_negocio_id' => $tipoNegocio->id,
            'nombre' => 'Padel Fijos Club',
            'subdominio' => 'padel-fijos',
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $this->cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 1 Central',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 8000,
            'duracion_minutos' => 90,
            'estado' => 'activo',
        ]);

        // Create business hours for Tuesday (dia 2)
        HorarioAtencion::create([
            'complejo_id' => $this->complejo->id,
            'dia_semana' => 2, // Tuesday
            'hora_apertura' => '08:00',
            'hora_cierre' => '23:00',
            'duracion_turno_minutos' => 90,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_club_owner_can_create_fixed_turnos_for_6_months(): void
    {
        $response = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2, // Martes
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01', // Hoy martes
                'semanas' => 26, // 6 meses
                'precio' => 7500,
                'cliente_id' => $this->client->id,
                'metodo_pago' => 'mostrador',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'cantidad' => 26,
            ]);

        $this->assertDatabaseCount('turnos', 26);
        $this->assertDatabaseHas('turnos', [
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->client->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '19:00',
            'es_fijo' => true,
        ]);
    }

    public function test_club_owner_can_create_fixed_turno_for_offline_client(): void
    {
        $response = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '20:30',
                'hora_fin' => '22:00',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 26,
                'precio' => 8000,
                'cliente_nombre' => 'Carlos Mostrador',
                'cliente_telefono' => '1199887766',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'cantidad' => 26,
            ]);

        $this->assertDatabaseHas('turnos', [
            'cancha_id' => $this->cancha->id,
            'cliente_nombre' => 'Carlos Mostrador',
            'cliente_telefono' => '1199887766',
            'cliente_id' => null,
            'es_fijo' => true,
        ]);
    }

    public function test_club_owner_can_list_fixed_turnos_grouped_by_series(): void
    {
        // Create 26 weeks fixed series
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 26,
                'precio' => 7500,
                'cliente_id' => $this->client->id,
            ]);

        $response = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'cancha_id',
                        'cancha_nombre',
                        'dia_semana',
                        'hora_inicio',
                        'hora_fin',
                        'precio',
                        'cliente_id',
                        'cliente_nombre',
                        'cliente_telefono',
                        'total_turnos',
                        'proximas_fechas_count',
                        'proxima_fecha',
                        'fecha_fin',
                        'requiere_renovacion',
                        'proximas_fechas',
                    ],
                ],
            ]);

        $series = $response->json('data.0');
        $this->assertEquals(26, $series['total_turnos']);
        $this->assertEquals(26, $series['proximas_fechas_count']);
        $this->assertFalse($series['requiere_renovacion']);
    }

    public function test_system_flags_series_expiring_soon_for_renewal(): void
    {
        // Create series with only 2 weeks left
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 2,
                'precio' => 7500,
                'cliente_id' => $this->client->id,
            ]);

        $response = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos");

        $response->assertStatus(200);
        $series = $response->json('data.0');
        $this->assertEquals(2, $series['proximas_fechas_count']);
        $this->assertTrue($series['requiere_renovacion']);
    }

    public function test_club_owner_can_renew_fixed_series_for_another_6_months(): void
    {
        // Create initial 2 weeks
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 2,
                'precio' => 7500,
                'cliente_id' => $this->client->id,
            ]);

        $this->assertDatabaseCount('turnos', 2);

        // Renew for 26 weeks
        $renewResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos/renovar", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'cliente_id' => $this->client->id,
                'semanas' => 26,
            ]);

        $renewResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cantidad_nuevos' => 26,
            ]);

        // Total should now be 28
        $this->assertDatabaseCount('turnos', 28);
    }

    public function test_club_owner_can_release_single_punctual_date_of_fixed_turno(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 4,
                'cliente_id' => $this->client->id,
            ]);

        $firstTurno = Turno::where('fecha', '2026-09-01')->where('hora_inicio', '19:00')->firstOrFail();
        $nextWeekTurno = Turno::where('fecha', '2026-09-08')->where('hora_inicio', '19:00')->firstOrFail();

        // Release first date only
        $releaseResponse = $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$firstTurno->id}/liberar-fecha");

        $releaseResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Fecha puntual liberada exitosamente. El horario vuelve a estar disponible para reservas.',
            ]);

        // First turno should be cancelled/deleted
        $this->assertDatabaseMissing('turnos', [
            'id' => $firstTurno->id,
            'estado' => 'reservado',
        ]);

        // Next week turno must remain intact
        $this->assertDatabaseHas('turnos', [
            'id' => $nextWeekTurno->id,
            'estado' => 'reservado',
            'es_fijo' => true,
        ]);
    }

    public function test_club_owner_can_cancel_entire_fixed_series(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 4,
                'cliente_id' => $this->client->id,
            ]);

        $this->assertDatabaseCount('turnos', 4);

        // Cancel full future series
        $cancelResponse = $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos/serie", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'cliente_id' => $this->client->id,
            ]);

        $cancelResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'turnos_cancelados' => 4,
            ]);

        $this->assertEquals(0, Turno::where('es_fijo', true)->whereIn('estado', ['reservado', 'confirmado'])->count());
    }

    public function test_register_payment_for_fixed_turno_with_wallet_or_cash(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos", [
                'cancha_id' => $this->cancha->id,
                'dia_semana' => 2,
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'fecha_inicio' => '2026-09-01',
                'semanas' => 1,
                'precio' => 8000,
                'cliente_id' => $this->client->id,
            ]);

        $turno = Turno::where('fecha', '2026-09-01')->firstOrFail();

        // 1. Pay with cash/mostrador
        $payCashResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$turno->id}/registrar-pago", [
                'metodo_pago' => 'mostrador',
                'monto' => 8000,
            ]);

        $payCashResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'estado_pago' => 'pagado',
            ]);

        $this->assertDatabaseHas('turnos', [
            'id' => $turno->id,
            'metodo_pago' => 'mostrador',
            'estado_pago' => 'pagado',
            'monto_pagado' => 8000,
        ]);

        // 2. Test Wallet payment
        $walletService = app(WalletService::class);
        $walletService->acreditar($this->client->id, $this->complejo->id, 10000, 'recarga_manual', null, 'Carga saldo');

        $this->assertEquals(10000, $walletService->obtenerSaldo($this->client->id, $this->complejo->id));

        $payWalletResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$turno->id}/registrar-pago", [
                'metodo_pago' => 'billetera',
                'monto' => 8000,
            ]);

        $payWalletResponse->assertStatus(200);
        $this->assertEquals(2000, $walletService->obtenerSaldo($this->client->id, $this->complejo->id));
    }

    public function test_non_owner_cannot_manage_turnos_fijos(): void
    {
        $otherUser = User::factory()->create();

        $response = $this->actingAs($otherUser, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/turnos-fijos");

        $response->assertStatus(403);
    }

    public function test_club_owner_can_search_registered_users(): void
    {
        User::factory()->create([
            'name' => 'Gonzalo Higuain',
            'email' => 'pipita@test.com',
            'telefono' => '1155667788',
        ]);

        User::factory()->create([
            'name' => 'Sergio Aguero',
            'email' => 'kun@test.com',
            'telefono' => '1199881122',
        ]);

        $response = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/usuarios/buscar?q=pipita");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'name', 'email', 'telefono'],
                ],
            ]);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Gonzalo Higuain', $data[0]['name']);
    }

    public function test_register_payment_updates_disponibilidad_occupied_turnos_status_to_pagado(): void
    {
        // 1. Create a regular reserved turno (pending payment)
        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '11:00',
            'hora_fin' => '12:30',
            'precio' => 8000,
            'cliente_nombre' => 'Cliente Presencial Mostrador',
            'cliente_telefono' => '1133445566',
            'metodo_pago' => 'mostrador',
            'estado_pago' => 'pendiente',
            'monto_pagado' => 0,
            'saldo_pendiente' => 8000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        // 2. Query disponibilidad before payment: should be 'pendiente'
        $dispBefore = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha=2026-09-01", [
                'X-Tenant-ID' => $this->complejo->subdominio,
            ]);

        $dispBefore->assertStatus(200);
        $ocupadosBefore = $dispBefore->json('turnos_ocupados');
        $turnoBefore = collect($ocupadosBefore)->firstWhere('id', $turno->id);
        $this->assertNotNull($turnoBefore);
        $this->assertEquals('pendiente', $turnoBefore['estado_pago']);

        // 3. Register full payment at the desk
        $payResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$turno->id}/registrar-pago", [
                'metodo_pago' => 'mostrador',
                'monto' => 8000,
            ]);

        $payResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'estado_pago' => 'pagado',
                'monto_pagado' => 8000,
                'saldo_pendiente' => 0,
            ]);

        // 4. Query disponibilidad after payment: must return 'pagado' and saldo_pendiente = 0
        $dispAfter = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha=2026-09-01", [
                'X-Tenant-ID' => $this->complejo->subdominio,
            ]);

        $dispAfter->assertStatus(200);
        $ocupadosAfter = $dispAfter->json('turnos_ocupados');
        $turnoAfter = collect($ocupadosAfter)->firstWhere('id', $turno->id);
        $this->assertNotNull($turnoAfter);
        $this->assertEquals('pagado', $turnoAfter['estado_pago']);
        $this->assertEquals(8000, $turnoAfter['monto_pagado']);
        $this->assertEquals(0, $turnoAfter['saldo_pendiente']);
    }
}
