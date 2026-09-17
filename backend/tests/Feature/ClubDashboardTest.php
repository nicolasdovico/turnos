<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationOtpMail;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\EmailVerification;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Models\UserCredito;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ClubDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
            \Database\Seeders\TipoNegocioSeeder::class,
        ]);
    }

    public function test_check_is_admin_for_guest_regular_user_and_owner(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@owner.com',
        ]);

        $regularClient = User::factory()->create([
            'name' => 'Cliente Jugador',
            'email' => 'cliente@jugador.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-padel-auth',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // 1. Guest (unauthenticated visitor) -> is_admin: false
        $resGuest = $this->getJson('/api/clubs/nico-padel-auth/is-admin');
        $resGuest->assertStatus(200)
            ->assertJsonPath('is_admin', false)
            ->assertJsonPath('is_authenticated', false);

        // 2. Regular client logged in -> is_admin: false
        $resClient = $this->actingAs($regularClient, 'sanctum')
            ->getJson('/api/clubs/nico-padel-auth/is-admin');
        $resClient->assertStatus(200)
            ->assertJsonPath('is_admin', false)
            ->assertJsonPath('is_authenticated', true);

        // 3. Owner of the club logged in -> is_admin: true
        $resOwner = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clubs/nico-padel-auth/is-admin');
        $resOwner->assertStatus(200)
            ->assertJsonPath('is_admin', true)
            ->assertJsonPath('is_authenticated', true)
            ->assertJsonPath('club_name', 'Nico Pádel Club');
    }

    public function test_get_club_dashboard_data(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@test.com',
        ]);

        $plan = Plan::where('slug', 'oro')->first();

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-padel-dash',
            'plan_id' => $plan->id,
            'deporte_principal' => 'padel',
            'ciudad' => 'Luján',
            'estado' => 'activo',
        ]);

        $response = $this->getJson('/api/clubs/nico-padel-dash/dashboard');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.complejo.nombre', 'Nico Pádel Club')
            ->assertJsonPath('data.complejo.subdominio', 'nico-padel-dash')
            ->assertJsonPath('data.complejo.owner.name', 'Nicolás Dueño')
            ->assertJsonPath('data.plan.slug', 'oro');
    }

    public function test_store_cancha_from_club_dashboard(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Club Canchas',
            'subdominio' => 'club-canchas',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $payload = [
            'nombre' => 'Cancha 4 Panorámica',
            'superficie' => 'cristal',
            'precio_base' => 9500,
            'techada' => true,
        ];

        $response = $this->postJson('/api/clubs/club-canchas/canchas', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cancha.nombre', 'Cancha 4 Panorámica')
            ->assertJsonPath('cancha.precio_base', '9500.00');

        $this->assertDatabaseHas('canchas', [
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 4 Panorámica',
        ]);
    }

    public function test_club_owner_can_update_payment_and_cancellation_policies(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@owner-policy.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-policy-club',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
            'porcentaje_sena' => 50.00,
            'horas_limite_cancelacion' => 4,
            'tipo_cobro_reserva' => 'sena',
            'permite_mostrador_publico' => true,
        ]);

        $payload = [
            'porcentaje_sena' => 30.00,
            'horas_limite_cancelacion' => 6,
            'tipo_cobro_reserva' => 'sena',
            'permite_mostrador_publico' => false,
            'telefono' => '+54 9 11 9999-8888',
        ];

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-policy-club/configuracion', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('complejo.porcentaje_sena', 30)
            ->assertJsonPath('complejo.horas_limite_cancelacion', 6)
            ->assertJsonPath('complejo.permite_mostrador_publico', false);

        $this->assertDatabaseHas('complejos', [
            'id' => $complejo->id,
            'porcentaje_sena' => 30.00,
            'horas_limite_cancelacion' => 6,
            'permite_mostrador_publico' => false,
        ]);
    }

    public function test_club_owner_can_update_institutional_club_data(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@datosclub.com',
        ]);

        $tipoComplejo = \App\Models\TipoNegocio::where('slug', 'complejo')->first();

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Antiguo',
            'subdominio' => 'nico-datos-club',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'telefono' => '11223344',
            'ciudad' => 'Luján',
            'direccion' => 'Calle Vieja 123',
            'estado' => 'activo',
        ]);

        $payload = [
            'nombre' => 'Nico Sport & Pádel Center',
            'telefono' => '+54 9 11 4979-0220',
            'ciudad' => 'Mercedes',
            'direccion' => 'Av. Siempre Viva 742',
            'deporte_principal' => 'tenis',
            'tipo_negocio_id' => $tipoComplejo->id,
        ];

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-datos-club/configuracion', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('complejo.nombre', 'Nico Sport & Pádel Center')
            ->assertJsonPath('complejo.telefono', '+54 9 11 4979-0220')
            ->assertJsonPath('complejo.ciudad', 'Mercedes')
            ->assertJsonPath('complejo.direccion', 'Av. Siempre Viva 742')
            ->assertJsonPath('complejo.deporte_principal', 'tenis')
            ->assertJsonPath('complejo.tipo_negocio.id', $tipoComplejo->id)
            ->assertJsonPath('complejo.tipo_negocio.slug', 'complejo');

        $this->assertDatabaseHas('complejos', [
            'id' => $complejo->id,
            'nombre' => 'Nico Sport & Pádel Center',
            'telefono' => '+54 9 11 4979-0220',
            'ciudad' => 'Mercedes',
            'direccion' => 'Av. Siempre Viva 742',
            'deporte_principal' => 'tenis',
            'tipo_negocio_id' => $tipoComplejo->id,
        ]);
    }

    public function test_validates_telefono_format_and_digit_length(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@telval.com',
        ]);

        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Tel',
            'subdominio' => 'nico-padel-tel',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // 1. Invalid characters (letters) -> 422
        $resLetters = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-padel-tel/configuracion', [
                'telefono' => 'mi-telefono-invalido',
            ]);
        $resLetters->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);

        // 2. Insufficient digits (< 8) -> 422
        $resShort = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-padel-tel/configuracion', [
                'telefono' => '12345',
            ]);
        $resShort->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);

        // 3. Valid telephone -> 200
        $resValid = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-padel-tel/configuracion', [
                'telefono' => '+54 9 11 4979-0220',
            ]);
        $resValid->assertStatus(200)
            ->assertJsonPath('complejo.telefono', '+54 9 11 4979-0220');
    }

    public function test_non_owner_cannot_update_club_policies(): void
    {
        $owner = User::factory()->create([
            'name' => 'Dueño Real',
            'email' => 'dueno@real.com',
        ]);

        $intruder = User::factory()->create([
            'name' => 'Otro Usuario',
            'email' => 'otro@usuario.com',
        ]);

        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Privado',
            'subdominio' => 'club-privado',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
            'porcentaje_sena' => 50.00,
        ]);

        $response = $this->actingAs($intruder, 'sanctum')
            ->putJson('/api/clubs/club-privado/configuracion', [
                'porcentaje_sena' => 20.00,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_club_owner_can_update_weekly_business_hours(): void
    {
        $owner = User::factory()->create([
            'name' => 'Nicolás Dueño',
            'email' => 'nico@horarios.com',
        ]);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Nico Pádel Club',
            'subdominio' => 'nico-horarios-club',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // Create initial hours for all 7 days
        for ($d = 0; $d <= 6; $d++) {
            \App\Models\HorarioAtencion::create([
                'complejo_id' => $complejo->id,
                'dia_semana' => $d,
                'hora_apertura' => '08:00',
                'hora_cierre' => '23:00',
                'duracion_turno_minutos' => 60,
            ]);
        }

        // Payload: Monday to Friday 09:00 - 22:00 (90 min), Saturday 09:00 - 18:00 (60 min), Sunday Closed
        $payload = [
            'horarios' => [
                ['dia_semana' => 1, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 2, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 3, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 4, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 5, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 90],
                ['dia_semana' => 6, 'abierto' => true, 'hora_apertura' => '09:00', 'hora_cierre' => '18:00', 'duracion_turno_minutos' => 60],
                ['dia_semana' => 0, 'abierto' => false],
            ],
        ];

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/nico-horarios-club/horarios', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(6, 'horarios');

        // Check DB has Lunes (1) updated
        $this->assertDatabaseHas('horarios_atencion', [
            'complejo_id' => $complejo->id,
            'dia_semana' => 1,
            'hora_apertura' => '09:00:00',
            'hora_cierre' => '22:00:00',
            'duracion_turno_minutos' => 90,
        ]);

        // Check DB does NOT have Domingo (0)
        $this->assertDatabaseMissing('horarios_atencion', [
            'complejo_id' => $complejo->id,
            'dia_semana' => 0,
        ]);
    }

    public function test_non_owner_cannot_update_club_horarios(): void
    {
        $owner = User::factory()->create(['email' => 'owner@club.com']);
        $intruder = User::factory()->create(['email' => 'intruder@club.com']);

        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Exclusivo',
            'subdominio' => 'club-exclusivo',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($intruder, 'sanctum')
            ->putJson('/api/clubs/club-exclusivo/horarios', [
                'horarios' => [
                    ['dia_semana' => 1, 'abierto' => true, 'hora_apertura' => '10:00', 'hora_cierre' => '20:00'],
                ],
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_validates_opening_time_before_closing_time(): void
    {
        $owner = User::factory()->create(['email' => 'owner2@club.com']);

        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Horas Invalidas',
            'subdominio' => 'club-invalid',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // Apertura 22:00 y Cierre 08:00 (Invalido)
        $response = $this->actingAs($owner, 'sanctum')
            ->putJson('/api/clubs/club-invalid/horarios', [
                'horarios' => [
                    ['dia_semana' => 1, 'abierto' => true, 'hora_apertura' => '22:00', 'hora_cierre' => '08:00', 'duracion_turno_minutos' => 60],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_enviar_otp_cliente_desde_mostrador_dispatches_mail(): void
    {
        Mail::fake();

        $owner = User::factory()->create(['email' => 'owner_otp@club.com']);
        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Mostrador OTP',
            'subdominio' => 'club-mostrador-otp',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/clubs/club-mostrador-otp/clientes/enviar-otp', [
                'email' => 'claudio.nuevo@gmail.com',
                'nombre' => 'Claudio Nuevo',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        Mail::assertSent(EmailVerificationOtpMail::class, function ($mail) {
            return $mail->hasTo('claudio.nuevo@gmail.com');
        });

        $this->assertDatabaseHas('email_verifications', [
            'email' => 'claudio.nuevo@gmail.com',
        ]);
    }

    public function test_destroy_turno_con_reembolso_en_billetera_exige_otp_para_cliente_nuevo(): void
    {
        $owner = User::factory()->create(['email' => 'owner_dest1@club.com']);
        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Cancelacion 1',
            'subdominio' => 'club-cancel-1',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 20000,
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'fecha' => '2026-09-10',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'cliente_nombre' => 'Claudio Anonimo',
            'cliente_telefono' => '12345678',
            'monto_pagado' => 20000,
            'precio' => 20000,
            'estado' => 'reservado',
            'estado_pago' => 'pagado',
        ]);

        // Sin enviar código OTP -> debe retornar 422 con OTP_REQUIRED
        $response = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/clubs/club-cancel-1/turnos/{$turno->id}", [
                'accion_reembolso' => 'billetera',
                'cliente_email' => 'claudio.nuevo2@gmail.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'OTP_REQUIRED');
    }

    public function test_destroy_turno_con_reembolso_en_billetera_valida_otp_crea_usuario_y_acredita_billetera(): void
    {
        $owner = User::factory()->create(['email' => 'owner_dest2@club.com']);
        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Cancelacion 2',
            'subdominio' => 'club-cancel-2',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 2',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 20000,
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'fecha' => '2026-09-10',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:00',
            'cliente_nombre' => 'Claudio Test',
            'cliente_telefono' => '1122334455',
            'monto_pagado' => 20000,
            'precio' => 20000,
            'estado' => 'reservado',
            'estado_pago' => 'pagado',
        ]);

        // Crear registro OTP
        EmailVerification::create([
            'email' => 'claudio.exitoso@gmail.com',
            'codigo' => '654321',
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        // Ejecutar cancelación con reembolso y OTP
        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/clubs/club-cancel-2/turnos/{$turno->id}/cancelar", [
                'accion_reembolso' => 'billetera',
                'cliente_email' => 'claudio.exitoso@gmail.com',
                'cliente_nombre' => 'Claudio Test',
                'cliente_telefono' => '1122334455',
                'otp_codigo' => '654321',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('reembolso.monto', 20000)
            ->assertJsonPath('reembolso.nuevo_saldo_billetera', 20000);

        // Verificar que el usuario fue creado y marcado verificado
        $user = User::where('email', 'claudio.exitoso@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);

        // Verificar saldo de billetera virtual en user_creditos
        $credito = UserCredito::where('user_id', $user->id)
            ->where('complejo_id', $complejo->id)
            ->first();
        $this->assertNotNull($credito);
        $this->assertEquals(20000, (float) $credito->saldo);

        // Verificar que el turno fue actualizado
        $turno->refresh();
        $this->assertEquals('cancelado', $turno->estado);
        $this->assertEquals('reembolsado', $turno->estado_pago);
        $this->assertEquals($user->id, $turno->cliente_id);
    }

    public function test_destroy_turno_con_devolucion_efectivo_no_toca_billetera(): void
    {
        $owner = User::factory()->create(['email' => 'owner_dest3@club.com']);
        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Cancelacion 3',
            'subdominio' => 'club-cancel-3',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 3',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 15000,
        ]);

        $turno = Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'fecha' => '2026-09-10',
            'hora_inicio' => '19:00',
            'hora_fin' => '20:00',
            'cliente_nombre' => 'Pedro Mano',
            'monto_pagado' => 15000,
            'precio' => 15000,
            'estado' => 'reservado',
            'estado_pago' => 'pagado',
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/clubs/club-cancel-3/turnos/{$turno->id}", [
                'accion_reembolso' => 'efectivo',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('reembolso.metodo', 'efectivo');

        $turno->refresh();
        $this->assertEquals('cancelado', $turno->estado);
        $this->assertEquals('reembolsado', $turno->estado_pago);
    }

    public function test_verificar_email_cliente_retorna_existencia_y_datos_si_registrado(): void
    {
        $owner = User::factory()->create(['email' => 'owner_verif@club.com']);
        $complejo = Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Verif',
            'subdominio' => 'club-verif',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $cliente = User::factory()->create([
            'name' => 'Claudio Magnano',
            'email' => 'claudio@verif.com',
            'telefono' => '1155667788',
            'email_verified_at' => now(),
        ]);

        app(\App\Services\WalletService::class)->acreditar(
            $cliente->id,
            $complejo->id,
            12000.0,
            'carga_manual',
            null,
            'Saldo inicial'
        );

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clubs/club-verif/clientes/verificar-email?email=claudio@verif.com');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('exists', true)
            ->assertJsonPath('cliente.id', $cliente->id)
            ->assertJsonPath('cliente.name', 'Claudio Magnano')
            ->assertJsonPath('cliente.email', 'claudio@verif.com')
            ->assertJsonPath('cliente.saldo_billetera', 12000)
            ->assertJsonPath('cliente.is_verified', true);
    }

    public function test_verificar_email_cliente_retorna_exists_false_si_no_registrado(): void
    {
        $owner = User::factory()->create(['email' => 'owner_verif2@club.com']);
        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Verif 2',
            'subdominio' => 'club-verif-2',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clubs/club-verif-2/clientes/verificar-email?email=noexiste@verif.com');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('exists', false)
            ->assertJsonPath('email', 'noexiste@verif.com');
    }

    public function test_verificar_email_cliente_requiere_autenticacion_admin(): void
    {
        $owner = User::factory()->create(['email' => 'owner_verif3@club.com']);
        $otherUser = User::factory()->create(['email' => 'other@club.com']);
        Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club Verif 3',
            'subdominio' => 'club-verif-3',
            'plan_id' => Plan::first()->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        // Sin autenticación -> 403
        $resGuest = $this->getJson('/api/clubs/club-verif-3/clientes/verificar-email?email=test@test.com');
        $resGuest->assertStatus(403);

        // Usuario no admin -> 403
        $resOther = $this->actingAs($otherUser, 'sanctum')
            ->getJson('/api/clubs/club-verif-3/clientes/verificar-email?email=test@test.com');
        $resOther->assertStatus(403);
    }
}
