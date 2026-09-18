<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\RedirectResponse;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_google_redirect_generates_oauth_redirect_with_encoded_state(): void
    {
        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('with')->once()->with(Mockery::on(function ($arg) {
            if (!isset($arg['state'])) return false;
            $decoded = json_decode(base64_decode($arg['state']), true);
            return isset($decoded['returnTo']) && $decoded['returnTo'] === 'http://nico-padel.localhost:8080/reservas';
        }))->andReturnSelf();
        $mockProvider->shouldReceive('redirect')->once()->andReturn(
            new RedirectResponse('https://accounts.google.com/o/oauth2/auth?mock=true')
        );

        Socialite::shouldReceive('driver')->with('google')->andReturn($mockProvider);

        $response = $this->get('/api/auth/google/redirect?returnTo=' . urlencode('http://nico-padel.localhost:8080/reservas'));

        $response->assertStatus(302);
        $this->assertStringContainsString('accounts.google.com', $response->headers->get('Location'));
    }

    public function test_google_callback_creates_new_user_with_verified_email(): void
    {
        $mockSocialiteUser = Mockery::mock(SocialiteUser::class);
        $mockSocialiteUser->shouldReceive('getId')->andReturn('google-unique-id-12345');
        $mockSocialiteUser->shouldReceive('getEmail')->andReturn('nuevousuario@gmail.com');
        $mockSocialiteUser->shouldReceive('getName')->andReturn('Nuevo Usuario Google');
        $mockSocialiteUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/avatar.jpg');

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($mockProvider);

        $state = base64_encode(json_encode([
            'returnTo' => 'http://nico-padel.localhost:8080/reservas',
            'ts' => time(),
        ]));

        $response = $this->get('/api/auth/google/callback?state=' . urlencode($state));

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('nico-padel.localhost:8080/reservas', $location);
        $this->assertStringContainsString('auth_token=', $location);
        $this->assertStringContainsString('google_login=success', $location);

        $response->assertCookie('saas_auth_token');

        $this->assertDatabaseHas('users', [
            'email' => 'nuevousuario@gmail.com',
            'google_id' => 'google-unique-id-12345',
            'name' => 'Nuevo Usuario Google',
        ]);

        $user = User::where('email', 'nuevousuario@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_google_callback_links_existing_user_by_email(): void
    {
        $existingUser = User::factory()->create([
            'name' => 'Usuario Existente',
            'email' => 'existente@gmail.com',
            'google_id' => null,
            'avatar' => null,
        ]);

        $mockSocialiteUser = Mockery::mock(SocialiteUser::class);
        $mockSocialiteUser->shouldReceive('getId')->andReturn('google-linked-id-999');
        $mockSocialiteUser->shouldReceive('getEmail')->andReturn('existente@gmail.com');
        $mockSocialiteUser->shouldReceive('getName')->andReturn('Usuario Existente');
        $mockSocialiteUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/linked.jpg');

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('user')->once()->andReturn($mockSocialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($mockProvider);

        $state = base64_encode(json_encode([
            'returnTo' => 'http://nico-tenis.localhost:8080/turnos',
            'ts' => time(),
        ]));

        $response = $this->get('/api/auth/google/callback?state=' . urlencode($state));

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('nico-tenis.localhost:8080/turnos', $location);
        $this->assertStringContainsString('google_login=success', $location);

        // Verify existing user was updated and not duplicated
        $this->assertEquals(1, User::where('email', 'existente@gmail.com')->count());
        $existingUser->refresh();
        $this->assertEquals('google-linked-id-999', $existingUser->google_id);
        $this->assertEquals('https://lh3.googleusercontent.com/linked.jpg', $existingUser->avatar);
        $this->assertNotNull($existingUser->email_verified_at);
    }

    public function test_google_callback_handles_user_cancellation(): void
    {
        $state = base64_encode(json_encode([
            'returnTo' => 'http://localhost:8080/login',
        ]));

        $response = $this->get('/api/auth/google/callback?error=access_denied&state=' . urlencode($state));

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('google_login=cancelled', $location);
    }

    public function test_google_callback_handles_socialite_failure(): void
    {
        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('user')->once()->andThrow(new \Exception('OAuth token expired'));

        Socialite::shouldReceive('driver')->with('google')->andReturn($mockProvider);

        $state = base64_encode(json_encode([
            'returnTo' => 'http://localhost:8080/login',
        ]));

        $response = $this->get('/api/auth/google/callback?state=' . urlencode($state));

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('google_login=error', $location);
    }

    public function test_google_token_auth_endpoint_creates_or_authenticates_user(): void
    {
        $mockSocialiteUser = Mockery::mock(SocialiteUser::class);
        $mockSocialiteUser->shouldReceive('getId')->andReturn('google-token-id-777');
        $mockSocialiteUser->shouldReceive('getEmail')->andReturn('mobileuser@gmail.com');
        $mockSocialiteUser->shouldReceive('getName')->andReturn('Mobile User');
        $mockSocialiteUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/m.jpg');

        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('userFromToken')->with('valid-google-id-token')->once()->andReturn($mockSocialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($mockProvider);

        $response = $this->postJson('/api/auth/google/token', [
            'id_token' => 'valid-google-id-token',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Autenticación con Google exitosa',
            ])
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'mobileuser@gmail.com',
            'google_id' => 'google-token-id-777',
        ]);
    }

    public function test_google_token_auth_validates_required_token(): void
    {
        $response = $this->postJson('/api/auth/google/token', []);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Token de Google no proporcionado.',
            ]);
    }

    public function test_google_token_auth_handles_invalid_token(): void
    {
        $mockProvider = Mockery::mock(Provider::class);
        $mockProvider->shouldReceive('stateless')->once()->andReturnSelf();
        $mockProvider->shouldReceive('userFromToken')->with('invalid-token')->once()->andThrow(new \Exception('Invalid token'));

        Socialite::shouldReceive('driver')->with('google')->andReturn($mockProvider);

        $response = $this->postJson('/api/auth/google/token', [
            'id_token' => 'invalid-token',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Token de Google inválido o expirado.',
            ]);
    }

    public function test_google_redirect_to_dev_simulator_when_simulated(): void
    {
        $response = $this->get('/api/auth/google/redirect?simulate=1&returnTo=' . urlencode('http://nico-padel.localhost:8080/reservas'));

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('/api/auth/google/dev-simulator', $location);
        $this->assertStringContainsString('state=', $location);
    }

    public function test_google_dev_simulator_view_renders_successfully(): void
    {
        $state = base64_encode(json_encode([
            'returnTo' => 'http://nico-padel.localhost:8080/reservas',
            'ts' => time(),
        ]));

        $response = $this->get('/api/auth/google/dev-simulator?state=' . urlencode($state));

        $response->assertStatus(200);
        $response->assertSee('Acceder con Google');
        $response->assertSee('Simulador Dev');
        $response->assertSee('Continuar y Autorizar');
        $response->assertSee('Nicolás Dóvico');
        $response->assertSee('nicolasdovico@gmail.com');
    }

    public function test_google_dev_callback_creates_and_authenticates_user(): void
    {
        $state = base64_encode(json_encode([
            'returnTo' => 'http://nico-padel.localhost:8080/reservas',
            'ts' => time(),
        ]));

        $response = $this->post('/api/auth/google/dev-callback', [
            'state' => $state,
            'name' => 'Nicolás Dóvico Dev',
            'email' => 'nicolasdev@example.com',
            'google_id' => 'dev-user-123456',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('nico-padel.localhost:8080/reservas', $location);
        $this->assertStringContainsString('auth_token=', $location);
        $this->assertStringContainsString('google_login=success', $location);

        $response->assertCookie('saas_auth_token');

        $this->assertDatabaseHas('users', [
            'email' => 'nicolasdev@example.com',
            'google_id' => 'dev-user-123456',
            'name' => 'Nicolás Dóvico Dev',
        ]);

        $user = User::where('email', 'nicolasdev@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_google_dev_callback_links_existing_user(): void
    {
        $existingUser = User::factory()->create([
            'name' => 'Usuario Existente Dev',
            'email' => 'existentedev@gmail.com',
            'google_id' => null,
        ]);

        $state = base64_encode(json_encode([
            'returnTo' => 'http://nico-tenis.localhost:8080/turnos',
            'ts' => time(),
        ]));

        $response = $this->post('/api/auth/google/dev-callback', [
            'state' => $state,
            'name' => 'Usuario Existente Dev',
            'email' => 'existentedev@gmail.com',
            'google_id' => 'dev-google-linked-id-555',
            'avatar' => 'https://example.com/avatar2.jpg',
        ]);

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('nico-tenis.localhost:8080/turnos', $location);
        $this->assertStringContainsString('google_login=success', $location);

        $this->assertEquals(1, User::where('email', 'existentedev@gmail.com')->count());
        $existingUser->refresh();
        $this->assertEquals('dev-google-linked-id-555', $existingUser->google_id);
    }

    public function test_google_dev_endpoints_forbidden_in_production(): void
    {
        $this->app['env'] = 'production';

        $responseSimulator = $this->get('/api/auth/google/dev-simulator');
        $responseSimulator->assertStatus(404);

        $responseCallback = $this->post('/api/auth/google/dev-callback', [
            'name' => 'Test',
            'email' => 'test@example.com',
            'google_id' => '123',
        ]);
        $responseCallback->assertStatus(404);
    }
}
