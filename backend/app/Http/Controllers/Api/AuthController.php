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
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('mobile_app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'message' => 'Usuario registrado exitosamente',
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
        return response()->json([
            'user' => $request->user(),
        ]);
    }
}
