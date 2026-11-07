<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jugador Demo',
            'email' => 'jugador@turnos.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
                'message',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'jugador@turnos.test',
        ]);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@turnos.test',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@turnos.test',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@turnos.test',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@turnos.test',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'error' => 'INVALID_CREDENTIALS',
            ]);
    }

    public function test_authenticated_user_can_get_profile_and_logout(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_token')->plainTextToken;

        // Probar /api/auth/me
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(200)
            ->assertJsonPath('user.email', $user->email);

        // Probar logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');

        $logoutResponse->assertStatus(200);
        $this->assertCount(0, $user->fresh()->tokens);
    }

    public function test_auth_me_and_login_return_clubes_como_jugador(): void
    {
        $owner = User::factory()->create();
        $plan = \App\Models\Plan::first() ?? \App\Models\Plan::create([
            'nombre' => 'Plan Test',
            'slug' => 'plan-test',
            'precio_mensual' => 10,
            'limite_canchas' => 5,
        ]);
        $complejo = \App\Models\Complejo::create([
            'user_id' => $owner->id,
            'nombre' => 'Club de Prueba',
            'subdominio' => 'club-prueba',
            'plan_id' => $plan->id,
            'estado' => 'activo',
            'deporte_principal' => 'pádel',
        ]);

        $jugador = User::factory()->create([
            'email' => 'jugador.test@turnos.com',
            'password' => bcrypt('password123'),
        ]);

        // Registrar al jugador como Cliente en el complejo
        \App\Models\Cliente::create([
            'complejo_id' => $complejo->id,
            'nombre' => 'Jugador Test',
            'email' => $jugador->email,
            'telefono' => '1122334455',
            'estado' => 'activo',
        ]);

        // Probar /api/auth/login
        $loginRes = $this->postJson('/api/auth/login', [
            'email' => 'jugador.test@turnos.com',
            'password' => 'password123',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'complejos',
                    'clubes_jugador' => [
                        '*' => ['id', 'nombre', 'subdominio', 'deporte_principal'],
                    ],
                ],
            ])
            ->assertJsonCount(1, 'user.clubes_jugador')
            ->assertJsonPath('user.clubes_jugador.0.subdominio', 'club-prueba');

        $token = $loginRes->json('token');

        // Probar /api/auth/me
        $meRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $meRes->assertStatus(200)
            ->assertJsonCount(1, 'user.clubes_jugador')
            ->assertJsonPath('user.clubes_jugador.0.nombre', 'Club de Prueba');
    }

    public function test_registration_fails_if_telefono_contains_letters(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Cliente Con Letras',
            'email' => 'cliente.letras@turnos.test',
            'telefono' => '11abcd2233',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);
    }

    public function test_registration_fails_if_telefono_has_less_than_8_digits(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Cliente Corto',
            'email' => 'cliente.corto@turnos.test',
            'telefono' => '12345',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);
    }

    public function test_registration_fails_if_telefono_has_more_than_15_digits(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Cliente Largo',
            'email' => 'cliente.largo@turnos.test',
            'telefono' => '12345678901234567',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['telefono']);
    }

    public function test_registration_succeeds_with_valid_whatsapp_telefono(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Cliente Valido',
            'email' => 'cliente.valido@turnos.test',
            'telefono' => '+54 9 11 2345-6789',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.telefono', '+54 9 11 2345-6789');

        $this->assertDatabaseHas('users', [
            'email' => 'cliente.valido@turnos.test',
            'telefono' => '+54 9 11 2345-6789',
        ]);
    }
}

