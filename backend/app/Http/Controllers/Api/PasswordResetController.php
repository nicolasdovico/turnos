<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetOtpMail;
use App\Models\EmailVerification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    /**
     * POST /api/auth/forgot-password
     * Solicitar código OTP de 6 dígitos para restablecer contraseña.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ], [
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'El formato del correo electrónico no es válido.',
        ]);

        $email = Str::lower(trim($request->email));
        $user = User::where('email', $email)->first();

        // Si el usuario no existe, devolvemos un mensaje neutral por seguridad contra enumeración
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'Si el correo electrónico está registrado, recibirás un código de recuperación en unos instantes.',
            ]);
        }

        // Verificar cooldown de 60 segundos
        $lastRequest = EmailVerification::where('email', $email)
            ->where('tipo', 'password_reset')
            ->latest('created_at')
            ->first();

        if ($lastRequest && $lastRequest->created_at->diffInSeconds(now()) < 60) {
            $remaining = 60 - $lastRequest->created_at->diffInSeconds(now());
            return response()->json([
                'success' => false,
                'cooldown' => true,
                'remaining_seconds' => $remaining,
                'message' => "Por favor espera {$remaining} segundos antes de solicitar otro código.",
            ], 429);
        }

        // Eliminar códigos previos de password_reset para este email
        EmailVerification::where('email', $email)
            ->where('tipo', 'password_reset')
            ->delete();

        // Generar código de 6 dígitos
        $codigo = (string) random_int(100000, 999999);

        EmailVerification::create([
            'email' => $email,
            'codigo' => $codigo,
            'tipo' => 'password_reset',
            'expires_at' => now()->addMinutes(15),
            'intentos' => 0,
        ]);

        // Enviar correo electrónico
        Mail::to($email)->send(new PasswordResetOtpMail($codigo, $user->name));

        return response()->json([
            'success' => true,
            'message' => 'Si el correo electrónico está registrado, recibirás un código de recuperación en unos instantes.',
        ]);
    }

    /**
     * POST /api/auth/reset-password
     * Validar código OTP y cambiar contraseña.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'codigo' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'email.required' => 'El correo electrónico es obligatorio.',
            'codigo.required' => 'El código de verificación es obligatorio.',
            'codigo.size' => 'El código debe tener exactamente 6 dígitos.',
            'password.required' => 'La nueva contraseña es obligatoria.',
            'password.min' => 'La contraseña debe contener al menos 6 caracteres.',
            'password.confirmed' => 'La confirmación de la contraseña no coincide.',
        ]);

        $email = Str::lower(trim($request->email));
        $codigo = trim($request->codigo);

        $verification = EmailVerification::where('email', $email)
            ->where('tipo', 'password_reset')
            ->first();

        if (!$verification) {
            return response()->json([
                'success' => false,
                'message' => 'No hay ninguna solicitud de recuperación pendiente para este correo o el código ha expirado.',
            ], 404);
        }

        if (Carbon::parse($verification->expires_at)->isPast()) {
            $verification->delete();
            return response()->json([
                'success' => false,
                'message' => 'El código de verificación ha expirado. Por favor solicita uno nuevo.',
            ], 410);
        }

        // Incrementar intentos fallidos
        if ($verification->codigo !== $codigo) {
            $verification->increment('intentos');
            if ($verification->intentos >= 5) {
                $verification->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Has superado el número máximo de intentos fallidos. Solicita un nuevo código.',
                ], 429);
            }

            return response()->json([
                'success' => false,
                'message' => 'El código de 6 dígitos ingresado es incorrecto.',
                'intentos_restantes' => 5 - $verification->intentos,
            ], 422);
        }

        // Código válido: buscar usuario y actualizar contraseña
        $user = User::where('email', $email)->first();

        if (!$user) {
            $verification->delete();
            return response()->json([
                'success' => false,
                'message' => 'No se encontró el usuario asociado a esta solicitud.',
            ], 404);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        // Revocar tokens anteriores de Sanctum por seguridad
        $user->tokens()->delete();

        // Eliminar registro de verificación
        $verification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva clave.',
        ]);
    }
}
