import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import GrillaHoraria, { Slot, getLocalDateString, formatFechaDDMMAAAA } from "../components/GrillaHoraria";

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
    sessionStorage.clear();
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

  it("renderiza los turnos disponibles y muestra slots ocupados protegidos con opción de lista de espera", () => {
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

    // The occupied slot (11:00) is rendered as occupied with waitlist option, not selectable
    expect(screen.getByLabelText("Turno 11:00 a 12:00 Ocupado")).toBeDefined();
    expect(screen.getByTestId("waitlist-card-11:00")).toBeDefined();
  });

  it("renderiza mensaje distintivo de complejo cerrado cuando no hay atencion el dia seleccionado", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ complejo_cerrado: true, slots_disponibles: [], turnos_ocupados: [] }),
      })
    );

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha Principal"
        deporte="padel"
        fechaInicial="2026-09-06"
      />
    );

    expect(await screen.findByText("Complejo cerrado este día")).toBeDefined();
    expect(screen.getByText(/El club no cuenta con horarios de atención habilitados/i)).toBeDefined();
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

    // 1. Cliente común: Ve el turno 20:00-21:30 como ocupado con Lista de Espera, pero SIN datos personales ni sección admin
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

    // El slot ocupado de las 20:00 está presente para lista de espera, pero NO revela datos del cliente
    expect(screen.getByTestId("waitlist-card-20:00")).toBeDefined();
    expect(screen.queryByText("Martín Palermo")).toBeNull();
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

  it("limpia el formulario de asignación en mostrador (nombre, teléfono y email) para la siguiente reserva", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/turnos/bloquear-temporal")) {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token_reserva: `admin-lock-${callCount}`, ttl: 600 }),
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
                cliente_nombre: "Claudio Magnano",
                cliente_telefono: "234234",
                cliente_email: "claudio@gmail.com",
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            slots_disponibles: [
              { hora_inicio: "15:00", hora_fin: "16:00", disponible: true, precio: 10000 },
              { hora_inicio: "16:00", hora_fin: "17:00", disponible: true, precio: 10000 },
            ],
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

    // 1. Primera reserva para claudio@gmail.com en el turno de las 15:00
    await waitFor(() => {
      expect(screen.getByLabelText("Turno 15:00 a 16:00 Disponible")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("Turno 15:00 a 16:00 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Confirmar Reserva"));

    const inputNombre = screen.getByPlaceholderText(/Mariano Werner/i) as HTMLInputElement;
    const inputTelefono = screen.getByPlaceholderText(/4567-8901/i) as HTMLInputElement;
    const inputEmail = screen.getByPlaceholderText(/cliente@ejemplo.com/i) as HTMLInputElement;

    fireEvent.change(inputNombre, { target: { value: "Claudio Magnano" } });
    fireEvent.change(inputTelefono, { target: { value: "234234" } });
    fireEvent.change(inputEmail, { target: { value: "claudio@gmail.com" } });

    const btnAsignar = screen.getByRole("button", { name: /Asignar en Mostrador/i });
    fireEvent.click(btnAsignar);

    // Esperar que se confirme la primera reserva
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          body: expect.stringContaining("claudio@gmail.com"),
        })
      );
    });

    // 2. Segunda reserva en el turno de las 16:00
    await waitFor(() => {
      expect(screen.getByLabelText("Turno 16:00 a 17:00 Disponible")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("Turno 16:00 a 17:00 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Confirmar Reserva"));

    // 3. Verificar que los campos aparezcan completamente vacíos y sin datos precargados del cliente anterior
    const inputEmail2 = screen.getByPlaceholderText(/cliente@ejemplo.com/i) as HTMLInputElement;
    const inputNombre2 = screen.getByPlaceholderText(/Mariano Werner/i) as HTMLInputElement;
    const inputTelefono2 = screen.getByPlaceholderText(/4567-8901/i) as HTMLInputElement;

    expect(inputEmail2.value).toBe("");
    expect(inputNombre2.value).toBe("");
    expect(inputTelefono2.value).toBe("");
  });

  it("permite al recepcionista elegir no cobrar seña con Sin Cobro o elegir Seña con método online", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token_reserva: "admin-flex-lock", ttl: 600 }),
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
                id: 88,
                cancha_id: 1,
                fecha: "2026-09-01",
                hora_inicio: "15:00:00",
                hora_fin: "16:30:00",
                precio: 12000,
                monto_pagado: 0,
                saldo_pendiente: 12000,
                estado_pago: "pendiente",
                metodo_pago: "online",
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

    // Selector de 3 opciones en mostrador
    expect(screen.getByText(/¿Cuánto se cobra ahora en mostrador\?/i)).toBeDefined();
    expect(screen.getByText("🕒 Sin cobro")).toBeDefined();
    expect(screen.getByText(/💳 Seña/i)).toBeDefined();
    expect(screen.getByText(/🎉 Total/i)).toBeDefined();

    // Hacemos click en "Sin cobro"
    fireEvent.click(screen.getByText("🕒 Sin cobro"));

    // El select debe tener únicamente la opción "Pendiente de Pago (Paga al jugar)"
    expect(screen.getByText("🕒 Pendiente de Pago (Paga al jugar)")).toBeDefined();
    expect(screen.queryByText("💵 Cobrado en Mostrador / Efectivo")).toBeNull();
    expect(screen.getByText(/No se registra cobro ahora/i)).toBeDefined();

    // Si el empleado cambia a "Seña", se restablecen los medios reales de cobro
    fireEvent.click(screen.getByText(/💳 Seña/i));
    expect(screen.getByText("💵 Cobrado en Mostrador / Efectivo")).toBeDefined();
    expect(screen.queryByText("🕒 Pendiente de Pago (Paga al jugar)")).toBeNull();

    // Regresamos a "Sin cobro"
    fireEvent.click(screen.getByText("🕒 Sin cobro"));
    expect(screen.getByText("🕒 Pendiente de Pago (Paga al jugar)")).toBeDefined();

    // El botón debe actualizarse a "Asignar en Mostrador (Sin Cobro)"
    expect(screen.getByRole("button", { name: /Asignar en Mostrador \(Sin Cobro\)/i })).toBeDefined();

    // Completar datos
    fireEvent.change(screen.getByPlaceholderText(/Mariano Werner/i), { target: { value: "Juan Amigo" } });

    // Confirmar
    fireEvent.click(screen.getByRole("button", { name: /Asignar en Mostrador \(Sin Cobro\)/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"modalidad_pago":"ninguno"'),
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
                fecha: "2026-09-01",
                hora_inicio: "17:00",
                hora_fin: "18:30",
                precio: 10000,
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

    // 5. Debe mostrar la tarjeta de reserva confirmada al visitante y remover el banner con cuenta regresiva
    await waitFor(() => {
      expect(screen.getByTestId("client-confirmed-turnos-section")).toBeDefined();
      expect(screen.getByTestId("client-reserved-card")).toBeDefined();
      expect(screen.getByText(/Seña Abonada/i)).toBeDefined();
      expect(screen.getByText(/Saldo en Club/i)).toBeDefined();
      expect(screen.queryByTestId("active-lock-banner")).toBeNull();
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

    // 3. Verificar desglose financiero de seña y recordatorio de modo pruebas
    await waitFor(() => {
      expect(screen.getByTestId("sena-breakdown")).toBeDefined();
      expect(screen.getByText(/Saldo a pagar en el club/i)).toBeDefined();
      expect(screen.getByTestId("dev-mode-reminder")).toBeDefined();
      expect(screen.getByText(/Modo Pruebas Activo/i)).toBeDefined();
    });

    // 4. Click en Confirmar Turno (en desarrollo se aprueba automáticamente con la seña)
    const botonConfirmar = screen.getByRole("button", { name: /Confirmar Turno.*5/i });
    expect(botonConfirmar).toBeDefined();

    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"modalidad_pago":"sena"'),
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
      expect(screen.getByText(/Notificación Activa/i)).toBeDefined();
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

    // Como es cliente presencial sin saldo en billetera, no debe figurar la opción de Billetera Virtual
    expect(screen.queryByText(/Billetera/i)).toBeNull();

    const btnConfirmarCobro = screen.getByRole("button", { name: /Confirmar Cobro/i });
    fireEvent.click(btnConfirmarCobro);

    // Debe reflejarse inmediatamente el estado ✓ Pagado y ocultarse el botón de Cobrar
    await waitFor(() => {
      expect(screen.getByText(/✓ Pagado/i)).toBeDefined();
      expect(screen.queryByRole("button", { name: /Cobrar/i })).toBeNull();
    });
  });

  it("muestra la opción de Billetera Virtual en el modal de cobro únicamente si el cliente tiene saldo a favor", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/canchas/1/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots_disponibles: [],
              turnos_ocupados: [
                {
                  id: 101,
                  cancha_id: 1,
                  fecha: "2026-09-01",
                  hora_inicio: "18:00",
                  hora_fin: "19:30",
                  precio: 10000,
                  monto_pagado: 5000,
                  saldo_pendiente: 5000,
                  estado_pago: "senado",
                  metodo_pago: "online",
                  estado: "reservado",
                  cliente_id: 25,
                  cliente_nombre: "Luciano Saldo",
                  cliente_saldo_billetera: 3500,
                },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
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

    expect(await screen.findByText("Luciano Saldo")).toBeDefined();
    const btnCobrar = screen.getByRole("button", { name: /Cobrar/i });
    fireEvent.click(btnCobrar);

    // Debe mostrarse el botón de Billetera con su saldo disponible
    expect(await screen.findByText(/👛 Billetera/i)).toBeDefined();
    expect(screen.getByText(/disp\./i)).toBeDefined();

    // Hacemos click en el botón de Billetera
    const btnBilletera = screen.getByText(/👛 Billetera/i);
    fireEvent.click(btnBilletera);

    // El input de monto a cobrar se debe autoajustar al máximo disponible ($3500)
    const inputMonto = screen.getByPlaceholderText("5000") as HTMLInputElement;
    expect(inputMonto.value).toBe("3500");
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
    // Toast remains preserved and does not prematurely expire while away
    expect(
      screen.getByText(/🔔 Nueva Reserva: Marcos Rojo en Cancha Central \(18:00 a 19:30 hs\)/i)
    ).toBeDefined();
  });

  it("muestra como ⏳ Pendiente y con botón 💵 Cobrar un turno reservado online con opción Pagar en el Club", async () => {
    const occupiedTurno = {
      id: 888,
      cancha_id: 1,
      fecha: "2026-09-01",
      hora_inicio: "21:00",
      hora_fin: "22:00",
      precio: 16000,
      monto_pagado: 0,
      saldo_pendiente: 16000,
      cliente_nombre: "Esteban Andrada",
      estado: "reservado",
      estado_pago: "pendiente",
      metodo_pago: "mostrador",
    };

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
              turnos_ocupados: [occupiedTurno],
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

    // Debe mostrar la tarjeta del turno ocupado con estado Pendiente y botón Cobrar
    expect(await screen.findByText("Esteban Andrada")).toBeDefined();
    expect(screen.getByText(/⏳ Pendiente/i)).toBeDefined();
    expect(screen.queryByText(/✓ Pagado/i)).toBeNull();

    const btnCobrar = screen.getByRole("button", { name: /Cobrar/i });
    expect(btnCobrar).toBeDefined();
  });

  it("no muestra la opción de 'Pagar en el Club / Mostrador' al reservar online y defaultea a online", async () => {
    const availableSlots: Slot[] = [
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 10000 },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, ttl: 600, token_reserva: "lock-token-123" }),
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
        isAdmin={false}
      />
    );

    fireEvent.click(screen.getByLabelText("Turno 18:00 a 19:00 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Confirmar Reserva"));

    await waitFor(() => {
      expect(screen.getByText(/Crear Cuenta Rápida/i)).toBeDefined();
    });

    // La opción de mostrador no debe existir para clientes online
    expect(screen.queryByText(/Pagar en el Club \/ Mostrador/i)).toBeNull();

    // Debe existir la opción de Mercado Pago / Tarjeta Online
    expect(screen.getByText(/Mercado Pago \/ Tarjeta Online/i)).toBeDefined();
  });

  it("muestra la opción 'Cobrado en Mostrador / Efectivo' cuando isAdmin es true", async () => {
    const availableSlots: Slot[] = [
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 10000 },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, ttl: 600, token_reserva: "lock-token-123" }),
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
        isAdmin={true}
      />
    );

    fireEvent.click(screen.getByLabelText("Turno 18:00 a 19:00 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Confirmar Reserva"));

    await waitFor(() => {
      expect(screen.getByText(/Modo Recepción: Asignación directa a cliente en el club o por llamada/i)).toBeDefined();
    });

    expect(screen.getByText(/Cobrado en Mostrador \/ Efectivo/i)).toBeDefined();
  });

  it("permite al usuario alternar entre pagar seña o el 100% del total y actualiza los montos a pagar", async () => {
    localStorage.setItem("saas_token", "fake-token-payment-test");

    const availableSlots: Slot[] = [
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 10000 },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: 1, name: "Max Verstappen", email: "max@redbull.com" } }),
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
              turno: {
                id: 99,
                monto_pagado: 10000,
                saldo_pendiente: 0,
                estado_pago: "pagado_total",
                metodo_pago: "simulador_dev",
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
        isAdmin={false}
        porcentajeSena={50}
      />
    );

    fireEvent.click(screen.getByLabelText("Turno 18:00 a 19:00 Disponible"));

    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Confirmar Reserva"));

    await waitFor(() => {
      expect(screen.getByText(/¿Cuánto deseas abonar ahora\?/i)).toBeDefined();
    });

    // Por defecto es Seña ($5.000 o $5,000) en el botón de confirmación
    expect(screen.getByRole("button", { name: /Confirmar Turno.*5/i })).toBeDefined();

    // Verificamos presencia del recordatorio de desarrollo y probamos el rechazo de pago simulado
    expect(screen.getByTestId("dev-mode-reminder")).toBeDefined();
    const btnRechazo = screen.getByText(/Probar rechazo de pago/i);
    fireEvent.click(btnRechazo);
    expect(screen.getByText(/Pago simulado rechazado por la pasarela/i)).toBeDefined();

    // Hacemos clic en "Total (100%)"
    const btnTotal = screen.getByRole("button", { name: /Total.*100%/i });
    fireEvent.click(btnTotal);

    // Ahora el botón principal debe actualizarse a $10.000 ($10,000)
    const btnConfirmarTotal = screen.getByRole("button", { name: /Confirmar Turno.*10/i });
    expect(btnConfirmarTotal).toBeDefined();

    // Confirmamos el pago total
    fireEvent.click(btnConfirmarTotal);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"modalidad_pago":"total"'),
        })
      );
    });
  });

  it("al disparar evento de logout saas-auth-changed limpia las reservas confirmadas del usuario y oculta la tarjeta de mis reservas", async () => {
    localStorage.setItem("saas_token", "fake-javo-token");
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 91, name: "javo", email: "javo@gmail.com" })
    );

    global.fetch = vi.fn().mockImplementation((url) => {
      const urlStr = typeof url === "string" ? url : "";
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ user: { id: 91, name: "javo", email: "javo@gmail.com" } }),
        });
      }
      if (urlStr.includes("/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots_disponibles: [
                { hora_inicio: "18:00", hora_fin: "19:30", disponible: true, precio: 10000, duracion_minutos: 90 },
              ],
              turnos_ocupados: [],
              turnos_retenidos: [],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    const initialConfirmed = [
      {
        id: 141,
        hora_inicio: "17:00",
        hora_fin: "18:30",
        fecha: "2026-09-05",
        precio: 10000,
        monto_pagado: 5000,
        saldo_pendiente: 5000,
        estado_pago: "senado",
        cliente_id: 91,
        cliente_nombre: "javo",
        cliente_email: "javo@gmail.com",
      },
    ];

    sessionStorage.setItem("confirmed_turnos_1", JSON.stringify(initialConfirmed));

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1 - Central Cristal"
        deporte="padel"
        subdomain="nico-padel"
        fechaInicial="2026-09-05"
        duracionInicial={90}
        precioBase={10000}
        isAdmin={false}
      />
    );

    // Como está logueado como javo (cliente_id: 91), se muestra la reserva confirmada
    await waitFor(() => {
      expect(screen.getByTestId("client-confirmed-turnos-section")).toBeDefined();
      expect(screen.getByText(/Tus Reservas Confirmadas/i)).toBeDefined();
      expect(screen.getByText(/17:00 - 18:30 hs/i)).toBeDefined();
    });

    // Simulamos el cierre de sesión (evento saas-auth-changed con user: null)
    act(() => {
      window.dispatchEvent(
        new CustomEvent("saas-auth-changed", { detail: { user: null, token: null } })
      );
    });

    // La sección debe desaparecer inmediatamente al cerrar sesión
    await waitFor(() => {
      expect(screen.queryByTestId("client-confirmed-turnos-section")).toBeNull();
      expect(screen.queryByText(/Tus Reservas Confirmadas/i)).toBeNull();
    });
  });

  it("permite al administrador liberar un turno con dinero abonado enviando OTP para registrar al cliente y acreditar en billetera", async () => {
    const mockTurnoConPago = {
      id: 55,
      cancha_id: 1,
      fecha: "2026-09-05",
      hora_inicio: "18:00",
      hora_fin: "19:30",
      cliente_nombre: "Claudio Magnano",
      cliente_telefono: "12345678",
      precio: 20000,
      monto_pagado: 20000,
      saldo_pendiente: 0,
      estado_pago: "pagado",
      estado: "reservado",
    };

    global.fetch = vi.fn().mockImplementation((url: string, opts: any) => {
      if (url.includes("/clientes/enviar-otp")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Código OTP enviado exitosamente a claudio@gmail.com." }),
        });
      }
      if (url.includes("/turnos/55/cancelar")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Turno liberado. Se acreditaron $20.000 en la Billetera Virtual.",
              reembolso: { monto: 20000, nuevo_saldo_billetera: 20000 },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            slots_disponibles: [],
            turnos_ocupados: [mockTurnoConPago],
          }),
      });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-05"
        duracionInicial={90}
        isAdmin={true}
      />
    );

    // Esperar a que renderice la tarjeta del turno ocupado
    await waitFor(() => {
      expect(screen.getByText("Claudio Magnano")).toBeDefined();
      expect(screen.getByText("$20,000")).toBeDefined();
    });

    // Abrir modal de liberación
    const btnLiberar = screen.getByRole("button", { name: /Liberar Turno/i });
    fireEvent.click(btnLiberar);

    // Debe mostrar la sección de gestión de reembolso
    expect(screen.getByText(/Gestión del Reembolso \(\$20,000\)/i)).toBeDefined();
    expect(screen.getByText(/Billetera Virtual/i)).toBeDefined();
    expect(screen.getByText(/Devolver en Caja/i)).toBeDefined();

    // Completar el email del cliente
    const inputEmail = screen.getByPlaceholderText("ejemplo@gmail.com");
    fireEvent.change(inputEmail, { target: { value: "claudio@gmail.com" } });

    // Enviar código OTP
    const btnEnviarOtp = screen.getByRole("button", { name: /Enviar Código OTP al Cliente/i });
    fireEvent.click(btnEnviarOtp);

    // Esperar cambio al paso OTP
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/clientes/enviar-otp"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("claudio@gmail.com"),
        })
      );
      expect(screen.getByPlaceholderText("123456")).toBeDefined();
    });

    // Ingresar código OTP de 6 dígitos
    const inputOtp = screen.getByPlaceholderText("123456");
    fireEvent.change(inputOtp, { target: { value: "654321" } });

    // Confirmar verificación y acreditación
    const btnConfirmar = screen.getByRole("button", { name: /Verificar OTP y Acreditar/i });
    fireEvent.click(btnConfirmar);

    // Validar llamada a endpoint de cancelación con datos de reembolso y OTP
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/55/cancelar"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            accion_reembolso: "billetera",
            cliente_email: "claudio@gmail.com",
            cliente_nombre: "Claudio Magnano",
            cliente_telefono: "12345678",
            otp_codigo: "654321",
          }),
        })
      );
    });
  });

  it("valida existencia de correo en asignacion de mostrador y permite registrar con OTP si no existe", async () => {
    localStorage.setItem("saas_token", "admin-token-123");
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 1, name: "Admin Club", email: "admin@club.com" })
    );

    const availableSlots = [
      { hora_inicio: "18:00", hora_fin: "19:00", disponible: true, precio: 10000 },
    ];

    global.fetch = vi.fn().mockImplementation((url, options) => {
      const urlStr = typeof url === "string" ? url : "";
      if (urlStr.includes("/turnos/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots_disponibles: availableSlots,
              turnos_ocupados: [],
            }),
        });
      }
      if (urlStr.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, ttl: 600, token_reserva: "lock-token-desk-otp" }),
        });
      }
      if (urlStr.includes("/clientes/verificar-email")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, exists: false, message: "El correo no está registrado en el sistema." }),
        });
      }
      if (urlStr.includes("/clientes/enviar-otp")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Código OTP enviado exitosamente a nuevo@gmail.com" }),
        });
      }
      if (urlStr.includes("/turnos/confirmar")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              turno: {
                id: 101,
                cancha_id: 1,
                fecha: "2026-09-05",
                hora_inicio: "18:00",
                hora_fin: "19:00",
                precio: 10000,
                monto_pagado: 10000,
                saldo_pendiente: 0,
                estado_pago: "pagado_total",
                metodo_pago: "mostrador",
                cliente_id: 99,
                cliente_email: "nuevo@gmail.com",
                cliente_nombre: "Mariano Werner",
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
        fechaInicial="2026-09-05"
        isAdmin={true}
      />
    );

    // 1. Click en slot disponible
    await waitFor(() => {
      expect(screen.getByLabelText("Turno 18:00 a 19:00 Disponible")).toBeDefined();
    });
    fireEvent.click(screen.getByLabelText("Turno 18:00 a 19:00 Disponible"));

    // 2. Abrir modal
    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Confirmar Reserva"));

    // 3. Completar nombre y correo nuevo
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Ej. Mariano Werner")).toBeDefined();
    });
    fireEvent.change(screen.getByPlaceholderText("Ej. Mariano Werner"), {
      target: { value: "Mariano Werner" },
    });

    const emailInput = screen.getByPlaceholderText("cliente@ejemplo.com (para vincular cuenta / billetera virtual)");
    fireEvent.change(emailInput, { target: { value: "nuevo@gmail.com" } });

    // 4. Click en botón Verificar
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Verificar" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));

    // 5. Debe mostrar advertencia de no registrado y botón de enviar OTP
    await waitFor(() => {
      expect(screen.getByText("El correo no está registrado en el sistema")).toBeDefined();
      expect(screen.getByRole("button", { name: /Registrar y Enviar OTP/i })).toBeDefined();
    });

    // 6. Click en Registrar y Enviar OTP
    fireEvent.click(screen.getByRole("button", { name: /Registrar y Enviar OTP/i }));

    // 7. Esperar a que se muestre el input del código OTP de 6 dígitos
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeDefined();
    });

    // 8. Ingresar los 6 dígitos de OTP
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "654321" } });

    // 9. Confirmar la reserva con OTP
    const btnConfirmar = screen.getByRole("button", { name: /Verificar OTP & Asignar/i });
    expect(btnConfirmar).toBeDefined();
    fireEvent.click(btnConfirmar);

    // 10. Validar que /turnos/confirmar fue invocado con cliente_email y codigo_otp
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"codigo_otp":"654321"'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/confirmar"),
        expect.objectContaining({
          body: expect.stringContaining('"cliente_email":"nuevo@gmail.com"'),
        })
      );
    });
  });

  it("permite al cliente registrado cancelar su turno desde su vista con confirmación de políticas de reembolso", async () => {
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 10, name: "Juan Perez", email: "juan@example.com" })
    );
    localStorage.setItem("saas_token", "dummy-client-token");

    const occupiedTurno = {
      id: 10,
      cancha_id: 1,
      fecha: "2026-09-01",
      hora_inicio: "18:00",
      hora_fin: "19:00",
      precio: 10000,
      monto_pagado: 5000,
      saldo_pendiente: 5000,
      estado_pago: "senado",
      estado: "reservado",
      cliente_id: 10,
      cliente_nombre: "Juan Perez",
      cliente_email: "juan@example.com",
      is_mine: true,
    };

    let cancelCalled = false;

    vi.spyOn(global, "fetch").mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: { id: 10, name: "Juan Perez", email: "juan@example.com" },
            }),
        });
      }
      if (urlStr.includes("/turnos/10/cancelar-cliente")) {
        cancelCalled = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Turno cancelado exitosamente. Se han acreditado $5.000 en tu billetera virtual.",
              reembolso_acreditado: true,
              monto_reembolsado: 5000,
            }),
        });
      }
      if (urlStr.includes("/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots: [],
              turnos_ocupados: cancelCalled ? [] : [occupiedTurno],
              tipo_cobro_reserva: "sena",
              porcentaje_sena: 50,
              horas_limite_cancelacion: 4,
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
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="padel-pro"
        fechaInicial="2026-09-01"
      />
    );

    // 1. Debe aparecer la tarjeta de reserva confirmada del cliente con su botón de cancelar
    await waitFor(() => {
      expect(screen.getByTestId("client-confirmed-turnos-section")).toBeDefined();
      expect(screen.getByTestId("client-cancel-btn-10")).toBeDefined();
    });

    // 2. Click en Cancelar Turno
    fireEvent.click(screen.getByTestId("client-cancel-btn-10"));

    // 3. Debe abrirse el modal con la advertencia y desglose de reembolso
    await waitFor(() => {
      expect(screen.getByTestId("client-cancel-modal")).toBeDefined();
      expect(screen.getByText("¿Cancelar tu Reserva?")).toBeDefined();
      expect(screen.getByText(/Cancha 1 • 01-09-2026/)).toBeDefined();
      expect(screen.getByTestId("confirm-client-cancel-btn")).toBeDefined();
    });

    // 4. Confirmar la cancelación
    fireEvent.click(screen.getByTestId("confirm-client-cancel-btn"));

    // 5. Debe haberse llamado a POST /turnos/10/cancelar-cliente y cerrado el modal
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/turnos/10/cancelar-cliente"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer dummy-client-token",
          }),
        })
      );
      expect(screen.queryByTestId("client-cancel-modal")).toBeNull();
    });
  });

  it("no atribuye reservas de mostrador con el mismo nombre al cliente autenticado si no coinciden cliente_id o email", async () => {
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 94, name: "Marcelo Gallardo", email: "marcelogallardo@gmail.com" })
    );
    localStorage.setItem("saas_token", "dummy-gallardo-token");

    const walkInTurno = {
      id: 153,
      cancha_id: 1,
      fecha: "2026-09-14",
      hora_inicio: "08:00",
      hora_fin: "09:00",
      precio: 20000,
      monto_pagado: 20000,
      saldo_pendiente: 0,
      estado_pago: "pagado_total",
      estado: "reservado",
      cliente_id: null,
      cliente_nombre: "Marcelo Gallardo",
    };

    vi.spyOn(global, "fetch").mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: { id: 94, name: "Marcelo Gallardo", email: "marcelogallardo@gmail.com" },
            }),
        });
      }
      if (urlStr.includes("/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots: [],
              turnos_ocupados: [walkInTurno],
              tipo_cobro_reserva: "sena",
              porcentaje_sena: 50,
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="nico-padel"
        fechaInicial="2026-09-14"
      />
    );

    // No debe mostrar la sección de "Tus Reservas Confirmadas" ni botones de cancelar para reservas ajenas/mostrador
    await waitFor(() => {
      expect(screen.queryByTestId("client-confirmed-turnos-section")).toBeNull();
      expect(screen.queryByTestId("client-cancel-btn-153")).toBeNull();
    });
  });

  it("al cancelar turno por cliente, actualiza disponibilidad, emite evento saas-turno-cancelled y libera el slot", async () => {
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 94, name: "Marcelo Gallardo", email: "marcelogallardo@gmail.com" })
    );
    localStorage.setItem("saas_token", "dummy-gallardo-token");

    let isCancelled = false;
    const cancelledEventSpy = vi.fn();
    window.addEventListener("saas-turno-cancelled", cancelledEventSpy);

    const clientTurno = {
      id: 155,
      cancha_id: 1,
      fecha: "2026-09-14",
      hora_inicio: "10:00",
      hora_fin: "11:00",
      precio: 20000,
      monto_pagado: 10000,
      saldo_pendiente: 10000,
      estado_pago: "senado",
      estado: "reservado",
      cliente_id: 94,
      cliente_nombre: "Marcelo Gallardo",
      cliente_email: "marcelogallardo@gmail.com",
      is_mine: true,
    };

    vi.spyOn(global, "fetch").mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: { id: 94, name: "Marcelo Gallardo", email: "marcelogallardo@gmail.com" },
            }),
        });
      }
      if (urlStr.includes("/turnos/155/cancelar-cliente")) {
        isCancelled = true;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Turno cancelado exitosamente. Se han acreditado $10.000 en tu billetera virtual.",
              reembolso_acreditado: true,
              monto_reembolsado: 10000,
            }),
        });
      }
      if (urlStr.includes("/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots_disponibles: isCancelled
                ? [
                    {
                      cancha_id: 1,
                      fecha: "2026-09-14",
                      hora_inicio: "10:00",
                      hora_fin: "11:00",
                      duracion_minutos: 60,
                      precio: 20000,
                      estado: "disponible",
                      disponible: true,
                    },
                  ]
                : [],
              turnos_ocupados: isCancelled ? [] : [clientTurno],
              tipo_cobro_reserva: "sena",
              porcentaje_sena: 50,
              horas_limite_cancelacion: 4,
            }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    render(
      <GrillaHoraria
        canchaId={1}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="nico-padel"
        fechaInicial="2026-09-14"
      />
    );

    // 1. Debe aparecer el turno reservado
    await waitFor(() => {
      expect(screen.getByTestId("client-cancel-btn-155")).toBeDefined();
    });

    // 2. Click en Cancelar Turno y Confirmar
    fireEvent.click(screen.getByTestId("client-cancel-btn-155"));
    await waitFor(() => {
      expect(screen.getByTestId("confirm-client-cancel-btn")).toBeDefined();
    });
    fireEvent.click(screen.getByTestId("confirm-client-cancel-btn"));

    // 3. Tras cancelar, se debe despachar el evento global
    await waitFor(() => {
      expect(cancelledEventSpy).toHaveBeenCalled();
      expect(screen.queryByTestId("client-confirmed-turnos-section")).toBeNull();
      // Y debe figurar el horario 10:00 como disponible en la grilla
      expect(screen.getByText("10:00")).toBeDefined();
      expect(screen.getByText("Libre")).toBeDefined();
    });

    window.removeEventListener("saas-turno-cancelled", cancelledEventSpy);
  });

  it("formatea correctamente las fechas de YYYY-MM-DD a DD-MM-YYYY (dd-mm-aaaa)", () => {
    expect(formatFechaDDMMAAAA("2026-09-14")).toBe("14-09-2026");
    expect(formatFechaDDMMAAAA("2026-01-05")).toBe("05-01-2026");
    expect(formatFechaDDMMAAAA("2026-12-31")).toBe("31-12-2026");
    expect(formatFechaDDMMAAAA("")).toBe("");
  });

  it("depura y no muestra en Tus Reservas Confirmadas un turno previamente almacenado en sessionStorage si el horario ahora figura como disponible en el backend tras anulación de admin", async () => {
    localStorage.setItem("saas_token", "fake-bela-token");
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 70, name: "Fernando Belasteguin", email: "bela@gmail.com" })
    );

    // El cliente tenía guardado en su sessionStorage el turno 159 a las 11:00 hs
    const staleTurno = [
      {
        id: 159,
        hora_inicio: "11:00",
        hora_fin: "12:00",
        fecha: "2026-09-14",
        precio: 20000,
        monto_pagado: 20000,
        saldo_pendiente: 0,
        estado_pago: "pagado",
        estado: "reservado",
        cliente_id: 70,
        cliente_nombre: "Fernando Belasteguin",
        cliente_email: "bela@gmail.com",
      },
    ];
    sessionStorage.setItem("confirmed_turnos_61", JSON.stringify(staleTurno));

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: { id: 70, name: "Fernando Belasteguin", email: "bela@gmail.com" },
            }),
        });
      }
      if (url.includes("/turnos/mis-turnos")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [] }), // El turno 159 ya no está activo
        });
      }
      if (url.includes("/disponibilidad")) {
        // En el backend, el turno fue anulado por el admin y el slot 11:00 ahora está disponible
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              slots_disponibles: [
                { hora_inicio: "11:00", hora_fin: "12:00", disponible: true, precio: 20000 },
              ],
              turnos_ocupados: [],
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
        canchaId={61}
        canchaNombre="Cancha 1"
        deporte="padel"
        subdomain="nico-padel"
        fechaInicial="2026-09-14"
        isAdmin={false}
      />
    );

    // Debe mostrar el slot de las 11:00 disponible/libre
    await waitFor(() => {
      expect(screen.getByText("11:00")).toBeDefined();
      expect(screen.getByText("Libre")).toBeDefined();
    });

    // NO debe mostrar la sección de reservas confirmadas para este turno anulado
    expect(screen.queryByTestId("client-confirmed-turnos-section")).toBeNull();
    expect(screen.queryByText(/Tus Reservas Confirmadas/i)).toBeNull();

    // El sessionStorage debe haber sido depurado
    const stored = JSON.parse(sessionStorage.getItem("confirmed_turnos_61") || "[]");
    expect(stored.length).toBe(0);
  });

  it("muestra badge '💡 Con Luz' en turnos con tarifa nocturna y desglose detallado en modal de confirmacion", async () => {
    localStorage.setItem("saas_token", "fake-token-luz");
    localStorage.setItem(
      "saas_user",
      JSON.stringify({ id: 88, name: "Lucas Campagnolo", email: "campa@padel.com" })
    );

    const testSlots = [
      {
        hora_inicio: "18:00",
        hora_fin: "19:30",
        duracion_minutos: 90,
        precio: 10000,
        tarifa_con_luz: false,
        precio_base: 10000,
        recargo_luz: 0,
        disponible: true,
      },
      {
        hora_inicio: "19:30",
        hora_fin: "21:00",
        duracion_minutos: 90,
        precio: 14000,
        tarifa_con_luz: true,
        precio_base: 10000,
        recargo_luz: 4000,
        disponible: true,
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: {
                id: 88,
                name: "Lucas Campagnolo",
                email: "campa@padel.com",
              },
            }),
        });
      }

      if (urlStr.includes("/disponibilidad")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              hora_inicio_luz: "20:00",
              porcentaje_sena: 50,
              slots_disponibles: testSlots,
              turnos_ocupados: [],
              turnos_retenidos: [],
              optimizacion_anti_baches: { activa: false, total_horarios_protegidos: 0, horarios_protegidos: [] },
            }),
        });
      }

      if (urlStr.includes("/turnos/bloquear-temporal")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              token_reserva: "token-luz-1930",
              ttl_segundos: 600,
              expira_en_segundos: 600,
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
        canchaId={75}
        canchaNombre="Cancha Panoramica 1"
        deporte="padel"
        subdomain="nico-padel"
        fechaInicial="2026-09-14"
        initialSlots={testSlots}
        isAdmin={false}
        porcentajeSena={50}
      />
    );

    // 1. Debe renderizar ambos slots
    await waitFor(() => {
      expect(screen.getByText("18:00")).toBeDefined();
      expect(screen.getByText("19:30")).toBeDefined();
    });

    // 2. El slot de las 19:30 debe tener el badge "💡 Con Luz"
    expect(screen.getByText(/💡 Con Luz/i)).toBeDefined();
    expect(screen.getByText(/\$?\s*14[,.]000/)).toBeDefined();
    expect(screen.getByText(/\$?\s*10[,.]000/)).toBeDefined();

    // 3. Clickear en 19:30 para bloquear el turno
    const btnSlot1930 = screen.getByRole("button", { name: /Turno 19:30 a 21:00 Disponible/i });
    fireEvent.click(btnSlot1930);

    // 4. Clickear en "Confirmar Reserva" del banner de turno retenido
    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Confirmar Reserva"));

    // 5. En el modal de confirmación, debe figurar el modal abierto y la tarifa nocturna con desglose
    await waitFor(() => {
      expect(screen.getByText("Confirmar Reserva de Turno")).toBeDefined();
    });

    const nocturnalBanner = screen.getByTestId("nocturnal-tariff-banner");
    expect(nocturnalBanner).toBeDefined();
    expect(nocturnalBanner.textContent).toContain("Tarifa Nocturna (Luz artificial incluida)");
    expect(nocturnalBanner.textContent).toContain("14,000");

    expect(screen.getByText(/Tarifa total del turno \(con luz\):/i)).toBeDefined();

    const senaBreakdown = screen.getByTestId("sena-breakdown");
    expect(senaBreakdown).toBeDefined();
    expect(senaBreakdown.textContent).toContain("Seña a Cobrar (50%)");
    expect(senaBreakdown.textContent).toContain("7,000");
  });
});

