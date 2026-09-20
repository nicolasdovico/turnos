import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GestionClientes, { ClienteItem, ClientesMetricas } from "../components/GestionClientes";

describe("GestionClientes Component", () => {
  const mockMetricas: ClientesMetricas = {
    total_clientes: 2,
    clientes_activos_mes: 2,
    total_saldo_billeteras: 15000,
    vales_activos_count: 1,
    clientes_bloqueados: 0,
  };

  const mockClientes: ClienteItem[] = [
    {
      id: 1,
      user_id: 101,
      nombre: "Carlos Tevez",
      telefono: "1144556677",
      email: "tevez@boca.com",
      dni: "30123456",
      notas: "Jugador muy puntual. Suele jugar al revés.",
      estado: "activo",
      motivo_bloqueo: null,
      saldo_billetera: 10000,
      vales_activos_count: 1,
      total_turnos: 5,
      turnos_jugados: 5,
      turnos_cancelados: 0,
      ultimo_turno: {
        fecha: "2026-09-18",
        hora_inicio: "19:00",
        cancha_nombre: "Cancha 1",
        estado: "completado",
      },
      created_at: "2026-09-01T12:00:00Z",
    },
    {
      id: 2,
      user_id: null,
      nombre: "Juan Roman Riquelme",
      telefono: "1199887766",
      email: null,
      dni: null,
      notas: "Cliente de mostrador habitual los domingos.",
      estado: "activo",
      motivo_bloqueo: null,
      saldo_billetera: 5000,
      vales_activos_count: 0,
      total_turnos: 8,
      turnos_jugados: 5,
      turnos_futuros: 2,
      turnos_cancelados: 1,
      ultimo_turno: {
        fecha: "2026-09-19",
        hora_inicio: "20:00",
        cancha_nombre: "Cancha 2",
        estado: "completado",
      },
      proximo_turno: {
        fecha: "2026-09-22",
        hora_inicio: "12:00",
        cancha_nombre: "Cancha 1",
        estado: "reservado",
      },
      created_at: "2026-09-05T15:00:00Z",
    },
  ];

  const mockProfileData = {
    success: true,
    cliente: mockClientes[0],
    estadisticas: {
      total_turnos: 5,
      turnos_jugados: 4,
      turnos_futuros: 1,
      turnos_cancelados: 0,
      tasa_cumplimiento: 100,
    },
    turnos: [
      {
        id: 501,
        fecha: "2026-09-18",
        hora_inicio: "19:00",
        hora_fin: "20:30",
        cancha_nombre: "Cancha 1",
        precio: 20000,
        monto_pagado: 20000,
        saldo_pendiente: 0,
        estado: "completado",
        estado_pago: "pagado_total",
        es_fijo: false,
        es_futuro: false,
      },
      {
        id: 502,
        fecha: "2026-09-25",
        hora_inicio: "18:00",
        hora_fin: "19:30",
        cancha_nombre: "Cancha 2",
        precio: 25000,
        monto_pagado: 0,
        saldo_pendiente: 25000,
        estado: "reservado",
        estado_pago: "pendiente",
        es_fijo: true,
        es_futuro: true,
      },
    ],
    billetera: {
      saldo: 10000,
      movimientos: [
        {
          id: 1,
          tipo: "carga_manual",
          monto: 10000,
          saldo_anterior: 0,
          saldo_posterior: 10000,
          descripcion: "Carga en mostrador",
          created_at: "2026-09-10T10:00:00Z",
        },
      ],
    },
    vales: [
      {
        id: 1,
        codigo: "VALE-TEST-1234",
        monto: 15000,
        saldo_restante: 15000,
        estado: "activo",
        fecha_emision: "2026-09-15 18:00",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url: string, options?: any) => {
      const urlStr = String(url);

      // Guardar / Editar notas o datos de cliente 1 (PUT)
      if (urlStr.includes("/clientes/1") && options?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Notas actualizadas correctamente.",
              cliente: { ...mockClientes[0], notas: "Nueva observación de prueba" },
            }),
        } as Response);
      }

      // Perfil 360 de cliente 1 (GET)
      if (urlStr.includes("/clientes/1") && (!options || !options.method || options.method === "GET")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProfileData),
        } as Response);
      }

      // Crear nuevo cliente (POST)
      if (urlStr.includes("/clientes") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Cliente registrado exitosamente en el club.",
              cliente: {
                id: 3,
                nombre: "Martin Palermo",
                telefono: "1155667788",
                estado: "activo",
              },
            }),
        } as Response);
      }

      // Listado general (GET)
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            metricas: mockMetricas,
            paginacion: {
              current_page: 1,
              last_page: 1,
              per_page: 20,
              total: 2,
            },
            clientes: mockClientes,
          }),
      } as Response);
    }) as any;
  });

  it("renders client directory panel with KPIs and client list", async () => {
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
      />
    );

    expect(screen.getByText("Padrón & Directorio de Clientes")).toBeDefined();

    // Esperar a que se carguen los clientes y métricas
    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
      expect(screen.getByText("Juan Roman Riquelme")).toBeDefined();
    });

    // Validar visualización de KPIs
    expect(screen.getByText("Total Clientes")).toBeDefined();
    expect(screen.getByText("Activos este Mes")).toBeDefined();
    expect(screen.getByText("Saldo en Billeteras")).toBeDefined();

    // Validar visualización de próximo turno y turnos en agenda
    expect(screen.getByText("Próx")).toBeDefined();
    expect(screen.getByText(/12:00 hs \(Cancha 1\)/i)).toBeDefined();
    expect(screen.getByText("⏱2")).toBeDefined();
  });

  it("allows searching and filtering clients", async () => {
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText("Buscar por nombre, WhatsApp, email o DNI...");
    fireEvent.change(searchInput, { target: { value: "Tevez" } });

    await waitFor(() => {
      expect((global.fetch as any).mock.calls.some((c: any) => c[0].includes("search=Tevez"))).toBe(true);
    });
  });

  it("opens new client modal and submits form to create client", async () => {
    const addToast = vi.fn();
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
        addToast={addToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    const newBtn = screen.getByText("Nuevo Cliente");
    fireEvent.click(newBtn);

    expect(screen.getByText("Nuevo Cliente en Directorio")).toBeDefined();

    const nombreInput = screen.getByPlaceholderText("Ej. Martin Gomez");
    const telInput = screen.getByPlaceholderText("Ej. 1144556677");

    fireEvent.change(nombreInput, { target: { value: "Martin Palermo" } });
    fireEvent.change(telInput, { target: { value: "1155667788" } });

    const submitBtn = screen.getByText("Crear Cliente");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("success", expect.stringContaining("exitosamente"));
    });
  });

  it("opens edit modal, modifies client data and saves successfully", async () => {
    const addToast = vi.fn();
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
        addToast={addToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    const editButtons = screen.getAllByTitle("Editar Datos");
    fireEvent.click(editButtons[0]);

    expect(screen.getByText("Editar Datos del Cliente")).toBeDefined();

    const nombreInput = screen.getByPlaceholderText("Ej. Martin Gomez");
    expect((nombreInput as HTMLInputElement).value).toBe("Carlos Tevez");

    fireEvent.change(nombreInput, { target: { value: "Carlos Tevez Editado" } });

    const submitBtn = screen.getByText("Guardar Cambios");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        (global.fetch as any).mock.calls.some(
          (c: any) => c[0].includes("/clientes/1") && c[1]?.method === "PUT"
        )
      ).toBe(true);
      expect(addToast).toHaveBeenCalledWith("success", expect.stringContaining("correctamente"));
    });
  });

  it("opens 360 profile modal and displays history, wallet and notes", async () => {
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    // Abrir ficha 360 del primer cliente
    const viewButtons = screen.getAllByTitle("Ver Ficha 360°");
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Notas Operativas del Club (Privadas)")).toBeDefined();
      expect(screen.getByText("Jugador muy puntual. Suele jugar al revés.")).toBeDefined();
    });

    // Cambiar a pestaña de turnos
    const turnosTab = screen.getByRole("button", { name: /Historial de Turnos/i });
    fireEvent.click(turnosTab);

    await waitFor(() => {
      expect(screen.getAllByText(/Cancha 1/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/19:00 a 20:30 hs/i)).toBeDefined();
      expect(screen.getAllByText(/Jugado/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/En Agenda/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Turno Fijo/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pago Pendiente/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pagado Total/i).length).toBeGreaterThan(0);
    });

    // Probar filtro "En Agenda" dentro del modal
    const agendaFilterBtn = screen.getByRole("button", { name: /En Agenda/i });
    fireEvent.click(agendaFilterBtn);

    expect(screen.getByText(/18:00 a 19:30 hs/i)).toBeDefined();
    expect(screen.queryByText(/19:00 a 20:30 hs/i)).toBeNull();
  });

  it("allows updating notes directly from the 360 profile modal", async () => {
    const addToast = vi.fn();
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
        addToast={addToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    const viewButtons = screen.getAllByTitle("Ver Ficha 360°");
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Editar Nota")).toBeDefined();
    });

    const editNotaBtn = screen.getByText("Editar Nota");
    fireEvent.click(editNotaBtn);

    const textArea = screen.getByPlaceholderText(/Escribí aquí observaciones sobre el jugador/i);
    fireEvent.change(textArea, { target: { value: "Nueva observación de prueba" } });

    const saveNotaBtn = screen.getByText("Guardar");
    fireEvent.click(saveNotaBtn);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith("success", "Notas actualizadas correctamente.");
    });
  });

  it("opens edit modal from within 360 profile modal and saves successfully", async () => {
    const addToast = vi.fn();
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
        addToast={addToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    // Abrir ficha 360
    const viewButtons = screen.getAllByTitle("Ver Ficha 360°");
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByTitle("Editar Datos del Cliente")).toBeDefined();
    });

    // Hacer clic en "Editar Datos" dentro del modal 360
    const editFrom360Btn = screen.getByTitle("Editar Datos del Cliente");
    fireEvent.click(editFrom360Btn);

    // Debe mostrarse el modal de edición de datos
    expect(screen.getByText("Editar Datos del Cliente")).toBeDefined();

    const nombreInput = screen.getByPlaceholderText("Ej. Martin Gomez");
    expect((nombreInput as HTMLInputElement).value).toBe("Carlos Tevez");

    fireEvent.change(nombreInput, { target: { value: "Carlos Tevez Desde 360" } });

    const submitBtn = screen.getByText("Guardar Cambios");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        (global.fetch as any).mock.calls.some(
          (c: any) => c[0].includes("/clientes/1") && c[1]?.method === "PUT"
        )
      ).toBe(true);
      expect(addToast).toHaveBeenCalledWith("success", expect.stringContaining("correctamente"));
    });
  });

  it("restricts Telefono and DNI to numeric characters and validates WhatsApp length", async () => {
    const addToast = vi.fn();
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
        addToast={addToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    // Abrir modal de nuevo cliente
    const nuevoBtn = screen.getByText("Nuevo Cliente");
    fireEvent.click(nuevoBtn);

    expect(screen.getByText("Nuevo Cliente en Directorio")).toBeDefined();

    const nombreInput = screen.getByPlaceholderText("Ej. Martin Gomez");
    const telInput = screen.getByPlaceholderText("Ej. 1144556677");
    const dniInput = screen.getByPlaceholderText("Ej. 38123456");

    // Escribir texto con letras en teléfono: debe filtrar caracteres no numéricos
    fireEvent.change(telInput, { target: { value: "abc 1144-556677 xyz" } });
    expect((telInput as HTMLInputElement).value).toBe("1144556677");

    // Probar que permite prefijo '+' si se ingresa
    fireEvent.change(telInput, { target: { value: "+54 9 11 4455-6677" } });
    expect((telInput as HTMLInputElement).value).toBe("+5491144556677");

    // Escribir texto con letras en DNI: debe filtrar caracteres no numéricos
    fireEvent.change(dniInput, { target: { value: "38.123.456-A" } });
    expect((dniInput as HTMLInputElement).value).toBe("38123456");

    // Si se ingresa un teléfono demasiado corto (menos de 8 dígitos) debe fallar la validación
    fireEvent.change(nombreInput, { target: { value: "Jugador Test" } });
    fireEvent.change(telInput, { target: { value: "12345" } });

    const submitBtn = screen.getByText("Crear Cliente");
    fireEvent.click(submitBtn);

    expect(addToast).toHaveBeenCalledWith("error", expect.stringContaining("entre 8 y 15 dígitos"));

    // Si se ingresa un DNI con menos de 6 dígitos debe fallar la validación
    fireEvent.change(telInput, { target: { value: "1144556677" } });
    fireEvent.change(dniInput, { target: { value: "123" } });
    fireEvent.click(submitBtn);

    expect(addToast).toHaveBeenCalledWith("error", expect.stringContaining("entre 6 y 12 dígitos"));

    // Si ambos son válidos, debe enviar la petición correctamente
    fireEvent.change(dniInput, { target: { value: "38123456" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        (global.fetch as any).mock.calls.some(
          (c: any) =>
            c[0].includes("/clientes") &&
            c[1]?.method === "POST" &&
            JSON.parse(c[1].body).telefono === "1144556677" &&
            JSON.parse(c[1].body).dni === "38123456"
        )
      ).toBe(true);
    });
  });

  it("generates correct international WhatsApp URLs with formatWhatsAppNumber", async () => {
    render(
      <GestionClientes
        subdomain="padel-test"
        apiUrl="http://localhost:8080/api"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Tevez")).toBeDefined();
    });

    // En la tabla, para teléfono 1144556677 debe generar https://wa.me/5491144556677
    const waLinks = screen.getAllByTitle("Abrir chat en WhatsApp");
    expect(waLinks[0].getAttribute("href")).toBe("https://wa.me/5491144556677");

    // En la ficha 360, el botón WhatsApp también debe tener el formato internacional
    const viewButtons = screen.getAllByTitle("Ver Ficha 360°");
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      const waBtn360 = screen.getByText("WhatsApp").closest("a");
      expect(waBtn360?.getAttribute("href")).toBe("https://wa.me/5491144556677");
    });
  });
});
