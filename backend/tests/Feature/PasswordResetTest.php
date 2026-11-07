<?php

namespace Tests\Feature;

use App\Mail\PasswordResetOtpMail;
use App\Models\EmailVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_solicitar_codigo_recuperacion_envia_correo_con_otp(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'jugador@example.com',
            'name' => 'Martín Di Nenno',
            'password' => Hash::make('claveVieja123'),
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'jugador@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        // Verificar que se guardó en email_verifications
        $this->assertDatabaseHas('email_verifications', [
            'email' => 'jugador@example.com',
            'tipo' => 'password_reset',
        ]);

        $verification = EmailVerification::where('email', 'jugador@example.com')
            ->where('tipo', 'password_reset')
            ->first();

        $this->assertNotNull($verification);
        $this->assertEquals(6, strlen($verification->codigo));

        // Verificar despacho de correo
        Mail::assertSent(PasswordResetOtpMail::class, function ($mail) use ($verification) {
            return $mail->hasTo('jugador@example.com') && $mail->codigo === $verification->codigo;
        });
    }

    public function test_solicitar_recuperacion_con_email_inexistente_retorna_200_sin_revelar_usuario(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'no_existe@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        Mail::assertNothingSent();
    }

    public function test_aplica_cooldown_de_60_segundos_al_solicitar_codigo_repetido(): void
    {
        Mail::fake();

        User::factory()->create([
            'email' => 'cooldown@example.com',
        ]);

        // Primera solicitud: OK
        $this->postJson('/api/auth/forgot-password', [
            'email' => 'cooldown@example.com',
        ])->assertStatus(200);

        // Segunda solicitud inmediata: 429 Cooldown
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'cooldown@example.com',
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
                'cooldown' => true,
            ]);
    }

    public function test_reset_password_exitoso_actualiza_hash_y_revoca_tokens_previos(): void
    {
        $user = User::factory()->create([
            'email' => 'cambio@example.com',
            'password' => Hash::make('passwordAntiguo123'),
        ]);

        // Token Sanctum previo
        $oldToken = $user->createToken('old-device')->plainTextToken;
        $this->assertCount(1, $user->fresh()->tokens);

        // Registro de verificación
        EmailVerification::create([
            'email' => 'cambio@example.com',
            'codigo' => '849201',
            'tipo' => 'password_reset',
            'expires_at' => now()->addMinutes(15),
            'intentos' => 0,
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'email' => 'cambio@example.com',
            'codigo' => '849201',
            'password' => 'nuevaPasswordSegura2026',
            'password_confirmation' => 'nuevaPasswordSegura2026',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        // Verificar que el usuario puede autenticarse con la nueva contraseña y no con la anterior
        $user->refresh();
        $this->assertTrue(Hash::check('nuevaPasswordSegura2026', $user->password));
        $this->assertFalse(Hash::check('passwordAntiguo123', $user->password));

        // Tokens previos revocados
        $this->assertCount(0, $user->tokens);

        // Código OTP consumido y eliminado
        $this->assertDatabaseMissing('email_verifications', [
            'email' => 'cambio@example.com',
            'tipo' => 'password_reset',
        ]);
    }

    public function test_reset_password_falla_con_codigo_incorrecto_o_expirado(): void
    {
        User::factory()->create([
            'email' => 'error@example.com',
            'password' => Hash::make('originalPassword'),
        ]);

        EmailVerification::create([
            'email' => 'error@example.com',
            'codigo' => '123456',
            'tipo' => 'password_reset',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        // 1. Código incorrecto
        $responseBadCode = $this->postJson('/api/auth/reset-password', [
            'email' => 'error@example.com',
            'codigo' => '999999',
            'password' => 'nuevaClave123',
            'password_confirmation' => 'nuevaClave123',
        ]);

        $responseBadCode->assertStatus(422)
            ->assertJson([
                'success' => false,
                'intentos_restantes' => 4,
            ]);

        // 2. Código expirado
        EmailVerification::where('email', 'error@example.com')->update([
            'expires_at' => now()->subMinute(),
        ]);

        $responseExpired = $this->postJson('/api/auth/reset-password', [
            'email' => 'error@example.com',
            'codigo' => '123456',
            'password' => 'nuevaClave123',
            'password_confirmation' => 'nuevaClave123',
        ]);

        $responseExpired->assertStatus(410)
            ->assertJson([
                'success' => false,
            ]);
    }
}
