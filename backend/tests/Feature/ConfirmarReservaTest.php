<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\EmailVerification;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\ReservaLockService;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class ConfirmarReservaTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoPlata;
    protected Complejo $complejoBronce;
    protected Cancha $canchaPlata;
    protected Cancha $canchaBronce;
    protected User $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planPlata = Plan::where('slug', 'plata')->firstOrFail(); // Has reservas & turnos_fijos
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail(); // Has reservas but NOT turnos_fijos

        $this->complejoPlata = Complejo::create([
            'nombre' => 'Club Plata Sports',
            'subdominio' => 'plata-sports',
            'plan_id' => $planPlata->id,
            'estado' => 'activo',
        ]);

        $this->complejoBronce = Complejo::create([
            'nombre' => 'Club Bronce Basic',
            'subdominio' => 'bronce-basic',
            'plan_id' => $planBronce->id,
            'estado' => 'activo',
        ]);

        app()->instance('currentTenant', $this->complejoPlata);

        $this->canchaPlata = Cancha::create([
            'nombre' => 'Cancha Padel 1',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'techada' => true,
            'precio_base' => 10000.00,
            'estado' => 'activo',
        ]);

        // Monday schedule (1)
        HorarioAtencion::create([
            'dia_semana' => 1,
            'hora_apertura' => '08:00',
            'hora_cierre' => '23:00',
            'duracion_turno_minutos' => 60,
        ]);

        app()->instance('currentTenant', $this->complejoBronce);

        $this->canchaBronce = Cancha::create([
            'nombre' => 'Cancha Futbol Bronce',
            'deporte' => 'futbol',
            'superficie' => 'sintetico',
            'techada' => false,
            'precio_base' => 15000.00,
            'estado' => 'activo',
        ]);

        $this->cliente = User::factory()->create(['name' => 'Carlos Gomez', 'email' => 'carlos@example.com']);
        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-08-31 07:00:00', 'America/Argentina/Buenos_Aires'));
    }

    protected function tearDown(): void
    {
        \Carbon\Carbon::setTestNow();
        Redis::flushdb();
        parent::tearDown();
    }

    /**
     * Test successful transactional reservation confirmation and Redis lock release.
     */
    public function test_confirmar_reserva_exitosa(): void
    {
        $fecha = '2026-08-31'; // Monday
        $horaInicio = '18:00';

        // 1. Acquire Redis lock
        $lockResponse = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/bloquear-temporal', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
            ]);

        $lockResponse->assertStatus(200);
        $token = $lockResponse->json('token_reserva');

        $redisKey = ReservaLockService::getLockKey($this->canchaPlata->id, $fecha, $horaInicio);
        $this->assertTrue((bool) Redis::exists($redisKey));

        // 2. Confirm booking
        $confirmResponse = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
                'cliente_id' => $this->cliente->id,
                'token_reserva' => $token,
            ]);

        $confirmResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'turno' => [
                    'cancha_id' => $this->canchaPlata->id,
                    'fecha' => $fecha,
                    'estado' => 'reservado',
                    'cliente_id' => $this->cliente->id,
                ],
            ]);
        $this->assertStringStartsWith('18:00', $confirmResponse->json('turno.hora_inicio'));
        $this->assertStringStartsWith('19:00', $confirmResponse->json('turno.hora_fin'));

        // 3. Verify Redis lock was released
        $this->assertFalse((bool) Redis::exists($redisKey));

        // 4. Verify in DB
        app()->instance('currentTenant', $this->complejoPlata);
        $this->assertDatabaseHas('turnos', [
            'cancha_id' => $this->canchaPlata->id,
            'fecha' => $fecha,
            'hora_inicio' => '18:00',
            'estado' => 'reservado',
        ]);
    }

    /**
     * Test confirming an already reserved slot returns 409 Conflict.
     */
    public function test_confirmar_reserva_duplicada_retorna_409(): void
    {
        $fecha = '2026-08-31';
        $horaInicio = '19:00';

        app()->instance('currentTenant', $this->complejoPlata);

        Turno::create([
            'cancha_id' => $this->canchaPlata->id,
            'cliente_id' => $this->cliente->id,
            'fecha' => $fecha,
            'hora_inicio' => $horaInicio,
            'hora_fin' => '20:00',
            'precio' => 10000.00,
            'estado' => 'reservado',
        ]);

        $response = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'error' => 'SLOT_ALREADY_RESERVED',
            ]);
    }

    /**
     * Test creating recurring fixed slots for N weeks.
     */
    public function test_crear_turnos_fijos_recurrentes(): void
    {
        $response = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/fijos', [
                'cancha_id' => $this->canchaPlata->id,
                'cliente_id' => $this->cliente->id,
                'dia_semana' => 1, // Lunes
                'fecha_inicio' => '2026-08-31',
                'hora_inicio' => '21:00',
                'semanas' => 4,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'cantidad' => 4,
            ]);

        app()->instance('currentTenant', $this->complejoPlata);
        $turnos = Turno::where('cancha_id', $this->canchaPlata->id)
            ->where('hora_inicio', '21:00')
            ->where('es_fijo', true)
            ->get();

        $this->assertCount(4, $turnos);
        $this->assertEquals(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'], $turnos->pluck('fecha')->map(fn ($f) => $f->format('Y-m-d'))->toArray());
    }

    /**
     * Test recurring conflict causes transaction rollback and 409 Conflict.
     */
    public function test_turnos_fijos_con_conflicto_hace_rollback(): void
    {
        // Pre-reserve week 3 (2026-09-14) at 20:00
        app()->instance('currentTenant', $this->complejoPlata);
        Turno::create([
            'cancha_id' => $this->canchaPlata->id,
            'cliente_id' => $this->cliente->id,
            'fecha' => '2026-09-14',
            'hora_inicio' => '20:00',
            'hora_fin' => '21:00',
            'precio' => 10000.00,
            'estado' => 'reservado',
        ]);

        $response = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/fijos', [
                'cancha_id' => $this->canchaPlata->id,
                'cliente_id' => $this->cliente->id,
                'dia_semana' => 1,
                'fecha_inicio' => '2026-08-31',
                'hora_inicio' => '20:00',
                'semanas' => 4,
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'error' => 'RECURRING_SLOT_CONFLICT',
                'fecha_conflicto' => '2026-09-14',
            ]);

        // Verify none of the other fixed turnos were saved (rollback)
        $turnosFijos = Turno::where('cancha_id', $this->canchaPlata->id)
            ->where('hora_inicio', '20:00')
            ->where('es_fijo', true)
            ->get();

        $this->assertCount(0, $turnosFijos);
    }

    /**
     * Test tenant without turnos_fijos module receives 403 Forbidden.
     */
    public function test_turnos_fijos_requiere_modulo_activo(): void
    {
        // Complejo Bronce does not have turnos_fijos module
        $response = $this->actingAs($this->cliente)
            ->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->postJson('/api/turnos/fijos', [
                'cancha_id' => $this->canchaBronce->id,
                'cliente_id' => $this->cliente->id,
                'dia_semana' => 1,
                'fecha_inicio' => '2026-08-31',
                'hora_inicio' => '20:00',
                'semanas' => 4,
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'turnos_fijos',
            ]);
    }

    /**
     * Test confirming reservation with guest name and phone stores them accurately.
     */
    public function test_confirmar_reserva_guest_persiste_nombre_telefono_y_metodo_pago(): void
    {
        $fecha = '2026-08-31';
        $horaInicio = '17:00';

        $confirmResponse = $this->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
                'cliente_nombre' => 'Rodrigo De Paul',
                'cliente_telefono' => '+54 9 11 4444-3333',
                'metodo_pago' => 'transferencia',
                'precio' => 10000,
            ]);

        $confirmResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('turno.cliente_nombre', 'Rodrigo De Paul')
            ->assertJsonPath('turno.cliente_telefono', '+54 9 11 4444-3333')
            ->assertJsonPath('turno.metodo_pago', 'transferencia');

        app()->instance('currentTenant', $this->complejoPlata);
        $this->assertDatabaseHas('turnos', [
            'cancha_id' => $this->canchaPlata->id,
            'fecha' => $fecha,
            'hora_inicio' => '17:00',
            'cliente_nombre' => 'Rodrigo De Paul',
            'cliente_telefono' => '+54 9 11 4444-3333',
            'metodo_pago' => 'transferencia',
        ]);
    }

    public function test_admin_booking_with_email_links_client_id_and_without_email_leaves_cliente_id_null(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@admin.com',
        ]);

        $clienteExistente = User::factory()->create([
            'email' => 'jugador.existente@gmail.com',
            'name' => 'Jugador Existente',
        ]);

        $fecha = '2026-08-31';

        // 1. Admin crea reserva sin email -> cliente_id debe ser null (NO el admin)
        $resSinEmail = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => $fecha,
                'hora_inicio' => '10:00',
                'cliente_nombre' => 'Cliente Anonimo Mostrador',
                'metodo_pago' => 'mostrador',
                'precio' => 10000,
            ]);

        $resSinEmail->assertStatus(200);
        $this->assertNull($resSinEmail->json('turno.cliente_id'));

        // 2. Admin crea reserva con email de usuario existente -> cliente_id debe ser el usuario existente
        $resConEmail = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => $fecha,
                'hora_inicio' => '11:00',
                'cliente_nombre' => 'Jugador Existente',
                'cliente_email' => 'jugador.existente@gmail.com',
                'metodo_pago' => 'mostrador',
                'precio' => 10000,
            ]);

        $resConEmail->assertStatus(200);
        $this->assertEquals($clienteExistente->id, $resConEmail->json('turno.cliente_id'));
    }

    public function test_admin_booking_with_unregistered_email_and_valid_otp_creates_verified_user_and_links_cliente_id(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin_otp@admin.com',
        ]);
        $this->complejoPlata->update(['user_id' => $admin->id]);

        $newEmail = 'nuevo.jugador@gmail.com';
        $this->assertNull(User::where('email', $newEmail)->first());

        // Create OTP verification record
        EmailVerification::create([
            'email' => $newEmail,
            'codigo' => '789123',
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '12:00',
                'cliente_nombre' => 'Nuevo Jugador',
                'cliente_telefono' => '1198765432',
                'cliente_email' => $newEmail,
                'codigo_otp' => '789123',
                'metodo_pago' => 'mostrador',
                'precio' => 10000,
            ]);

        $response->assertStatus(200);

        $createdUser = User::where('email', $newEmail)->first();
        $this->assertNotNull($createdUser);
        $this->assertEquals('Nuevo Jugador', $createdUser->name);
        $this->assertEquals('1198765432', $createdUser->telefono);
        $this->assertNotNull($createdUser->email_verified_at);
        $this->assertEquals($createdUser->id, $response->json('turno.cliente_id'));
        $this->assertEquals(0, EmailVerification::where('email', $newEmail)->count());
    }

    public function test_admin_booking_with_unregistered_email_and_invalid_otp_fails(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin_otp2@admin.com',
        ]);
        $this->complejoPlata->update(['user_id' => $admin->id]);

        $newEmail = 'fallo.otp@gmail.com';
        EmailVerification::create([
            'email' => $newEmail,
            'codigo' => '789123',
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Tenant-ID', $this->complejoPlata->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $this->canchaPlata->id,
                'fecha' => '2026-08-31',
                'hora_inicio' => '13:00',
                'cliente_nombre' => 'Fallo OTP',
                'cliente_email' => $newEmail,
                'codigo_otp' => '000000',
                'metodo_pago' => 'mostrador',
                'precio' => 10000,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'INVALID_OTP');

        $this->assertNull(User::where('email', $newEmail)->first());
    }
}
