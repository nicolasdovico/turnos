import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import ClubAdminPanel from "../app/tenants/[subdomain]/panel/page";
import ResumenDiarioTurnos from "../components/ResumenDiarioTurnos";
import { AuthProvider } from "../context/AuthContext";

// Mock useParams from next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ subdomain: "padel-central" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("Frontend WhatsApp Reminders Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders WhatsApp reminder settings in Políticas tab and saves configuration", async () => {
    let putConfigPayload: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/is-admin")) {
        return { ok: true, json: async () => ({ is_admin: true }) } as any;
      }
      if (urlStr.includes("/dashboard")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              complejo: {
                id: 1,
                nombre: "Padel Club Central",
                subdominio: "padel-central",
                deporte_principal: "padel",
                tipo_negocio: { nombre: "Club Deportivo" },
                tipo_cobro_reserva: "sena",
                porcentaje_sena: 50,
                horas_limite_cancelacion: 4,
                permite_mostrador_publico: true,
                hora_inicio_luz: "19:00",
                recordatorio_whatsapp_activo: true,
                recordatorio_anticipacion_minutos: 120,
                owner: { name: "Dueño Central" },
              },
              plan: {
                nombre: "Oro",
                modulos: [{ slug: "reservas" }],
              },
              canchas: [
                {
                  id: 1,
                  nombre: "Cancha 1",
                  deporte: "padel",
                  precio_base: 8000,
                  estado: "activo",
                },
              ],
            },
          }),
        } as any;
      }
      if (urlStr.includes("/configuracion") && opts?.method === "PUT") {
        putConfigPayload = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            complejo: {
              recordatorio_whatsapp_activo: putConfigPayload.recordatorio_whatsapp_activo,
              recordatorio_anticipacion_minutos: putConfigPayload.recordatorio_anticipacion_minutos,
            },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <AuthProvider>
        <ClubAdminPanel />
      </AuthProvider>
    );

    // Switch to Políticas tab
    const politicasTabBtn = await screen.findByRole("button", { name: /Políticas/i });
    fireEvent.click(politicasTabBtn);

    // Verify WhatsApp Reminders Card is rendered
    expect(await screen.findByText(/5. Recordatorios de Turnos por WhatsApp/i)).toBeDefined();
    expect(screen.getByText(/Tiempo de Anticipación para el Envío:/i)).toBeDefined();

    // Anticipation options
    expect(screen.getByText(/1 hora antes/i)).toBeDefined();
    expect(screen.getByText(/2 horas antes/i)).toBeDefined();
    expect(screen.getByText(/3 horas antes/i)).toBeDefined();

    // Click 1 hora antes button (60 min)
    const btn1Hora = screen.getByRole("button", { name: /1 hora antes/i });
    fireEvent.click(btn1Hora);

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /Guardar Políticas de Reserva/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(putConfigPayload).not.toBeNull();
      expect(putConfigPayload.recordatorio_whatsapp_activo).toBe(true);
      expect(putConfigPayload.recordatorio_anticipacion_minutos).toBe(60);
    });
  });

  it("renders WhatsApp reminder button in Resumen Diario and dispatches manual reminder", async () => {
    let reminderDispatchedTurnoId: number | null = null;

    const mockResumenData = {
      periodo: {
        fecha_desde: "2026-09-18",
        fecha_hasta: "2026-09-18",
        total_dias: 1,
        cancha_id: null,
      },
      kpis: {
        total_facturado: 10000,
        total_cobrado: 5000,
        total_saldo_pendiente: 5000,
        total_turnos: 1,
        total_turnos_fijos: 0,
        ocupacion_promedio: 50,
        porcentaje_cobrado: 50,
      },
      dias: [
        {
          fecha: "2026-09-18",
          dia_semana_numero: 5,
          dia_nombre: "Viernes",
          total_turnos: 1,
          turnos_fijos: 0,
          monto_total: 10000,
          monto_cobrado: 5000,
          saldo_pendiente: 5000,
          ocupacion_porcentaje: 50,
          metodos_pago: { mostrador: 5000 },
          turnos: [
            {
              id: 99,
              cancha_id: 1,
              cancha_nombre: "Cancha 1 Panorámica",
              cliente_nombre: "Lucas Pádel",
              cliente_telefono: "1133221100",
              hora_inicio: "18:00",
              hora_fin: "19:30",
              duracion_minutos: 90,
              precio: 10000,
              monto_pagado: 5000,
              saldo_pendiente: 5000,
              estado_pago: "senado",
              metodo_pago: "mostrador",
              es_fijo: false,
              estado: "reservado",
              recordatorio_enviado_at: null,
            },
          ],
        },
      ],
      canchas: [
        {
          cancha_id: 1,
          nombre: "Cancha 1 Panorámica",
          deporte: "padel",
          turnos: 1,
          total_facturado: 10000,
          total_cobrado: 5000,
          saldo_pendiente: 5000,
        },
      ],
      metodos_pago: { mostrador: 5000 },
    };

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/resumen-diario")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: mockResumenData,
          }),
        } as any;
      }
      if (urlStr.includes("/enviar-recordatorio") && opts?.method === "POST") {
        const parts = urlStr.split("/");
        const idIdx = parts.indexOf("turnos") + 1;
        reminderDispatchedTurnoId = parseInt(parts[idIdx], 10);
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Recordatorio enviado exitosamente por WhatsApp a 1133221100.",
            telefono: "1133221100",
            recordatorio_enviado_at: "2026-09-18T16:00:00Z",
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(
      <ResumenDiarioTurnos
        subdomain="padel-central"
        canchas={[{ id: 1, nombre: "Cancha 1 Panorámica", deporte: "padel" }]}
      />
    );

    // Expand Friday accordion
    const dayHeader = await screen.findByText(/Viernes/i);
    fireEvent.click(dayHeader);

    // Verify turno info is visible
    expect(await screen.findByText(/Lucas Pádel/i)).toBeDefined();
    expect(screen.getByText(/1133221100/i)).toBeDefined();

    // Verify "Recordatorio" button is present and click it
    const reminderBtn = screen.getByRole("button", { name: /Recordatorio/i });
    expect(reminderBtn).toBeDefined();
    fireEvent.click(reminderBtn);

    // Assert API call was made
    await waitFor(() => {
      expect(reminderDispatchedTurnoId).toBe(99);
    });

    // Toast should show success message
    expect(await screen.findByText(/Recordatorio de WhatsApp enviado exitosamente a 1133221100/i)).toBeDefined();

    // Button should now transition to "Recordatorio enviado"
    expect(await screen.findByText(/Recordatorio enviado/i)).toBeDefined();
  });
});
