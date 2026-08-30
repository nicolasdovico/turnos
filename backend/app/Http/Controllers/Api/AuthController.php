<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Registro de nuevo usuario y emisión de token Sanctum.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'telefono' => 'nullable|string|max:50',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'telefono' => $validated['telefono'] ?? null,
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        // Disparar código OTP de verificación por correo
        OtpVerificationController::dispatchOtp($user->email, $user->name);

        return response()->json([
            'token' => $token,
            'user' => $user,
            'message' => 'Usuario registrado exitosamente. Se ha enviado un código de verificación a tu correo.',
        ], 201);
    }

    /**
     * Inicio de sesión y emisión de token Bearer.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'error' => 'INVALID_CREDENTIALS',
                'message' => 'Las credenciales proporcionadas son incorrectas.',
            ], 401);
        }

        $token = $user->createToken('mobile_app')->plainTextToken;
        $user->load(['complejos' => function ($query) {
            $query->with('tipoNegocio')->select('id', 'user_id', 'nombre', 'subdominio', 'estado', 'deporte_principal', 'tipo_negocio_id');
        }]);

        return response()->json([
            'token' => $token,
            'user' => $user,
            'message' => 'Inicio de sesión exitoso',
        ]);
    }

    /**
     * Cierre de sesión y revocación del token actual.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente',
        ]);
    }

    /**
     * Obtener perfil del usuario autenticado.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['complejos' => function ($query) {
            $query->with('tipoNegocio')->select('id', 'user_id', 'nombre', 'subdominio', 'estado', 'deporte_principal', 'tipo_negocio_id');
        }]);

        return response()->json([
            'user' => $user,
        ]);
    }
}
