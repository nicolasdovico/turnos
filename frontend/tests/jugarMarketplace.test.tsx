import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JugarMarketplacePage from "../app/jugar/page";

describe("Jugar Marketplace & Buscador Espacial de Jugadores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders coming soon view when marketplace is not enabled (feature flag off)", () => {
    render(<JugarMarketplacePage />);

    expect(screen.getByTestId("marketplace-coming-soon")).toBeDefined();
    expect(screen.getByText(/Próximamente en Fase de Lanzamiento/i)).toBeDefined();
    expect(screen.getByText(/El buscador y mapa de canchas deportivas/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Registrar mi Club Gratis/i })).toBeDefined();
    expect(screen.getByTestId("btn-enable-preview")).toBeDefined();
  });

  it("unlocks interactive marketplace when clicking preview button and searches nearby clubs", async () => {
    const mockComplejos = [
      {
        id: 1,
        uuid: "c1",
        nombre: "Padel Pro Center",
        subdominio: "padelpro",
        deporte_principal: "padel",
        direccion: "Av. San Martin 123",
        ciudad: "Luján",
        latitud: -34.570000,
        longitud: -59.100000,
        distancia_km: 1.8,
        deportes_disponibles: ["padel"],
      },
      {
        id: 2,
        uuid: "c2",
        nombre: "Tenis Mercedes Club",
        subdominio: "tenis-mercedes",
        deporte_principal: "tenis",
        direccion: "Calle 29 y 30",
        ciudad: "Mercedes",
        latitud: -34.650000,
        longitud: -59.430000,
        distancia_km: 15.2,
        deportes_disponibles: ["tenis"],
      },
    ];

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      return {
        ok: true,
        json: async () => ({
          data: mockComplejos,
          total: 2,
        }),
      } as any;
    });

    render(<JugarMarketplacePage />);

    // Click on preview mode
    const previewBtn = screen.getByTestId("btn-enable-preview");
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Verify list of complexes rendered with distances
    const padelClubs = await screen.findAllByText("Padel Pro Center");
    expect(padelClubs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1.8 km").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Tenis Mercedes Club")).toBeDefined();
    expect(screen.getByText("15.2 km")).toBeDefined();

    // Verify filter buttons exist (Radius and Sports)
    expect(screen.getByRole("button", { name: "5 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "10 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "20 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "50 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Pádel/i })).toBeDefined();

    // Verify direct reservation links
    const reserveLinks = screen.getAllByRole("link", { name: /Ver Canchas/i });
    expect(reserveLinks.length).toBeGreaterThanOrEqual(1);

    // Verify map iframe rendered
    const mapIframe = screen.getByTitle(/Mapa de Padel Pro Center/i) as HTMLIFrameElement;
    expect(mapIframe).toBeDefined();
    expect(mapIframe.src).toContain("openstreetmap.org");
  });
});
