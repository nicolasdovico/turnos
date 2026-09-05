<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\WalletService;
use Carbon\Carbon;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class SenaYPagoSimuladoTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected Cancha $cancha;
    protected User $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejo = Complejo::create([
            'nombre' => 'Club Padel Señas',
            'subdominio' => 'padelseñas',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
            'timezone' => 'America/Argentina/Buenos_Aires',
            'tipo_cobro_reserva' => 'sena',
            'porcentaje_sena' => 50.00,
            'horas_limite_cancelacion' => 4,
        ]);

        app()->instance('currentTenant', $this->complejo);

        $this->cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 1 Pro',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => true,
            'precio_base' => 10000.00,
            'estado' => 'activo',
        ]);

        HorarioAtencion::create([
            'complejo_id' => $this->complejo->id,
            'dia_semana' => 1, // Lunes
            'hora_apertura' => '08:00',
            'hora_cierre' => '23:00',
            'duracion_turno_minutos' => 60,
        ]);

        $this->cliente = User::factory()->create([
            'name' => 'Franco Colapinto',
            'email' => 'franco@williams.com',
            'telefono' => '1122334455',
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    public function test_confirmar_reserva_con_simulador_dev_calcula_sena_del_50_porciento(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '19:00',
                'precio' => 10000.00,
                'metodo_pago' => 'simulador_dev',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'monto_pagado' => '5000.00',
                'saldo_pendiente' => '5000.00',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
            ],
        ]);

        $this->assertDatabaseHas('turnos', [
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-08-31',
            'hora_inicio' => '19:00:00',
            'monto_pagado' => 5000.00,
            'saldo_pendiente' => 5000.00,
            'estado_pago' => 'senado',
        ]);

        Carbon::setTestNow();
    }

    public function test_confirmar_reserva_con_billetera_virtual_debitando_saldo(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        // Acreditar $5000 a la billetera virtual del cliente en este complejo
        $walletService = app(WalletService::class);
        $walletService->acreditar($this->cliente->id, $this->complejo->id, 5000.00, 'ajuste_manual');

        $this->assertEquals(5000.00, $walletService->obtenerSaldo($this->cliente->id, $this->complejo->id));

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '20:00',
                'precio' => 10000.00,
                'metodo_pago' => 'wallet_credito',
                'aplicar_credito_wallet' => true,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'monto_pagado' => '5000.00',
                'saldo_pendiente' => '5000.00',
                'estado_pago' => 'senado',
            ],
        ]);

        // El saldo de la billetera debe haber quedado en 0
        $this->assertEquals(0.00, $walletService->obtenerSaldo($this->cliente->id, $this->complejo->id));

        // Debe registrarse el movimiento en wallet_movimientos
        $this->assertDatabaseHas('wallet_movimientos', [
            'user_id' => $this->cliente->id,
            'complejo_id' => $this->complejo->id,
            'tipo' => 'uso_reserva',
            'monto' => -5000.00,
        ]);

        Carbon::setTestNow();
    }

    public function test_consultar_saldo_billetera_endpoint(): void
    {
        $walletService = app(WalletService::class);
        $walletService->acreditar($this->cliente->id, $this->complejo->id, 7500.00, 'reembolso_cancelacion');

        $response = $this->actingAs($this->cliente)
            ->getJson("/api/wallet/saldo?complejo_id={$this->complejo->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'saldo' => 7500.00,
            'saldo_formateado' => '$7.500,00',
        ]);
    }

    public function test_confirmar_reserva_con_metodo_online_calcula_sena_del_50_porciento_y_libera_lock(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        // Simular un bloqueo previo en Redis
        $lockKey = "lock:cancha:{$this->cancha->id}:2026-08-31:21:00";
        Redis::setex($lockKey, 600, json_encode([
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-08-31',
            'hora_inicio' => '21:00',
            'hora_fin' => '22:00',
            'token' => 'test-token-123',
            'user_id' => $this->cliente->id,
        ]));

        $this->assertNotEmpty(Redis::get($lockKey));

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '21:00',
                'precio' => 10000.00,
                'metodo_pago' => 'online',
                'token_reserva' => 'test-token-123',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'monto_pagado' => '5000.00',
                'saldo_pendiente' => '5000.00',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
                'metodo_pago' => 'online',
            ],
        ]);

        // El candado en Redis debe haberse eliminado
        $this->assertEmpty(Redis::get($lockKey));

        // Al consultar disponibilidad como el cliente, el turno ocupado debe incluir is_mine = true
        $dispResponse = $this->actingAs($this->cliente)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha=2026-08-31");

        $dispResponse->assertStatus(200);
        $turnosOcupados = $dispResponse->json('turnos_ocupados');
        $this->assertNotEmpty($turnosOcupados);
        $miTurno = collect($turnosOcupados)->firstWhere('hora_inicio', '21:00');
        $this->assertNotNull($miTurno);
        $this->assertTrue($miTurno['is_mine']);
        $this->assertEquals('senado', $miTurno['estado_pago']);
        $this->assertEquals(5000.0, (float) $miTurno['monto_pagado']);

        Carbon::setTestNow();
    }

    public function test_cliente_online_no_puede_reservar_con_metodo_pago_mostrador(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '22:00',
                'precio' => 10000.00,
                'metodo_pago' => 'mostrador',
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'METODO_PAGO_INVALIDO',
        ]);

        $this->assertDatabaseMissing('turnos', [
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-08-31',
            'hora_inicio' => '22:00:00',
        ]);

        Carbon::setTestNow();
    }

    public function test_cliente_online_sin_especificar_metodo_pago_defaultea_a_online_con_sena(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '22:00',
                'precio' => 10000.00,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'metodo_pago' => 'online',
                'monto_pagado' => '5000.00',
                'saldo_pendiente' => '5000.00',
                'estado_pago' => 'senado',
            ],
        ]);

        Carbon::setTestNow();
    }

    public function test_admin_club_si_puede_confirmar_en_mostrador(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $adminUser = User::factory()->create([
            'email' => 'admin@club.test',
        ]);
        $this->complejo->update(['user_id' => $adminUser->id]);

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($adminUser)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '22:00',
                'precio' => 10000.00,
                'metodo_pago' => 'mostrador',
                'cliente_nombre' => 'Jugador Mostrador',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'metodo_pago' => 'mostrador',
                'monto_pagado' => '10000.00',
                'saldo_pendiente' => '0.00',
                'estado_pago' => 'pagado_total',
            ],
        ]);

        Carbon::setTestNow();
    }

    public function test_confirmar_reserva_con_simulador_dev_permitiendo_elegir_pago_total_del_100_porciento(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '23:00',
                'precio' => 10000.00,
                'metodo_pago' => 'simulador_dev',
                'modalidad_pago' => 'total',
                'pago_completo' => true,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'metodo_pago' => 'simulador_dev',
                'monto_pagado' => '10000.00',
                'saldo_pendiente' => '0.00',
                'estado_pago' => 'pagado_total',
                'estado' => 'reservado',
            ],
        ]);

        $this->assertDatabaseHas('turnos', [
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-08-31',
            'hora_inicio' => '23:00:00',
            'monto_pagado' => 10000.00,
            'saldo_pendiente' => 0.00,
            'estado_pago' => 'pagado_total',
        ]);

        Carbon::setTestNow();
    }

    public function test_disponibilidad_retorna_politicas_de_pago_y_sena(): void
    {
        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha=2026-08-31");

        $response->assertStatus(200);
        $response->assertJson([
            'tipo_cobro_reserva' => 'sena',
            'porcentaje_sena' => 50.0,
        ]);
    }

    public function test_cancha_90_minutos_precio_base_no_se_multiplica_por_1_5(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 08:00:00', 'America/Argentina/Buenos_Aires'));

        // Cancha configurada a 90 minutos fija con precio base $10000
        $cancha90 = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 1 - Central Cristal 90m',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 10000.00,
            'duracion_minutos' => 90,
            'permite_duracion_flexible' => false,
            'precio_90_min' => null,
            'estado' => 'activo',
        ]);

        // Verificar endpoint de disponibilidad
        $responseDisp = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->getJson("/api/canchas/{$cancha90->id}/disponibilidad?fecha=2026-08-31");

        $responseDisp->assertStatus(200);
        $responseDisp->assertJsonPath('precio_base', 10000);
        $responseDisp->assertJsonPath('precio_90_min', 10000); // No debe ser 15000!

        $slots = $responseDisp->json('slots_disponibles');
        $this->assertNotEmpty($slots);
        $this->assertEquals(90, $slots[0]['duracion_minutos']);
        $this->assertEquals(10000, $slots[0]['precio']); // No debe ser 15000!

        // Confirmar reserva pagando seña (50%)
        $horaInicio = $slots[0]['hora_inicio'];
        $horaFin = $slots[0]['hora_fin'];

        $responseConfirmar = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $cancha90->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'precio' => $slots[0]['precio'],
                'metodo_pago' => 'simulador_dev',
                'modalidad_pago' => 'sena',
            ]);

        $responseConfirmar->assertStatus(200);
        $responseConfirmar->assertJson([
            'success' => true,
            'turno' => [
                'precio' => '10000.00',
                'monto_pagado' => '5000.00',
                'saldo_pendiente' => '5000.00',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
            ],
        ]);

        Carbon::setTestNow();
    }

    public function test_admin_club_puede_elegir_no_cobrar_sena_con_modalidad_ninguno_dejando_pago_pendiente(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $adminUser = User::factory()->create([
            'email' => 'admin_flex@club.test',
        ]);
        $this->complejo->update(['user_id' => $adminUser->id]);

        // El empleado elige modalidad online o mostrador, pero modalidad_pago = ninguno (sin cobro)
        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($adminUser)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '21:00',
                'precio' => 10000.00,
                'metodo_pago' => 'online',
                'modalidad_pago' => 'ninguno',
                'cliente_nombre' => 'Amigo del Club',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'precio' => '10000.00',
                'monto_pagado' => '0.00',
                'saldo_pendiente' => '10000.00',
                'estado_pago' => 'pendiente',
                'metodo_pago' => 'pendiente',
                'estado' => 'reservado',
            ],
        ]);

        Carbon::setTestNow();
    }

    public function test_admin_club_puede_cobrar_sena_en_mostrador_dejando_saldo_pendiente(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $adminUser = User::factory()->create([
            'email' => 'admin_sena@club.test',
        ]);
        $this->complejo->update(['user_id' => $adminUser->id]);

        // El empleado cobra seña (50%) en efectivo en mostrador
        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($adminUser)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '22:00',
                'precio' => 10000.00,
                'metodo_pago' => 'mostrador',
                'modalidad_pago' => 'sena',
                'cliente_nombre' => 'Cliente Seña Mostrador',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'turno' => [
                'precio' => '10000.00',
                'monto_pagado' => '5000.00',
                'saldo_pendiente' => '5000.00',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
            ],
        ]);

        Carbon::setTestNow();
    }

    public function test_disponibilidad_admin_retorna_saldo_billetera_del_cliente_ocupado(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        $adminUser = User::factory()->create([
            'email' => 'admin_wallet_check@club.test',
        ]);
        $this->complejo->update(['user_id' => $adminUser->id]);

        // Acreditar saldo en billetera al cliente
        $walletService = app(\App\Services\WalletService::class);
        $walletService->acreditar($this->cliente->id, $this->complejo->id, 3500.0, 'recarga_manual', null, 'Saldo de prueba');

        // Crear turno ocupado asignado al cliente
        \App\Models\Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'cliente_nombre' => $this->cliente->name,
            'fecha' => '2026-08-31',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 10000.0,
            'monto_pagado' => 5000.0,
            'saldo_pendiente' => 5000.0,
            'metodo_pago' => 'online',
            'estado_pago' => 'senado',
            'estado' => 'reservado',
        ]);

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($adminUser)
            ->getJson("/api/canchas/{$this->cancha->id}/disponibilidad?fecha=2026-08-31");

        $response->assertStatus(200);
        $turnosOcupados = $response->json('turnos_ocupados');
        $this->assertNotEmpty($turnosOcupados);

        $turno = collect($turnosOcupados)->firstWhere('hora_inicio', '18:00');
        $this->assertNotNull($turno);
        $this->assertEquals(3500.0, $turno['cliente_saldo_billetera']);

        Carbon::setTestNow();
    }
}

