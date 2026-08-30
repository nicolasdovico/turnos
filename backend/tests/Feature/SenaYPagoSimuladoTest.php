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
}
