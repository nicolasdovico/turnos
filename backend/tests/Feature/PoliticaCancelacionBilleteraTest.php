<?php

namespace Tests\Feature;

use App\Jobs\NotificarListaEsperaJob;
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
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class PoliticaCancelacionBilleteraTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected Cancha $cancha;
    protected User $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();
        Queue::fake();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejo = Complejo::create([
            'nombre' => 'Club Padel Cancelaciones',
            'subdominio' => 'padelcancel',
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
            'nombre' => 'Cancha 2 Cristal',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => true,
            'precio_base' => 12000.00,
            'estado' => 'activo',
        ]);

        $this->cliente = User::factory()->create([
            'name' => 'Agustin Canapino',
            'email' => 'canapino@indycar.com',
            'telefono' => '1199887766',
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    public function test_cancelar_turno_con_mas_de_4_horas_acredita_reembolso_en_billetera_y_despacha_job_espera(): void
    {
        // Simular que son las 10:00 AM del 31 de agosto
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        // Turno a las 18:00 (restan 8 horas, > 4 horas límite)
        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'cliente_nombre' => $this->cliente->name,
            'cliente_telefono' => $this->cliente->telefono,
            'fecha' => '2026-08-31',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 12000.00,
            'monto_pagado' => 6000.00,
            'saldo_pendiente' => 6000.00,
            'metodo_pago' => 'simulador_dev',
            'estado_pago' => 'senado',
            'estado' => 'reservado',
        ]);

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson("/api/turnos/{$turno->id}/cancelar-cliente");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'reembolso_acreditado' => true,
            'monto_reembolsado' => 6000.00,
        ]);

        // Verificar que el saldo de la billetera del cliente aumentó en $6000
        $walletService = app(WalletService::class);
        $this->assertEquals(6000.00, $walletService->obtenerSaldo($this->cliente->id, $this->complejo->id));

        // Verificar que el estado del turno cambió a cancelado
        $turno->refresh();
        $this->assertEquals('cancelado', $turno->estado);
        $this->assertEquals('reembolsado', $turno->estado_pago);

        // Verificar que se despachó el job para notificar a la lista de espera
        Queue::assertPushed(NotificarListaEsperaJob::class, function ($job) use ($turno) {
            return $job->canchaId === $turno->cancha_id && $job->horaInicio === '18:00';
        });

        Carbon::setTestNow();
    }

    public function test_cancelar_turno_con_menos_de_4_horas_retiene_sena_sin_reembolso_a_billetera(): void
    {
        // Simular que son las 16:30 del 31 de agosto
        Carbon::setTestNow(Carbon::parse('2026-08-31 16:30:00', 'America/Argentina/Buenos_Aires'));

        // Turno a las 18:00 (restan 1.5 horas, < 4 horas límite)
        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'cliente_nombre' => $this->cliente->name,
            'cliente_telefono' => $this->cliente->telefono,
            'fecha' => '2026-08-31',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 12000.00,
            'monto_pagado' => 6000.00,
            'saldo_pendiente' => 6000.00,
            'metodo_pago' => 'simulador_dev',
            'estado_pago' => 'senado',
            'estado' => 'reservado',
        ]);

        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson("/api/turnos/{$turno->id}/cancelar-cliente");

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'reembolso_acreditado' => false,
            'monto_reembolsado' => 0.0,
        ]);

        // Verificar que NO se acreditó saldo en la billetera
        $walletService = app(WalletService::class);
        $this->assertEquals(0.00, $walletService->obtenerSaldo($this->cliente->id, $this->complejo->id));

        // Verificar que el estado del turno es cancelado y la seña retenida
        $turno->refresh();
        $this->assertEquals('cancelado', $turno->estado);
        $this->assertEquals('retenido_penalidad', $turno->estado_pago);

        // Aún así se despacha la notificación a la lista de espera para reocupar el turno
        Queue::assertPushed(NotificarListaEsperaJob::class);

        Carbon::setTestNow();
    }
}
