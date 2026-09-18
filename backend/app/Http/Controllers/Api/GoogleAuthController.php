<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirigir al usuario hacia la pantalla de autenticación de Google OAuth.
     */
    public function redirect(Request $request)
    {
        $returnTo = $request->query('returnTo', '/');

        // Empaquetar estado para persistir returnTo a través de la redirección de OAuth
        $statePayload = [
            'returnTo' => $returnTo,
            'ts' => time(),
        ];
        $state = base64_encode(json_encode($statePayload));

        $clientId = config('services.google.client_id');
        $isDummy = empty($clientId) || str_starts_with($clientId, 'test_') || $clientId === 'dummy';

        if (($isDummy && app()->environment('local') && !$request->has('force_real')) || $request->has('simulate')) {
            return redirect('/api/auth/google/dev-simulator?state=' . urlencode($state));
        }

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    /**
     * Vista de simulación de Google OAuth para desarrollo local.
     */
    public function devSimulator(Request $request)
    {
        if (!app()->environment('local', 'testing')) {
            abort(404);
        }

        $state = $request->query('state', '');

        return view('auth.google_simulator', [
            'state' => $state,
            'defaultName' => 'Nicolás Dóvico',
            'defaultEmail' => 'nicolasdovico@gmail.com',
        ]);
    }

    /**
     * Callback de simulación de Google OAuth para desarrollo local.
     */
    public function devCallback(Request $request): RedirectResponse
    {
        if (!app()->environment('local', 'testing')) {
            abort(404);
        }

        $validated = $request->validate([
            'state' => 'nullable|string',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'google_id' => 'required|string|max:255',
            'avatar' => 'nullable|string|max:1000',
        ]);

        $returnTo = '/';
        $stateRaw = $validated['state'] ?? null;
        if ($stateRaw) {
            try {
                $decoded = json_decode(base64_decode($stateRaw), true);
                if (!empty($decoded['returnTo'])) {
                    $returnTo = $decoded['returnTo'];
                }
            } catch (\Throwable $e) {
                Log::warning("Error al decodificar state en Google devCallback: " . $e->getMessage());
            }
        }

        return $this->handleSuccessfulAuthentication(
            $validated['google_id'],
            $validated['email'],
            $validated['name'],
            $validated['avatar'] ?? null,
            $returnTo,
            $request
        );
    }

    /**
     * Manejar el retorno (callback) desde Google OAuth.
     */
    public function callback(Request $request)
    {
        $stateRaw = $request->query('state');
        $returnTo = '/';

        if ($stateRaw) {
            try {
                $decoded = json_decode(base64_decode($stateRaw), true);
                if (!empty($decoded['returnTo'])) {
                    $returnTo = $decoded['returnTo'];
                }
            } catch (\Throwable $e) {
                Log::warning("Error al decodificar state en Google OAuth callback: " . $e->getMessage());
            }
        }

        // Si el usuario canceló la autorización en Google
        if ($request->has('error') || $request->query('error') === 'access_denied') {
            Log::info("Google OAuth cancelado por el usuario: " . $request->query('error'));
            $sep = str_contains($returnTo, '?') ? '&' : '?';
            return redirect("{$returnTo}{$sep}google_login=cancelled");
        }

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::error("Fallo al obtener datos de usuario de Google: " . $e->getMessage());
            $sep = str_contains($returnTo, '?') ? '&' : '?';
            return redirect("{$returnTo}{$sep}google_login=error&message=" . urlencode('No se pudo autenticar con Google. Inténtalo nuevamente.'));
        }

        $googleId = (string) $googleUser->getId();
        $email = strtolower(trim((string) $googleUser->getEmail()));
        $name = (string) ($googleUser->getName() ?: explode('@', $email)[0]);
        $avatar = $googleUser->getAvatar();

        return $this->handleSuccessfulAuthentication(
            $googleId,
            $email,
            $name,
            $avatar,
            $returnTo,
            $request
        );
    }

    /**
     * Procesar autenticación exitosa (crear o vincular usuario, generar token y redirigir con cookie).
     */
    protected function handleSuccessfulAuthentication(
        string $googleId,
        string $email,
        string $name,
        ?string $avatar,
        string $returnTo,
        Request $request
    ): RedirectResponse {
        // 1. Buscar si ya existe por google_id
        $user = User::where('google_id', $googleId)->first();

        // 2. Si no, buscar por email para vincular cuenta existente
        if (!$user && !empty($email)) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([
                    'google_id' => $googleId,
                    'avatar' => $user->avatar ?: $avatar,
                    'email_verified_at' => $user->email_verified_at ?: Carbon::now(),
                ]);
            }
        }

        // 3. Si no existe, crear nuevo usuario
        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId,
                'avatar' => $avatar,
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => Carbon::now(),
            ]);
        }

        $token = $user->createToken('google_token')->plainTextToken;

        // Construir URL final de redirección
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:8080');
        $targetUrl = $returnTo;

        if (!str_starts_with($targetUrl, 'http://') && !str_starts_with($targetUrl, 'https://')) {
            $targetUrl = rtrim($frontendUrl, '/') . '/' . ltrim($targetUrl, '/');
        }

        $sep = str_contains($targetUrl, '?') ? '&' : '?';
        $finalUrl = "{$targetUrl}{$sep}auth_token=" . urlencode($token) . "&google_login=success";

        // Determinar dominio de cookie para cross-subdomain
        $host = $request->getHost();
        $cookieDomain = null;
        if (str_contains($host, 'localhost')) {
            $cookieDomain = '.localhost';
        } elseif (substr_count($host, '.') >= 2) {
            $parts = explode('.', $host);
            $cookieDomain = '.' . implode('.', array_slice($parts, -2));
        }

        $cookie = cookie(
            'saas_auth_token',
            $token,
            60 * 24 * 30, // 30 días
            '/',
            $cookieDomain,
            false, // secure
            false, // httpOnly: false para que frontend lo pueda leer
            false, // raw
            'Lax'
        );

        return redirect($finalUrl)->withCookie($cookie);
    }

    /**
     * Autenticación directa mediante id_token o token de Google (para apps móviles o SPA).
     */
    public function tokenAuth(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id_token' => 'nullable|string',
            'token' => 'nullable|string',
        ]);

        $tokenString = $validated['id_token'] ?? $validated['token'] ?? null;
        if (!$tokenString) {
            return response()->json([
                'success' => false,
                'message' => 'Token de Google no proporcionado.',
            ], 422);
        }

        try {
            $googleUser = Socialite::driver('google')->stateless()->userFromToken($tokenString);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token de Google inválido o expirado.',
            ], 401);
        }

        $googleId = (string) $googleUser->getId();
        $email = strtolower(trim((string) $googleUser->getEmail()));
        $name = (string) ($googleUser->getName() ?: explode('@', $email)[0]);
        $avatar = $googleUser->getAvatar();

        $user = User::where('google_id', $googleId)->first();
        if (!$user && !empty($email)) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $user->update([
                    'google_id' => $googleId,
                    'avatar' => $user->avatar ?: $avatar,
                    'email_verified_at' => $user->email_verified_at ?: Carbon::now(),
                ]);
            }
        }

        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId,
                'avatar' => $avatar,
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => Carbon::now(),
            ]);
        }

        $authToken = $user->createToken('google_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $authToken,
            'user' => $user->load(['complejos']),
            'message' => 'Autenticación con Google exitosa',
        ]);
    }
}
