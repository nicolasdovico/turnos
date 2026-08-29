<?php

namespace Tests\Feature;

use App\Jobs\EnviarRecordatorioTurnoJob;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Turno;
use App\Models\User;
use App\Services\FCMNotificationService;
use App\Services\GeolocationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class GeolocationAndNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_haversine_formula_calculates_accurate_distance(): void
    {
        $geoService = new GeolocationService();

        // Obelisco Buenos Aires (-34.6037, -58.3816) a Monumental River Plate (-34.5453, -58.4498) -> aprox 9.0 km
        $distancia = $geoService->calcularDistanciaHaversine(-34.6037, -58.3816, -34.5453, -58.4498);

        $this->assertGreaterThan(8.5, $distancia);
        $this->assertLessThan(9.5, $distancia);
    }

    public function test_buscar_complejos_cercanos_filtra_por_radio_y_ordena_por_distancia(): void
    {
        // Complejo 1: Cerca (2.5 km de -34.6000, -58.3800) -> Palermo
        $complejoCercano = Complejo::create([
            'nombre' => 'Padel Palermo Club',
            'subdominio' => 'palermopadel',
            'latitud' => -34.5800,
            'longitud' => -58.4000,
            'estado' => 'activo',
        ]);

        Cancha::create([
            'complejo_id' => $complejoCercano->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 5000,
            'estado' => 'activo',
        ]);

        // Complejo 2: Medio (10 km) -> Belgrano
        $complejoMedio = Complejo::create([
            'nombre' => 'Tenis & Padel Belgrano',
            'subdominio' => 'belgranotenis',
            'latitud' => -34.5500,
            'longitud' => -58.4500,
            'estado' => 'activo',
        ]);

        Cancha::create([
            'complejo_id' => $complejoMedio->id,
            'nombre' => 'Cancha Tenis 1',
            'deporte' => 'tenis',
            'superficie' => 'polvo',
            'techada' => false,
            'precio_base' => 6000,
            'estado' => 'activo',
        ]);

        // Complejo 3: Lejos (60 km) -> La Plata
        Complejo::create([
            'nombre' => 'Fútbol La Plata',
            'subdominio' => 'laplatafutbol',
            'latitud' => -34.9205,
            'longitud' => -57.9536,
            'estado' => 'activo',
        ]);

        // Petición con radio de 15 km desde el Centro (-34.6000, -58.3800)
        $response = $this->getJson('/api/complejos/cercanos?lat=-34.6000&lng=-58.3800&radio_km=15');

        $response->assertStatus(200)
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.nombre', 'Padel Palermo Club')
            ->assertJsonPath('data.1.nombre', 'Tenis & Padel Belgrano');

        // Petición con filtro de deporte 'padel'
        $responsePadel = $this->getJson('/api/complejos/cercanos?lat=-34.6000&lng=-58.3800&radio_km=15&deporte=padel');

        $responsePadel->assertStatus(200)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.nombre', 'Padel Palermo Club');
    }

    public function test_usuario_puede_actualizar_su_fcm_token(): void
    {
        $user = User::factory()->create([
            'fcm_token' => null,
        ]);
        $token = $user->createToken('mobile_test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/fcm-token', [
                'fcm_token' => 'fcm_token_device_abc_123456',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Token FCM actualizado correctamente',
                'fcm_token' => 'fcm_token_device_abc_123456',
            ]);

        $this->assertEquals('fcm_token_device_abc_123456', $user->fresh()->fcm_token);
    }

    public function test_job_enviar_recordatorio_turno_despacha_notificacion_fcm(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Pádel Pro Arena',
            'subdominio' => 'padelproarena',
            'latitud' => -34.6000,
            'longitud' => -58.3800,
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha Central Cristal',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 8000,
            'estado' => 'activo',
        ]);

        $cliente = User::factory()->create([
            'name' => 'Martín Palermo',
            'email' => 'martin@boca.test',
            'fcm_token' => 'fcm_token_martin_999',
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => now()->addDay()->toDateString(),
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'precio' => 8000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        $fcmService = new FCMNotificationService();
        $job = new EnviarRecordatorioTurnoJob($turno);
        $resultado = $job->handle($fcmService);

        $this->assertEquals('sent', $resultado['status']);
        $this->assertEquals($turno->id, $resultado['turno_id']);
        $this->assertEquals($cliente->id, $resultado['cliente_id']);
        $this->assertEquals(1, $resultado['fcm_response']['success']);
    }

    public function test_job_recordatorio_ignora_cliente_sin_fcm_token(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Club San Martín',
            'subdominio' => 'sanmartinclub',
            'latitud' => -34.6000,
            'longitud' => -58.3800,
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'futbol',
            'superficie' => 'sintetico',
            'techada' => false,
            'precio_base' => 4000,
            'estado' => 'activo',
        ]);

        $cliente = User::factory()->create([
            'fcm_token' => null,
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => now()->toDateString(),
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 4000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);

        $fcmService = new FCMNotificationService();
        $job = new EnviarRecordatorioTurnoJob($turno);
        $resultado = $job->handle($fcmService);

        $this->assertEquals('skipped', $resultado['status']);
        $this->assertEquals('NO_FCM_TOKEN', $resultado['reason']);
    }
}
