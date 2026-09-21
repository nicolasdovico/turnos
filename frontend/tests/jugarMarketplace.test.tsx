import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import JugarMarketplacePage from "../app/jugar/page";

describe("Jugar Marketplace & Buscador Espacial de Jugadores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders active and operative marketplace by default showing subscribed clubs and search filters", async () => {
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
        canchas: [{ id: 10, nombre: "Pista 1" }, { id: 11, nombre: "Pista 2" }],
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
        canchas: [{ id: 12, nombre: "Court 1" }],
      },
    ];

    global.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        data: mockComplejos,
        total: 2,
      }),
    } as any));

    render(<JugarMarketplacePage />);

    expect(screen.getByTestId("marketplace-active")).toBeDefined();
    expect(screen.getByText("Canchas y Complejos Deportivos Cercanos")).toBeDefined();

    // Verify list of complexes rendered immediately with distances
    const padelClubs = await screen.findAllByText("Padel Pro Center");
    expect(padelClubs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1.8 km").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2 canchas/i)).toBeDefined();

    expect(screen.getByText("Tenis Mercedes Club")).toBeDefined();
    expect(screen.getByText("15.2 km")).toBeDefined();

    // Verify filter buttons exist (Radius and Sports)
    expect(screen.getByRole("button", { name: "5 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "10 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "20 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "50 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Pádel/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Gimnasio/i })).toBeDefined();

    // Verify direct reservation links
    const reserveLinks = screen.getAllByRole("link", { name: /Ver Canchas/i });
    expect(reserveLinks.length).toBeGreaterThanOrEqual(1);

    // Verify map iframe rendered
    const mapIframe = screen.getByTitle(/Mapa de Padel Pro Center/i) as HTMLIFrameElement;
    expect(mapIframe).toBeDefined();
    expect(mapIframe.src).toContain("openstreetmap.org");
  });

  it("renders coming soon view when access is cut off with NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE=false", () => {
    const originalEnv = process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE;
    process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE = "false";

    try {
      render(<JugarMarketplacePage />);

      expect(screen.getByTestId("marketplace-coming-soon")).toBeDefined();
      expect(screen.getByText(/Próximamente en Fase de Lanzamiento/i)).toBeDefined();
      expect(screen.getByText(/El buscador y mapa de canchas deportivas/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /Registrar mi Club Gratis/i })).toBeDefined();
      expect(screen.getByTestId("btn-enable-preview")).toBeDefined();
    } finally {
      process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE = originalEnv;
    }
  });

  it("unlocks interactive marketplace with preview button when disabled via variable", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE;
    process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE = "false";

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
    ];

    global.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        data: mockComplejos,
        total: 1,
      }),
    } as any));

    try {
      render(<JugarMarketplacePage />);

      // Initially in coming soon view
      expect(screen.getByTestId("marketplace-coming-soon")).toBeDefined();

      // Click on preview mode button
      const previewBtn = screen.getByTestId("btn-enable-preview");
      fireEvent.click(previewBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Verify marketplace is unlocked
      const padelClubs = await screen.findAllByText("Padel Pro Center");
      expect(padelClubs.length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("1.8 km").length).toBeGreaterThanOrEqual(1);
    } finally {
      process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE = originalEnv;
    }
  });

  it("allows searching manual location by city name with Nominatim geocoding and expanded radius", async () => {
    const mockComplejosLujan = [
      {
        id: 1,
        uuid: "c1",
        nombre: "Club Padel Luján",
        subdominio: "padel-lujan",
        deporte_principal: "padel",
        direccion: "San Martín 500",
        ciudad: "Luján",
        latitud: -34.5703,
        longitud: -59.1050,
        distancia_km: 0.8,
        deportes_disponibles: ["padel"],
        canchas: [{ id: 10, nombre: "Cancha 1" }],
      },
    ];

    global.fetch = vi.fn().mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("nominatim.openstreetmap.org")) {
        return {
          ok: true,
          json: async () => [
            {
              lat: "-34.570300",
              lon: "-59.105000",
              display_name: "Luján, Partido de Luján, Buenos Aires, Argentina",
            },
          ],
        } as any;
      }
      if (urlStr.includes("complejos/cercanos")) {
        return {
          ok: true,
          json: async () => ({
            data: mockComplejosLujan,
            total: 1,
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ data: [] }) } as any;
    });

    render(<JugarMarketplacePage />);

    // Verify 100 km and 200 km radius buttons exist
    expect(screen.getByRole("button", { name: "100 km" })).toBeDefined();
    expect(screen.getByRole("button", { name: "200 km" })).toBeDefined();

    // Verify manual location input
    const locationInput = screen.getByTestId("input-manual-location") as HTMLInputElement;
    expect(locationInput).toBeDefined();

    // Type "Luján" in input
    fireEvent.change(locationInput, { target: { value: "Luján" } });

    // Submit location search
    const form = screen.getByTestId("form-location-search");
    fireEvent.submit(form);

    const clubs = await screen.findAllByText("Club Padel Luján");
    expect(clubs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/800 m/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Luján/i).length).toBeGreaterThanOrEqual(1);

    // Click 100 km radius button
    const btn100 = screen.getByRole("button", { name: "100 km" });
    fireEvent.click(btn100);

    // Verify fetch called with radio_km=100
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("radio_km=100")
      );
    });
  });
});

