<?php

namespace Tests\Unit;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\DispositivoIoT;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\IoTControlService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class IoTSchedulerTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected Cancha $cancha;
    protected DispositivoIoT $dispositivo;
    protected Turno $turno;

    protected function setUp(): void
    {
        parent::setUp();

        // Obtener o crear módulo domótica
        $moduloDomotica = Modulo::firstOrCreate(
            ['slug' => 'domotica'],
            ['nombre' => 'Domótica IoT & Luces']
        );

        $plan = Plan::firstOrCreate(
            ['slug' => 'pro_iot'],
            ['nombre' => 'Plan Pro IoT', 'precio_mensual' => 20000]
        );
        $plan->modulos()->syncWithoutDetaching([$moduloDomotica->id]);

        $this->complejo = Complejo::create([
            'nombre' => 'Club Pádel Domótica',
            'subdominio' => 'padeliot',
            'plan_id' => $plan->id,
            'estado' => 'activo',
        ]);

        $this->cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha Cristal 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 10000,
            'estado' => 'activo',
        ]);

        $this->dispositivo = DispositivoIoT::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'nombre' => 'Relay Luces Cancha 1',
            'tipo' => 'luces',
            'minutos_antelacion_encendido' => 10,
            'minutos_gracia_apagado' => 5,
            'estado_actual' => 'apagado',
            'esta_activo' => true,
        ]);

        $cliente = User::factory()->create();

        // Turno reservado de 18:00 a 19:00 el 2026-09-05
        $this->turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->cancha->id,
            'cliente_id' => $cliente->id,
            'fecha' => '2026-09-05',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 10000,
            'estado' => 'reservado',
            'es_fijo' => false,
        ]);
    }

    public function test_luces_se_encienden_dentro_del_margen_de_antelacion(): void
    {
        // 17:45 (15 min antes, fuera de la ventana de 10 min de antelación) -> debe estar apagado
        $momentoPrevio = Carbon::parse('2026-09-05 17:45:00');
        $this->assertFalse($this->dispositivo->deberiaEstarEncendido($momentoPrevio));

        // 17:52 (8 min antes, dentro de la ventana de 10 min de antelación) -> debe estar encendido
        $momentoAntelacion = Carbon::parse('2026-09-05 17:52:00');
        $this->assertTrue($this->dispositivo->deberiaEstarEncendido($momentoAntelacion));
    }

    public function test_luces_permanecen_encendidas_durante_el_turno(): void
    {
        // 18:30 (en pleno partido) -> debe estar encendido
        $momentoPartido = Carbon::parse('2026-09-05 18:30:00');
        $this->assertTrue($this->dispositivo->deberiaEstarEncendido($momentoPartido));
    }

    public function test_luces_se_apagan_una_vez_expirado_el_tiempo_de_gracia(): void
    {
        // 19:03 (3 min después del final, dentro de los 5 min de gracia) -> debe seguir encendido
        $momentoGracia = Carbon::parse('2026-09-05 19:03:00');
        $this->assertTrue($this->dispositivo->deberiaEstarEncendido($momentoGracia));

        // 19:08 (8 min después del final, expiró tiempo de gracia) -> debe estar apagado
        $momentoExpirado = Carbon::parse('2026-09-05 19:08:00');
        $this->assertFalse($this->dispositivo->deberiaEstarEncendido($momentoExpirado));
    }

    public function test_dispositivo_inactivo_o_sin_cancha_retorna_falso(): void
    {
        $this->dispositivo->update(['esta_activo' => false]);
        $momento = Carbon::parse('2026-09-05 18:30:00');

        $this->assertFalse($this->dispositivo->deberiaEstarEncendido($momento));
    }

    public function test_iot_control_service_emite_ordenes_y_actualiza_estado(): void
    {
        $service = new IoTControlService();

        $resEncender = $service->enviarOrden($this->dispositivo, 'ENCENDER', 'Prueba encendido');
        $this->assertTrue($resEncender['success']);
        $this->assertEquals('encendido', $this->dispositivo->fresh()->estado_actual);

        $resApagar = $service->enviarOrden($this->dispositivo, 'APAGAR', 'Prueba apagado');
        $this->assertTrue($resApagar['success']);
        $this->assertEquals('apagado', $this->dispositivo->fresh()->estado_actual);
    }

    public function test_comando_artisan_sincronizar_luces_ejecuta_ciclo_completo(): void
    {
        // 1. Simular ejecución a las 18:15 (partido en curso)
        Artisan::call('iot:sincronizar-luces', [
            '--momento' => '2026-09-05 18:15',
            '--complejo' => $this->complejo->id,
        ]);

        $this->assertEquals('encendido', $this->dispositivo->fresh()->estado_actual);

        // 2. Simular ejecución a las 20:00 (cancha libre)
        Artisan::call('iot:sincronizar-luces', [
            '--momento' => '2026-09-05 20:00',
            '--complejo' => $this->complejo->id,
        ]);

        $this->assertEquals('apagado', $this->dispositivo->fresh()->estado_actual);
    }

    public function test_complejo_sin_modulo_domotica_no_emite_ordenes(): void
    {
        $planBasico = Plan::firstOrCreate(
            ['slug' => 'sin_iot'],
            ['nombre' => 'Plan Sin IoT', 'precio_mensual' => 10000]
        );

        $this->complejo->update(['plan_id' => $planBasico->id]);

        Artisan::call('iot:sincronizar-luces', [
            '--momento' => '2026-09-05 18:15',
            '--complejo' => $this->complejo->id,
        ]);

        // El dispositivo debe continuar 'apagado' ya que el complejo no tiene contratado el módulo
        $this->assertEquals('apagado', $this->dispositivo->fresh()->estado_actual);
    }
}
