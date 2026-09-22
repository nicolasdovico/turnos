<?php

namespace Tests\Feature;

use App\Jobs\NotificarCancelacionLluviaWhatsAppJob;
use App\Models\Cancha;
use App\Models\CancelacionLluvia;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Models\ValeCredito;
use App\Services\WalletService;
use Carbon\Carbon;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class CancelacionLluviaTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejo;
    protected User $adminUser;
    protected Cancha $canchaDescubierta1;
    protected Cancha $canchaDescubierta2;
    protected Cancha $canchaTechada;
    protected User $clienteRegistrado;

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

        $this->adminUser = User::factory()->create([
            'email' => 'admin@nico-padel.com',
        ]);

        $this->complejo = Complejo::create([
            'user_id' => $this->adminUser->id,
            'nombre' => 'Nico Padel Club',
            'subdominio' => 'nico-padel',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
            'timezone' => 'America/Argentina/Buenos_Aires',
        ]);

        app()->instance('currentTenant', $this->complejo);

        // Cancha 1: Descubierta (Outdoor)
        $this->canchaDescubierta1 = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 1 Descubierta',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => false,
            'tipo_cubierta' => 'outdoor',
            'precio_base' => 20000.00,
            'estado' => 'activo',
            'duracion_minutos' => 60,
        ]);

        // Cancha 2: Descubierta (Outdoor)
        $this->canchaDescubierta2 = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 2 Descubierta',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => false,
            'tipo_cubierta' => 'outdoor',
            'precio_base' => 20000.00,
            'estado' => 'activo',
            'duracion_minutos' => 60,
        ]);

        // Cancha 3: Techada (Indoor)
        $this->canchaTechada = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha 3 Techada',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'techada' => true,
            'tipo_cubierta' => 'indoor',
            'precio_base' => 24000.00,
            'estado' => 'activo',
            'duracion_minutos' => 60,
        ]);

        // Horario de atención para generación de slots
        for ($dia = 0; $dia <= 6; $dia++) {
            HorarioAtencion::create([
                'complejo_id' => $this->complejo->id,
                'dia_semana' => $dia,
                'hora_apertura' => '08:00',
                'hora_cierre' => '23:00',
                'esta_cerrado' => false,
            ]);
        }

        $this->clienteRegistrado = User::factory()->create([
            'name' => 'Franco Colapinto',
            'email' => 'franco@f1.com',
            'telefono' => '1198765432',
        ]);
    }

    public function test_preview_calculates_impact_and_defaults_to_outdoor_courts(): void
    {
        $fecha = Carbon::today()->format('Y-m-d');

        // Turno en Cancha 1 Descubierta (Registrado con seña)
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_id' => $this->clienteRegistrado->id,
            'fecha' => $fecha,
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 20000.00,
            'monto_pagado' => 10000.00,
            'saldo_pendiente' => 10000.00,
            'estado' => 'confirmado',
        ]);

        // Turno en Cancha 2 Descubierta (Mostrador sin cuenta)
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta2->id,
            'cliente_id' => null,
            'cliente_nombre' => 'Juan Perez Mostrador',
            'cliente_telefono' => '1144556677',
            'fecha' => $fecha,
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'saldo_pendiente' => 0.00,
            'estado' => 'confirmado',
        ]);

        // Turno en Cancha 3 Techada (Debe quedar protegido)
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaTechada->id,
            'cliente_id' => $this->clienteRegistrado->id,
            'fecha' => $fecha,
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 24000.00,
            'monto_pagado' => 12000.00,
            'saldo_pendiente' => 12000.00,
            'estado' => 'confirmado',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/preview", [
                'fecha' => $fecha,
                'solo_descubiertas' => true,
            ]);

        $response->assertStatus(200);
        $data = $response->json();

        // Verificaciones del resumen
        $this->assertEquals(2, $data['resumen']['total_turnos_a_cancelar']);
        $this->assertEquals(30000.00, $data['resumen']['total_monto_a_reembolsar']);
        $this->assertEquals(1, $data['resumen']['turnos_con_billetera']);
        $this->assertEquals(10000.00, $data['resumen']['monto_billetera']);
        $this->assertEquals(1, $data['resumen']['turnos_sin_cuenta']);
        $this->assertEquals(20000.00, $data['resumen']['monto_vales']);
        $this->assertEquals(1, $data['resumen']['total_turnos_protegidos']);
        $this->assertEquals(1, $data['resumen']['total_canchas_techadas_protegidas']);

        // Verificaciones de las canchas
        $canchas = collect($data['canchas']);
        $c1 = $canchas->firstWhere('id', $this->canchaDescubierta1->id);
        $c2 = $canchas->firstWhere('id', $this->canchaDescubierta2->id);
        $c3 = $canchas->firstWhere('id', $this->canchaTechada->id);

        $this->assertTrue($c1['seleccionada']);
        $this->assertTrue($c2['seleccionada']);
        $this->assertFalse($c3['seleccionada']);
        $this->assertEquals(1, $c3['turnos_protegidos_count']);
    }

    public function test_preview_with_hora_desde_excludes_earlier_shifts(): void
    {
        $fecha = Carbon::today()->format('Y-m-d');

        // Turno a la mañana (10:00 - Antes de la lluvia)
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_id' => $this->clienteRegistrado->id,
            'fecha' => $fecha,
            'hora_inicio' => '10:00',
            'hora_fin' => '11:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'estado' => 'confirmado',
        ]);

        // Turno a la tarde (17:00 - Durante la lluvia)
        Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_id' => $this->clienteRegistrado->id,
            'fecha' => $fecha,
            'hora_inicio' => '17:00',
            'hora_fin' => '18:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'estado' => 'confirmado',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/preview", [
                'fecha' => $fecha,
                'hora_desde' => '16:00',
                'canchas_ids' => [$this->canchaDescubierta1->id],
            ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(1, $data['resumen']['total_turnos_a_cancelar']);
        $this->assertEquals('17:00', $data['turnos_afectados'][0]['hora_inicio']);
    }

    public function test_ejecutar_cancels_turnos_credits_wallets_and_issues_vouchers(): void
    {
        $fecha = Carbon::today()->format('Y-m-d');
        $walletService = app(WalletService::class);

        // Turno 1: Cliente registrado con $10.000 pagados
        $turno1 = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_id' => $this->clienteRegistrado->id,
            'fecha' => $fecha,
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 20000.00,
            'monto_pagado' => 10000.00,
            'saldo_pendiente' => 10000.00,
            'estado' => 'confirmado',
        ]);

        // Turno 2: Cliente mostrador sin cuenta con $20.000 pagados
        $turno2 = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta2->id,
            'cliente_id' => null,
            'cliente_nombre' => 'Carlos Tevez',
            'cliente_telefono' => '1133445566',
            'fecha' => $fecha,
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'saldo_pendiente' => 0.00,
            'estado' => 'confirmado',
        ]);

        // Turno 3: Cancha techada (Protegida)
        $turnoTechado = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaTechada->id,
            'cliente_id' => $this->clienteRegistrado->id,
            'fecha' => $fecha,
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 24000.00,
            'monto_pagado' => 12000.00,
            'saldo_pendiente' => 12000.00,
            'estado' => 'confirmado',
        ]);

        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/ejecutar", [
                'fecha' => $fecha,
                'hora_desde' => '16:00',
                'canchas_ids' => [$this->canchaDescubierta1->id, $this->canchaDescubierta2->id],
                'notificar_whatsapp' => true,
                'bloquear_grilla' => false,
                'observaciones' => 'Tormenta eléctrica y lluvia intensa',
            ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertTrue($data['success']);
        $this->assertEquals(2, $data['total_turnos_cancelados']);
        $this->assertEquals(30000.00, $data['total_monto_reembolsado']);
        $this->assertEquals(1, $data['billeteras_acreditadas_count']);
        $this->assertEquals(1, $data['vales_emitidos_count']);

        // 1. Verificar Turno 1 (Registrado)
        $turno1->refresh();
        $this->assertEquals('cancelado', $turno1->estado);
        $this->assertEquals('lluvia', $turno1->motivo_cancelacion);
        $this->assertEquals('reembolsado', $turno1->estado_pago);
        $this->assertEquals(0.00, (float) $turno1->saldo_pendiente);
        $this->assertEquals($this->adminUser->id, $turno1->cancelado_por_user_id);
        $this->assertNotNull($turno1->cancelacion_lluvia_id);

        // Saldo en billetera del cliente registrado debe ser $10.000
        $saldoWallet = $walletService->obtenerSaldo($this->clienteRegistrado->id, $this->complejo->id);
        $this->assertEquals(10000.00, $saldoWallet);

        // 2. Verificar Turno 2 (Sin cuenta -> Vale Digital)
        $turno2->refresh();
        $this->assertEquals('cancelado', $turno2->estado);
        $this->assertEquals('lluvia', $turno2->motivo_cancelacion);
        $this->assertEquals('reembolsado', $turno2->estado_pago);

        $vale = ValeCredito::where('turno_origen_id', $turno2->id)->first();
        $this->assertNotNull($vale);
        $this->assertStringStartsWith('LLUVIA-', $vale->codigo);
        $this->assertNotEmpty($vale->token_seguro);
        $this->assertEquals(20000.00, (float) $vale->monto);
        $this->assertEquals(20000.00, (float) $vale->saldo_restante);
        $this->assertEquals('activo', $vale->estado);
        $this->assertEquals('Carlos Tevez', $vale->cliente_nombre);

        // 3. Verificar Turno Techado (Intacto)
        $turnoTechado->refresh();
        $this->assertEquals('confirmado', $turnoTechado->estado);
        $this->assertNull($turnoTechado->motivo_cancelacion);

        // 4. Verificar auditoría en cancelaciones_lluvia
        $cancelacion = CancelacionLluvia::find($data['cancelacion_id']);
        $this->assertNotNull($cancelacion);
        $this->assertEquals(2, $cancelacion->total_turnos_cancelados);
        $this->assertEquals(30000.00, (float) $cancelacion->total_monto_reembolsado);
        $this->assertEquals('Tormenta eléctrica y lluvia intensa', $cancelacion->observaciones);

        // 5. Verificar Jobs de WhatsApp encolados
        Queue::assertPushed(NotificarCancelacionLluviaWhatsAppJob::class, 2);
    }

    public function test_public_voucher_view_and_wallet_claim(): void
    {
        $fecha = Carbon::today()->format('Y-m-d');
        $walletService = app(WalletService::class);

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_nombre' => 'Lionel Messi',
            'cliente_telefono' => '1122334455',
            'fecha' => $fecha,
            'hora_inicio' => '20:00',
            'hora_fin' => '21:00',
            'precio' => 20000.00,
            'monto_pagado' => 15000.00,
            'estado' => 'confirmado',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/ejecutar", [
                'fecha' => $fecha,
                'canchas_ids' => [$this->canchaDescubierta1->id],
            ]);

        $vale = ValeCredito::where('turno_origen_id', $turno->id)->firstOrFail();

        // 1. Acceso público sin autenticación
        $resPublic = $this->getJson("/api/vales/{$vale->token_seguro}");
        $resPublic->assertStatus(200);
        $resPublic->assertJson([
            'codigo' => $vale->codigo,
            'monto' => 15000.00,
            'saldo_restante' => 15000.00,
            'cliente_nombre' => 'Lionel Messi',
            'es_valido' => true,
        ]);

        // 2. Canje autenticado por parte del cliente
        $nuevoUsuario = User::factory()->create([
            'name' => 'Lionel Messi',
            'email' => 'leo@intermiami.com',
        ]);

        $resCanje = $this->actingAs($nuevoUsuario, 'sanctum')
            ->postJson("/api/vales/{$vale->token_seguro}/canjear-billetera");

        $resCanje->assertStatus(200);
        $resCanje->assertJson([
            'success' => true,
            'monto_acreditado' => 15000.00,
            'nuevo_saldo_billetera' => 15000.00,
        ]);

        $vale->refresh();
        $this->assertEquals('transferido_billetera', $vale->estado);
        $this->assertEquals(0.00, (float) $vale->saldo_restante);
        $this->assertEquals($nuevoUsuario->id, $vale->user_id_canje);

        // 3. Reintento de canje debe ser rechazado
        $resCanje2 = $this->actingAs($nuevoUsuario, 'sanctum')
            ->postJson("/api/vales/{$vale->token_seguro}/canjear-billetera");
        $resCanje2->assertStatus(400);
    }

    public function test_admin_cash_refund_for_voucher(): void
    {
        $fecha = Carbon::today()->format('Y-m-d');

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_nombre' => 'Max Verstappen',
            'fecha' => $fecha,
            'hora_inicio' => '15:00',
            'hora_fin' => '16:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'estado' => 'confirmado',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/ejecutar", [
                'fecha' => $fecha,
                'canchas_ids' => [$this->canchaDescubierta1->id],
            ]);

        $vale = ValeCredito::where('turno_origen_id', $turno->id)->firstOrFail();

        // Admin reembolsa en efectivo en mostrador
        $resReembolso = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/vales/{$vale->id}/reembolsar-efectivo");

        $resReembolso->assertStatus(200);
        $vale->refresh();
        $this->assertEquals('reembolsado_efectivo', $vale->estado);
        $this->assertEquals(0.00, (float) $vale->saldo_restante);
    }

    public function test_ejecutar_creates_preventive_grid_blocks_when_requested(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-21 12:00:00'));
        try {
            $fecha = Carbon::today()->format('Y-m-d');

            $response = $this->actingAs($this->adminUser, 'sanctum')
                ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/ejecutar", [
                    'fecha' => $fecha,
                    'hora_desde' => '20:00',
                    'canchas_ids' => [$this->canchaDescubierta1->id],
                    'bloquear_grilla' => true,
                ]);

            $response->assertStatus(200);

            // Deberían haberse generado turnos con estado 'bloqueado' y motivo 'lluvia' para las horas >= 20:00
            $bloqueos = Turno::where('cancha_id', $this->canchaDescubierta1->id)
                ->where('fecha', $fecha)
                ->where('estado', 'bloqueado')
                ->where('motivo_cancelacion', 'lluvia')
                ->get();

            $this->assertGreaterThan(0, $bloqueos->count());
            foreach ($bloqueos as $b) {
                $this->assertGreaterThanOrEqual('20:00', substr($b->hora_inicio, 0, 5));
            }
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_admin_can_list_vales_with_search_and_filter(): void
    {
        $fecha = Carbon::today()->format('Y-m-d');

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_nombre' => 'Emiliano Dibu Martinez',
            'cliente_telefono' => '1155667788',
            'fecha' => $fecha,
            'hora_inicio' => '16:00',
            'hora_fin' => '17:00',
            'precio' => 20000.00,
            'monto_pagado' => 20000.00,
            'estado' => 'confirmado',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/ejecutar", [
                'fecha' => $fecha,
                'canchas_ids' => [$this->canchaDescubierta1->id],
            ]);

        // Consulta de listado en panel admin
        $res = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson("/api/clubs/nico-padel/vales?q=Dibu");

        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Emiliano Dibu Martinez', $data[0]['cliente_nombre']);
    }

    public function test_whatsapp_job_enviar_cancelacion_lluvia(): void
    {
        \Illuminate\Support\Facades\Http::fake([
            '*/message/sendText/*' => \Illuminate\Support\Facades\Http::response(['status' => 'PENDING'], 201),
        ]);

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $this->canchaDescubierta1->id,
            'cliente_nombre' => 'Guillermo Vilas',
            'cliente_telefono' => '1133221100',
            'fecha' => '2026-09-20',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'precio' => 20000.00,
            'monto_pagado' => 10000.00,
            'estado' => 'cancelado',
        ]);

        $job = new NotificarCancelacionLluviaWhatsAppJob(
            turno: $turno,
            tipoReembolso: 'vale',
            monto: 10000.00,
            linkVale: 'https://nico-padel.turnos.com/vales/tok123',
            codigoVale: 'LLUVIA-VILA99'
        );

        $resultado = $job->handle(app(\App\Services\WhatsAppEvolutionService::class));
        $this->assertEquals('sent', $resultado['status']);
    }

    public function test_unauthorized_user_cannot_execute_cancellation(): void
    {
        $otroUsuario = User::factory()->create();

        $response = $this->actingAs($otroUsuario, 'sanctum')
            ->postJson("/api/clubs/nico-padel/cancelacion-lluvia/ejecutar", [
                'fecha' => '2026-09-20',
                'canchas_ids' => [$this->canchaDescubierta1->id],
            ]);

        $response->assertStatus(403);
    }
}
