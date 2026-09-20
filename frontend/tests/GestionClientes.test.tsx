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
      turnos_jugados: 7,
      turnos_cancelados: 1,
      ultimo_turno: {
        fecha: "2026-09-19",
        hora_inicio: "20:00",
        cancha_nombre: "Cancha 2",
        estado: "completado",
      },
      created_at: "2026-09-05T15:00:00Z",
    },
  ];

  const mockProfileData = {
    success: true,
    cliente: mockClientes[0],
    estadisticas: {
      total_turnos: 5,
      turnos_jugados: 5,
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
    });
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
});
