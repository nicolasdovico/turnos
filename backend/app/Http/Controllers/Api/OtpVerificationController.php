<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmailVerificationOtpMail;
use App\Models\EmailVerification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OtpVerificationController extends Controller
{
    /**
     * Helper to generate and send a 6-digit OTP code to an email.
     */
    public static function dispatchOtp(string $email, string $nombre = 'Usuario'): string
    {
        $cleanEmail = Str::lower(trim($email));

        // Invalidate previous OTPs for this email
        EmailVerification::where('email', $cleanEmail)->delete();

        $codigo = (string) random_int(100000, 999999);

        EmailVerification::create([
            'email' => $cleanEmail,
            'codigo' => $codigo,
            'tipo' => 'email_verification',
            'expires_at' => now()->addMinutes(10),
            'intentos' => 0,
        ]);

        Mail::to($cleanEmail)->send(new EmailVerificationOtpMail($codigo, $nombre));

        return $codigo;
    }

    /**
     * Send or resend OTP with a 60-second cooldown rate limit.
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $email = Str::lower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró ningún usuario con ese correo electrónico.',
            ], 404);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'success' => true,
                'already_verified' => true,
                'message' => 'Tu correo electrónico ya se encuentra verificado.',
            ]);
        }

        // Check 60-second cooldown rate limit
        $lastVerification = EmailVerification::where('email', $email)
            ->latest('created_at')
            ->first();

        if ($lastVerification && $lastVerification->created_at->diffInSeconds(now()) < 60) {
            $remaining = 60 - $lastVerification->created_at->diffInSeconds(now());
            return response()->json([
                'success' => false,
                'cooldown' => true,
                'remaining_seconds' => $remaining,
                'message' => "Por favor espera {$remaining} segundos antes de solicitar otro código.",
            ], 429);
        }

        self::dispatchOtp($email, $user->name);

        return response()->json([
            'success' => true,
            'message' => 'Se ha enviado un nuevo código de 6 dígitos a tu correo.',
        ]);
    }

    /**
     * Verify the 6-digit OTP code and mark the user's email as verified.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'codigo' => ['required', 'string', 'size:6'],
        ]);

        $email = Str::lower(trim($request->email));
        $codigo = trim($request->codigo);

        $verification = EmailVerification::where('email', $email)
            ->latest('created_at')
            ->first();

        if (!$verification) {
            return response()->json([
                'success' => false,
                'message' => 'No hay ninguna solicitud de verificación pendiente para este correo.',
            ], 404);
        }

        if ($verification->isExpired()) {
            return response()->json([
                'success' => false,
                'expired' => true,
                'message' => 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
            ], 422);
        }

        if ($verification->intentos >= 5) {
            return response()->json([
                'success' => false,
                'max_attempts' => true,
                'message' => 'Has superado el límite de intentos fallidos. Por favor solicita un nuevo código.',
            ], 429);
        }

        if ($verification->codigo !== $codigo) {
            $verification->increment('intentos');
            $remainingAttempts = 5 - $verification->intentos;

            return response()->json([
                'success' => false,
                'remaining_attempts' => max(0, $remainingAttempts),
                'message' => "Código incorrecto. Te quedan {$remainingAttempts} intento(s).",
            ], 422);
        }

        // OTP is valid! Mark User as verified
        $user = User::where('email', $email)->first();
        if ($user) {
            $user->email_verified_at = now();
            $user->save();
        }

        // Clean up OTP records for this email
        EmailVerification::where('email', $email)->delete();

        return response()->json([
            'success' => true,
            'message' => '¡Correo electrónico verificado exitosamente!',
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
            ] : null,
        ]);
    }
}
