<?php

namespace Tests\Feature;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\Plan;
use App\Models\Turno;
use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubBilleterasAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected Complejo $complejo;
    protected User $cliente1;
    protected User $cliente2;

    protected function setUp(): void
    {
        parent::setUp();

        $plan = Plan::firstOrCreate(
            ['slug' => 'club-pro'],
            ['nombre' => 'Club Pro', 'precio_mensual' => 10000, 'estado' => 'activo']
        );

        $this->owner = User::factory()->create([
            'name' => 'Owner Padel',
            'email' => 'owner@padelclub.test',
        ]);

        $this->complejo = Complejo::create([
            'user_id' => $this->owner->id,
            'nombre' => 'Padel Club Center',
            'subdominio' => 'padel-center',
            'plan_id' => $plan->id,
            'deporte_principal' => 'padel',
            'estado' => 'activo',
        ]);

        $this->cliente1 = User::factory()->create([
            'name' => 'Agustín Tapia',
            'email' => 'tapia@padel.test',
            'telefono' => '+54 9 11 1111-2222',
        ]);

        $this->cliente2 = User::factory()->create([
            'name' => 'Federico Chingotto',
            'email' => 'chingotto@padel.test',
            'telefono' => '+54 9 11 3333-4444',
        ]);
    }

    public function test_club_owner_can_list_wallets_and_metrics(): void
    {
        $walletService = app(WalletService::class);
        $walletService->acreditar($this->cliente1->id, $this->complejo->id, 15000, 'carga_manual', null, 'Carga en mostrador');
        $walletService->acreditar($this->cliente2->id, $this->complejo->id, 5000, 'reembolso_cancelacion', null, 'Reembolso por lluvia');

        $response = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/billeteras");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('metricas.total_saldo', 20000)
            ->assertJsonPath('metricas.clientes_con_saldo', 2)
            ->assertJsonPath('metricas.total_movimientos', 2)
            ->assertJsonCount(2, 'billeteras.data');

        $this->assertEquals(15000, $response->json('billeteras.data.0.saldo'));
        $this->assertEquals('Agustín Tapia', $response->json('billeteras.data.0.user.name'));
    }

    public function test_club_owner_can_filter_wallets_by_search_and_saldo(): void
    {
        $walletService = app(WalletService::class);
        $walletService->acreditar($this->cliente1->id, $this->complejo->id, 15000, 'carga_manual', null, 'Carga en mostrador');
        // Cliente 2 has 0 balance (created but debited completely)
        $walletService->acreditar($this->cliente2->id, $this->complejo->id, 5000, 'carga_manual', null, 'Carga inicial');
        $walletService->debitar($this->cliente2->id, $this->complejo->id, 5000, 'ajuste_manual', null, 'Devolución total');

        // Search by name
        $searchResponse = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/billeteras?search=Tapia");

        $searchResponse->assertStatus(200)
            ->assertJsonCount(1, 'billeteras.data')
            ->assertJsonPath('billeteras.data.0.user.name', 'Agustín Tapia');

        // Filter solo con saldo
        $filterResponse = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/billeteras?solo_con_saldo=true");

        $filterResponse->assertStatus(200)
            ->assertJsonCount(1, 'billeteras.data')
            ->assertJsonPath('billeteras.data.0.user.name', 'Agustín Tapia');
    }

    public function test_club_owner_can_view_client_wallet_movements(): void
    {
        $cancha = Cancha::create([
            'complejo_id' => $this->complejo->id,
            'nombre' => 'Cancha Central',
            'deporte' => 'padel',
            'superficie' => 'sintetico',
            'precio_base' => 10000,
            'estado' => 'activa',
        ]);

        $turno = Turno::create([
            'complejo_id' => $this->complejo->id,
            'cancha_id' => $cancha->id,
            'cliente_id' => $this->cliente1->id,
            'fecha' => '2026-10-10',
            'hora_inicio' => '18:00',
            'hora_fin' => '19:30',
            'precio' => 10000,
            'estado' => 'cancelado',
        ]);

        $walletService = app(WalletService::class);
        $walletService->acreditar($this->cliente1->id, $this->complejo->id, 5000, 'reembolso_cancelacion', $turno->id, 'Reembolso cancelación anticipada');
        $walletService->debitar($this->cliente1->id, $this->complejo->id, 2000, 'uso_reserva', null, 'Pago parcial turno');

        $response = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/billeteras/{$this->cliente1->id}/movimientos");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('cliente.id', $this->cliente1->id)
            ->assertJsonPath('cliente.saldo', 3000)
            ->assertJsonCount(2, 'movimientos');

        // The most recent movement should be the debit
        $this->assertEquals(-2000, $response->json('movimientos.0.monto'));
        $this->assertEquals('uso_reserva', $response->json('movimientos.0.tipo'));
        // The second movement has turno relation
        $this->assertEquals(5000, $response->json('movimientos.1.monto'));
        $this->assertEquals('Cancha Central', $response->json('movimientos.1.turno.cancha_nombre'));
    }

    public function test_club_owner_can_credit_and_debit_wallet_manually(): void
    {
        // 1. Credit 8000
        $creditResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/billeteras/ajustar", [
                'user_id' => $this->cliente1->id,
                'monto' => 8000,
                'tipo_operacion' => 'acreditar',
                'motivo' => 'Pago en efectivo adelantado en caja mostrador',
            ]);

        $creditResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('nuevo_saldo', 8000);

        $this->assertDatabaseHas('user_creditos', [
            'user_id' => $this->cliente1->id,
            'complejo_id' => $this->complejo->id,
            'saldo' => 8000,
        ]);

        // 2. Debit 3000
        $debitResponse = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/billeteras/ajustar", [
                'user_id' => $this->cliente1->id,
                'monto' => 3000,
                'tipo_operacion' => 'debitar',
                'motivo' => 'Devolución de saldo en efectivo solicitada por el cliente',
            ]);

        $debitResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('nuevo_saldo', 5000);

        $this->assertDatabaseHas('user_creditos', [
            'user_id' => $this->cliente1->id,
            'complejo_id' => $this->complejo->id,
            'saldo' => 5000,
        ]);
    }

    public function test_debit_fails_if_insufficient_balance(): void
    {
        app(WalletService::class)->acreditar($this->cliente1->id, $this->complejo->id, 2000, 'carga_manual', null, 'Saldo inicial');

        $response = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/billeteras/ajustar", [
                'user_id' => $this->cliente1->id,
                'monto' => 5000,
                'tipo_operacion' => 'debitar',
                'motivo' => 'Intento de débito mayor al disponible',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Saldo insuficiente para debitar. El cliente dispone de $2.000,00.');
    }

    public function test_unauthenticated_or_unauthorized_user_cannot_manage_wallets(): void
    {
        $stranger = User::factory()->create(['email' => 'stranger@other.com']);

        // 1. Unauthenticated
        $this->getJson("/api/clubs/{$this->complejo->subdominio}/billeteras")
            ->assertStatus(401);

        // 2. Unauthorized
        $this->actingAs($stranger, 'sanctum')
            ->getJson("/api/clubs/{$this->complejo->subdominio}/billeteras")
            ->assertStatus(403);

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/clubs/{$this->complejo->subdominio}/billeteras/ajustar", [
                'user_id' => $this->cliente1->id,
                'monto' => 1000,
                'tipo_operacion' => 'acreditar',
                'motivo' => 'Sin permisos',
            ])
            ->assertStatus(403);
    }
}
