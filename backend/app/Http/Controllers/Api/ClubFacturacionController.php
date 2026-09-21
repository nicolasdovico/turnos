<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Models\FacturaClub;
use App\Services\ClubBillingService;
use App\Services\ClubPaymentGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClubFacturacionController extends Controller
{
    public function __construct(
        protected ClubBillingService $billingService,
        protected ClubPaymentGatewayService $paymentGatewayService
    ) {}

    /**
     * Resuelve el complejo y valida permisos administrativos del solicitante.
     */
    protected function getComplejoForAdmin(Request $request, string $subdomain): ?Complejo
    {
        $cleanSubdomain = strtolower(trim($subdomain));
        $complejo = Complejo::withoutGlobalScopes()
            ->where('subdominio', $cleanSubdomain)
            ->first();

        if (!$complejo) {
            return null;
        }

        $user = $request->user('sanctum') ?: ($request->bearerToken() ? \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken())?->tokenable : null);

        if (!$user) {
            return null;
        }

        $isAdmin = ($complejo->user_id && $complejo->user_id === $user->id) || ($user->role ?? '') === 'admin' || !empty($user->is_admin);

        return $isAdmin ? $complejo : null;
    }

    /**
     * Retorna el resumen consolidado de facturación, estado de suscripción y cálculo en tiempo real.
     */
    public function resumen(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para ver la facturación de este club.',
            ], 403);
        }

        // Evaluar transiciones automáticas de vencimiento o gracia
        $this->billingService->evaluarEstadoSuscripcion($complejo);

        $resumen = $this->billingService->obtenerResumenFacturacion($complejo);

        return response()->json([
            'success' => true,
            'data' => $resumen,
        ]);
    }

    /**
     * Lista el historial completo de facturas B2B emitidas para este club.
     */
    public function facturas(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para ver las facturas de este club.',
            ], 403);
        }

        $facturas = FacturaClub::where('complejo_id', $complejo->id)
            ->with('plan:id,nombre,slug')
            ->orderBy('fecha_emision', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $facturas,
        ]);
    }

    /**
     * Genera o recalcula la factura pendiente del período actual.
     */
    public function generarFactura(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado para gestionar facturación de este club.',
            ], 403);
        }

        $periodo = $request->input('periodo');
        $factura = $this->billingService->generarOFacturaPendiente($complejo, $periodo);

        return response()->json([
            'success' => true,
            'data' => $factura,
            'message' => 'Factura generada y consolidada exitosamente.',
        ]);
    }

    /**
     * Inicia el proceso de checkout en Mercado Pago para abonar la factura en ARS.
     */
    public function pagarMercadoPago(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.',
            ], 403);
        }

        $facturaUuid = $request->input('factura_uuid');
        if ($facturaUuid) {
            $factura = FacturaClub::where('uuid', $facturaUuid)
                ->where('complejo_id', $complejo->id)
                ->first();
        } else {
            $factura = $this->billingService->generarOFacturaPendiente($complejo);
        }

        if (!$factura) {
            return response()->json([
                'success' => false,
                'message' => 'Factura no encontrada.',
            ], 404);
        }

        if ($factura->estado === 'pagada') {
            return response()->json([
                'success' => false,
                'message' => 'Esta factura ya se encuentra saldada.',
            ], 422);
        }

        $backUrl = $request->input('back_url');
        $resultado = $this->paymentGatewayService->crearPreferenciaMercadoPago($factura, $backUrl);

        return response()->json($resultado);
    }

    /**
     * Inicia el checkout en Stripe para abonar la factura en USD.
     */
    public function pagarStripe(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.',
            ], 403);
        }

        $facturaUuid = $request->input('factura_uuid');
        if ($facturaUuid) {
            $factura = FacturaClub::where('uuid', $facturaUuid)
                ->where('complejo_id', $complejo->id)
                ->first();
        } else {
            $factura = $this->billingService->generarOFacturaPendiente($complejo);
        }

        if (!$factura) {
            return response()->json([
                'success' => false,
                'message' => 'Factura no encontrada.',
            ], 404);
        }

        if ($factura->estado === 'pagada') {
            return response()->json([
                'success' => false,
                'message' => 'Esta factura ya se encuentra saldada.',
            ], 422);
        }

        $backUrl = $request->input('back_url');
        $resultado = $this->paymentGatewayService->crearCheckoutStripe($factura, $backUrl);

        return response()->json($resultado);
    }

    /**
     * Carga de comprobante de transferencia bancaria para verificación del superadmin.
     */
    public function subirComprobanteTransferencia(Request $request, string $subdomain): JsonResponse
    {
        $complejo = $this->getComplejoForAdmin($request, $subdomain);
        if (!$complejo) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.',
            ], 403);
        }

        $validated = $request->validate([
            'factura_uuid' => ['nullable', 'string'],
            'comprobante_url' => ['required', 'string'],
            'notas' => ['nullable', 'string', 'max:500'],
        ]);

        if (!empty($validated['factura_uuid'])) {
            $factura = FacturaClub::where('uuid', $validated['factura_uuid'])
                ->where('complejo_id', $complejo->id)
                ->first();
        } else {
            $factura = $this->billingService->generarOFacturaPendiente($complejo);
        }

        if (!$factura) {
            return response()->json([
                'success' => false,
                'message' => 'Factura no encontrada.',
            ], 404);
        }

        $facturaActualizada = $this->paymentGatewayService->registrarComprobanteTransferencia(
            $factura,
            $validated['comprobante_url'],
            $validated['notas'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => $facturaActualizada,
            'message' => 'Comprobante de transferencia registrado correctamente. El pago pasará a revisión del equipo administrativo.',
        ]);
    }
}
