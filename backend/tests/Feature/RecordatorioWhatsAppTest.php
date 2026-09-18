<?php

namespace Tests\Feature;

use App\Jobs\EnviarRecordatorioWhatsAppJob;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Turno;
use App\Models\User;
use App\Services\WhatsAppEvolutionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class RecordatorioWhatsAppTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Fijar tiempo determinístico para pruebas en horario de Argentina
        Carbon::setTestNow(Carbon::parse('2026-09-18 10:00:00', 'America/Argentina/Buenos_Aires'));

        // Mockear respuestas de Evolution API para llamadas salientes HTTP
        Http::fake([
            '*/message/sendText/*' => Http::response([
                'status' => 'PENDING',
                'key' => ['id' => 'MSG_EVOLUTION_TEST_123'],
            ], 201),
            '*' => Http::response(['status' => 'OK'], 200),
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function crearComplejoYAdmin(string $subdominio = 'club-test', array $atributos = []): array
    {
        $admin = User::factory()->create([
            'email' => "admin@{$subdominio}.com",
            'telefono' => '1199887766',
        ]);

        $complejo = Complejo::create(array_merge([
            'nombre' => 'Club Deportivo Test',
            'subdominio' => $subdominio,
            'user_id' => $admin->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
            'recordatorio_whatsapp_activo' => true,
            'recordatorio_anticipacion_minutos' => 120,
            'tipo_cobro_reserva' => 'sena',
            'porcentaje_sena' => 50,
        ], $atributos));

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1 Panorámica',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'techada' => true,
            'precio_base' => 10000,
            'estado' => 'activo',
        ]);

        return [$admin, $complejo, $cancha];
    }

    public function test_job_enviar_recordatorio_whatsapp_despacha_mensaje_correctamente(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('padel-recordatorio');

        $cliente = User::factory()->create([
            'name' => 'Carlos Pádel',
            'telefono' => '1144556677',
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:30',
            'precio' => 10000,
            'monto_pagado' => 5000,
            'saldo_pendiente' => 5000,
            'estado' => 'reservado',
            'estado_pago' => 'senado',
            'es_fijo' => false,
        ]);

        $whatsAppService = new WhatsAppEvolutionService();
        $job = new EnviarRecordatorioWhatsAppJob($turno);
        $res = $job->handle($whatsAppService);

        $this->assertEquals('sent', $res['status']);
        $this->assertEquals($turno->id, $res['turno_id']);
        $this->assertNotNull($turno->fresh()->recordatorio_enviado_at);
    }

    public function test_job_enviar_recordatorio_omite_si_ya_fue_enviado(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('padel-idempotente');

        $cliente = User::factory()->create([
            'telefono' => '1144556677',
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:30',
            'precio' => 10000,
            'estado' => 'reservado',
            'recordatorio_enviado_at' => Carbon::now()->subMinutes(30),
            'es_fijo' => false,
        ]);

        $whatsAppService = new WhatsAppEvolutionService();
        $job = new EnviarRecordatorioWhatsAppJob($turno);
        $res = $job->handle($whatsAppService);

        $this->assertEquals('skipped', $res['status']);
        $this->assertEquals('ALREADY_SENT', $res['reason']);
    }

    public function test_job_enviar_recordatorio_omite_si_no_tiene_telefono(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('padel-sin-tel');

        $cliente = User::factory()->create([
            'telefono' => null,
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'cliente_telefono' => null,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:30',
            'precio' => 10000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        $whatsAppService = new WhatsAppEvolutionService();
        $job = new EnviarRecordatorioWhatsAppJob($turno);
        $res = $job->handle($whatsAppService);

        $this->assertEquals('skipped', $res['status']);
        $this->assertEquals('NO_PHONE', $res['reason']);
    }

    public function test_job_enviar_recordatorio_omite_turno_cancelado(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('padel-cancelado');

        $cliente = User::factory()->create([
            'telefono' => '1144556677',
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:30',
            'precio' => 10000,
            'estado' => 'cancelado',
            'es_fijo' => false,
        ]);

        $whatsAppService = new WhatsAppEvolutionService();
        $job = new EnviarRecordatorioWhatsAppJob($turno);
        $res = $job->handle($whatsAppService);

        $this->assertEquals('skipped', $res['status']);
        $this->assertEquals('TURNO_CANCELLED', $res['reason']);
    }

    public function test_command_turnos_enviar_recordatorios_selecciona_turnos_en_ventana(): void
    {
        Queue::fake();

        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-ventana', [
            'recordatorio_whatsapp_activo' => true,
            'recordatorio_anticipacion_minutos' => 120,
        ]);

        $cliente = User::factory()->create(['telefono' => '1122334455']);

        // Turno 1: A las 12:00 de hoy (en 120 minutos desde 10:00) -> DEBE despachar
        $turnoEnVentana = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
            'precio' => 8000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        // Turno 2: A las 18:00 de hoy (muy lejos, 8 horas) -> NO debe despachar
        $turnoLejano = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 8000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        // Turno 3: A las 12:00 pero ya con recordatorio enviado -> NO debe despachar
        $turnoYaEnviado = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
            'precio' => 8000,
            'estado' => 'reservado',
            'recordatorio_enviado_at' => Carbon::now()->subMinutes(60),
            'es_fijo' => false,
        ]);

        $this->artisan('turnos:enviar-recordatorios', ['--momento' => '2026-09-18 10:00:00'])
            ->expectsOutputToContain('Iniciando escaneo de recordatorios')
            ->expectsOutputToContain('Total de recordatorios despachados: 1')
            ->assertExitCode(0);

        Queue::assertPushed(EnviarRecordatorioWhatsAppJob::class, function ($job) use ($turnoEnVentana) {
            return $job->turno->id === $turnoEnVentana->id;
        });

        Queue::assertNotPushed(EnviarRecordatorioWhatsAppJob::class, function ($job) use ($turnoLejano) {
            return $job->turno->id === $turnoLejano->id;
        });

        Queue::assertNotPushed(EnviarRecordatorioWhatsAppJob::class, function ($job) use ($turnoYaEnviado) {
            return $job->turno->id === $turnoYaEnviado->id;
        });

        $this->assertNotNull($turnoEnVentana->fresh()->recordatorio_enviado_at);
    }

    public function test_command_despacha_job_que_ejecuta_envio_correctamente_sin_ser_omitido(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-e2e', [
            'recordatorio_whatsapp_activo' => true,
            'recordatorio_anticipacion_minutos' => 120,
        ]);

        $cliente = User::factory()->create(['telefono' => '1155443322']);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
            'precio' => 8000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        // Ejecutar el comando (simulando 10:00)
        $this->artisan('turnos:enviar-recordatorios', ['--momento' => '2026-09-18 10:00:00'])
            ->assertExitCode(0);

        // El turno fue marcado preventivamente al encolar
        $this->assertNotNull($turno->fresh()->recordatorio_enviado_at);

        // El Job encolado con despachadoPorComando = true debe ejecutarse y enviar el mensaje
        $job = new EnviarRecordatorioWhatsAppJob($turno->fresh(), true);
        $res = $job->handle(app(WhatsAppEvolutionService::class));

        $this->assertEquals('sent', $res['status']);
        $this->assertEquals($turno->id, $res['turno_id']);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/message/sendText/') &&
                   str_contains($request->body(), '5491155443322');
        });
    }

    public function test_command_ignora_complejos_con_recordatorio_desactivado(): void
    {
        Queue::fake();

        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-desactivado', [
            'recordatorio_whatsapp_activo' => false,
            'recordatorio_anticipacion_minutos' => 120,
        ]);

        $cliente = User::factory()->create(['telefono' => '1122334455']);

        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
            'precio' => 8000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        $this->artisan('turnos:enviar-recordatorios', ['--momento' => '2026-09-18 10:00:00'])
            ->assertExitCode(0);

        Queue::assertNothingPushed();
    }

    public function test_endpoint_enviar_recordatorio_manual(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-manual');

        $cliente = User::factory()->create(['name' => 'Lucas Pádel', 'telefono' => '1133221100']);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '16:00',
            'hora_fin' => '17:30',
            'precio' => 10000,
            'monto_pagado' => 5000,
            'saldo_pendiente' => 5000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/clubs/{$complejo->subdominio}/turnos/{$turno->id}/enviar-recordatorio");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertStringContainsString('Recordatorio enviado exitosamente', $response->json('message'));
        $this->assertNotNull($turno->fresh()->recordatorio_enviado_at);
    }

    public function test_endpoint_enviar_recordatorio_falla_si_no_es_admin(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-seguridad');

        $otroUsuario = User::factory()->create();
        $token = $otroUsuario->createToken('otro_token')->plainTextToken;

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'fecha' => '2026-09-18',
            'hora_inicio' => '16:00',
            'hora_fin' => '17:30',
            'precio' => 10000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/clubs/{$complejo->subdominio}/turnos/{$turno->id}/enviar-recordatorio");

        $response->assertStatus(403);
    }

    public function test_actualizar_configuracion_recordatorio_en_dashboard(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-config');

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/clubs/{$complejo->subdominio}/configuracion", [
                'tipo_cobro_reserva' => 'total',
                'porcentaje_sena' => 100,
                'horas_limite_cancelacion' => 6,
                'permite_mostrador_publico' => false,
                'hora_inicio_luz' => '20:00',
                'recordatorio_whatsapp_activo' => false,
                'recordatorio_anticipacion_minutos' => 60,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'complejo' => [
                    'recordatorio_whatsapp_activo' => false,
                    'recordatorio_anticipacion_minutos' => 60,
                ],
            ]);

        $complejoActualizado = $complejo->fresh();
        $this->assertFalse($complejoActualizado->recordatorio_whatsapp_activo);
        $this->assertEquals(60, $complejoActualizado->recordatorio_anticipacion_minutos);
    }

    public function test_formateo_numeros_telefono_sin_codigo_pais_o_sin_signo_mas(): void
    {
        [$admin, $complejo, $cancha] = $this->crearComplejoYAdmin('club-format-test');

        $casos = [
            '11 4455-6677' => '5491144556677',
            '011 4455-6677' => '5491144556677',
            '11 15 4455-6677' => '5491144556677',
            '15 4455-6677' => '5491144556677',
            '341 456 7890' => '5493414567890',
            '0341 15 456 7890' => '5493414567890',
            '223 456 7890' => '5492234567890',
            '54 11 4455 6677' => '5491144556677',
            '+54 9 11 4455 6677' => '5491144556677',
            '598 99 123 456' => '59899123456',
        ];

        $service = new WhatsAppEvolutionService();

        foreach ($casos as $input => $esperado) {
            $turno = Turno::create([
                'complejo_id' => $complejo->id,
                'cancha_id' => $cancha->id,
                'cliente_telefono' => $input,
                'cliente_nombre' => 'Test Jugador',
                'fecha' => '2026-09-18',
                'hora_inicio' => '19:00',
                'hora_fin' => '20:30',
                'precio' => 10000,
                'estado' => 'reservado',
                'es_fijo' => false,
            ]);

            $enviado = $service->enviarRecordatorioTurno($turno);
            $this->assertTrue($enviado);

            Http::assertSent(function ($request) use ($esperado) {
                return isset($request['number']) && $request['number'] === $esperado;
            });
        }
    }
}
