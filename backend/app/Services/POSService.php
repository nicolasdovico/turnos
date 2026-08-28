<?php

namespace App\Services;

use App\Models\Producto;
use App\Models\Turno;
use App\Models\Venta;
use App\Models\VentaItem;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class POSService
{
    /**
     * Process a direct sale or court consumption with automatic stock deduction and ACID transaction.
     *
     * @param array $datosVenta
     * @param array<int, array{producto_id: int, cantidad: int, precio_unitario?: float}> $items
     * @return Venta
     */
    public function procesarVenta(array $datosVenta, array $items): Venta
    {
        if (empty($items)) {
            throw new InvalidArgumentException('La venta debe contener al menos un producto.');
        }

        return DB::transaction(function () use ($datosVenta, $items) {
            $subtotalCalculado = 0.0;
            $itemsPreparados = [];

            // Pass 1: Lock products and validate stock
            foreach ($items as $item) {
                $productoId = $item['producto_id'];
                $cantidad = (int) $item['cantidad'];

                if ($cantidad <= 0) {
                    throw new InvalidArgumentException("La cantidad debe ser mayor a 0 para el producto ID {$productoId}.");
                }

                $producto = Producto::where('id', $productoId)->lockForUpdate()->first();
                if (!$producto) {
                    throw new InvalidArgumentException("Producto ID {$productoId} no encontrado.");
                }

                if ($producto->stock_actual < $cantidad) {
                    throw new DomainException(
                        "Stock insuficiente para '{$producto->nombre}'. Disponible: {$producto->stock_actual}, Solicitado: {$cantidad}."
                    );
                }

                $precioUnitario = isset($item['precio_unitario'])
                    ? (float) $item['precio_unitario']
                    : (float) $producto->precio_venta;

                $itemSubtotal = round($precioUnitario * $cantidad, 2);
                $subtotalCalculado += $itemSubtotal;

                $itemsPreparados[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $itemSubtotal,
                ];
            }

            $descuento = (float) ($datosVenta['descuento'] ?? 0.0);
            $total = max(0.0, round($subtotalCalculado - $descuento, 2));

            // Create Venta record
            $venta = Venta::create([
                'complejo_id' => $datosVenta['complejo_id'] ?? null,
                'turno_id' => $datosVenta['turno_id'] ?? null,
                'usuario_id' => $datosVenta['usuario_id'] ?? auth()->id(),
                'cliente_id' => $datosVenta['cliente_id'] ?? null,
                'numero_comprobante' => $datosVenta['numero_comprobante'] ?? ('TKT-' . strtoupper(Str::random(8))),
                'tipo_pago' => $datosVenta['tipo_pago'] ?? 'efectivo',
                'subtotal' => $subtotalCalculado,
                'descuento' => $descuento,
                'total' => $total,
                'estado' => $datosVenta['estado'] ?? 'completada',
            ]);

            // Create items and decrement inventory
            foreach ($itemsPreparados as $prep) {
                VentaItem::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $prep['producto']->id,
                    'cantidad' => $prep['cantidad'],
                    'precio_unitario' => $prep['precio_unitario'],
                    'subtotal' => $prep['subtotal'],
                ]);

                $prep['producto']->decrement('stock_actual', $prep['cantidad']);
            }

            return $venta->load(['items.producto', 'turno', 'cliente']);
        });
    }

    /**
     * Add consumption order (comanda) linked to a specific court reservation.
     */
    public function agregarConsumoATurno(
        int $turnoId,
        array $items,
        ?int $usuarioId = null,
        string $tipoPago = 'cuenta_turno'
    ): Venta {
        $turno = Turno::findOrFail($turnoId);

        return $this->procesarVenta([
            'complejo_id' => $turno->complejo_id,
            'turno_id' => $turnoId,
            'cliente_id' => $turno->cliente_id,
            'usuario_id' => $usuarioId,
            'tipo_pago' => $tipoPago,
        ], $items);
    }
}
