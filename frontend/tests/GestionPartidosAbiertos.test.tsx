import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import GestionPartidosAbiertos from "../components/GestionPartidosAbiertos";

describe("GestionPartidosAbiertos Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPartidos = [
    {
      id: 1,
      complejo_id: 1,
      turno_id: 10,
      jugadores_requeridos: 4,
      jugadores_actuales: 2,
      estado: "buscando",
      tipo_partido: "competitivo",
      nivel_min: "7ma",
      nivel_max: "6ta",
      created_at: "2026-11-22T10:00:00Z",
      turno: {
        id: 10,
        fecha: "2026-11-25",
        hora_inicio: "20:00:00",
        hora_fin: "21:30:00",
        precio: 16000,
        estado: "disponible",
        cancha: {
          id: 1,
          nombre: "Cancha 1 Cristal",
          deporte: "padel",
        },
      },
      organizador: {
        id: 5,
        name: "Carlos Gomez",
        email: "carlos@test.com",
      },
      pagos_divididos: [
        {
          id: 101,
          cuota_numero: 1,
          total_cuotas: 4,
          monto: 4000,
          token_pago: "token-uuid-1",
          estado: "pagado",
          nombre_jugador: "Carlos Gomez",
          metodo_pago: "mercadopago",
        },
        {
          id: 102,
          cuota_numero: 2,
          total_cuotas: 4,
          monto: 4000,
          token_pago: "token-uuid-2",
          estado: "pendiente",
        },
        {
          id: 103,
          cuota_numero: 3,
          total_cuotas: 4,
          monto: 4000,
          token_pago: "token-uuid-3",
          estado: "pendiente",
        },
        {
          id: 104,
          cuota_numero: 4,
          total_cuotas: 4,
          monto: 4000,
          token_pago: "token-uuid-4",
          estado: "pendiente",
        },
      ],
    },
  ];

  it("renderiza el panel de partidos abiertos y KPIs correctamente", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/partidos-abiertos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPartidos }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    }) as any;

    render(<GestionPartidosAbiertos subdomain="nico-padel" />);

    expect(screen.getByText("Cargando convocatorias activas...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Cancha 1 Cristal")).toBeDefined();
      expect(screen.getByText("padel")).toBeDefined();
      expect(screen.getAllByText("Buscando").length).toBeGreaterThan(0);
    });

    // Validar KPIs
    expect(screen.getByText("Convocatorias Activas")).toBeDefined();
    expect(screen.getByText("1 / 4")).toBeDefined();
  });

  it("permite abrir el modal de detalle y copiar links de cuotas", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/partidos-abiertos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPartidos }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
    }) as any;

    render(<GestionPartidosAbiertos subdomain="nico-padel" />);

    await waitFor(() => {
      expect(screen.getByText("Cancha 1 Cristal")).toBeDefined();
    });

    const btnVerDetalle = screen.getByRole("button", { name: /Ver Cuotas & Links/i });
    fireEvent.click(btnVerDetalle);

    await waitFor(() => {
      expect(screen.getByText("Cuotas de Cancha 1 Cristal")).toBeDefined();
      expect(screen.getByText("Cuota 1")).toBeDefined();
      expect(screen.getByText("Cuota 2")).toBeDefined();
      expect(screen.getAllByText("Cobrar en Mostrador").length).toBeGreaterThan(0);
    });
  });
});
