import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GestionBilleteras, { formatFechaDDMMAAAA, formatFechaHoraDDMMAAAA } from "../components/GestionBilleteras";

describe("GestionBilleteras Component", () => {
  const mockMetricas = {
    total_saldo: 25000,
    total_saldo_formateado: "$25.000,00",
    clientes_con_saldo: 2,
    total_movimientos: 5,
  };

  const mockBilleteras = [
    {
      id: 1,
      user_id: 10,
      user: {
        id: 10,
        name: "Agustín Tapia",
        email: "tapia@padel.test",
        telefono: "+54 9 11 1111-2222",
      },
      saldo: 20000,
      saldo_formateado: "$20.000,00",
      total_movimientos: 3,
      ultimo_movimiento: {
        id: 101,
        monto: 5000,
        monto_formateado: "+$5.000,00",
        tipo: "carga_manual",
        descripcion: "Carga en efectivo mostrador",
        created_at: "2026-09-17 19:00:00",
      },
    },
    {
      id: 2,
      user_id: 20,
      user: {
        id: 20,
        name: "Federico Chingotto",
        email: "chingotto@padel.test",
        telefono: "+54 9 11 3333-4444",
      },
      saldo: 5000,
      saldo_formateado: "$5.000,00",
      total_movimientos: 2,
      ultimo_movimiento: {
        id: 102,
        monto: 5000,
        monto_formateado: "+$5.000,00",
        tipo: "reembolso_cancelacion",
        descripcion: "Reembolso cancelación turno",
        created_at: "2026-09-17 18:30:00",
      },
    },
  ];

  const mockMovimientos = [
    {
      id: 101,
      monto: 5000,
      monto_formateado: "+$5.000,00",
      tipo: "carga_manual",
      descripcion: "Carga en efectivo en mostrador",
      created_at: "2026-09-17 19:00:00",
      created_at_humano: "hace 1 hora",
      turno: null,
    },
    {
      id: 99,
      monto: -3000,
      monto_formateado: "-$3.000,00",
      tipo: "uso_reserva",
      descripcion: "Uso de crédito para reserva de turno",
      created_at: "2026-09-17 15:00:00",
      created_at_humano: "hace 5 horas",
      turno: {
        id: 50,
        fecha: "2026-09-18",
        hora_inicio: "19:00",
        hora_fin: "20:30",
        cancha_nombre: "Cancha Panorámica",
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/billeteras/10/movimientos")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, movimientos: mockMovimientos }),
        });
      }
      if (url.includes("/billeteras/ajustar")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Se acreditaron exitosamente $5.000,00.",
              nuevo_saldo: 25000,
              nuevo_saldo_formateado: "$25.000,00",
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            metricas: mockMetricas,
            billeteras: {
              data: mockBilleteras,
              current_page: 1,
              last_page: 1,
              total: 2,
            },
          }),
      });
    });
  });

  it("renderiza el panel de billeteras con KPIs y listado de saldos", async () => {
    render(
      <GestionBilleteras
        subdomain="padel-center"
        token="valid-admin-token"
        apiUrl="http://localhost:8000/api"
        complejoNombre="Padel Center"
      />
    );

    // 1. Encabezado y KPIs
    await waitFor(() => {
      expect(screen.getByText("Billeteras Virtuales de Clientes")).toBeDefined();
      expect(screen.getByTestId("kpi-total-saldo")).toBeDefined();
      expect(screen.getByText("$25.000,00")).toBeDefined();
      expect(screen.getByText("2")).toBeDefined();
    });

    // 2. Filas de clientes en la tabla
    expect(screen.getByText("Agustín Tapia")).toBeDefined();
    expect(screen.getByText("$20.000,00")).toBeDefined();
    expect(screen.getByText("Federico Chingotto")).toBeDefined();
    expect(screen.getByText("$5.000,00")).toBeDefined();
  });

  it("abre el modal de movimientos al hacer clic en 'Movimientos'", async () => {
    render(
      <GestionBilleteras
        subdomain="padel-center"
        token="valid-admin-token"
        apiUrl="http://localhost:8000/api"
        complejoNombre="Padel Center"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-historial-10")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-historial-10"));

    await waitFor(() => {
      expect(screen.getByTestId("modal-historial-movimientos")).toBeDefined();
      expect(screen.getByText(/Extracto de Billetera: Agustín Tapia/i)).toBeDefined();
      expect(screen.getAllByText("+$5.000,00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("-$3.000,00")).toBeDefined();
      expect(screen.getByText(/Cancha Panorámica/i)).toBeDefined();
      // Verificamos que la fecha del turno se muestre en dd-mm-aaaa
      expect(screen.getByText(/18-09-2026 19:00 hs/i)).toBeDefined();
      // Verificamos que la fecha del movimiento se muestre en dd-mm-aaaa HH:mm hs
      expect(screen.getByText(/17-09-2026 15:00 hs/i)).toBeDefined();
    });
  });

  it("permite abrir el modal de ajuste y acreditar saldo a un cliente", async () => {
    const addToast = vi.fn();
    render(
      <GestionBilleteras
        subdomain="padel-center"
        token="valid-admin-token"
        apiUrl="http://localhost:8000/api"
        complejoNombre="Padel Center"
        addToast={addToast}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-ajustar-10")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-ajustar-10"));

    await waitFor(() => {
      expect(screen.getByTestId("modal-ajustar-saldo")).toBeDefined();
    });

    const inputMonto = screen.getByPlaceholderText("0.00");
    const inputMotivo = screen.getByPlaceholderText(/Ej: Cobro en efectivo/i);

    fireEvent.change(inputMonto, { target: { value: "5000" } });
    fireEvent.change(inputMotivo, { target: { value: "Pago en efectivo en mostrador" } });

    const btnSubmit = screen.getByRole("button", { name: /Confirmar Acreditación/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/clubs/padel-center/billeteras/ajustar"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"monto":5000'),
        })
      );
    });
  });

  describe("Funciones utilitarias de formateo de fecha (dd-mm-aaaa)", () => {
    it("formatFechaDDMMAAAA convierte YYYY-MM-DD a DD-MM-YYYY correctamente", () => {
      expect(formatFechaDDMMAAAA("2026-09-18")).toBe("18-09-2026");
      expect(formatFechaDDMMAAAA("2026-01-05")).toBe("05-01-2026");
      expect(formatFechaDDMMAAAA("18-09-2026")).toBe("18-09-2026");
      expect(formatFechaDDMMAAAA("")).toBe("");
      expect(formatFechaDDMMAAAA(null)).toBe("");
      expect(formatFechaDDMMAAAA(undefined)).toBe("");
    });

    it("formatFechaHoraDDMMAAAA formatea fecha con hora a DD-MM-YYYY HH:mm hs", () => {
      expect(formatFechaHoraDDMMAAAA("2026-09-17 19:00:00")).toBe("17-09-2026 19:00 hs");
      expect(formatFechaHoraDDMMAAAA("17-09-2026 19:00")).toBe("17-09-2026 19:00 hs");
      expect(formatFechaHoraDDMMAAAA("2026-10-01T14:30:00Z")).toBe("01-10-2026 14:30 hs");
      expect(formatFechaHoraDDMMAAAA("")).toBe("");
      expect(formatFechaHoraDDMMAAAA(null)).toBe("");
    });
  });
});

