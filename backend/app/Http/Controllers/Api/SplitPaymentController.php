<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cancha;
use App\Models\HorarioAtencion;
use App\Models\PartidoAbierto;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use App\Services\DisponibilidadService;
use App\Services\SplitPaymentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SplitPaymentController extends Controller
{
    public function __construct(
        protected SplitPaymentService $splitPaymentService,
        protected DisponibilidadService $disponibilidadService
    ) {}

    /**
     * POST /api/partidos-abiertos/crear
     * Crea un turno y genera inmediatamente una convocatoria de partido abierto
     * a partir de cancha, fecha y hora_inicio (usado por el club y por particulares).
     */
    public function crearPartidoDirecto(Request $request): JsonResponse
    {
        $user = auth('sanctum')->user() ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        $validated = $request->validate([
            'cancha_id' => 'required|integer|exists:canchas,id',
            'fecha' => 'required|date_format:Y-m-d',
            'hora_inicio' => 'required|string',
            'hora_fin' => 'nullable|string',
            'cuotas' => 'required|integer|min:2|max:30',
            'nivel_min' => 'nullable|string|max:50',
            'nivel_max' => 'nullable|string|max:50',
            'tipo_partido' => 'nullable|string|max:50',
            'organizador_nombre' => 'nullable|string|max:255',
            'organizador_email' => 'nullable|email|max:255',
            'organizador_telefono' => 'nullable|string|max:50',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        // Si no hay usuario autenticado y tampoco user_id válido, requerir registro
        $organizadorId = $user?->id ?? $validated['user_id'] ?? null;
        if (!$organizadorId && empty($validated['organizador_email'])) {
            return response()->json([
                'error' => 'AUTH_REQUIRED',
                'message' => 'Para iniciar una convocatoria abierta debés estar registrado e iniciar sesión con tu cuenta de jugador.',
            ], 401);
        }

        // Si se envió email pero no hay usuario logueado, intentar asociar al usuario por email si existe
        if (!$organizadorId && !empty($validated['organizador_email'])) {
            $existingUser = \App\Models\User::where('email', Str::lower(trim($validated['organizador_email'])))->first();
            if ($existingUser) {
                $organizadorId = $existingUser->id;
            }
        }

        $cancha = Cancha::with('complejo')->findOrFail($validated['cancha_id']);
        $timezone = $cancha->complejo?->timezone ?: config('app.timezone', 'America/Argentina/Buenos_Aires');

        $fechaNormalizada = Carbon::parse($validated['fecha'], $timezone)->format('Y-m-d');
        $horaInicioNormalizada = Carbon::parse($validated['hora_inicio'], $timezone)->format('H:i');

        $slotStartDateTime = Carbon::parse($fechaNormalizada . ' ' . $horaInicioNormalizada, $timezone);
        if ($slotStartDateTime->lessThanOrEqualTo(Carbon::now($timezone))) {
            return response()->json([
                'error' => 'PAST_SLOT_NOT_ALLOWED',
                'message' => 'No es posible crear una convocatoria en una fecha u horario que ya ha pasado.',
            ], 422);
        }

        // Obtener o calcular hora_fin
        if (!empty($validated['hora_fin'])) {
            $horaFinNormalizada = Carbon::parse($validated['hora_fin'])->format('H:i');
        } else {
            $horario = HorarioAtencion::where('complejo_id', $cancha->complejo_id)
                ->where('dia_semana', Carbon::parse($fechaNormalizada)->dayOfWeek)
                ->first();
            $duracion = $cancha->duracion_minutos ?: ($horario?->duracion_turno_minutos ?: 60);
            $horaFinNormalizada = Carbon::parse($fechaNormalizada . ' ' . $horaInicioNormalizada)
                ->addMinutes($duracion)
                ->format('H:i');
        }

        // Verificar disponibilidad en tiempo real
        $disponibilidad = $this->disponibilidadService->obtenerDisponibilidadCompleta($cancha->id, $fechaNormalizada, null, true);
        $slots = $disponibilidad['slots'] ?? [];
        $slotElegido = collect($slots)->first(function ($s) use ($horaInicioNormalizada) {
            return Carbon::parse($s['hora_inicio'])->format('H:i') === $horaInicioNormalizada && ($s['disponible'] ?? false);
        });

        // Verificar si ya existe un turno ocupado o solapado
        $turnoSolapado = Turno::where('cancha_id', $cancha->id)
            ->where('fecha', $fechaNormalizada)
            ->whereIn('estado', ['disponible', 'bloqueado', 'reservado', 'pagado'])
            ->where(function ($q) use ($horaInicioNormalizada, $horaFinNormalizada) {
                $q->whereBetween('hora_inicio', [$horaInicioNormalizada, $horaFinNormalizada])
                  ->orWhereBetween('hora_fin', [$horaInicioNormalizada, $horaFinNormalizada]);
            })
            ->first();

        if ($turnoSolapado && $turnoSolapado->partidoAbierto && in_array($turnoSolapado->partidoAbierto->estado, ['pendiente_pago', 'buscando', 'completo'])) {
            return response()->json([
                'error' => 'PARTIDO_YA_EXISTE',
                'message' => 'Ya existe un partido abierto programado para esta cancha en ese horario.',
            ], 422);
        }

        $precioTurno = $slotElegido['precio'] ?? (float) $cancha->precio_base;

        $organizadorNombre = $validated['organizador_nombre'] ?? $user?->name ?? 'Convocatoria Abierta';
        $organizadorEmail = $validated['organizador_email'] ?? $user?->email ?? null;
        $organizadorTelefono = $validated['organizador_telefono'] ?? $user?->telefono ?? null;

        return DB::transaction(function () use ($cancha, $fechaNormalizada, $horaInicioNormalizada, $horaFinNormalizada, $precioTurno, $validated, $organizadorId, $organizadorNombre, $organizadorEmail, $organizadorTelefono) {
            // Si ya existía un turno libre o creamos uno nuevo atómicamente en estado bloqueado por convocatoria
            $turno = Turno::create([
                'complejo_id' => $cancha->complejo_id,
                'cancha_id' => $cancha->id,
                'fecha' => $fechaNormalizada,
                'hora_inicio' => $horaInicioNormalizada . ':00',
                'hora_fin' => $horaFinNormalizada . ':00',
                'precio' => $precioTurno,
                'estado' => 'bloqueado',
                'cliente_id' => $organizadorId,
                'cliente_nombre' => $organizadorNombre,
                'cliente_email' => $organizadorEmail,
                'cliente_telefono' => $organizadorTelefono,
                'metodo_pago' => 'split',
            ]);

            $splitParams = array_merge($validated, [
                'es_partido_abierto' => true,
                'organizador_id' => $organizadorId,
                'organizador_nombre' => $organizadorNombre,
                'organizador_email' => $organizadorEmail,
                'organizador_telefono' => $organizadorTelefono,
            ]);

            $resultado = $this->splitPaymentService->crearSplit(
                $turno,
                (int) $validated['cuotas'],
                $splitParams
            );

            // Localizar la cuota 1 del organizador para devolver su token y checkout directamente
            $cuotas = $resultado['cuotas'] ?? [];
            $cuotaOrganizador = collect($cuotas)->firstWhere('cuota_numero', 1);

            return response()->json([
                'message' => 'Convocatoria de partido abierto creada exitosamente.',
                'data' => $resultado,
                'cuota_organizador' => $cuotaOrganizador,
            ], 201);
        });
    }

    /**
     * POST /api/turnos/{id}/split
     * Fracciona el total de un turno en cuotas individuales con links de checkout.
     */
    public function splitTurno(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'cuotas' => 'required|integer|min:2|max:30',
            'es_partido_abierto' => 'nullable|boolean',
            'nivel_min' => 'nullable|string|max:50',
            'nivel_max' => 'nullable|string|max:50',
            'tipo_partido' => 'nullable|string|max:50',
            'organizador_nombre' => 'nullable|string|max:255',
            'organizador_email' => 'nullable|email|max:255',
        ]);

        $turno = Turno::findOrFail($id);

        $resultado = $this->splitPaymentService->crearSplit(
            $turno,
            (int) $request->input('cuotas'),
            $request->all()
        );

        return response()->json([
            'message' => 'Pago dividido generado con éxito.',
            'data' => $resultado,
        ], 201);
    }

    /**
     * POST /api/split-pagos/{token}/pagar
     * Paga una cuota individual y confirma automáticamente el turno al completarse.
     */
    public function pagarCuota(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'metodo_pago' => 'nullable|string|in:tarjeta,mercadopago,efectivo,transferencia',
            'nombre_jugador' => 'nullable|string|max:255',
            'email_jugador' => 'nullable|email|max:255',
            'comprobante_transferencia' => 'nullable|string|max:1000',
            'verificado_por_club' => 'nullable|boolean',
        ]);

        $resultado = $this->splitPaymentService->procesarPagoCuota(
            $token,
            $request->all()
        );

        return response()->json([
            'message' => 'Cuota pagada con éxito.',
            'data' => $resultado,
        ], 200);
    }

    /**
     * GET /api/split-pagos/{token}
     * Consulta el detalle y estado de una cuota de split payment.
     */
    public function showCuota(string $token): JsonResponse
    {
        $cuota = TurnoPagoDividido::where('token_pago', $token)
            ->with(['turno.cancha', 'partidoAbierto', 'complejo'])
            ->firstOrFail();

        $complejo = $cuota->complejo;
        $datosBancarios = null;
        if ($complejo) {
            $datosBancarios = [
                'banco' => $complejo->banco_nombre,
                'cbu' => $complejo->banco_cbu,
                'alias' => $complejo->banco_alias,
                'titular' => $complejo->banco_titular,
                'cuit' => $complejo->banco_cuit,
            ];
        }

        return response()->json([
            'data' => [
                'cuota' => $cuota,
                'checkout_url' => $cuota->checkout_url,
                'datos_bancarios' => $datosBancarios,
            ],
        ]);
    }

    /**
     * GET /api/partidos-abiertos
     * Lista partidos abiertos convocando jugadores para matchmaking.
     */
    public function indexPartidos(Request $request): JsonResponse
    {
        $partidos = $this->splitPaymentService->listarPartidosAbiertos($request->all());

        return response()->json([
            'data' => $partidos,
        ]);
    }

    /**
     * POST /api/partidos-abiertos/{id}/unirse
     * Permite a un jugador unirse a un partido abierto tomando una cuota pendiente.
     */
    public function unirsePartido(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'nombre_jugador' => 'required|string|max:255',
            'email_jugador' => 'nullable|email|max:255',
        ]);

        $partido = PartidoAbierto::findOrFail($id);

        $cuota = $this->splitPaymentService->unirseAPartidoAbierto(
            $partido,
            $request->all()
        );

        return response()->json([
            'message' => 'Te has unido al partido abierto exitosamente.',
            'data' => [
                'partido_id' => $partido->id,
                'cuota_asignada' => $cuota,
                'checkout_url' => $cuota->checkout_url,
            ],
        ], 200);
    }

    /**
     * POST /api/partidos-abiertos/{id}/cancelar
     * Cancela una convocatoria de partido abierto y sus cuotas pendientes.
     */
    public function cancelarPartido(Request $request, int $id): JsonResponse
    {
        $partido = PartidoAbierto::findOrFail($id);
        $resultado = $this->splitPaymentService->cancelarPartidoAbierto($partido, $request->input('motivo'));

        return response()->json([
            'message' => 'Partido abierto cancelado exitosamente.',
            'data' => $resultado,
        ], 200);
    }

    /**
     * GET /api/turnos-para-split
     * Lista turnos del complejo que pueden ser fraccionados o puestos como partido abierto.
     */
    public function turnosParaSplit(Request $request): JsonResponse
    {
        $turnos = Turno::with(['cancha', 'cliente'])
            ->whereIn('estado', ['disponible', 'bloqueado', 'reservado'])
            ->whereDate('fecha', '>=', now()->toDateString())
            ->whereDoesntHave('partidoAbierto', function ($q) {
                $q->whereIn('estado', ['buscando', 'completo']);
            })
            ->whereDoesntHave('pagosDivididos', function ($q) {
                $q->where('estado', 'pendiente');
            })
            ->orderBy('fecha', 'asc')
            ->orderBy('hora_inicio', 'asc')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $turnos,
        ]);
    }
}
