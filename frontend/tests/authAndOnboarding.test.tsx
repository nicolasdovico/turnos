import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "../components/Navbar";
import LoginPage from "../app/login/page";
import RegisterPage from "../app/registro/page";
import RegistroClubPage from "../app/registro-club/page";
import { AuthProvider } from "../context/AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    subdomain: "nico-padel",
  }),
}));

import PlanesPage from "../app/planes/page";
import VerificarEmailPage from "../app/verificar-email/page";
import ClubAdminPanel from "../app/tenants/[subdomain]/panel/page";
import PortalPage from "../app/portal/page";

describe("Frontend Auth & Club Onboarding Suite", () => {
  it("renders Navbar with guest navigation buttons", () => {
    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    expect(screen.getByText(/Turnos/i)).toBeDefined();
    expect(screen.getByText(/Iniciar Sesión/i)).toBeDefined();
    expect(screen.getByText(/Planes & Precios/i)).toBeDefined();
    expect(screen.getByText(/Registrar mi Club/i)).toBeDefined();
    expect(screen.queryByText(/Panel de Administrador/i)).toBeNull();
    expect(screen.queryByText(/Panel Club/i)).toBeNull();
  });

  it("renders Planes & Precios page with pricing cards, comparison matrix and FAQ", () => {
    render(<PlanesPage />);

    expect(screen.getByText("Planes diseñados para potenciar tu Club")).toBeDefined();
    expect(screen.getAllByText("Bronce").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Plata").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Oro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Comparativa Detallada de Funcionalidades")).toBeDefined();
    expect(screen.getByText("Preguntas Frecuentes")).toBeDefined();
  });

  it("renders Login page with email, password fields and link to register club", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    const passInput = screen.getByPlaceholderText("••••••••") as HTMLInputElement;
    expect(passInput.type).toBe("password");

    const toggleBtn = screen.getByLabelText("Ver contraseña");
    fireEvent.click(toggleBtn);
    expect(passInput.type).toBe("text");

    const hideBtn = screen.getByLabelText("Ocultar contraseña");
    fireEvent.click(hideBtn);
    expect(passInput.type).toBe("password");

    expect(screen.getByText("Ingresar a mi cuenta")).toBeDefined();
    expect(screen.getByText(/Registrar mi Club/i)).toBeDefined();
  });

  it("renders User Register page and validates password mismatch", async () => {
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    const nameInput = screen.getByPlaceholderText("Ej. Juan Pérez");
    const emailInput = screen.getByPlaceholderText("juan@ejemplo.com");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInputs[0], { target: { value: "pass12345" } });
    fireEvent.change(passwordInputs[1], { target: { value: "mismatchpass" } });

    const submitBtn = screen.getByText("Crear mi Cuenta");
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeDefined();
  });

  it("renders Club Onboarding page with business type selector, plan cards, court management and subdomain inputs", () => {
    render(
      <AuthProvider>
        <RegistroClubPage />
      </AuthProvider>
    );

    // Initial state: Club
    expect(screen.getByText(/Registra tu Club Deportivo/i)).toBeDefined();
    expect(screen.getByPlaceholderText("Ej. Club Pádel Master")).toBeDefined();
    expect(screen.getByText(/Tipo de Establecimiento \/ Negocio/i)).toBeDefined();
    expect(screen.getAllByText(/Complejo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Gimnasio/i).length).toBeGreaterThanOrEqual(1);

    // Select Complejo
    const complejoBtn = screen.getByRole("button", { name: /Complejo/i });
    fireEvent.click(complejoBtn);

    expect(screen.getByText(/Registra tu Complejo Deportivo/i)).toBeDefined();
    expect(screen.getByPlaceholderText("Ej. Complejo Deportivo Central")).toBeDefined();
    expect(screen.getByText(/Crear mi Complejo y Comenzar Prueba Gratis/i)).toBeDefined();

    expect(screen.getByText("Bronce")).toBeDefined();
    expect(screen.getByText("Plata")).toBeDefined();
    expect(screen.getByText("Oro")).toBeDefined();
    expect(screen.getByText("+ Agregar Cancha")).toBeDefined();
  });

  it("renders Verificar Email page with 6-digit OTP input boxes and resend cooldown", () => {
    render(
      <AuthProvider>
        <VerificarEmailPage />
      </AuthProvider>
    );

    expect(screen.getByText("Verifica tu Correo")).toBeDefined();
    expect(screen.getAllByPlaceholderText("•").length).toBe(6);
    expect(screen.getByText("Confirmar Código OTP")).toBeDefined();
    expect(screen.getByText(/Mailpit Activo/i)).toBeDefined();
  });

  it("renders Club Admin Panel with sport-aware courts, attributes, and modal", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("is-admin")) {
        return {
          ok: true,
          json: async () => ({ is_admin: true, is_authenticated: true }),
        } as any;
      }
      if (urlStr.includes("dashboard")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              complejo: {
                id: 1,
                nombre: "Nico Padel",
                subdominio: "nico-padel",
                deporte_principal: "padel",
                tipo_negocio: { id: 1, nombre: "Club", slug: "club" },
              },
              plan: {
                id: 1,
                nombre: "Oro",
                slug: "oro",
                modulos: [{ id: 1, nombre: "Reservas", slug: "reservas" }],
              },
              canchas: [
                {
                  id: 1,
                  nombre: "Cancha 1 (Panorámica)",
                  deporte: "padel",
                  superficie: "sintetico_wpt",
                  precio_base: 8000,
                  precio_con_luz: 10000,
                  techada: true,
                  iluminacion: true,
                  tipo_pared: "cristal_panoramico",
                  camara_grabacion: true,
                  marcador_digital: true,
                  estado: "activo",
                },
              ],
              stats: { total_canchas: 1, total_turnos: 0, modulos_count: 7 },
            },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ data: [] }) } as any;
    });

    render(
      <AuthProvider>
        <ClubAdminPanel />
      </AuthProvider>
    );

    expect(await screen.findByText(/Canchas Disponibles/i)).toBeDefined();
    expect(await screen.findByText(/Cancha 1 \(Panorámica\)/i)).toBeDefined();
    expect(await screen.findByText(/Cámara Grabación/i)).toBeDefined();
    expect(await screen.findByText(/\+ Nueva Cancha/i)).toBeDefined();

    // Open modal
    const addBtn = screen.getByText(/\+ Nueva Cancha/i);
    fireEvent.click(addBtn);

    expect(await screen.findByText("➕ Nueva Cancha")).toBeDefined();
    expect(screen.getByText(/1\. Deporte y Formato/i)).toBeDefined();
    expect(screen.getByText(/2\. Tarifas y Precios/i)).toBeDefined();
    expect(screen.getByText(/3\. Equipamiento & Atributos del Mercado/i)).toBeDefined();
    expect(screen.getByText(/Iluminación Artificial/i)).toBeDefined();
  });

  it("renders Portal Global page with features and marketplace banner", () => {
    render(
      <AuthProvider>
        <PortalPage />
      </AuthProvider>
    );

    expect(screen.getByText("Portal Global de Complejos Deportivos")).toBeDefined();
    expect(screen.getByText(/Registrar mi Negocio/i)).toBeDefined();
    expect(screen.getByText("Reservas & Agenda")).toBeDefined();
    expect(screen.getByText("POS & Buffet")).toBeDefined();
    expect(screen.getByText("Domótica IoT")).toBeDefined();
  });
});
