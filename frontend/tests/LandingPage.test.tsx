import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PortalPage from "../app/portal/page";
import { AuthProvider } from "../context/AuthContext";


describe("Landing Page Vendedora (PortalPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza la landing page con la propuesta de valor y prueba gratuita de 30 días", () => {
    render(
      <AuthProvider>
        <PortalPage />
      </AuthProvider>
    );

    // 1. Hero Section
    expect(
      screen.getByText(/La plataforma integral que transforma tu complejo/i)
    ).toBeDefined();
    expect(screen.getByText(/en un club de primer nivel/i)).toBeDefined();


    // Verificamos que indique explícitamente 30 días de prueba
    const btnTrial = screen.getAllByText(/Prueba 30 Días/i);
    expect(btnTrial.length).toBeGreaterThanOrEqual(1);

    // 2. Sección Antes vs Después
    expect(screen.getByText("El Antes y el Después de tu Club")).toBeDefined();
    expect(screen.getByText("Gestión Tradicional (Sin Sistema)")).toBeDefined();
    expect(screen.getByText("Con Nuestra Plataforma SaaS")).toBeDefined();

    // 3. Funcionalidades Operativas Hoy
    expect(screen.getByText("Funcionalidades Operativas Hoy")).toBeDefined();
    expect(screen.getAllByText("Reservas & Agenda en Tiempo Real").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cobro de Señas & Billetera Virtual")).toBeDefined();

    // 4. Calculadora de Impacto Financiero
    expect(screen.getByText("¿Cuánto dinero pierde tu club por turnos colgados?")).toBeDefined();

    // 5. Próximos Módulos en Desarrollo (Roadmap)
    expect(screen.getByText("Próximos Módulos en Desarrollo Activo")).toBeDefined();
    expect(screen.getByText("POS & Buffet / Cantina")).toBeDefined();
    expect(screen.getByText("Gestor de Torneos & Fixtures")).toBeDefined();
    expect(screen.getByText("Partidos Abiertos & Matchmaking")).toBeDefined();
    expect(screen.getByText("Domótica IoT: Control de Luces")).toBeDefined();

    // 6. Planes & FAQ
    expect(screen.getByText(/Elegí el plan que mejor se adapte/i)).toBeDefined();
    expect(screen.getByText("Preguntas Frecuentes de Dueños de Clubes")).toBeDefined();
    expect(screen.getByText("¿Cómo funciona la prueba gratuita por 30 días?")).toBeDefined();
  });

  it("permite interactuar con la calculadora de ROI ajustando sliders y calcula pérdidas y recupero", () => {
    render(
      <AuthProvider>
        <PortalPage />
      </AuthProvider>
    );

    // Canchas slider
    const inputCanchas = screen.getByLabelText(/Cantidad de Canchas/i) as HTMLInputElement;
    expect(inputCanchas.value).toBe("4");

    // Precio slider
    const inputPrecio = screen.getByLabelText(/Precio Promedio por Turno/i) as HTMLInputElement;
    expect(inputPrecio.value).toBe("12000");

    // Turnos caídos slider
    const inputTurnos = screen.getByLabelText(/Turnos no presentados/i) as HTMLInputElement;
    expect(inputTurnos.value).toBe("8");

    // 8 turnos * $12.000 = $96.000 de pérdida
    expect(screen.getByText("$96.000")).toBeDefined();
    // 50% recuperado con seña = $48.000
    expect(screen.getByText("+$48.000")).toBeDefined();

    // Cambiamos los turnos caídos a 10
    fireEvent.change(inputTurnos, { target: { value: "10" } });
    // 10 turnos * $12.000 = $120.000 de pérdida
    expect(screen.getByText("$120.000")).toBeDefined();
    // 50% recuperado = $60.000
    expect(screen.getByText("+$60.000")).toBeDefined();

    // Alternar a cobro total 100%
    const btnPagoTotal = screen.getByRole("button", { name: /Pago Total \(100%\)/i });
    fireEvent.click(btnPagoTotal);
    // 100% de $120.000 = +$120.000
    expect(screen.getByText("+$120.000")).toBeDefined();
  });

  it("permite abrir y cerrar las preguntas frecuentes (FAQ accordion)", () => {
    render(
      <AuthProvider>
        <PortalPage />
      </AuthProvider>
    );

    // La primera pregunta viene abierta por defecto
    expect(screen.getByText(/Podés registrar tu club en 2 minutos y acceder de inmediato/i)).toBeDefined();

    // Hacemos click en la segunda pregunta
    const btnFaq2 = screen.getByText("¿Mis clientes tienen que instalarse alguna app pesada?");
    fireEvent.click(btnFaq2);

    expect(screen.getByText(/Nuestra plataforma funciona 100% en la web moderna/i)).toBeDefined();
  });

  it("permite navegar manualmente por las obleas de funcionalidades y soporta controles de pausa y siguiente/anterior", () => {
    render(
      <AuthProvider>
        <PortalPage />
      </AuthProvider>
    );

    // Inicialmente muestra la primera feature (1 / 6)
    expect(screen.getByText("1 / 6")).toBeDefined();
    expect(
      screen.getByText(/Tus clientes ven la disponibilidad en vivo desde su celular/i)
    ).toBeDefined();

    // Hacemos click en la oblea "Cobro de Señas & Billetera Virtual"
    const obleaSenas = screen.getByRole("button", { name: /Cobro de Señas & Billetera Virtual/i });
    fireEvent.click(obleaSenas);

    // Ahora muestra la feature 2 (2 / 6) y su detalle correspondiente
    expect(screen.getByText("2 / 6")).toBeDefined();
    expect(
      screen.getByText(/Configurá el porcentaje de seña requerido o cobro total/i)
    ).toBeDefined();

    // Probamos el botón Siguiente
    const btnNext = screen.getByRole("button", { name: /Siguiente funcionalidad/i });
    fireEvent.click(btnNext);

    expect(screen.getByText("3 / 6")).toBeDefined();
    expect(
      screen.getByText(/Cargá los turnos semanales fijos con un solo clic/i)
    ).toBeDefined();

    // Probamos el botón Anterior
    const btnPrev = screen.getByRole("button", { name: /Funcionalidad anterior/i });
    fireEvent.click(btnPrev);
    expect(screen.getByText("2 / 6")).toBeDefined();

    // Probamos alternar Pausa / Auto-rotación
    const btnAuto = screen.getByRole("button", { name: /Pausar rotación automática/i });
    fireEvent.click(btnAuto);
    expect(screen.getByRole("button", { name: /Reanudar rotación automática/i })).toBeDefined();
  });

  it("rota automáticamente a la siguiente funcionalidad después de 6 segundos", () => {
    vi.useFakeTimers();

    render(
      <AuthProvider>
        <PortalPage />
      </AuthProvider>
    );

    expect(screen.getByText("1 / 6")).toBeDefined();

    // Avanzamos 6 segundos en el temporizador
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Debe haber avanzado automáticamente a 2 / 6
    expect(screen.getByText("2 / 6")).toBeDefined();

    vi.useRealTimers();
  });
});

