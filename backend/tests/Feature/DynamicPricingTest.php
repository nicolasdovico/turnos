<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\DisponibilidadService;
use Carbon\Carbon;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class DynamicPricingTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected Cancha $canchaOutdoor;
    protected Cancha $canchaIndoor;
    protected Cancha $canchaLegacy;
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->owner = User::factory()->create([
            'email' => 'owner@clubdinamico.com',
        ]);

        $this->complejo = Complejo::create([
            'user_id' => $this->owner->id,
            'nombre' => 'Club Dynamic Padel',
            'subdominio' => 'dynamicpadel',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
            'hora_inicio_luz' => '19:00',
            'hora_inicio_pico_semana' => '18:00',
            'hora_fin_pico_semana' => '23:00',
            'dias_pico_semana' => [1, 2, 3, 4, 5],
            'dias_fin_semana' => [0, 6],
            'porcentaje_sena' => 50.00,
            'tipo_cobro_reserva' => 'sena',
        ]);

        app()->instance('currentTenant', $this->complejo);

        // Cancha exterior descubierta con tarifas dinámicas y luz adicional desacoplada
        $this->canchaOutdoor = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 1 Outdoor Panorámica',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => false,
            'iluminacion' => true,
            'duracion_minutos' => 60,
            'precio_base' => 10000.00,
            'precio_valle' => 8000.00,
            'precio_pico' => 14000.00,
            'precio_fin_semana' => 12000.00,
            'precio_luz_adicional' => 2000.00,
            'estado' => 'activo',
        ]);

        // Cancha indoor techada (no debe cobrar recargo de luz a menos que esté seteado)
        $this->canchaIndoor = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 2 Indoor Climatizada',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => true,
            'iluminacion' => true,
            'duracion_minutos' => 60,
            'precio_base' => 12000.00,
            'precio_valle' => 10000.00,
            'precio_pico' => 16000.00,
            'precio_fin_semana' => 15000.00,
            'precio_luz_adicional' => null,
            'estado' => 'activo',
        ]);

        // Cancha legacy sin configuración dinámica (debe fallback a precio_base)
        $this->canchaLegacy = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 3 Legacy',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => false,
            'iluminacion' => true,
            'duracion_minutos' => 60,
            'precio_base' => 9000.00,
            'precio_valle' => null,
            'precio_pico' => null,
            'precio_fin_semana' => null,
            'precio_luz_adicional' => null,
            'estado' => 'activo',
        ]);

        // Horarios de atención: Lunes a Domingo de 08:00 a 23:00
        for ($dia = 0; $dia <= 6; $dia++) {
            HorarioAtencion::create([
                'complejo_id' => $this->complejo->id,
                'dia_semana' => $dia,
                'hora_apertura' => '08:00',
                'hora_cierre' => '23:00',
                'abierto' => true,
                'duracion_turno_minutos' => 60,
            ]);
        }
    }

    public function test_cotizacion_cancha_outdoor_dia_semana_valle(): void
    {
        // Miércoles 2026-09-23 a las 14:00 (valle, antes del atardecer)
        $fecha = Carbon::parse('2026-09-23 14:00:00');

        $cotizacion = $this->canchaOutdoor->calcularCotizacionTurno(
            60,
            $fecha,
            '14:00',
            '15:00',
            '19:00',
            $this->complejo
        );

        $this->assertEquals('valle', $cotizacion['tipo_franja']);
        $this->assertFalse($cotizacion['aplica_luz']);
        $this->assertEquals(8000.00, $cotizacion['precio_base']);
        $this->assertEquals(0.00, $cotizacion['recargo_luz']);
        $this->assertEquals(8000.00, $cotizacion['precio_total']);
        $this->assertEquals(4000.00, $cotizacion['monto_sena']);
    }

    public function test_cotizacion_cancha_outdoor_dia_semana_pico_sin_luz(): void
    {
        // Miércoles 2026-09-23 a las 18:00 - 19:00 (pico, antes de hora_inicio_luz 19:00)
        $fecha = Carbon::parse('2026-09-23 18:00:00');

        $cotizacion = $this->canchaOutdoor->calcularCotizacionTurno(
            60,
            $fecha,
            '18:00',
            '19:00',
            '19:00',
            $this->complejo
        );

        $this->assertEquals('pico', $cotizacion['tipo_franja']);
        $this->assertFalse($cotizacion['aplica_luz']);
        $this->assertEquals(14000.00, $cotizacion['precio_base']);
        $this->assertEquals(0.00, $cotizacion['recargo_luz']);
        $this->assertEquals(14000.00, $cotizacion['precio_total']);
        $this->assertEquals(7000.00, $cotizacion['monto_sena']);
    }

    public function test_cotizacion_cancha_outdoor_dia_semana_pico_con_luz(): void
    {
        // Miércoles 2026-09-23 a las 20:00 - 21:00 (pico y posterior a las 19:00)
        $fecha = Carbon::parse('2026-09-23 20:00:00');

        $cotizacion = $this->canchaOutdoor->calcularCotizacionTurno(
            60,
            $fecha,
            '20:00',
            '21:00',
            '19:00',
            $this->complejo
        );

        $this->assertEquals('pico', $cotizacion['tipo_franja']);
        $this->assertTrue($cotizacion['aplica_luz']);
        $this->assertEquals(14000.00, $cotizacion['precio_base']);
        $this->assertEquals(2000.00, $cotizacion['recargo_luz']);
        $this->assertEquals(16000.00, $cotizacion['precio_total']);
        $this->assertEquals(8000.00, $cotizacion['monto_sena']);
    }

    public function test_cotizacion_cancha_outdoor_fin_de_semana(): void
    {
        // Sábado 2026-09-26 a las 10:00 (fin de semana, sin luz)
        $fechaDia = Carbon::parse('2026-09-26 10:00:00');
        $cotizacionDia = $this->canchaOutdoor->calcularCotizacionTurno(
            60,
            $fechaDia,
            '10:00',
            '11:00',
            '19:00',
            $this->complejo
        );

        $this->assertEquals('fin_semana', $cotizacionDia['tipo_franja']);
        $this->assertFalse($cotizacionDia['aplica_luz']);
        $this->assertEquals(12000.00, $cotizacionDia['precio_base']);
        $this->assertEquals(12000.00, $cotizacionDia['precio_total']);

        // Sábado 2026-09-26 a las 20:00 (fin de semana, con luz)
        $fechaNoche = Carbon::parse('2026-09-26 20:00:00');
        $cotizacionNoche = $this->canchaOutdoor->calcularCotizacionTurno(
            60,
            $fechaNoche,
            '20:00',
            '21:00',
            '19:00',
            $this->complejo
        );

        $this->assertEquals('fin_semana', $cotizacionNoche['tipo_franja']);
        $this->assertTrue($cotizacionNoche['aplica_luz']);
        $this->assertEquals(12000.00, $cotizacionNoche['precio_base']);
        $this->assertEquals(2000.00, $cotizacionNoche['recargo_luz']);
        $this->assertEquals(14000.00, $cotizacionNoche['precio_total']);
    }

    public function test_cancha_indoor_no_cobra_luz_por_defecto(): void
    {
        // Cancha indoor techada a las 21:00 en día de semana (pico)
        $fecha = Carbon::parse('2026-09-23 21:00:00');

        $cotizacion = $this->canchaIndoor->calcularCotizacionTurno(
            60,
            $fecha,
            '21:00',
            '22:00',
            '19:00',
            $this->complejo
        );

        $this->assertEquals('pico', $cotizacion['tipo_franja']);
        $this->assertFalse($cotizacion['aplica_luz']);
        $this->assertEquals(16000.00, $cotizacion['precio_base']);
        $this->assertEquals(0.00, $cotizacion['recargo_luz']);
        $this->assertEquals(16000.00, $cotizacion['precio_total']);
    }

    public function test_cancha_legacy_fallback_a_precio_base(): void
    {
        // En cualquier horario y día, una cancha sin tarifas dinámicas cobra precio_base ($9000)
        $fechaValle = Carbon::parse('2026-09-23 10:00:00');
        $cotValle = $this->canchaLegacy->calcularCotizacionTurno(60, $fechaValle, '10:00', '11:00', '19:00', $this->complejo);
        $this->assertEquals(9000.00, $cotValle['precio_total']);

        $fechaPico = Carbon::parse('2026-09-23 20:00:00');
        $cotPico = $this->canchaLegacy->calcularCotizacionTurno(60, $fechaPico, '20:00', '21:00', '19:00', $this->complejo);
        $this->assertEquals(9000.00, $cotPico['precio_total']);

        $fechaFds = Carbon::parse('2026-09-26 15:00:00');
        $cotFds = $this->canchaLegacy->calcularCotizacionTurno(60, $fechaFds, '15:00', '16:00', '19:00', $this->complejo);
        $this->assertEquals(9000.00, $cotFds['precio_total']);
    }

    public function test_disponibilidad_service_enriquece_slots_con_franjas_y_precios(): void
    {
        $service = app(DisponibilidadService::class);
        Carbon::setTestNow(Carbon::parse('2026-09-23 06:00:00'));

        $slots = $service->obtenerSlotsDisponibles($this->canchaOutdoor->id, '2026-09-23');

        $this->assertNotEmpty($slots);

        // Buscar slot de las 14:00 (valle)
        $slotValle = collect($slots)->firstWhere('hora_inicio', '14:00');
        $this->assertNotNull($slotValle);
        $this->assertEquals('valle', $slotValle['tipo_franja']);
        $this->assertEquals(8000.00, $slotValle['precio']);

        // Buscar slot de las 20:00 (pico con luz)
        $slotPicoNoche = collect($slots)->firstWhere('hora_inicio', '20:00');
        $this->assertNotNull($slotPicoNoche);
        $this->assertEquals('pico', $slotPicoNoche['tipo_franja']);
        $this->assertEquals(16000.00, $slotPicoNoche['precio']);
        $this->assertEquals(8000.00, $slotPicoNoche['monto_sena']);
    }

    public function test_api_panel_guardar_y_actualizar_tarifas_dinamicas_cancha(): void
    {
        $this->actingAs($this->owner, 'sanctum');

        // 1. Crear cancha con tarifas dinámicas vía API
        $responseCreate = $this->postJson("/api/clubs/{$this->complejo->subdominio}/canchas", [
            'nombre' => 'Cancha 4 Dinámica API',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 11000.00,
            'precio_valle' => 9000.00,
            'precio_pico' => 15000.00,
            'precio_fin_semana' => 13500.00,
            'precio_luz_adicional' => 2500.00,
            'techada' => false,
            'iluminacion' => true,
        ]);

        $responseCreate->assertStatus(201);
        $createdId = $responseCreate->json('cancha.id');

        $canchaDb = Cancha::find($createdId);
        $this->assertEquals(9000.00, (float) $canchaDb->precio_valle);
        $this->assertEquals(15000.00, (float) $canchaDb->precio_pico);
        $this->assertEquals(13500.00, (float) $canchaDb->precio_fin_semana);
        $this->assertEquals(2500.00, (float) $canchaDb->precio_luz_adicional);

        // 2. Modificar tarifas de la cancha vía API
        $responseUpdate = $this->putJson("/api/clubs/{$this->complejo->subdominio}/canchas/{$createdId}", [
            'nombre' => 'Cancha 4 Dinámica Modificada',
            'precio_base' => 11500.00,
            'precio_valle' => 9500.00,
            'precio_pico' => 16000.00,
            'precio_fin_semana' => 14000.00,
            'precio_luz_adicional' => 3000.00,
        ]);

        $responseUpdate->assertStatus(200);
        $canchaDb->refresh();
        $this->assertEquals(9500.00, (float) $canchaDb->precio_valle);
        $this->assertEquals(16000.00, (float) $canchaDb->precio_pico);
        $this->assertEquals(14000.00, (float) $canchaDb->precio_fin_semana);
        $this->assertEquals(3000.00, (float) $canchaDb->precio_luz_adicional);
    }

    public function test_api_panel_configurar_horarios_pico_y_fines_de_semana(): void
    {
        $this->actingAs($this->owner, 'sanctum');

        $response = $this->putJson("/api/clubs/{$this->complejo->subdominio}/configuracion", [
            'hora_inicio_pico_semana' => '17:30',
            'hora_fin_pico_semana' => '22:30',
            'hora_inicio_luz' => '19:30',
        ]);

        $response->assertStatus(200);
        $this->complejo->refresh();

        $this->assertEquals('17:30', substr($this->complejo->hora_inicio_pico_semana, 0, 5));
        $this->assertEquals('22:30', substr($this->complejo->hora_fin_pico_semana, 0, 5));
        $this->assertEquals('19:30', substr($this->complejo->hora_inicio_luz, 0, 5));
    }

    public function test_api_confirmar_reserva_aplica_tarifa_dinamica_correctamente(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-23 08:00:00'));

        // Reservar un turno de miércoles a las 20:00 (pico $14000 + luz $2000 = $16000)
        $response = $this->withHeader('X-Tenant-ID', $this->complejo->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaOutdoor->id,
                'fecha' => '2026-09-23',
                'hora_inicio' => '20:00',
                'hora_fin' => '21:00',
                'cliente_nombre' => 'Jugador Test',
                'cliente_telefono' => '+5491122334455',
                'cliente_email' => 'jugador@test.com',
                'metodo_pago' => 'simulador_dev',
                'modalidad_pago' => 'sena',
            ]);

        $response->assertStatus(200);
        $turnoId = $response->json('turno.id');

        $turno = Turno::find($turnoId);
        $this->assertEquals(16000.00, (float) $turno->precio);
        $this->assertEquals(8000.00, (float) $turno->monto_pagado);
        $this->assertEquals(8000.00, (float) $turno->saldo_pendiente);
        $this->assertEquals('senado', $turno->estado_pago);
    }
}
