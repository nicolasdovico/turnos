import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GrillaHoraria, { Slot, getLocalDateString } from "../components/GrillaHoraria";

describe("Componente Reactivo GrillaHoraria", () => {
  const mockSlots: Slot[] = [
    { hora_inicio: "09:00", hora_fin: "10:00", disponible: true, precio: 8000 },
    { hora_inicio: "10:00", hora_fin: "11:00", disponible: true, precio: 8000 },
    { hora_inicio: "11:00", hora_fin: "12:00", disponible: false, precio: 8000 },
  ];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T07:00:00"));
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
    vi.useRealTimers();
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
            duracion_minutos: 60,
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
    const today = getLocalDateString();
    
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

  it("muestra múltiples turnos retenidos con sus cuentas regresivas exclusivamente al administrador con opción de forzar liberación", async () => {
    const mockTurnosRetenidos = [
      {
        cancha_id: 1,
        cancha_nombre: "Cancha Central",
        fecha: "2026-09-01",
        hora_inicio: "19:00",
        hora_fin: "20:00",
        duracion_minutos: 60,
        precio: 10000,
        ttl_segundos: 450,
        expira_en_segundos: 450,
        estado: "bloqueado_temporal",
      },
      {
        cancha_id: 1,
        cancha_nombre: "Cancha Central",
        fecha: "2026-09-01",
        hora_inicio: "21:00",
        hora_fin: "22:00",
        duracion_minutos: 60,
        precio: 10000,
        ttl_segundos: 520,
        expira_en_segundos: 520,
        estado: "bloqueado_temporal",
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/turnos/liberar-bloqueo")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Bloqueo liberado" }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            cancha_id: 1,
            slots_disponibles: [
              { hora_inicio: "18:00", hora_fin: "19:00", disponible: true },
              { hora_inicio: "20:00", hora_fin: "21:00", disponible: true },
            ],
            turnos_ocupados: [],
            turnos_retenidos: mockTurnosRetenidos,
          }),
      });
    });

    // 1. Cliente público: NO ve el contenedor de turnos retenidos
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
      expect(screen.getByLabelText("Turno 18:00 a 19:00 Disponible")).toBeDefined();
    });

    expect(screen.queryByTestId("admin-retained-locks-container")).toBeNull();

    unmount();

    // 2. Administrador: SÍ ve el contenedor con todos los turnos retenidos uno debajo del otro
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
      const container = screen.getByTestId("admin-retained-locks-container");
      expect(container).toBeDefined();
      expect(container.textContent).toContain("Turnos Retenidos en Proceso de Reserva (2)");
    });

    // Verificar que se listan ambos turnos retenidos con sus tiempos
    expect(screen.getByText(/19:00 - 20:00 hs/)).toBeDefined();
    expect(screen.getByText(/21:00 - 22:00 hs/)).toBeDefined();
    expect(screen.getByTestId("countdown-timer-19:00")).toBeDefined();
    expect(screen.getByTestId("countdown-timer-21:00")).toBeDefined();

    // Probar forzar liberación de un turno retenido
    const botonesLiberar = screen.getAllByRole("button", { name: /Forzar Liberación/i });
    expect(botonesLiberar.length).toBe(2);

    fireEvent.click(botonesLiberar[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/liberar-bloqueo"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"hora_inicio":"19:00"'),
        })
      );
    });
  });

  it("permite simular pago de seña del 50% con simulador sandbox y confirma el turno", async () => {
    localStorage.setItem("saas_token", "fake-token");
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 1, name: "Max Verstappen", email: "max@redbull.com", telefono: "1122334455" })
    );

    const availableSlots: Slot[] = [
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 10000 },
    ];

    global.fetch = vi.fn().mockImplementation((url, options) => {
      const urlStr = typeof url === "string" ? url : "";
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: 1, name: "Max Verstappen", email: "max@redbull.com" } }),
        });
      }
      if (urlStr.includes("/wallet/saldo")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ saldo: 2500.0 }),
        });
      }
      if (urlStr.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, ttl: 600, token_reserva: "lock-token-123" }),
        });
      }
      if (urlStr.includes("/turnos/confirmar")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Turno confirmado",
              turno: {
                id: 10,
                monto_pagado: 5000,
                saldo_pendiente: 5000,
                estado_pago: "senado",
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ slots: availableSlots }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-01"
        initialSlots={availableSlots}
      />
    );

    // 1. Click en slot disponible
    fireEvent.click(screen.getByLabelText("Turno 18:00 a 19:00 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });

    // 2. Abrir modal
    fireEvent.click(screen.getByText("Confirmar Reserva"));

    // 3. Verificar desglose financiero de seña
    await waitFor(() => {
      expect(screen.getByTestId("sena-breakdown")).toBeDefined();
      expect(screen.getByText(/Saldo a pagar en el club/i)).toBeDefined();
    });

    // 4. Click en Simular Pago Aprobado
    const botonSimular = screen.getByRole("button", { name: /Simular Pago Aprobado/i });
    expect(botonSimular).toBeDefined();

    fireEvent.click(botonSimular);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"metodo_pago":"simulador_dev"'),
        })
      );
    });
  });

  it("permite a un visitante público suscribirse a la lista de espera de un turno ocupado", async () => {
    localStorage.setItem("saas_token", "fake-token-waitlist");
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 2, name: "Charles Leclerc", email: "charles@ferrari.com" })
    );

    const mixedSlots: Slot[] = [
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 10000 },
      { hora_inicio: "19:00", hora_fin: "20:00", disponible: false, precio: 10000 },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      const urlStr = typeof url === "string" ? url : "";
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: 2, name: "Charles Leclerc", email: "charles@ferrari.com" } }),
        });
      }
      if (urlStr.includes("/lista-espera")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Suscripción confirmada" }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ slots: mixedSlots }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-01"
        initialSlots={mixedSlots}
      />
    );

    // Verificar que aparece la sección de lista de espera para el horario de las 19:00 ocupado
    await waitFor(() => {
      expect(screen.getByTestId("public-waitlist-section")).toBeDefined();
      expect(screen.getByText(/Lista de Espera/i)).toBeDefined();
    });

    const botonAvisarme = screen.getByRole("button", { name: /Avisarme/i });
    expect(botonAvisarme).toBeDefined();

    fireEvent.click(botonAvisarme);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/lista-espera"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"hora_inicio":"19:00"'),
        })
      );
      expect(screen.getByText("✓ Notificación Activa")).toBeDefined();
    });
  });

  it("diferencia turnos fijos en grilla admin y permite liberar fecha puntual o dar de baja serie y registrar pagos", async () => {
    const fixedTurno = {
      id: 55,
      cancha_id: 1,
      fecha: "2026-09-01",
      hora_inicio: "19:00",
      hora_fin: "20:30",
      precio: 8000,
      cliente_nombre: "Lucas Titular Fijo",
      cliente_telefono: "1199887766",
      es_fijo: true,
      estado: "reservado",
      estado_pago: "pendiente",
      metodo_pago: "mostrador",
    };

    let paymentPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      const urlStr = url.toString();

      if (urlStr.includes("/turnos/55/registrar-pago")) {
        paymentPayload = JSON.parse(init?.body || "{}");
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, estado_pago: "pagado" }),
        });
      }
      if (urlStr.includes("/turnos/55/liberar-fecha")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Fecha puntual liberada." }),
        });
      }
      if (urlStr.includes("/canchas/1/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              cancha_id: 1,
              fecha: "2026-09-01",
              turnos_ocupados: [fixedTurno],
              slots: [],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

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

    expect(await screen.findByText("Lucas Titular Fijo")).toBeDefined();
    expect(screen.getAllByText(/Fijo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/⏳ Pendiente/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Cobrar/i })).toBeDefined();

    // 1. Probar modal de Cobro
    const btnCobrar = screen.getByRole("button", { name: /Cobrar/i });
    fireEvent.click(btnCobrar);

    expect(await screen.findByText(/Registrar Cobro de Turno/i)).toBeDefined();
    const btnConfirmarCobro = screen.getByRole("button", { name: /Confirmar Cobro/i });
    fireEvent.click(btnConfirmarCobro);

    await waitFor(() => {
      expect(paymentPayload).toBeDefined();
      expect(paymentPayload.metodo_pago).toBe("mostrador");
    });

    // 2. Probar modal de Liberación para turno fijo
    const btnLiberar = screen.getByRole("button", { name: /Liberar Turno/i });
    fireEvent.click(btnLiberar);

    expect(await screen.findByText(/Gestión de Turno Fijo/i)).toBeDefined();
    expect(screen.getByText(/Liberar SOLO esta fecha puntual/i)).toBeDefined();
    expect(screen.getByText(/Dar de BAJA Turno Fijo Definitivamente/i)).toBeDefined();

    // Click liberar fecha puntual
    const btnLiberarPuntual = screen.getByRole("button", { name: /Liberar SOLO esta fecha puntual/i });
    fireEvent.click(btnLiberarPuntual);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/55/liberar-fecha"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("actualiza el estado a Pagado y oculta el botón Cobrar tras confirmar el cobro en mostrador", async () => {
    const regularTurno = {
      id: 88,
      cancha_id: 1,
      fecha: "2026-09-01",
      hora_inicio: "11:00",
      hora_fin: "12:30",
      precio: 8000,
      monto_pagado: 0,
      saldo_pendiente: 8000,
      cliente_nombre: "Cliente Presencial",
      cliente_telefono: "1122334455",
      es_fijo: false,
      estado: "reservado",
      estado_pago: "pendiente",
      metodo_pago: "mostrador",
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/turnos/88/registrar-pago")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              turno_id: 88,
              metodo_pago: "mostrador",
              monto_pagado: 8000,
              saldo_pendiente: 0,
              estado_pago: "pagado",
            }),
        });
      }
      if (urlStr.includes("/canchas/1/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              cancha_id: 1,
              fecha: "2026-09-01",
              turnos_ocupados: [regularTurno],
              slots: [],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

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

    expect(await screen.findByText("Cliente Presencial")).toBeDefined();
    expect(screen.getByText(/⏳ Pendiente/i)).toBeDefined();
    const btnCobrar = screen.getByRole("button", { name: /Cobrar/i });
    expect(btnCobrar).toBeDefined();

    // Abrir modal y confirmar cobro
    fireEvent.click(btnCobrar);
    expect(await screen.findByText(/Registrar Cobro de Turno/i)).toBeDefined();

    const btnConfirmarCobro = screen.getByRole("button", { name: /Confirmar Cobro/i });
    fireEvent.click(btnConfirmarCobro);

    // Debe reflejarse inmediatamente el estado ✓ Pagado y ocultarse el botón de Cobrar
    await waitFor(() => {
      expect(screen.getByText(/✓ Pagado/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Cobrar/i })).toBeNull();
    });
  });

  it("emite alerta toast con icono de campana cuando detecta un nuevo turno reservado durante el polling silencioso en modo admin", async () => {
    let currentTurnos: any[] = [];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/canchas/1/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              cancha_id: 1,
              fecha: "2026-09-01",
              turnos_ocupados: currentTurnos,
              slots: [],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

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

    // Initial render finishes with 0 turnos
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Simulate new booking arriving from an online user
    currentTurnos = [
      {
        id: 999,
        cancha_id: 1,
        fecha: "2026-09-01",
        hora_inicio: "19:00",
        hora_fin: "20:30",
        precio: 15000,
        cliente_nombre: "Lucía Gómez",
        estado: "reservado",
        estado_pago: "pagado",
      },
    ];

    // Trigger window focus (SWR revalidation)
    fireEvent(window, new Event("focus"));

    // Toast alert with bell and player details must appear
    await waitFor(() => {
      expect(
        screen.getByText(/🔔 Nueva Reserva: Lucía Gómez en Cancha Central \(19:00 a 20:30 hs\)/i)
      ).toBeDefined();
    });
  });

  it("pausa el temporizador de alerta toast cuando la pestaña está oculta y no lo descarta hasta que vuelve a ser visible", async () => {
    // Mock document.visibilityState to 'hidden'
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    let currentTurnos: any[] = [];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/canchas/1/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              cancha_id: 1,
              fecha: "2026-09-01",
              turnos_ocupados: currentTurnos,
              slots: [],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

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
      expect(global.fetch).toHaveBeenCalled();
    });

    // New booking arrives in database while user was away
    currentTurnos = [
      {
        id: 777,
        cancha_id: 1,
        fecha: "2026-09-01",
        hora_inicio: "18:00",
        hora_fin: "19:30",
        precio: 14000,
        cliente_nombre: "Marcos Rojo",
        estado: "reservado",
        estado_pago: "pagado",
      },
    ];

    // User switches back to the tab -> visibility becomes 'visible'
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    fireEvent(document, new Event("visibilitychange"));
    fireEvent(window, new Event("focus"));

    // Toast alert with bell and player details appears and starts 10s countdown
    expect(
      await screen.findByText(/🔔 Nueva Reserva: Marcos Rojo en Cancha Central \(18:00 a 19:30 hs\)/i)
    ).toBeDefined();

    // Now user switches away to another tab
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    fireEvent(document, new Event("visibilitychange"));

    // Toast remains preserved and does not prematurely expire while away
    expect(
      screen.getByText(/🔔 Nueva Reserva: Marcos Rojo en Cancha Central \(18:00 a 19:30 hs\)/i)
    ).toBeDefined();
  });
});
