<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ClubOnboardingController extends Controller
{
    protected array $reservedSubdomains = [
        'admin', 'api', 'app', 'portal', 'www', 'mail', 'auth',
        'test', 'demo', 'staging', 'turnos', 'saas', 'root', 'support',
    ];

    /**
     * Check if a subdomain is available and valid.
     */
    public function checkSubdomain(Request $request): JsonResponse
    {
        $request->validate([
            'subdomain' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            ],
        ], [
            'subdomain.regex' => 'El subdominio sólo puede contener letras minúsculas, números y guiones medios (no consecutivos ni al inicio/final).',
        ]);

        $subdomain = Str::lower($request->query('subdomain'));

        if (in_array($subdomain, $this->reservedSubdomains, true)) {
            return response()->json([
                'available' => false,
                'subdominio' => $subdomain,
                'message' => 'Este subdominio es una palabra reservada del sistema.',
            ], 422);
        }

        $exists = Complejo::where('subdominio', $subdomain)->exists();

        return response()->json([
            'available' => !$exists,
            'subdominio' => $subdomain,
            'message' => $exists ? 'El subdominio ya se encuentra registrado.' : '¡Subdominio disponible!',
        ]);
    }

    /**
     * Complete unified club onboarding & registration.
     */
    public function registrarClub(Request $request): JsonResponse
    {
        // 1. Identify if request is from an authenticated user or guest
        $currentUser = $request->user('sanctum');

        $rules = [
            // Club data
            'nombre_club' => ['required', 'string', 'min:3', 'max:100'],
            'subdominio' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                'unique:complejos,subdominio',
                Rule::notIn($this->reservedSubdomains),
            ],
            'plan_slug' => ['required', 'string', 'exists:planes,slug'],
            'tipo_negocio_id' => ['nullable', 'integer', 'exists:tipos_negocio,id'],
            'tipo_negocio_slug' => ['nullable', 'string', 'exists:tipos_negocio,slug'],
            'deporte_principal' => ['nullable', 'string', 'max:50'],
            'telefono' => ['nullable', 'string', 'max:50'],
            'ciudad' => ['nullable', 'string', 'max:100'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'latitud' => ['nullable', 'numeric', 'between:-90,90'],
            'longitud' => ['nullable', 'numeric', 'between:-180,180'],
            'canchas' => ['nullable', 'array'],
            'canchas.*.nombre' => ['required_with:canchas', 'string', 'max:100'],
            'canchas.*.deporte' => ['nullable', 'string', 'max:50'],
            'canchas.*.tipo_superficie' => ['nullable', 'string', 'max:50'],
            'canchas.*.precio' => ['nullable', 'numeric', 'min:0'],
        ];

        // If not authenticated, require admin user registration fields
        if (!$currentUser) {
            $rules['nombre_admin'] = ['required', 'string', 'max:255'];
            $rules['email_admin'] = ['required', 'string', 'email', 'max:255', 'unique:users,email'];
            $rules['password_admin'] = ['required', 'string', 'min:8'];
        }

        $validated = $request->validate($rules, [
            'subdominio.regex' => 'El subdominio sólo puede contener letras minúsculas, números y guiones medios.',
            'subdominio.not_in' => 'El subdominio elegido está reservado por la plataforma.',
            'subdominio.unique' => 'El subdominio elegido ya está en uso por otro club o complejo.',
            'email_admin.unique' => 'Ya existe una cuenta con este correo electrónico. Por favor inicia sesión.',
        ]);

        $subdomain = Str::lower($validated['subdominio']);

        $result = DB::transaction(function () use ($validated, $currentUser, $subdomain) {
            // A. Create or use existing User
            $user = $currentUser;
            if (!$user) {
                $user = User::create([
                    'name' => $validated['nombre_admin'],
                    'email' => Str::lower($validated['email_admin']),
                    'password' => Hash::make($validated['password_admin']),
                ]);
            }

            // B. Find selected Plan
            $plan = Plan::where('slug', $validated['plan_slug'])->firstOrFail();

            // Resolve Tipo de Negocio
            $tipoNegocioId = $validated['tipo_negocio_id'] ?? null;
            if (!$tipoNegocioId && !empty($validated['tipo_negocio_slug'])) {
                $tipoNegocio = \App\Models\TipoNegocio::where('slug', $validated['tipo_negocio_slug'])->first();
                $tipoNegocioId = $tipoNegocio?->id;
            }
            if (!$tipoNegocioId) {
                $defaultTipo = \App\Models\TipoNegocio::where('slug', 'club')->first() ?? \App\Models\TipoNegocio::first();
                $tipoNegocioId = $defaultTipo?->id;
            }

            // C. Create Complejo
            $complejo = Complejo::create([
                'user_id' => $user->id,
                'nombre' => $validated['nombre_club'],
                'subdominio' => $subdomain,
                'plan_id' => $plan->id,
                'tipo_negocio_id' => $tipoNegocioId,
                'estado' => 'activo',
                'deporte_principal' => $validated['deporte_principal'] ?? 'padel',
                'telefono' => $validated['telefono'] ?? null,
                'ciudad' => $validated['ciudad'] ?? null,
                'direccion' => $validated['direccion'] ?? null,
                'latitud' => $validated['latitud'] ?? null,
                'longitud' => $validated['longitud'] ?? null,
            ]);

            // D. Initialize default operating hours (Monday to Sunday, 08:00 - 23:00)
            for ($dia = 0; $dia <= 6; $dia++) {
                HorarioAtencion::create([
                    'complejo_id' => $complejo->id,
                    'dia_semana' => $dia,
                    'hora_apertura' => '08:00',
                    'hora_cierre' => '23:00',
                    'duracion_turno_minutos' => 60,
                ]);
            }

            // E. Create initial courts
            $canchasInput = $validated['canchas'] ?? null;
            if (!empty($canchasInput) && is_array($canchasInput)) {
                foreach ($canchasInput as $canchaData) {
                    Cancha::create([
                        'complejo_id' => $complejo->id,
                        'nombre' => $canchaData['nombre'],
                        'deporte' => $canchaData['deporte'] ?? $complejo->deporte_principal ?? 'padel',
                        'superficie' => $canchaData['tipo_superficie'] ?? $canchaData['superficie'] ?? 'cristal',
                        'techada' => $canchaData['techada'] ?? false,
                        'precio_base' => $canchaData['precio'] ?? $canchaData['precio_base'] ?? 8000,
                        'estado' => 'activo',
                    ]);
                }
            } else {
                // Default initial court
                Cancha::create([
                    'complejo_id' => $complejo->id,
                    'nombre' => 'Cancha 1 (Principal)',
                    'deporte' => $complejo->deporte_principal ?? 'padel',
                    'superficie' => 'cristal',
                    'techada' => false,
                    'precio_base' => 8000,
                    'estado' => 'activo',
                ]);
            }

            // F. Generate Sanctum token ONLY if user was already authenticated
            $token = $currentUser ? $user->createToken('saas_auth_token')->plainTextToken : null;

            return [
                'user' => $user,
                'complejo' => $complejo->load(['plan.modulos', 'canchas', 'horariosAtencion']),
                'token' => $token,
                'is_new_user' => !$currentUser,
            ];
        });

        $isNewUser = $result['is_new_user'];

        if ($isNewUser) {
            OtpVerificationController::dispatchOtp($result['user']->email, $result['user']->name);
        }

        $incomingHost = $request->header('X-Forwarded-Host') ?? $request->header('Host') ?? parse_url(config('app.url', 'http://localhost:8080'), PHP_URL_HOST) ?? 'localhost';
        $port = '';
        if (str_contains($incomingHost, ':')) {
            $parts = explode(':', $incomingHost);
            $incomingHost = $parts[0];
            $port = ':' . $parts[1];
        } elseif ($configPort = parse_url(config('app.url', 'http://localhost:8080'), PHP_URL_PORT)) {
            $port = ':' . $configPort;
        }

        $baseHost = 'localhost';
        if (str_ends_with($incomingHost, 'turnos.com')) {
            $baseHost = 'turnos.com';
        }

        $scheme = $request->header('X-Forwarded-Proto') ?? $request->getScheme() ?? parse_url(config('app.url', 'http://localhost:8080'), PHP_URL_SCHEME) ?? 'http';
        $subdomainUrl = "{$scheme}://{$subdomain}.{$baseHost}{$port}";

        return response()->json([
            'success' => true,
            'message' => $isNewUser
                ? '¡Club registrado! Por favor ingresa el código de 6 dígitos enviado a tu correo para activar tu cuenta y acceder a tu club.'
                : '¡Club registrado y configurado exitosamente!',
            'requires_verification' => $isNewUser,
            'token' => $result['token'],
            'user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
                'email_verified_at' => $result['user']->email_verified_at,
                'complejos' => $result['user']->complejos()->with('tipoNegocio')->get(['id', 'user_id', 'nombre', 'subdominio', 'estado', 'deporte_principal', 'tipo_negocio_id']),
            ],
            'complejo' => $result['complejo']->load('tipoNegocio'),
            'subdomain_url' => $subdomainUrl,
        ], 201);
    }
}
