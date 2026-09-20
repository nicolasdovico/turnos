<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Cliente;
use App\Models\Complejo;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Models\UserCredito;
use App\Models\ValeCredito;
use App\Models\WalletMovimiento;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClubClienteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\ModuloSeeder::class,
            \Database\Seeders\PlanSeeder::class,
        ]);
    }

    protected function crearComplejoConAdmin(string $subdominio = 'club-padel'): array
    {
        $admin = User::factory()->create([
            'name' => 'Admin Club',
            'email' => "admin@{$subdominio}.com",
            'password' => bcrypt('password'),
        ]);

        $plan = Plan::where('slug', 'oro')->first();

        $complejo = Complejo::create([
            'user_id' => $admin->id,
            'nombre' => ucfirst(str_replace('-', ' ', $subdominio)),
            'subdominio' => $subdominio,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
            'plan_id' => $plan->id,
        ]);

        return [$complejo, $admin];
    }

    public function test_admin_can_list_clients_with_metrics(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-center');

        // Crear clientes
        Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Carlos Tevez',
            'telefono' => '1144556677',
            'email' => 'tevez@boca.com',
            'estado' => 'activo',
        ]);

        Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Juan Roman',
            'telefono' => '1199887766',
            'email' => 'roman@boca.com',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'success',
                'metricas' => [
                    'total_clientes',
                    'clientes_activos_mes',
                    'total_saldo_billeteras',
                    'vales_activos_count',
                    'clientes_bloqueados',
                ],
                'paginacion' => ['current_page', 'total'],
                'clientes',
            ]);

        $this->assertEquals(2, $response->json('metricas.total_clientes'));
        $this->assertCount(2, $response->json('clientes'));
    }

    public function test_admin_can_search_and_filter_clients(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-search');

        $c1 = Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Fernando Belasteguin',
            'telefono' => '1122334455',
            'email' => 'bela@padel.com',
            'estado' => 'activo',
        ]);

        $c2 = Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Agustin Tapia',
            'telefono' => '1199001122',
            'email' => 'tapia@padel.com',
            'estado' => 'bloqueado',
            'motivo_bloqueo' => 'Inasistencias reiteradas',
        ]);

        // Búsqueda por texto
        $resSearch = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes?search=Tapia");
        $resSearch->assertStatus(200);
        $this->assertCount(1, $resSearch->json('clientes'));
        $this->assertEquals('Agustin Tapia', $resSearch->json('clientes.0.nombre'));

        // Filtro por estado
        $resBloqueados = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes?estado=bloqueado");
        $resBloqueados->assertStatus(200);
        $this->assertCount(1, $resBloqueados->json('clientes'));
        $this->assertEquals('Agustin Tapia', $resBloqueados->json('clientes.0.nombre'));
    }

    public function test_multi_tenant_isolation_club_a_cannot_see_club_b_clients(): void
    {
        [$complejoA, $adminA] = $this->crearComplejoConAdmin('club-alpha');
        [$complejoB, $adminB] = $this->crearComplejoConAdmin('club-beta');

        Cliente::create([
            'complejo_id' => $complejoA->id,
            'nombre' => 'Cliente Exclusivo Alpha',
            'telefono' => '1111111111',
            'estado' => 'activo',
        ]);

        Cliente::create([
            'complejo_id' => $complejoB->id,
            'nombre' => 'Cliente Exclusivo Beta',
            'telefono' => '2222222222',
            'estado' => 'activo',
        ]);

        $resA = $this->actingAs($adminA, 'sanctum')
            ->getJson("/api/clubs/{$complejoA->subdominio}/clientes");
        $resA->assertStatus(200);
        $this->assertCount(1, $resA->json('clientes'));
        $this->assertEquals('Cliente Exclusivo Alpha', $resA->json('clientes.0.nombre'));

        // Admin B intentando consultar club A debe recibir 403 Forbidden
        $resForbidden = $this->actingAs($adminB, 'sanctum')
            ->getJson("/api/clubs/{$complejoA->subdominio}/clientes");
        $resForbidden->assertStatus(403);
    }

    public function test_admin_can_create_new_client(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-create');

        $payload = [
            'nombre' => 'Martin Di Nenno',
            'telefono' => '1155443322',
            'email' => 'dinenno@padel.com',
            'dni' => '35123456',
            'notas' => 'Prefiere jugar al revés. Muy puntual.',
            'estado' => 'activo',
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Cliente registrado exitosamente en el club.',
            ]);

        $this->assertDatabaseHas('clientes', [
            'complejo_id' => $complejo->id,
            'nombre' => 'Martin Di Nenno',
            'telefono' => '1155443322',
            'email' => 'dinenno@padel.com',
        ]);
    }

    public function test_create_client_validates_unique_phone_in_same_club(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-unique');

        Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Jugador Uno',
            'telefono' => '1133334444',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", [
                'nombre' => 'Jugador Dos',
                'telefono' => '1133334444',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);
    }

    public function test_create_and_update_client_validates_numeric_phone_and_dni(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-validation');

        // Rechaza teléfono con letras
        $resInvalidPhone = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", [
                'nombre' => 'Cliente Letras Tel',
                'telefono' => '1144telefono',
            ]);
        $resInvalidPhone->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);

        // Rechaza teléfono demasiado corto
        $resShortPhone = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", [
                'nombre' => 'Cliente Tel Corto',
                'telefono' => '12345',
            ]);
        $resShortPhone->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);

        // Rechaza DNI con letras
        $resInvalidDni = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", [
                'nombre' => 'Cliente Letras DNI',
                'dni' => '38ABCD56',
            ]);
        $resInvalidDni->assertStatus(422)
            ->assertJsonValidationErrors(['dni']);

        // Rechaza DNI demasiado corto
        $resShortDni = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", [
                'nombre' => 'Cliente DNI Corto',
                'dni' => '123',
            ]);
        $resShortDni->assertStatus(422)
            ->assertJsonValidationErrors(['dni']);

        // Acepta cliente con teléfono internacional o estándar y DNI numérico
        $resValid = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clubs/{$complejo->subdominio}/clientes", [
                'nombre' => 'Cliente Válido',
                'telefono' => '+5491144556677',
                'dni' => '38123456',
            ]);
        $resValid->assertStatus(201);
        $clienteId = $resValid->json('cliente.id');

        // En actualización también valida rechazo de letras en DNI
        $resUpdateInvalidDni = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clubs/{$complejo->subdominio}/clientes/{$clienteId}", [
                'dni' => 'no-numerico',
            ]);
        $resUpdateInvalidDni->assertStatus(422)
            ->assertJsonValidationErrors(['dni']);

        // En actualización también valida rechazo de teléfono no numérico
        $resUpdateInvalidPhone = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clubs/{$complejo->subdominio}/clientes/{$clienteId}", [
                'telefono' => 'invalido-wa',
            ]);
        $resUpdateInvalidPhone->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);
    }

    public function test_admin_can_view_360_client_profile(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-360');

        $user = User::factory()->create([
            'name' => 'Franco Stupaczuk',
            'email' => 'stupa@padel.com',
            'telefono' => '1177889900',
        ]);

        $cliente = Cliente::create([
            'complejo_id' => $complejo->id,
            'user_id' => $user->id,
            'nombre' => $user->name,
            'telefono' => $user->telefono,
            'email' => $user->email,
            'notas' => 'Jugador profesional de drive.',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 1 Panorámica',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'precio_base' => 20000,
            'estado' => 'activo',
        ]);

        // Crear turno jugado pasado para el cliente
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $user->id,
            'club_cliente_id' => $cliente->id,
            'fecha' => now()->subDays(2)->toDateString(),
            'hora_inicio' => '18:00',
            'hora_fin' => '19:30',
            'precio' => 20000,
            'monto_pagado' => 20000,
            'saldo_pendiente' => 0,
            'estado' => 'completado',
            'estado_pago' => 'pagado_total',
        ]);

        // Crear turno futuro agendado para el cliente
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $user->id,
            'club_cliente_id' => $cliente->id,
            'fecha' => now()->addDays(3)->toDateString(),
            'hora_inicio' => '20:00',
            'hora_fin' => '21:30',
            'precio' => 25000,
            'monto_pagado' => 10000,
            'saldo_pendiente' => 15000,
            'estado' => 'reservado',
            'estado_pago' => 'senado',
        ]);

        // Crear saldo en billetera
        UserCredito::create([
            'complejo_id' => $complejo->id,
            'user_id' => $user->id,
            'saldo' => 5000.00,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes/{$cliente->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cliente' => [
                    'id' => $cliente->id,
                    'nombre' => 'Franco Stupaczuk',
                    'saldo_billetera' => 5000.0,
                ],
                'estadisticas' => [
                    'total_turnos' => 2,
                    'turnos_jugados' => 1,
                    'turnos_futuros' => 1,
                    'turnos_cancelados' => 0,
                    'tasa_cumplimiento' => 100.0,
                ],
            ])
            ->assertJsonStructure([
                'success',
                'cliente',
                'estadisticas' => [
                    'total_turnos',
                    'turnos_jugados',
                    'turnos_futuros',
                    'turnos_cancelados',
                    'tasa_cumplimiento',
                ],
                'turnos',
                'billetera',
                'vales',
            ]);
    }

    public function test_admin_can_update_client_data_and_notes(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-update');

        $cliente = Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Nombre Viejo',
            'telefono' => '1122223333',
            'notas' => 'Nota inicial',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clubs/{$complejo->subdominio}/clientes/{$cliente->id}", [
                'nombre' => 'Nombre Nuevo',
                'telefono' => '1199998888',
                'notas' => 'Nota actualizada con observaciones',
                'estado' => 'bloqueado',
                'motivo_bloqueo' => 'Moroso en cantina',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cliente' => [
                    'nombre' => 'Nombre Nuevo',
                    'telefono' => '1199998888',
                    'estado' => 'bloqueado',
                    'motivo_bloqueo' => 'Moroso en cantina',
                ],
            ]);

        $this->assertDatabaseHas('clientes', [
            'id' => $cliente->id,
            'nombre' => 'Nombre Nuevo',
            'telefono' => '1199998888',
            'estado' => 'bloqueado',
        ]);
    }

    public function test_admin_can_update_client_and_clear_optional_fields(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-clear-fields');

        $cliente = Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Jugador Completo',
            'telefono' => '1144556677',
            'email' => 'jugador@completo.com',
            'dni' => '35123456',
            'notas' => 'Alguna nota previa',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clubs/{$complejo->subdominio}/clientes/{$cliente->id}", [
                'nombre' => 'Jugador Sin Datos Extra',
                'telefono' => null,
                'email' => null,
                'dni' => null,
                'notas' => null,
                'estado' => 'activo',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'cliente' => [
                    'id' => $cliente->id,
                    'nombre' => 'Jugador Sin Datos Extra',
                    'telefono' => null,
                    'email' => null,
                    'dni' => null,
                    'notas' => null,
                ],
            ]);

        $this->assertDatabaseHas('clientes', [
            'id' => $cliente->id,
            'nombre' => 'Jugador Sin Datos Extra',
            'telefono' => null,
            'email' => null,
            'dni' => null,
            'notas' => null,
        ]);
    }

    public function test_admin_cannot_delete_client_with_active_turnos(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-delete');

        $cliente = Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cliente Con Turno',
            'telefono' => '1144445555',
            'estado' => 'activo',
        ]);

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 2',
            'deporte' => 'padel',
            'superficie' => 'cemento',
            'precio_base' => 15000,
            'estado' => 'activo',
        ]);

        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'club_cliente_id' => $cliente->id,
            'fecha' => now()->addDays(2)->toDateString(),
            'hora_inicio' => '20:00',
            'hora_fin' => '21:00',
            'precio' => 15000,
            'estado' => 'reservado',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/clubs/{$complejo->subdominio}/clientes/{$cliente->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertDatabaseHas('clientes', [
            'id' => $cliente->id,
        ]);
    }

    public function test_autocomplete_sugerencias_returns_matching_clients(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-sug');

        Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Federico Chingotto',
            'telefono' => '1188776655',
            'estado' => 'activo',
        ]);

        Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Alejandro Galan',
            'telefono' => '1166554433',
            'estado' => 'activo',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes/sugerencias?q=Chingo");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $sugerencias = $response->json('sugerencias');
        $this->assertCount(1, $sugerencias);
        $this->assertEquals('Federico Chingotto', $sugerencias[0]['nombre']);
    }

    public function test_confirming_turno_automatically_creates_or_links_cliente(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-auto');

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha 3',
            'deporte' => 'padel',
            'superficie' => 'sintetico_wpt',
            'precio_base' => 18000,
            'estado' => 'activo',
        ]);

        $fecha = now()->addDay()->toDateString();

        $response = $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Tenant-ID', $complejo->uuid)
            ->postJson('/api/turnos/confirmar', [
                'cancha_id' => $cancha->id,
                'fecha' => $fecha,
                'hora_inicio' => '17:00',
                'hora_fin' => '18:30',
                'cliente_nombre' => 'Leo Messi',
                'cliente_telefono' => '1198765432',
                'metodo_pago' => 'mostrador',
                'monto_pagado' => 9000,
            ]);

        $response->assertStatus(200);

        // Verificar que el turno tiene club_cliente_id
        $turno = Turno::where('complejo_id', $complejo->id)->where('cliente_nombre', 'Leo Messi')->first();
        $this->assertNotNull($turno);
        $this->assertNotNull($turno->club_cliente_id);

        // Verificar que existe el cliente en el directorio
        $cliente = Cliente::find($turno->club_cliente_id);
        $this->assertNotNull($cliente);
        $this->assertEquals('Leo Messi', $cliente->nombre);
        $this->assertEquals('1198765432', $cliente->telefono);
        $this->assertEquals($complejo->id, $cliente->complejo_id);
    }

    public function test_turnos_distinguish_past_played_from_future_scheduled_and_accurately_report_ultimo_y_proximo_turno(): void
    {
        [$complejo, $admin] = $this->crearComplejoConAdmin('padel-fechas');

        $cancha = Cancha::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Cancha Central',
            'deporte' => 'padel',
            'superficie' => 'cristal',
            'precio_base' => 22000,
            'estado' => 'activo',
        ]);

        $cliente = Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Fernando Belasteguin',
            'telefono' => '1133445566',
            'email' => 'bela@padel.com',
            'estado' => 'activo',
        ]);

        $fechaPasada = now()->subDays(3)->toDateString();
        $fechaProxima = now()->addDays(2)->toDateString();
        $fechaFuturaFija = now()->addMonths(6)->toDateString(); // e.g. 2027

        // Turno pasado jugado
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'club_cliente_id' => $cliente->id,
            'fecha' => $fechaPasada,
            'hora_inicio' => '19:00',
            'hora_fin' => '20:30',
            'precio' => 20000,
            'monto_pagado' => 20000,
            'saldo_pendiente' => 0,
            'estado' => 'completado',
            'estado_pago' => 'pagado_total',
        ]);

        // Turno próximo en agenda
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'club_cliente_id' => $cliente->id,
            'fecha' => $fechaProxima,
            'hora_inicio' => '18:00',
            'hora_fin' => '19:30',
            'precio' => 22000,
            'monto_pagado' => 10000,
            'saldo_pendiente' => 12000,
            'estado' => 'reservado',
            'estado_pago' => 'senado',
        ]);

        // Turno fijo futuro a 6 meses (marzo 2027)
        Turno::create([
            'complejo_id' => $complejo->id,
            'cancha_id' => $cancha->id,
            'club_cliente_id' => $cliente->id,
            'fecha' => $fechaFuturaFija,
            'hora_inicio' => '21:00',
            'hora_fin' => '22:30',
            'precio' => 22000,
            'monto_pagado' => 0,
            'saldo_pendiente' => 22000,
            'estado' => 'reservado',
            'estado_pago' => 'pendiente',
            'es_fijo' => true,
        ]);

        // 1. Probar listado general
        $resList = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes");

        $resList->assertStatus(200);
        $item = $resList->json('clientes.0');

        $this->assertEquals(3, $item['total_turnos']);
        $this->assertEquals(1, $item['turnos_jugados']);
        $this->assertEquals(2, $item['turnos_futuros']);
        $this->assertEquals(0, $item['turnos_cancelados']);

        // Último turno debe ser el jugado en el pasado, NUNCA el de 2027
        $this->assertNotNull($item['ultimo_turno']);
        $this->assertEquals($fechaPasada, $item['ultimo_turno']['fecha']);
        $this->assertEquals('19:00', $item['ultimo_turno']['hora_inicio']);

        // Próximo turno debe ser el más cercano en agenda
        $this->assertNotNull($item['proximo_turno']);
        $this->assertEquals($fechaProxima, $item['proximo_turno']['fecha']);
        $this->assertEquals('18:00', $item['proximo_turno']['hora_inicio']);

        // 2. Probar Ficha 360
        $resFicha = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/clubs/{$complejo->subdominio}/clientes/{$cliente->id}");

        $resFicha->assertStatus(200);
        $stats = $resFicha->json('estadisticas');
        $this->assertEquals(3, $stats['total_turnos']);
        $this->assertEquals(1, $stats['turnos_jugados']);
        $this->assertEquals(2, $stats['turnos_futuros']);
        $this->assertEquals(0, $stats['turnos_cancelados']);

        $turnos = $resFicha->json('turnos');
        $this->assertCount(3, $turnos);

        $turnoFuturoLejano = collect($turnos)->firstWhere('fecha', $fechaFuturaFija);
        $this->assertTrue($turnoFuturoLejano['es_futuro']);
        $this->assertTrue($turnoFuturoLejano['es_fijo']);
        $this->assertEquals('pendiente', $turnoFuturoLejano['estado_pago']);

        $turnoPasado = collect($turnos)->firstWhere('fecha', $fechaPasada);
        $this->assertFalse($turnoPasado['es_futuro']);
    }
}
