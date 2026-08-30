<?php

namespace Tests\Feature;

use App\Jobs\NotificarListaEsperaJob;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\ListaEspera;
use App\Models\Plan;
use App\Models\User;
use App\Services\NotificationService;
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

        // Mock NotificationService
        $mockNotification = Mockery::mock(NotificationService::class);
        $mockNotification->shouldReceive('sendPushNotification')
            ->once()
            ->with(
                'fcm_token_scaloni_123',
                Mockery::pattern('/Turno Disponible/i'),
                Mockery::pattern('/20:00/i'),
                Mockery::type('array')
            )
            ->andReturn(true);

        $this->app->instance(NotificationService::class, $mockNotification);

        // Ejecutar el Job
        $job = new NotificarListaEsperaJob($this->cancha->id, '2026-09-01', '20:00', '21:00');
        $job->handle();

        // Verificar que la suscripción quedó notificada
        $suscripcion->refresh();
        $this->assertTrue($suscripcion->notificado);
    }
}
