import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GestionPOSBuffet from "../components/GestionPOSBuffet";
import GestionCajaArqueo from "../components/GestionCajaArqueo";

const mockProductos = [
  {
    id: 1,
    nombre: "Gatorade Blue 500ml",
    codigo_barra: "779123456789",
    categoria: "bebidas",
    precio_costo: "1000.00",
    precio_venta: "2500.00",
    stock_actual: 20,
    stock_minimo: 5,
  },
  {
    id: 2,
    nombre: "Empanada Carne Suave",
    codigo_barra: null,
    categoria: "alimentos",
    precio_costo: "800.00",
    precio_venta: "1800.00",
    stock_actual: 15,
    stock_minimo: 4,
  },
  {
    id: 3,
    nombre: "Tubo Pelotas Padel Pro",
    codigo_barra: "779987654321",
    categoria: "pelotas",
    precio_costo: "5000.00",
    precio_venta: "9500.00",
    stock_actual: 0, // Agotado
    stock_minimo: 2,
  },
];

describe("GestionPOSBuffet Component", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/pos/productos")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: mockProductos,
            }),
          });
        }
        if (url.includes("/api/caja/resumen-diario")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                total_recaudado: 150000,
                total_buffet: 45000,
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      })
    );
  });

  it("renders POS terminal with categories, products and adds items to cart", async () => {
    render(<GestionPOSBuffet subdomain="nico-padel" token="fake-token" />);

    // Esperar a que carguen los productos
    expect(await screen.findByText("Gatorade Blue 500ml")).toBeDefined();
    expect(screen.getByText("Empanada Carne Suave")).toBeDefined();
    expect(screen.getByText("Tubo Pelotas Padel Pro")).toBeDefined();

    // El ticket de venta está vacío al inicio
    expect(screen.getByText(/El ticket está vacío/i)).toBeDefined();

    // Agregar Gatorade al carrito
    const gatoradeCard = screen.getByTestId("pos-producto-card-1");
    fireEvent.click(gatoradeCard);

    // Debe aparecer en el ticket
    expect(screen.getByText(/Ticket de Venta \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Total a Cobrar:/i)).toBeDefined();
    expect(screen.getAllByText(/2,500|2\.500/).length).toBeGreaterThan(0);

    // El producto agotado está deshabilitado
    const pelotasCard = screen.getByTestId("pos-producto-card-3") as HTMLButtonElement;
    expect(pelotasCard.disabled).toBe(true);
  });

  it("switches to inventario tab and shows product catalog with stock status", async () => {
    render(<GestionPOSBuffet subdomain="nico-padel" token="fake-token" />);

    await screen.findByText("Gatorade Blue 500ml");

    const inventarioTab = screen.getByTestId("tab-pos-inventario");
    fireEvent.click(inventarioTab);

    expect(await screen.findByText(/Catálogo de Mercadería/i)).toBeDefined();
    expect(screen.getByText("SKU: 779123456789")).toBeDefined();
    expect(screen.getByText("🔴 Agotado")).toBeDefined();
    expect(screen.getAllByText("🟢 Normal").length).toBeGreaterThan(0);
  });

  it("allows creating a new product with a custom new category on the fly", async () => {
    let savedPayload: any = null;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, opts?: any) => {
        if (url.includes("/api/pos/productos") && opts?.method === "POST") {
          savedPayload = JSON.parse(opts.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { id: 10, ...savedPayload },
            }),
          });
        }
        if (url.includes("/api/pos/productos")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: mockProductos,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      })
    );

    render(<GestionPOSBuffet subdomain="nico-padel" token="fake-token" />);

    await screen.findByText("Gatorade Blue 500ml");

    // Ir a inventario
    fireEvent.click(screen.getByTestId("tab-pos-inventario"));

    // Abrir modal nuevo producto
    fireEvent.click(screen.getByTestId("btn-nuevo-producto"));

    // Completar datos
    fireEvent.change(screen.getByTestId("input-producto-nombre"), {
      target: { value: "Sándwich de Bondiola" },
    });
    fireEvent.change(screen.getByTestId("input-producto-precio"), {
      target: { value: "3500" },
    });

    // Activar creación de nueva categoría al vuelo
    fireEvent.click(screen.getByText("+ Nueva"));

    const inputNuevaCat = screen.getByTestId("input-nueva-categoria");
    fireEvent.change(inputNuevaCat, { target: { value: "Parrilla" } });

    // Guardar
    fireEvent.click(screen.getByTestId("btn-guardar-producto"));

    await waitFor(() => {
      expect(savedPayload).toEqual(
        expect.objectContaining({
          nombre: "Sándwich de Bondiola",
          categoria: "Parrilla",
          precio_venta: 3500,
        })
      );
    });

    expect(await screen.findByText(/guardado exitosamente/i)).toBeDefined();
  });

  it("renders caja arqueo component and shows daily revenue metrics", async () => {
    render(<GestionCajaArqueo subdomain="nico-padel" token="fake-token" />);

    expect(await screen.findByText(/Resumen Operativo Diario/i)).toBeDefined();
    expect(screen.getByText(/150,000|150\.000/)).toBeDefined();
    expect(screen.getByText(/45,000|45\.000/)).toBeDefined();
    expect(screen.getByTestId("btn-apertura-caja")).toBeDefined();
    expect(screen.getByTestId("btn-cierre-caja")).toBeDefined();
  });

  it("processes direct POS sale successfully", async () => {
    let salePayload: any = null;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, opts?: any) => {
        if (url.includes("/api/pos/ventas") && opts?.method === "POST") {
          salePayload = JSON.parse(opts.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { id: 99, total: 2500 },
            }),
          });
        }
        if (url.includes("/api/pos/productos")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: mockProductos,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      })
    );

    render(<GestionPOSBuffet subdomain="nico-padel" token="fake-token" />);

    await screen.findByText("Gatorade Blue 500ml");

    // Agregar al carrito
    fireEvent.click(screen.getByTestId("pos-producto-card-1"));

    // Confirmar venta
    const confirmBtn = screen.getByTestId("btn-confirmar-venta-pos");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(salePayload).toEqual(
        expect.objectContaining({
          tipo_pago: "efectivo",
          items: [
            expect.objectContaining({
              producto_id: 1,
              cantidad: 1,
              precio_unitario: 2500,
            }),
          ],
        })
      );
    });

    expect(await screen.findByText(/registrada con éxito/i)).toBeDefined();
  });
});
