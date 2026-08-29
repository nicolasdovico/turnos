<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationOtpMail;
use App\Models\EmailVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailOtpVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_registration_dispatches_otp_email(): void
    {
        Mail::fake();

        $payload = [
            'name' => 'Carlos Tévez',
            'email' => 'carlos@boca.com',
            'password' => 'BocaJuniors2026!',
            'password_confirmation' => 'BocaJuniors2026!',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', 'carlos@boca.com');

        // Verify OTP email was sent
        Mail::assertSent(EmailVerificationOtpMail::class, function ($mail) {
            return $mail->hasTo('carlos@boca.com');
        });

        // Verify record in database
        $verification = EmailVerification::where('email', 'carlos@boca.com')->first();
        $this->assertNotNull($verification);
        $this->assertEquals(6, strlen($verification->codigo));
    }

    public function test_verify_valid_otp_marks_user_as_verified(): void
    {
        $user = User::factory()->create([
            'email' => 'verificado@test.com',
            'email_verified_at' => null,
        ]);

        EmailVerification::create([
            'email' => 'verificado@test.com',
            'codigo' => '482910',
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => 'verificado@test.com',
            'codigo' => '482910',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // Verify User email_verified_at is set
        $this->assertNotNull($user->fresh()->email_verified_at);

        // Verify OTP record is deleted
        $this->assertDatabaseMissing('email_verifications', [
            'email' => 'verificado@test.com',
        ]);
    }

    public function test_verify_invalid_otp_increments_attempts(): void
    {
        $user = User::factory()->create([
            'email' => 'erroneo@test.com',
            'email_verified_at' => null,
        ]);

        $verification = EmailVerification::create([
            'email' => 'erroneo@test.com',
            'codigo' => '123456',
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => 'erroneo@test.com',
            'codigo' => '999999',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('remaining_attempts', 4);

        $this->assertEquals(1, $verification->fresh()->intentos);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_verify_expired_otp_fails(): void
    {
        EmailVerification::create([
            'email' => 'expirado@test.com',
            'codigo' => '112233',
            'tipo' => 'email_verification',
            'expires_at' => now()->subMinutes(5), // Expired!
            'intentos' => 0,
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => 'expirado@test.com',
            'codigo' => '112233',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('expired', true);
    }

    public function test_resend_otp_rate_limited_cooldown_60s(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'email' => 'cooldown@test.com',
            'email_verified_at' => null,
        ]);

        EmailVerification::create([
            'email' => 'cooldown@test.com',
            'codigo' => '555555',
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'created_at' => now()->subSeconds(20), // 20s ago (less than 60s!)
            'intentos' => 0,
        ]);

        $response = $this->postJson('/api/auth/resend-otp', [
            'email' => 'cooldown@test.com',
        ]);

        $response->assertStatus(429)
            ->assertJsonPath('cooldown', true);
    }
}
