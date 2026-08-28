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

  it("renderiza los turnos disponibles y deshabilita los ocupados", () => {
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
    expect(screen.getByLabelText("Turno 11:00 a 12:00 Ocupado")).toBeDefined();

    // The occupied slot (11:00) should be disabled
    const occupiedButton = screen.getByLabelText("Turno 11:00 a 12:00 Ocupado");
    expect((occupiedButton as HTMLButtonElement).disabled).toBe(true);
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
});
