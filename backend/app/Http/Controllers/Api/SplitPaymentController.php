<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PartidoAbierto;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use App\Services\SplitPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SplitPaymentController extends Controller
{
    public function __construct(
        protected SplitPaymentService $splitPaymentService
    ) {}

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
            ->with(['turno.cancha', 'partidoAbierto'])
            ->firstOrFail();

        return response()->json([
            'data' => [
                'cuota' => $cuota,
                'checkout_url' => $cuota->checkout_url,
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
}
