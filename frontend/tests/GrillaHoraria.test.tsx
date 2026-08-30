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
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ slots_disponibles: [], turnos_ocupados: [] }),
      })
    );
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

  it("permite al recepcionista asignar turnos en mostrador sin exigir crear cuenta", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token_reserva: "admin-lock", ttl: 600 }),
        });
      }
      if (url.includes("/turnos/confirmar")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              turno: {
                id: 99,
                cancha_id: 1,
                cliente_nombre: "Mariano Werner",
                cliente_telefono: "+54 9 11 4444-1111",
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            slots_disponibles: [{ hora_inicio: "15:00", hora_fin: "16:30", disponible: true, precio: 12000 }],
            turnos_ocupados: [],
          }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-01"
        isAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Turno 15:00 a 16:30 Disponible")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("Turno 15:00 a 16:30 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Confirmar Reserva"));

    // El modal de recepcionista se abre con título de Asignación en Mostrador
    expect(screen.getByText("Asignación de Turno en Mostrador")).toBeDefined();
    expect(screen.getByText(/Modo Recepción/i)).toBeDefined();

    // Completar nombre y teléfono del cliente presencial
    const inputNombre = screen.getByPlaceholderText(/Mariano Werner/i);
    const inputTelefono = screen.getByPlaceholderText(/4567-8901/i);

    fireEvent.change(inputNombre, { target: { value: "Mariano Werner" } });
    fireEvent.change(inputTelefono, { target: { value: "+54 9 11 4444-1111" } });

    const btnAsignar = screen.getByRole("button", { name: /Asignar en Mostrador/i });
    fireEvent.click(btnAsignar);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Mariano Werner"),
        })
      );
    });
  });

  it("permite a un visitante público crear su cuenta rápida en el checkout y confirmar su turno", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token_reserva: "client-lock", ttl: 600 }),
        });
      }
      if (url.includes("/auth/register")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              token: "new-user-token",
              user: { id: 77, name: "Lucas Martínez", email: "lucas@example.com", telefono: "+54 9 11 2345-6789" },
            }),
        });
      }
      if (url.includes("/auth/verify-otp")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "¡Correo verificado exitosamente!",
              user: { id: 77, name: "Lucas Martínez", email: "lucas@example.com" },
            }),
        });
      }
      if (url.includes("/turnos/confirmar")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              turno: {
                id: 101,
                cancha_id: 1,
                cliente_id: 77,
                cliente_nombre: "Lucas Martínez",
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            slots_disponibles: [{ hora_inicio: "17:00", hora_fin: "18:30", disponible: true, precio: 10000 }],
            turnos_ocupados: [],
          }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-01"
        isAdmin={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Turno 17:00 a 18:30 Disponible")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("Turno 17:00 a 18:30 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Confirmar Reserva"));

    // Modal de registro rápido (Paso 1)
    expect(screen.getByText("✨ Crear Cuenta Rápida")).toBeDefined();

    const inputNombre = screen.getByPlaceholderText(/Lucas Martínez/i);
    const inputTelefono = screen.getByPlaceholderText(/2345-6789/i);
    const inputEmail = screen.getByPlaceholderText(/lucas@example.com/i);
    const inputPassword = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(inputNombre, { target: { value: "Lucas Martínez" } });
    fireEvent.change(inputTelefono, { target: { value: "+54 9 11 2345-6789" } });
    fireEvent.change(inputEmail, { target: { value: "lucas@example.com" } });
    fireEvent.change(inputPassword, { target: { value: "secret123" } });

    const btnPaso1 = screen.getByRole("button", { name: /Continuar \(Paso 1\/2\)/i });
    fireEvent.click(btnPaso1);

    // 1. Debe haber llamado a register
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("lucas@example.com"),
        })
      );
    });

    // 2. Transiciona a Paso 2: Verificación OTP in-modal
    await waitFor(() => {
      expect(screen.getByText(/Código de Verificación Enviado/i)).toBeDefined();
    });

    const inputOtp = screen.getByPlaceholderText("000000");
    fireEvent.change(inputOtp, { target: { value: "482910" } });

    const btnVerificarConfirmar = screen.getByRole("button", { name: /Verificar & Confirmar/i });
    fireEvent.click(btnVerificarConfirmar);

    await waitFor(() => {
      // 3. Debe haber llamado a verify-otp
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/verify-otp"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("482910"),
        })
      );

      // 4. Debe haber confirmado el turno
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Lucas Martínez"),
        })
      );
    });
  });

  it("bloquea fechas pasadas en el selector de fecha y previene seleccionar fechas anteriores a hoy", async () => {
    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        fechaInicial="2026-09-01"
      />
    );

    const inputFecha = screen.getByLabelText(/Fecha:/i) as HTMLInputElement;
    const today = new Date().toISOString().split("T")[0];
    
    // min attribute debe estar fijado en la fecha de hoy
    expect(inputFecha.min).toBe(today);

    // Intentar cambiar a una fecha del pasado
    fireEvent.change(inputFecha, { target: { value: "2020-01-01" } });

    // Debe mostrar alerta de advertencia y reiniciar a la fecha de hoy
    await waitFor(() => {
      expect(screen.getByText(/No se pueden seleccionar fechas del pasado/i)).toBeDefined();
      expect(inputFecha.value).toBe(today);
    });
  });

  it("no muestra horarios que ya han pasado cuando la fecha seleccionada es hoy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T15:30:00"));

    const mixedSlots: Slot[] = [
      { hora_inicio: "10:00", hora_fin: "11:00", disponible: true, precio: 8000 },
      { hora_inicio: "14:00", hora_fin: "15:00", disponible: true, precio: 8000 },
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 8000 },
      { hora_inicio: "20:00", hora_fin: "21:00", disponible: true, precio: 8000 },
    ];

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        fechaInicial="2026-09-01"
        initialSlots={mixedSlots}
      />
    );

    // Los slots de las 10:00 y 14:00 (anteriores a las 15:30) NO deben aparecer
    expect(screen.queryByLabelText("Turno 10:00 a 11:00 Disponible")).toBeNull();
    expect(screen.queryByLabelText("Turno 14:00 a 15:00 Disponible")).toBeNull();

    // Los slots de las 18:00 y 20:00 (posteriores a las 15:30) SÍ deben aparecer
    expect(screen.getByLabelText("Turno 18:00 a 19:00 Disponible")).toBeDefined();
    expect(screen.getByLabelText("Turno 20:00 a 21:00 Disponible")).toBeDefined();

    vi.useRealTimers();
  });
});
