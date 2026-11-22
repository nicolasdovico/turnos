import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SplitPagoClient from "../components/SplitPagoClient";

describe("SplitPagoClient Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCuota = {
    id: 101,
    cuota_numero: 2,
    total_cuotas: 4,
    monto: 4000,
    token_pago: "token-uuid-123",
    estado: "pendiente",
    partido_abierto: {
      id: 1,
      estado: "buscando",
      tipo_partido: "competitivo",
      nivel_min: "7ma",
      nivel_max: "6ta",
      jugadores_requeridos: 4,
      jugadores_actuales: 1,
    },
    turno: {
      id: 10,
      fecha: "2026-11-25",
      hora_inicio: "20:00:00",
      hora_fin: "21:30:00",
      precio: 16000,
      estado: "bloqueado",
      cancha: {
        id: 1,
        nombre: "Cancha Central Pádel",
        deporte: "padel",
        superficie: "cristal",
        techada: true,
      },
    },
  };

  it("renderiza el detalle de la cuota y el formulario de pago", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/split-pagos/token-uuid-123")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { cuota: mockCuota } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<SplitPagoClient token="token-uuid-123" />);

    expect(screen.getByText("Cargando datos del partido...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Cancha Central Pádel")).toBeDefined();
      expect(screen.getByText("Cuota 2 de 4")).toBeDefined();
      expect(screen.getByText("Datos del Jugador y Medio de Pago")).toBeDefined();
    });
  });

  it("permite pagar la cuota y muestra pantalla de confirmación exitosa", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "POST" && url.includes("/api/split-pagos/token-uuid-123/pagar")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              message: "Cuota pagada con éxito",
              data: {
                cuota: {
                  ...mockCuota,
                  estado: "pagado",
                  nombre_jugador: "Martín Padel",
                },
              },
            }),
        });
      }
      if (url.includes("/api/split-pagos/token-uuid-123")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { cuota: mockCuota } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;

    render(<SplitPagoClient token="token-uuid-123" />);

    await waitFor(() => {
      expect(screen.getByText("Cancha Central Pádel")).toBeDefined();
    });

    const inputNombre = screen.getByPlaceholderText("Ej: Marcos Gómez");
    fireEvent.change(inputNombre, { target: { value: "Martín Padel" } });

    const btnPagar = screen.getByRole("button", { name: /Pagar Mi Cuota/i });
    fireEvent.click(btnPagar);

    await waitFor(() => {
      expect(screen.getByText("¡Cuota Pagada con Éxito!")).toBeDefined();
      expect(screen.getByText("Volver a la Grilla de Turnos")).toBeDefined();
    });
  });
});
