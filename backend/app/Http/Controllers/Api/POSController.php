<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Turno;
use App\Services\POSService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class POSController extends Controller
{
    public function __construct(
        protected POSService $posService
    ) {}

    /**
     * List buffet products for the current tenant.
     */
    public function indexProductos(Request $request): JsonResponse
    {
        $productos = Producto::where('estado', 'activo')
            ->orderBy('categoria')
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $productos,
        ]);
    }

    /**
     * List active and recent turnos of today to assign buffet orders easily.
     */
    public function turnosActivos(Request $request): JsonResponse
    {
        $today = now()->format('Y-m-d');

        $turnos = Turno::where('fecha', $today)
            ->whereIn('estado', ['confirmado', 'reservado', 'pendiente', 'pagado'])
            ->with(['cancha', 'cliente'])
            ->orderBy('hora_inicio', 'desc')
            ->get()
            ->map(function ($t) {
                return [
                    'id' => $t->id,
                    'hora_inicio' => substr($t->hora_inicio, 0, 5),
                    'hora_fin' => substr($t->hora_fin, 0, 5),
                    'cancha_nombre' => $t->cancha->nombre ?? 'Cancha',
                    'cliente_nombre' => $t->cliente_nombre ?: ($t->cliente?->nombre ?: ($t->nombre_contacto ?: 'Sin Nombre')),
                    'estado' => $t->estado,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $turnos,
        ]);
    }

    /**
     * Create a new product in the buffet catalog.
     */
    public function storeProducto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'codigo_barra' => ['nullable', 'string', 'max:100'],
            'categoria' => ['nullable', 'string', 'max:100'],
            'precio_costo' => ['nullable', 'numeric', 'min:0'],
            'precio_venta' => ['required', 'numeric', 'min:0'],
            'stock_actual' => ['nullable', 'integer', 'min:0'],
            'stock_minimo' => ['nullable', 'integer', 'min:0'],
        ]);

        $producto = Producto::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Producto creado exitosamente.',
            'data' => $producto,
        ], 201);
    }

    /**
     * Update an existing product in the buffet catalog.
     */
    public function updateProducto(Request $request, int $id): JsonResponse
    {
        $producto = Producto::find($id);
        if (!$producto) {
            return response()->json([
                'error' => 'PRODUCT_NOT_FOUND',
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $validated = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:255'],
            'codigo_barra' => ['nullable', 'string', 'max:100'],
            'categoria' => ['nullable', 'string', 'max:100'],
            'precio_costo' => ['nullable', 'numeric', 'min:0'],
            'precio_venta' => ['sometimes', 'required', 'numeric', 'min:0'],
            'stock_actual' => ['nullable', 'integer', 'min:0'],
            'stock_minimo' => ['nullable', 'integer', 'min:0'],
            'estado' => ['nullable', 'string', 'in:activo,inactivo'],
        ]);

        $producto->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado exitosamente.',
            'data' => $producto,
        ]);
    }

    /**
     * Delete / deactivate a product in the buffet catalog.
     */
    public function destroyProducto(int $id): JsonResponse
    {
        $producto = Producto::find($id);
        if (!$producto) {
            return response()->json([
                'error' => 'PRODUCT_NOT_FOUND',
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $producto->update(['estado' => 'inactivo']);

        return response()->json([
            'success' => true,
            'message' => 'Producto dado de baja exitosamente.',
        ]);
    }

    /**
     * Process a direct POS buffet sale.
     */
    public function storeVenta(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'turno_id' => ['nullable', 'integer', 'exists:turnos,id'],
            'cliente_id' => ['nullable', 'integer', 'exists:users,id'],
            'tipo_pago' => ['nullable', 'string'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'integer', 'exists:productos,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $venta = $this->posService->procesarVenta($validated, $validated['items']);

            return response()->json([
                'success' => true,
                'message' => 'Venta procesada exitosamente.',
                'data' => $venta,
            ], 201);
        } catch (DomainException $e) {
            return response()->json([
                'error' => 'INSUFFICIENT_STOCK',
                'message' => $e->getMessage(),
            ], 422);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'INVALID_SALE_DATA',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Add consumption order (comanda) to an active court session.
     */
    public function storeConsumoTurno(Request $request, int $id): JsonResponse
    {
        $turno = Turno::find($id);
        if (!$turno) {
            return response()->json([
                'error' => 'TURNO_NOT_FOUND',
                'message' => 'El turno especificado no fue encontrado.',
            ], 404);
        }

        $validated = $request->validate([
            'tipo_pago' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.producto_id' => ['required', 'integer', 'exists:productos,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $venta = $this->posService->agregarConsumoATurno(
                $id,
                $validated['items'],
                auth()->id(),
                $validated['tipo_pago'] ?? 'cuenta_turno'
            );

            return response()->json([
                'success' => true,
                'message' => 'Comanda agregada al turno exitosamente.',
                'data' => $venta,
            ], 201);
        } catch (DomainException $e) {
            return response()->json([
                'error' => 'INSUFFICIENT_STOCK',
                'message' => $e->getMessage(),
            ], 422);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'INVALID_CONSUMPTION_DATA',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
