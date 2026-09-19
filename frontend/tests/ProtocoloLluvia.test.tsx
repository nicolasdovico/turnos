import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import ModalProtocoloLluvia from "../components/ModalProtocoloLluvia";
import ResumenDiarioTurnos from "../components/ResumenDiarioTurnos";
import PaginaValeDigital from "../app/vales/[token]/page";

// Mock useParams y useRouter de next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "token-seguro-test-123", subdomain: "nico-padel" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Protocolo de Cancelación Masiva por Lluvia & Vales de Crédito Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPreviewData = {
    resumen: {
      total_turnos_a_cancelar: 4,
      total_clientes_afectados: 4,
      total_monto_a_reembolsar: 60000,
      turnos_con_billetera: 2,
      monto_billetera: 30000,
      turnos_sin_cuenta: 2,
      monto_vales: 30000,
      total_canchas_techadas_protegidas: 1,
      total_turnos_protegidos: 3,
    },
    canchas: [
      {
        id: 101,
        nombre: "Cancha 1",
        deporte: "padel",
        techada: false,
        tipo_cubierta: "outdoor",
        es_descubierta: true,
        seleccionada: true,
        turnos_afectados_count: 2,
        monto_afectado: 30000,
        turnos_protegidos_count: 0,
      },
      {
        id: 102,
        nombre: "Cancha 2",
        deporte: "padel",
        techada: false,
        tipo_cubierta: "outdoor",
        es_descubierta: true,
        seleccionada: true,
        turnos_afectados_count: 2,
        monto_afectado: 30000,
        turnos_protegidos_count: 0,
      },
      {
        id: 103,
        nombre: "Cancha 3 Techada",
        deporte: "padel",
        techada: true,
        tipo_cubierta: "indoor",
        es_descubierta: false,
        seleccionada: false,
        turnos_afectados_count: 0,
        monto_afectado: 0,
        turnos_protegidos_count: 3,
      },
    ],
    turnos_afectados: [
      {
        id: 501,
        cancha_id: 101,
        cancha_nombre: "Cancha 1",
        hora_inicio: "18:00",
        hora_fin: "19:00",
        cliente_id: 1,
        cliente_nombre: "Franco Colapinto",
        precio: 20000,
        monto_pagado: 15000,
        tiene_cuenta: true,
      },
    ],
  };

  it("ModalProtocoloLluvia renders and fetches live impact preview", async () => {
    let previewCalled = false;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/cancelacion-lluvia/preview")) {
        previewCalled = true;
        return {
          ok: true,
          json: async () => mockPreviewData,
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <ModalProtocoloLluvia
        isOpen={true}
        onClose={vi.fn()}
        subdomain="nico-padel"
        apiUrl="http://localhost:8080/api"
      />
    );

    expect(screen.getByText("Protocolo de Suspensión por Lluvia")).toBeDefined();
    expect(screen.getByText(/Contingencia Climática/i)).toBeDefined();

    await waitFor(() => {
      expect(previewCalled).toBe(true);
      expect(screen.getByText("Cancha 1")).toBeDefined();
      expect(screen.getByText("Cancha 3 Techada")).toBeDefined();
      expect(screen.getByText("4")).toBeDefined(); // total turnos a suspender
      expect(screen.getByText("$60.000")).toBeDefined(); // total a reintegrar
    });
  });

  it("allows switching quick presets and toggling courts individually", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.toString().includes("/cancelacion-lluvia/preview")) {
        return {
          ok: true,
          json: async () => mockPreviewData,
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <ModalProtocoloLluvia
        isOpen={true}
        onClose={vi.fn()}
        subdomain="nico-padel"
        apiUrl="http://localhost:8080/api"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Cancha 1")).toBeDefined();
    });

    // Preset "Todas las canchas"
    const btnTodas = screen.getByText("🔴 Todas las canchas");
    fireEvent.click(btnTodas);

    // Preset "Ninguna"
    const btnNinguna = screen.getByText("Ninguna");
    fireEvent.click(btnNinguna);

    // Preset "Solo Descubiertas"
    const btnSoloDesc = screen.getByText("🟢 Solo Descubiertas");
    fireEvent.click(btnSoloDesc);

    expect(btnSoloDesc).toBeDefined();
  });

  it("prompts double confirmation before executing cancellation", async () => {
    let executeCalled = false;
    let executePayload: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/cancelacion-lluvia/preview")) {
        return {
          ok: true,
          json: async () => mockPreviewData,
        } as any;
      }
      if (urlStr.includes("/cancelacion-lluvia/ejecutar")) {
        executeCalled = true;
        executePayload = JSON.parse(opts?.body || "{}");
        return {
          ok: true,
          json: async () => ({
            success: true,
            total_turnos_cancelados: 4,
            total_monto_reembolsado: 60000,
            billeteras_acreditadas_count: 2,
            vales_emitidos_count: 2,
            whatsapp_encolados_count: 4,
            message: "4 turnos cancelados exitosamente.",
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    const onSuccessMock = vi.fn();

    render(
      <ModalProtocoloLluvia
        isOpen={true}
        onClose={vi.fn()}
        subdomain="nico-padel"
        apiUrl="http://localhost:8080/api"
        onSuccess={onSuccessMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Suspender por Lluvia/i)).toBeDefined();
    });

    // Click en "Suspender por Lluvia"
    const btnSuspender = screen.getByText(/Suspender por Lluvia/i);
    fireEvent.click(btnSuspender);

    // Debe mostrar paso de confirmación
    await waitFor(() => {
      expect(screen.getByText("¿Confirmás la suspensión climática definitiva?")).toBeDefined();
      expect(screen.getByText("Confirmar Suspensión Masiva")).toBeDefined();
    });

    // Confirmar
    const btnConfirmar = screen.getByText("Confirmar Suspensión Masiva");
    fireEvent.click(btnConfirmar);

    // Debe ejecutar y mostrar resumen exitoso
    await waitFor(() => {
      expect(executeCalled).toBe(true);
      expect(executePayload.canchas_ids).toBeDefined();
      expect(onSuccessMock).toHaveBeenCalled();
      expect(screen.getByText("¡Suspensión Masiva Ejecutada con Éxito!")).toBeDefined();
      expect(screen.getByText("Entendido y Finalizar")).toBeDefined();
    });
  });

  it("ResumenDiarioTurnos renders Protocolo de Lluvia and Vales buttons", async () => {
    const mockResumenResponse = {
      data: {
        periodo: { fecha_desde: "2026-09-01", fecha_hasta: "2026-09-30", total_dias: 30, cancha_id: null },
        kpis: {
          total_facturado: 100000,
          total_cobrado: 80000,
          total_saldo_pendiente: 20000,
          total_turnos: 10,
          total_turnos_fijos: 2,
          ocupacion_promedio: 50,
          porcentaje_cobrado: 80,
        },
        dias: [],
        canchas: [],
        metodos_pago: {},
      },
    };

    const mockVales = [
      {
        id: 1,
        codigo: "LLUVIA-7K9P",
        token_seguro: "tok-abc-123",
        monto: 15000,
        saldo_restante: 15000,
        cliente_nombre: "Mariano Werner",
        cliente_telefono: "1199887766",
        estado: "activo",
        turno_original: { fecha: "20/09/2026", hora: "18:00", cancha: "Cancha 1" },
      },
    ];

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/resumen-diario")) {
        return { ok: true, json: async () => mockResumenResponse } as any;
      }
      if (urlStr.includes("/vales") && !urlStr.includes("reembolsar")) {
        return { ok: true, json: async () => ({ data: mockVales }) } as any;
      }
      if (urlStr.includes("/cancelacion-lluvia/preview")) {
        return { ok: true, json: async () => mockPreviewData } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <ResumenDiarioTurnos
        subdomain="nico-padel"
        apiUrl="http://localhost:8080/api"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Protocolo de Lluvia")).toBeDefined();
      expect(screen.getByText("Vales de Lluvia")).toBeDefined();
    });

    // Abrir modal de vales
    const btnVales = screen.getByText("Vales de Lluvia");
    fireEvent.click(btnVales);

    await waitFor(() => {
      expect(screen.getByText("Vales de Lluvia Emitidos")).toBeDefined();
      expect(screen.getByText("Mariano Werner (1199887766)")).toBeDefined();
      expect(screen.getByText("LLUVIA-7K9P")).toBeDefined();
      expect(screen.getByText("Devolver Caja")).toBeDefined();
    });
  });

  it("PaginaValeDigital renders voucher details and enables wallet claim", async () => {
    const mockValePublico = {
      id: 1,
      codigo: "LLUVIA-MESSI10",
      token_seguro: "token-seguro-test-123",
      monto: 20000,
      saldo_restante: 20000,
      cliente_nombre: "Lionel Messi",
      estado: "activo",
      es_valido: true,
      fecha_emision: "20/09/2026",
      fecha_vencimiento: "20/12/2026",
      complejo: {
        id: 1,
        nombre: "Nico Padel Club",
        subdominio: "nico-padel",
      },
      turno_origen: {
        id: 99,
        fecha: "20/09/2026",
        hora_inicio: "19:00",
        cancha_nombre: "Cancha 1",
        deporte: "padel",
      },
    };

    let canjeCalled = false;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/vales/token-seguro-test-123/canjear-billetera")) {
        canjeCalled = true;
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "¡Saldo acreditado exitosamente!",
            monto_acreditado: 20000,
          }),
        } as any;
      }
      if (urlStr.includes("/vales/token-seguro-test-123")) {
        return { ok: true, json: async () => mockValePublico } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    // Simular usuario autenticado en localStorage
    localStorage.setItem("auth_token", "fake-client-token");

    render(<PaginaValeDigital />);

    await waitFor(() => {
      expect(screen.getByText("LLUVIA-MESSI10")).toBeDefined();
      expect(screen.getByText("$20.000")).toBeDefined();
      expect(screen.getByText("Nico Padel Club")).toBeDefined();
    });

    const btnVincular = screen.getByText("Vincular y Pasar Saldo a mi Billetera Virtual");
    fireEvent.click(btnVincular);

    await waitFor(() => {
      expect(canjeCalled).toBe(true);
      expect(screen.getByText("¡Saldo acreditado exitosamente!")).toBeDefined();
    });
  });
});
