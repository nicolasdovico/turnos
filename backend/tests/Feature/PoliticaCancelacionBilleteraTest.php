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

    public function test_cliente_puede_listar_sus_turnos_con_estado_y_posibilidad_de_cancelar(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

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
            'metodo_pago' => 'online',
            'estado_pago' => 'senado',
            'estado' => 'reservado',
        ]);

        $response = $this->actingAs($this->cliente)
            ->getJson('/api/turnos/mis-turnos');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'fecha',
                    'hora_inicio',
                    'hora_fin',
                    'precio',
                    'monto_pagado',
                    'saldo_pendiente',
                    'estado',
                    'estado_pago',
                    'cancha',
                    'complejo',
                    'horas_restantes',
                    'puede_cancelar',
                    'aplica_reembolso',
                    'limite_horas_cancelacion',
                ],
            ],
            'total',
        ]);

        $this->assertEquals(1, $response->json('total'));
        $this->assertEquals(6000.00, $response->json('data.0.monto_pagado'));
        $this->assertTrue($response->json('data.0.puede_cancelar'));
        $this->assertTrue($response->json('data.0.aplica_reembolso'));
        $this->assertEquals(8, $response->json('data.0.horas_restantes'));

        Carbon::setTestNow();
    }

    public function test_usuario_no_puede_cancelar_turno_ajeno(): void
    {
        $otroCliente = User::factory()->create([
            'name' => 'Otro Usuario',
            'email' => 'otro@usuario.com',
        ]);

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'cliente_nombre' => $this->cliente->name,
            'fecha' => '2026-08-31',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 12000.00,
            'monto_pagado' => 6000.00,
            'saldo_pendiente' => 6000.00,
            'estado' => 'reservado',
        ]);

        $response = $this->actingAs($otroCliente)
            ->postJson("/api/turnos/{$turno->id}/cancelar-cliente");

        $response->assertStatus(403);
        $response->assertJson([
            'error' => 'UNAUTHORIZED',
        ]);
    }

    public function test_cancelar_turno_libera_slot_inmediatamente_en_disponibilidad_y_reporte(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-31 10:00:00', 'America/Argentina/Buenos_Aires'));

        // Configurar horario de atención para el lunes (día 1)
        HorarioAtencion::create([
            'complejo_id' => $this->complejo->id,
            'dia_semana' => 1,
            'hora_apertura' => '08:00:00',
            'hora_cierre' => '23:00:00',
            'duracion_turno_minutos' => 60,
        ]);

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'cliente_nombre' => $this->cliente->name,
            'cliente_email' => $this->cliente->email,
            'fecha' => '2026-08-31',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 12000.00,
            'monto_pagado' => 6000.00,
            'saldo_pendiente' => 6000.00,
            'metodo_pago' => 'online',
            'estado_pago' => 'senado',
            'estado' => 'reservado',
        ]);

        $disponibilidadService = app(\App\Services\DisponibilidadService::class);
        $reporteService = app(\App\Services\ClubReporteService::class);

        // Antes de cancelar: 18:00 está ocupado y reportado en el resumen diario
        $dispAntes = $disponibilidadService->obtenerDisponibilidadCompleta($this->cancha->id, '2026-08-31');
        $slot18Antes = collect($dispAntes['slots'])->firstWhere('hora_inicio', '18:00');
        $this->assertNull($slot18Antes);
        $this->assertTrue(collect($dispAntes['turnos_ocupados'])->contains('id', $turno->id));

        $resumenAntes = $reporteService->obtenerResumenDiario($this->complejo, '2026-08-31', '2026-08-31');
        $this->assertEquals(1, $resumenAntes['kpis']['total_turnos']);

        // El cliente cancela su turno
        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejo->id)
            ->actingAs($this->cliente)
            ->postJson("/api/turnos/{$turno->id}/cancelar-cliente");

        $response->assertStatus(200);

        // Después de cancelar: 18:00 debe figurar como disponible en los slots y fuera de turnos_ocupados
        $dispDespues = $disponibilidadService->obtenerDisponibilidadCompleta($this->cancha->id, '2026-08-31');
        $slot18Despues = collect($dispDespues['slots'])->firstWhere('hora_inicio', '18:00');
        $this->assertNotNull($slot18Despues);
        $this->assertTrue($slot18Despues['disponible']);
        $this->assertFalse(collect($dispDespues['turnos_ocupados'])->contains('id', $turno->id));

        // En el resumen diario del club para el administrador ya no debe figurar como turno ocupado
        $resumenDespues = $reporteService->obtenerResumenDiario($this->complejo, '2026-08-31', '2026-08-31');
        $this->assertEquals(0, $resumenDespues['kpis']['total_turnos']);

        Carbon::setTestNow();
    }

    public function test_turnos_cancelados_por_admin_con_devolucion_efectivo_no_figuran_como_activos_para_el_cliente(): void
    {
        $owner = User::factory()->create();
        $this->complejo->update(['user_id' => $owner->id]);

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $this->cliente->id,
            'cliente_nombre' => $this->cliente->name,
            'cliente_email' => $this->cliente->email,
            'fecha' => '2026-09-14',
            'hora_inicio' => '11:00',
            'hora_fin' => '12:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'saldo_pendiente' => 0.00,
            'metodo_pago' => 'online',
            'estado_pago' => 'pagado_total',
            'estado' => 'reservado',
        ]);

        // El administrador anula el turno con reembolso en efectivo
        $responseAdmin = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$turno->id}/cancelar", [
                'accion_reembolso' => 'efectivo',
            ]);

        $responseAdmin->assertStatus(200);

        $turno->refresh();
        $this->assertEquals('cancelado', $turno->estado);
        $this->assertEquals('reembolsado', $turno->estado_pago);
        $this->assertEquals(0.00, (float) $turno->saldo_pendiente);

        // Al consultar turnos activos del cliente, el turno cancelado no debe figurar como activo
        $resActivos = $this->actingAs($this->cliente, 'sanctum')
            ->getJson('/api/turnos/mis-turnos?estado=activos');

        $resActivos->assertStatus(200);
        $this->assertCount(0, $resActivos->json('data'));

        // Disponibilidad de la cancha debe tener el slot disponible y no en turnos_ocupados
        $dispService = app(\App\Services\DisponibilidadService::class);
        $disp = $dispService->obtenerDisponibilidadCompleta($this->cancha->id, '2026-09-14', 60, false, $this->cliente->id);
        $this->assertFalse(collect($disp['turnos_ocupados'])->contains('id', $turno->id));
    }
}

