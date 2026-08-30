import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GrillaHoraria, { Slot } from "../components/GrillaHoraria";

describe("Componente Reactivo GrillaHoraria", () => {
  const mockSlots: Slot[] = [
    { hora_inicio: "09:00", hora_fin: "10:00", disponible: true, precio: 8000 },
    { hora_inicio: "10:00", hora_fin: "11:00", disponible: true, precio: 8000 },
    { hora_inicio: "11:00", hora_fin: "12:00", disponible: false, precio: 8000 },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza los turnos disponibles y oculta los no disponibles para los clientes", () => {
    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Principal"
        deporte="padel"
        fechaInicial="2026-09-01"
        initialSlots={mockSlots}
      />
    );

    expect(screen.getByText("Cancha Principal")).toBeDefined();
    expect(screen.getByLabelText("Turno 09:00 a 10:00 Disponible")).toBeDefined();
    expect(screen.getByLabelText("Turno 10:00 a 11:00 Disponible")).toBeDefined();

    // The occupied slot (11:00) should be omitted for clients
    expect(screen.queryByLabelText("Turno 11:00 a 12:00 Ocupado")).toBeNull();
  });


  it("simula selección y bloqueo exitoso de turno con inicio del contador de 10 minutos", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              token_reserva: "lock-uuid-1234",
              ttl: 600,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { slots: mockSlots } }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padelpro"
        fechaInicial="2026-09-01"
        initialSlots={mockSlots}
      />
    );

    const slotBtn = screen.getByLabelText("Turno 09:00 a 10:00 Disponible");
    fireEvent.click(slotBtn);

    // Verify atomic lock API was called with required payload and header
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/bloquear-temporal"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Tenant-ID": "padelpro",
          }),
          body: JSON.stringify({
            cancha_id: 1,
            fecha: "2026-09-01",
            hora_inicio: "09:00",
            hora_fin: "10:00",
          }),
        })
      );
    });

    // Check active lock banner and 10:00 countdown timer
    await waitFor(() => {
      expect(screen.getByTestId("active-lock-banner")).toBeDefined();
      const timer = screen.getByTestId("countdown-timer");
      expect(timer.textContent).toMatch(/^(10:00|09:59)$/);
    });

    // Check success toast notification
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/bloqueado con éxito/i)).toBeDefined();
  });

  it("muestra alerta Toast en caso de error 409 Conflict (doble reserva)", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              error: "TURNO_ALREADY_LOCKED",
              message: "El turno ya se encuentra bloqueado por otro usuario.",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { slots: mockSlots } }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        fechaInicial="2026-09-01"
        initialSlots={mockSlots}
      />
    );

    const slotBtn = screen.getByLabelText("Turno 10:00 a 11:00 Disponible");
    fireEvent.click(slotBtn);

    // Verify toast alert with 409 Conflict message is displayed
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeDefined();
      expect(alert.textContent).toContain("El turno ya se encuentra bloqueado por otro usuario.");
    });

    // Active lock banner should not exist
    expect(screen.queryByTestId("active-lock-banner")).toBeNull();
  });

  it("renderiza el selector de duración flexible y permite consultar turnos de 90 minutos", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            cancha_id: 1,
            duracion_minutos: url.includes("duracion=90") ? 90 : 60,
            permite_duracion_flexible: true,
            slots_disponibles: [
              { hora_inicio: "08:00", hora_fin: "09:30", disponible: true, precio: 12000, duracion_minutos: 90 },
              { hora_inicio: "09:30", hora_fin: "11:00", disponible: true, precio: 12000, duracion_minutos: 90 },
            ],
          }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Central"
        deporte="padel"
        fechaInicial="2026-09-01"
        permiteDuracionFlexible={true}
        duracionInicial={60}
      />
    );

    expect(await screen.findByText(/Elige la duración que deseas jugar/i)).toBeDefined();
    expect(screen.getByText(/90 min/i)).toBeDefined();

    // Click on 90 min button
    const btn90 = screen.getByText(/90 min/i);
    fireEvent.click(btn90);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("duracion=90"),
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Turno 08:00 a 09:30 Disponible")).toBeDefined();
      expect(screen.getByLabelText("Turno 09:30 a 11:00 Disponible")).toBeDefined();
    });
  });

  it("muestra banner explicativo de optimización anti-baches exclusivamente al administrador", async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            cancha_id: 1,
            slots_disponibles: [
              { hora_inicio: "18:30", hora_fin: "20:00", disponible: true, precio: 12000, duracion_minutos: 90 },
            ],
            optimizacion_anti_baches: {
              activa: true,
              total_horarios_protegidos: 1,
              horarios_protegidos: [
                {
                  hora_inicio: "18:00",
                  hora_fin: "19:30",
                  duracion_minutos: 90,
                  motivo: "Dejaría un hueco muerto de 30 min (19:30 a 20:00)",
                },
              ],
            },
          }),
      });
    });

    // 1. Render as normal client (isAdmin = false)
    const { unmount } = render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Central"
        deporte="padel"
        fechaInicial="2026-09-01"
        isAdmin={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Turno 18:30 a 20:00 Disponible")).toBeDefined();
    });

    // Client should NOT see the admin banner
    expect(screen.queryByTestId("admin-anti-baches-banner")).toBeNull();

    unmount();

    // 2. Render as Club Admin (isAdmin = true)
    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Central"
        deporte="padel"
        fechaInicial="2026-09-01"
        isAdmin={true}
      />
    );

    // Admin SHOULD see the informative callout explaining why 18:00 was hidden
    await waitFor(() => {
      const adminBanner = screen.getByTestId("admin-anti-baches-banner");
      expect(adminBanner).toBeDefined();
      expect(adminBanner.textContent).toContain("Regla Anti-Baches en Acción");
      expect(adminBanner.textContent).toContain("Dejaría un hueco muerto de 30 min");
    });
  });

  it("oculta completamente los turnos ocupados a los clientes y los muestra enriquecidos exclusivamente al administrador con opción de liberar", async () => {
    const mockTurnosOcupados = [
      {
        id: 42,
        cancha_id: 1,
        fecha: "2026-09-01",
        hora_inicio: "20:00",
        hora_fin: "21:30",
        duracion_minutos: 90,
        precio: 12000,
        estado: "confirmado",
        cliente_nombre: "Martín Palermo",
        cliente_telefono: "+54 9 11 9999-8888",
        es_fijo: false,
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/turnos/42")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Turno liberado" }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            cancha_id: 1,
            slots_disponibles: [
              { hora_inicio: "18:30", hora_fin: "20:00", disponible: true, precio: 12000 },
              { hora_inicio: "20:00", hora_fin: "21:30", disponible: false },
            ],
            turnos_ocupados: mockTurnosOcupados,
          }),
      });
    });

    // 1. Cliente común: NO ve el turno 20:00-21:30 ni la sección de turnos ocupados
    const { unmount } = render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Central"
        deporte="padel"
        fechaInicial="2026-09-01"
        isAdmin={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Turno 18:30 a 20:00 Disponible")).toBeDefined();
    });

    // El slot ocupado de las 20:00 no debe estar en los botones de selección
    expect(screen.queryByLabelText(/Turno 20:00 a 21:30/i)).toBeNull();
    // La sección administrativa no debe existir
    expect(screen.queryByTestId("admin-occupied-turnos-section")).toBeNull();

    unmount();

    // 2. Administrador: Ve la sección de turnos ocupados con el nombre del cliente y teléfono
    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Central"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-01"
        isAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("admin-occupied-turnos-section")).toBeDefined();
      expect(screen.getByText("Martín Palermo")).toBeDefined();
      expect(screen.getByText(/9999-8888/)).toBeDefined();
      expect(screen.getByText("WhatsApp ↗")).toBeDefined();
    });

    // Probar liberación de turno
    const btnLiberar = screen.getByRole("button", { name: /Liberar Turno/i });
    fireEvent.click(btnLiberar);

    // Debe abrirse modal de confirmación
    expect(screen.getByText("¿Liberar este Turno?")).toBeDefined();

    const btnConfirmarLiberacion = screen.getByRole("button", { name: /Sí, Liberar Turno/i });
    fireEvent.click(btnConfirmarLiberacion);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/clubs/padel-pro/turnos/42"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
