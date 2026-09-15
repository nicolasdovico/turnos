<?php

namespace Tests\Feature;

use App\Jobs\NotificarListaEsperaJob;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\ListaEspera;
use App\Models\Plan;
use App\Models\User;
use App\Services\FCMNotificationService;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Mockery;
use Tests\TestCase;

class ListaEsperaTest extends TestCase
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
            'nombre' => 'Club Padel Waitlist',
            'subdominio' => 'padelwaitlist',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
            'timezone' => 'America/Argentina/Buenos_Aires',
        ]);

        app()->instance('currentTenant', $this->complejo);

        $this->cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha Central',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => true,
            'precio_base' => 15000.00,
            'estado' => 'activo',
        ]);

        $this->cliente = User::factory()->create([
            'name' => 'Lionel Scaloni',
            'email' => 'scaloni@afa.com.ar',
            'telefono' => '1133445566',
            'fcm_token' => 'fcm_token_scaloni_123',
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        Mockery::close();
        parent::tearDown();
    }

    public function test_suscribir_y_desuscribir_lista_espera(): void
    {
        // 1. Suscribirse a un horario ocupado
        $response = $this->actingAs($this->cliente)
            ->postJson('/api/lista-espera', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-09-01',
                'hora_inicio' => '19:00',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('lista_espera', [
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '19:00:00',
            'user_id' => $this->cliente->id,
            'notificado' => false,
        ]);

        // 2. Consultar mis suscripciones
        $resMisSuscripciones = $this->actingAs($this->cliente)
            ->getJson('/api/lista-espera/mis-suscripciones');

        $resMisSuscripciones->assertStatus(200);
        $this->assertCount(1, $resMisSuscripciones->json('suscripciones'));

        // 3. Desuscribirse
        $resDesuscribir = $this->actingAs($this->cliente)
            ->deleteJson('/api/lista-espera', [
                'cancha_id' => $this->cancha->id,
                'fecha' => '2026-09-01',
                'hora_inicio' => '19:00',
            ]);

        $resDesuscribir->assertStatus(200);
        $this->assertDatabaseMissing('lista_espera', [
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '19:00:00',
            'user_id' => $this->cliente->id,
        ]);
    }

    public function test_notificar_lista_espera_job_envia_push_fcm_y_marca_notificado(): void
    {
        // Crear suscripción
        $suscripcion = ListaEspera::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-01',
            'hora_inicio' => '20:00',
            'hora_fin' => '21:00',
            'user_id' => $this->cliente->id,
            'notificado' => false,
        ]);

        // Mock FCMNotificationService
        $mockNotification = Mockery::mock(FCMNotificationService::class);
        $mockNotification->shouldReceive('sendPushNotification')
            ->once()
            ->with(
                'fcm_token_scaloni_123',
                Mockery::pattern('/Turno Disponible/i'),
                Mockery::pattern('/20:00/i'),
                Mockery::type('array')
            )
            ->andReturn([]);

        $this->app->instance(FCMNotificationService::class, $mockNotification);

        // Ejecutar el Job
        $job = new NotificarListaEsperaJob($this->cancha->id, '2026-09-01', '20:00', '21:00');
        $job->handle();

        // Verificar que la suscripción quedó notificada
        $suscripcion->refresh();
        $this->assertTrue($suscripcion->notificado);
    }

    public function test_notificar_lista_espera_envia_email_y_whatsapp_via_evolution(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $suscripcion = ListaEspera::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-02',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'user_id' => $this->cliente->id,
            'notificado' => false,
        ]);

        $mockWhatsApp = Mockery::mock(\App\Services\WhatsAppEvolutionService::class);
        $mockWhatsApp->shouldReceive('enviarMensajeTurnoLiberado')
            ->once()
            ->with(
                Mockery::on(fn ($u) => $u->id === $this->cliente->id),
                Mockery::on(fn ($c) => $c->id === $this->cancha->id),
                '2026-09-02',
                '18:00',
                '19:00'
            )
            ->andReturn(true);

        $this->app->instance(\App\Services\WhatsAppEvolutionService::class, $mockWhatsApp);

        $job = new NotificarListaEsperaJob($this->cancha->id, '2026-09-02', '18:00', '19:00');
        $job->handle();

        \Illuminate\Support\Facades\Mail::assertSent(\App\Mail\TurnoLiberadoMail::class, function ($mail) {
            return $mail->hasTo($this->cliente->email);
        });

        $suscripcion->refresh();
        $this->assertTrue($suscripcion->notificado);
    }

    public function test_admin_cancelar_turno_despacha_notificar_lista_espera_job(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $owner = User::factory()->create();
        $this->complejo->user_id = $owner->id;
        $this->complejo->save();

        $turno = \App\Models\Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-03',
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'precio' => 10000,
            'estado' => 'reservado',
            'estado_pago' => 'pendiente',
        ]);

        $response = $this->actingAs($owner)
            ->deleteJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$turno->id}");

        $response->assertStatus(200);

        \Illuminate\Support\Facades\Queue::assertPushed(NotificarListaEsperaJob::class, function ($job) use ($turno) {
            return $job->canchaId === $turno->cancha_id && $job->fecha === '2026-09-03' && $job->horaInicio === '19:00';
        });
    }

    public function test_admin_liberar_fecha_puntual_despacha_notificar_lista_espera_job(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $owner = User::factory()->create();
        $this->complejo->user_id = $owner->id;
        $this->complejo->save();

        $turno = \App\Models\Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'fecha' => '2026-09-04',
            'hora_inicio' => '21:00',
            'hora_fin' => '22:00',
            'precio' => 12000,
            'estado' => 'reservado',
            'estado_pago' => 'pendiente',
            'es_fijo' => true,
        ]);

        $response = $this->actingAs($owner)
            ->deleteJson("/api/clubs/{$this->complejo->subdominio}/turnos/{$turno->id}/liberar-fecha");

        $response->assertStatus(200);

        \Illuminate\Support\Facades\Queue::assertPushed(NotificarListaEsperaJob::class, function ($job) use ($turno) {
            return $job->canchaId === $turno->cancha_id && $job->fecha === '2026-09-04' && $job->horaInicio === '21:00';
        });
    }
}
