import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FacturacionClubPanel from "../components/FacturacionClubPanel";

describe("Facturación Club B2B & Pasarelas de Pago", () => {
  const mockResumen = {
    periodo_actual: "2026-09",
    plan: {
      id: 1,
      nombre: "Bronce",
      slug: "bronce",
      precio_mensual: 29,
      canchas_incluidas: 2,
      precio_cancha_adicional: 8,
      comision_marketplace_pct: 5,
    },
    canchas: {
      totales: 3,
      incluidas: 2,
      excedentes: 1,
      costo_adicional_total: 8,
    },
    marketplace: {
      turnos_captados_count: 2,
      total_comisiones_usd: 10,
      porcentaje_aplicado: 5,
      turnos: [
        {
          id: 101,
          fecha: "2026-09-15",
          hora_inicio: "18:00",
          precio: 100,
          comision_porcentaje: 5,
          comision_marketplace: 5,
        },
        {
          id: 102,
          fecha: "2026-09-18",
          hora_inicio: "19:00",
          precio: 100,
          comision_porcentaje: 5,
          comision_marketplace: 5,
        },
      ],
    },
    totales: {
      base_plan_usd: 29,
      canchas_extras_usd: 8,
      comisiones_marketplace_usd: 10,
      total_usd: 47,
      tipo_cambio_ars: 1350,
      total_ars: 63450,
    },
    suscripcion: {
      estado: "gracia",
      es_valida: true,
      en_gracia: true,
      dias_restantes: 5,
      trial_vence_at: null,
      proximo_vencimiento: "2026-09-20",
      gracia_vence_at: "2026-09-27",
    },
  };

  const mockFacturas = [
    {
      id: 1,
      uuid: "fac-uuid-1",
      numero_factura: "FC-2026-0001",
      periodo: "2026-09",
      monto_plan_base_usd: 29,
      canchas_totales: 3,
      canchas_incluidas_plan: 2,
      canchas_excedentes: 1,
      monto_canchas_extras_usd: 8,
      cantidad_turnos_marketplace: 2,
      monto_comisiones_marketplace_usd: 10,
      total_usd: 47,
      tipo_cambio_ars: 1350,
      total_ars: 63450,
      estado: "pendiente",
      metodo_pago: null,
      fecha_emision: "2026-09-20",
      fecha_vencimiento: "2026-09-25",
      fecha_gracia_vencimiento: "2026-10-02",
      fecha_pago: null,
      comprobante_transferencia_url: null,
      comprobante_transferencia_notas: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/facturacion/resumen")) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockResumen }),
        } as any;
      }
      if (url.includes("/facturacion/facturas")) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockFacturas }),
        } as any;
      }
      if (url.includes("/facturacion/pagar-mercadopago")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            gateway: "mercadopago",
            init_point: "https://mercadopago.com/checkout/123",
            total_ars: 63450,
          }),
        } as any;
      }
      if (url.includes("/facturacion/comprobante-transferencia")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { estado: "revision_transferencia" },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
  });

  it("renders billing breakdown with base plan, extra courts and marketplace commission", async () => {
    render(<FacturacionClubPanel subdomain="testclub" token="mock-token" />);

    await waitFor(() => {
      expect(screen.getByTestId("seccion-facturacion-abono")).toBeDefined();
    });

    // Validar estado de suscripción en período de gracia
    expect(screen.getByText(/En Período de Gracia/i)).toBeDefined();
    expect(screen.getByText(/Gracia 7 Días/i)).toBeDefined();

    // Validar Métricas
    expect(screen.getByText("Bronce")).toBeDefined();
    expect(screen.getByText(/excedentes/i)).toBeDefined();
    expect(screen.getAllByText(/turnos/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$47.00 USD").length).toBeGreaterThanOrEqual(1);

    // Validar Historial de Facturas con formato dd-mm-aaaa
    expect(screen.getByText("FC-2026-0001")).toBeDefined();
    expect(screen.getByText("20-09-2026")).toBeDefined();
    expect(screen.getByText("25-09-2026")).toBeDefined();

    // Desplegar tabla de turnos de marketplace y validar formato dd-mm-aaaa
    const btnVerTurnos = screen.getByText(/Ver Turnos Marketplace/i);
    fireEvent.click(btnVerTurnos);
    expect(screen.getByText("15-09-2026")).toBeDefined();
    expect(screen.getByText("18-09-2026")).toBeDefined();
  });

  it("opens payment modal and switches between Mercado Pago, Stripe and Transferencia", async () => {
    render(<FacturacionClubPanel subdomain="testclub" token="mock-token" />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-pagar-abono")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-pagar-abono"));

    // Modal abierto con métodos
    expect(screen.getByTestId("btn-metodo-mp")).toBeDefined();
    expect(screen.getByTestId("btn-metodo-stripe")).toBeDefined();
    expect(screen.getByTestId("btn-metodo-transferencia")).toBeDefined();

    // Validar Mercado Pago
    expect(screen.getByText(/Pagar Ahora con Mercado Pago/i)).toBeDefined();

    // Cambiar a Transferencia Bancaria
    fireEvent.click(screen.getByTestId("btn-metodo-transferencia"));
    expect(screen.getByText("TURNOS.SAAS.PAGOS")).toBeDefined();
    expect(screen.getByText("0000003100010000000001")).toBeDefined();
    expect(screen.getByText(/Informar Transferencia Realizada/i)).toBeDefined();
  });

  it("submits bank transfer receipt and refreshes data", async () => {
    render(<FacturacionClubPanel subdomain="testclub" token="mock-token" />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-pagar-abono")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-pagar-abono"));
    fireEvent.click(screen.getByTestId("btn-metodo-transferencia"));

    const urlInput = screen.getByPlaceholderText(/https:\/\/drive.google.com/i);
    fireEvent.change(urlInput, { target: { value: "https://comprobantes.com/recibo.png" } });

    const submitBtn = screen.getByText(/Informar Transferencia Realizada/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/facturacion/comprobante-transferencia"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("https://comprobantes.com/recibo.png"),
        })
      );
    });
  });
});
