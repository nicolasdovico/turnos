import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Navbar from "../components/Navbar";
import LoginPage from "../app/login/page";
import RegisterPage from "../app/registro/page";
import RegistroClubPage from "../app/registro-club/page";
import { AuthProvider } from "../context/AuthContext";

let mockParams: Record<string, string> = {};

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => mockParams,
}));

import PlanesPage from "../app/planes/page";
import VerificarEmailPage from "../app/verificar-email/page";
import ClubAdminPanel from "../app/tenants/[subdomain]/panel/page";
import TenantPage from "../app/tenants/[subdomain]/page";
import PortalPage from "../app/portal/page";

describe("Frontend Auth & Club Onboarding Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    mockParams = { subdomain: "nico-padel" };
  });

  it("renders Navbar on root domain with guest navigation buttons and pricing", () => {
    mockParams = {};
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

  it("renders clean tenant Navbar on club subdomain omitting central portal and B2B pricing links", () => {
    mockParams = { subdomain: "nico-tenis" };
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      hostname: "nico-tenis.localhost",
      protocol: "http:",
      port: "8080",
    };

    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    // Should display the tenant slug badge
    expect(screen.getByText("nico-tenis")).toBeDefined();
    expect(screen.getByText(/Iniciar Sesión/i)).toBeDefined();
    expect(screen.getByText(/Registrarse/i)).toBeDefined();

    // Must NOT display SaaS B2B links
    expect(screen.queryByText(/Planes & Precios/i)).toBeNull();
    expect(screen.queryByText(/Portal Central/i)).toBeNull();
    expect(screen.queryByText(/Registrar mi Club/i)).toBeNull();

    // Restore window.location
    window.location = originalLocation;
  });

  it("reactively updates Navbar without page reload when a user completes quick registration or login", async () => {
    localStorage.clear();
    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    // Initial state: Guest buttons visible
    expect(screen.getByText(/Iniciar Sesión/i)).toBeDefined();
    expect(screen.queryByText("Agustín Rossi")).toBeNull();

    // Simulate in-page quick registration / login emitting custom auth event
    const newUser = { id: 55, name: "Agustín Rossi", email: "agustin@boca.com" };
    localStorage.setItem("saas_token", "fake-token-rossi");
    localStorage.setItem("saas_user", JSON.stringify(newUser));

    fireEvent(
      window,
      new CustomEvent("saas-auth-changed", {
        detail: { user: newUser, token: "fake-token-rossi" },
      })
    );

    // Navbar must reactively update immediately
    await waitFor(() => {
      expect(screen.getByText("Agustín Rossi")).toBeDefined();
      expect(screen.queryByText(/Iniciar Sesión/i)).toBeNull();
    });

    // Cleanup session for subsequent test cases
    localStorage.clear();
    fireEvent(
      window,
      new CustomEvent("saas-auth-changed", {
        detail: { user: null, token: null },
      })
    );
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

  it("verifies OTP with club context, updates auth session and provides direct link to club panel", async () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      search: "?email=gonzalo@olivos.test&club=Padel%20Park%20Olivos&subdomain_url=http://padel-olivos.localhost:8080&redirect=http://padel-olivos.localhost:8080/panel",
      pathname: "/verificar-email",
      hostname: "localhost",
      protocol: "http:",
      port: "8080",
    } as any;

    try {
      vi.spyOn(global, "fetch").mockImplementation(async (url: any, opts: any) => {
        const urlStr = String(url);
        if (urlStr.includes("verify-otp")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              message: "¡Correo electrónico verificado exitosamente!",
              token: "valid-sanctum-token-gonzalo",
              user: {
                id: 99,
                name: "Gonzalo Martínez",
                email: "gonzalo@olivos.test",
                email_verified_at: "2026-09-03T22:50:00Z",
                complejos: [{ id: 10, nombre: "Padel Park Olivos", subdominio: "padel-olivos" }],
              },
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(
        <AuthProvider>
          <VerificarEmailPage />
        </AuthProvider>
      );

      // Should display club name on the verification screen
      expect(screen.getByText(/Padel Park Olivos/i)).toBeDefined();
      expect(screen.getByText("gonzalo@olivos.test")).toBeDefined();

      // Fill the 6-digit OTP
      const inputs = screen.getAllByPlaceholderText("•");
      expect(inputs.length).toBe(6);
      fireEvent.change(inputs[0], { target: { value: "1" } });
      fireEvent.change(inputs[1], { target: { value: "2" } });
      fireEvent.change(inputs[2], { target: { value: "3" } });
      fireEvent.change(inputs[3], { target: { value: "4" } });
      fireEvent.change(inputs[4], { target: { value: "5" } });
      fireEvent.change(inputs[5], { target: { value: "6" } });

      await waitFor(() => {
        expect(screen.getByText(/¡Club y Cuenta Activados!/i)).toBeDefined();
        expect(screen.getByText(/Ir al Panel de mi Club/i)).toBeDefined();
      });

      // Verify session token was stored in localStorage
      expect(localStorage.getItem("saas_token")).toBe("valid-sanctum-token-gonzalo");
    } finally {
      window.location = originalLocation;
    }
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
    expect(screen.getByText(/3\. Duración de Turno/i)).toBeDefined();
    expect(screen.getByText(/4\. Equipamiento/i)).toBeDefined();
    expect(screen.getByText(/Iluminación Artificial/i)).toBeDefined();
  });

  it("displays courts sorted alphabetically by name in the admin panel", async () => {
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
                { id: 1, nombre: "Cancha Zeta", deporte: "padel", superficie: "cemento", precio_base: 8000, techada: false, estado: "activo" },
                { id: 2, nombre: "Cancha Alpha", deporte: "padel", superficie: "sintetico_wpt", precio_base: 10000, techada: true, estado: "activo" },
                { id: 3, nombre: "Cancha Beta", deporte: "padel", superficie: "cristal", precio_base: 9000, techada: true, estado: "activo" },
              ],
              stats: { total_canchas: 3, total_turnos: 0, modulos_count: 7 },
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

    expect(await screen.findByText("Cancha Alpha")).toBeDefined();
    expect(await screen.findByText("Cancha Beta")).toBeDefined();
    expect(await screen.findByText("Cancha Zeta")).toBeDefined();

    const courtHeadings = screen.getAllByRole("heading", { level: 3 });
    const courtNames = courtHeadings.map((h) => h.textContent).filter((t) => t && t.startsWith("Cancha"));
    expect(courtNames).toEqual(["Cancha Alpha", "Cancha Beta", "Cancha Zeta"]);
  });

  it("opens custom styled confirmation modal when putting a court into maintenance", async () => {
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
              plan: { id: 1, nombre: "Oro", slug: "oro", modulos: [] },
              canchas: [
                { id: 1, nombre: "Cancha Central", deporte: "padel", superficie: "sintetico_wpt", precio_base: 8000, techada: true, estado: "activo" },
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

    expect(await screen.findByText("Cancha Central")).toBeDefined();

    // Click on pause button
    const pauseBtn = screen.getByTitle("Poner en mantenimiento");
    fireEvent.click(pauseBtn);

    expect(await screen.findByText("¿Poner Cancha Central en Mantenimiento?")).toBeDefined();
    expect(screen.getByText(/Al activar el modo mantenimiento/i)).toBeDefined();
    expect(screen.getByText("Sí, Pausar Cancha")).toBeDefined();
    expect(screen.getByText("Cancelar")).toBeDefined();
  });

  it("renders dynamic TenantPage with real club name, business type and real courts", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("is-admin")) {
        return {
          ok: true,
          json: async () => ({ is_admin: false, is_authenticated: false }),
        } as any;
      }
      if (urlStr.includes("dashboard")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              complejo: {
                id: 115,
                nombre: "Nico Tenis",
                subdominio: "nico-tenis",
                deporte_principal: "tenis",
                tipo_negocio: { id: 2, nombre: "Complejo", slug: "complejo" },
                direccion: "Ruta 5",
                ciudad: "Lujan",
                telefono: "+5491149790220",
              },
              plan: { id: 189, nombre: "Bronce", slug: "bronce", modulos: [] },
              canchas: [
                {
                  id: 63,
                  nombre: "Cancha 1 (Polvo)",
                  deporte: "tenis",
                  superficie: "polvo_ladrillo",
                  precio_base: 8000,
                  techada: false,
                  estado: "activo",
                },
                {
                  id: 64,
                  nombre: "Cancha 2 (Rápida)",
                  deporte: "tenis",
                  superficie: "cemento_rapida",
                  precio_base: 10000,
                  techada: false,
                  estado: "activo",
                },
              ],
            },
          }),
        } as any;
      }
      return { ok: true, json: async () => ({ data: { slots: [] } }) } as any;
    });

    render(
      <AuthProvider>
        <TenantPage params={{ subdomain: "nico-tenis" }} />
      </AuthProvider>
    );

    // Verify real name and business type are displayed
    expect(await screen.findByText("Nico Tenis")).toBeDefined();
    expect(screen.getByText(/Complejo Oficial/i)).toBeDefined();
    expect(screen.getByText(/🏆 tenis/i)).toBeDefined();
    expect(screen.getByText(/Ruta 5, Lujan/i)).toBeDefined();

    // Verify real courts are displayed and sport is Tennis (NOT padel)
    expect(screen.getAllByText("Cancha 1 (Polvo)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cancha 2 (Rápida)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/tenis •/i).length).toBeGreaterThanOrEqual(1);

    // Switch court
    const court2Btn = screen.getByText("Cancha 2 (Rápida)");
    fireEvent.click(court2Btn);

    expect(await screen.findByText(/2\. Elige tu Turno en/i)).toBeDefined();
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

  it("renders and updates payment and cancellation policies in club admin panel", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url: any, options: any) => {
      const urlStr = String(url);
      if (urlStr.includes("is-admin")) {
        return {
          ok: true,
          json: async () => ({ is_admin: true, is_authenticated: true }),
        } as any;
      }
      if (urlStr.includes("configuracion") && options?.method === "PUT") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Políticas guardadas exitosamente",
            complejo: {
              id: 1,
              nombre: "Nico Padel",
              subdominio: "nico-padel",
              porcentaje_sena: 30,
              horas_limite_cancelacion: 6,
              tipo_cobro_reserva: "sena",
            },
          }),
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
                porcentaje_sena: 50,
                horas_limite_cancelacion: 4,
                tipo_cobro_reserva: "sena",
                permite_mostrador_publico: true,
              },
              plan: {
                id: 1,
                nombre: "Oro",
                slug: "oro",
                modulos: [{ id: 1, nombre: "Reservas", slug: "reservas" }],
              },
              canchas: [],
              stats: { total_canchas: 0, total_turnos: 0, modulos_count: 1 },
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
    const politicasTabBtn = await screen.findByRole("button", { name: /Políticas de Seña & Cancelación/i });
    fireEvent.click(politicasTabBtn);

    expect(await screen.findByText(/Políticas de Cobro, Seña y Cancelación/i)).toBeDefined();
    expect(screen.getByText("Seña Obligatoria")).toBeDefined();
    expect(screen.getByText("Pago Total (100%)")).toBeDefined();
    expect(screen.getByText("Sin Seña Previa")).toBeDefined();

    // Click quick 30% preset button
    const preset30Btn = screen.getByRole("button", { name: "30%" });
    fireEvent.click(preset30Btn);

    // Click 6hs button
    const btn6hs = screen.getByRole("button", { name: /6 hs/i });
    fireEvent.click(btn6hs);

    // Click submit
    const saveBtn = screen.getByRole("button", { name: /Guardar Políticas de Reserva/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText(/Políticas de cobro de seña y cancelación guardadas exitosamente!/i)).toBeDefined();
  });

  it("renders and updates weekly business hours in club admin panel", async () => {
    let putHorariosPayload: any = null;

    vi.spyOn(global, "fetch").mockImplementation(async (url: any, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("is-admin")) {
        return {
          ok: true,
          json: async () => ({ is_admin: true, is_authenticated: true }),
        } as any;
      }
      if (urlStr.includes("/horarios") && options?.method === "PUT") {
        putHorariosPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Horarios de atención actualizados exitosamente.",
            horarios: [
              { id: 1, dia_semana: 1, hora_apertura: "09:00", hora_cierre: "22:00", duracion_turno_minutos: 90 },
              { id: 2, dia_semana: 2, hora_apertura: "09:00", hora_cierre: "22:00", duracion_turno_minutos: 90 },
            ],
          }),
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
              },
              plan: {
                id: 1,
                nombre: "Oro",
                slug: "oro",
                modulos: [{ id: 1, nombre: "Reservas", slug: "reservas" }],
              },
              canchas: [],
              horarios_atencion: [
                { id: 1, dia_semana: 1, hora_apertura: "08:00:00", hora_cierre: "23:00:00", duracion_turno_minutos: 60 },
                { id: 2, dia_semana: 2, hora_apertura: "08:00:00", hora_cierre: "23:00:00", duracion_turno_minutos: 60 },
              ],
              stats: { total_canchas: 0, total_turnos: 0, modulos_count: 1 },
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

    // Switch to Horarios tab
    const horariosTabBtn = await screen.findByRole("button", { name: /Horarios de Atención/i });
    fireEvent.click(horariosTabBtn);

    expect(await screen.findByText(/Horarios de Atención del Club/i)).toBeDefined();
    expect(screen.getByText("Lunes")).toBeDefined();
    expect(screen.getByText("Martes")).toBeDefined();
    expect(screen.getByText("Miércoles")).toBeDefined();
    expect(screen.getByText("Jueves")).toBeDefined();
    expect(screen.getByText("Viernes")).toBeDefined();
    expect(screen.getByText("Sábado")).toBeDefined();
    expect(screen.getByText("Domingo")).toBeDefined();

    // Click quick action "⚡ Copiar Lun a Vie"
    const btnCopiarLunVie = screen.getByRole("button", { name: /⚡ Copiar Lun a Vie/i });
    fireEvent.click(btnCopiarLunVie);
    expect(await screen.findByText(/Horario del Lunes copiado a Martes, Miércoles, Jueves y Viernes/i)).toBeDefined();

    // Toggle switch on Sunday to close it
    const toggleDomingo = screen.getByRole("checkbox", { name: /Estado de atención Domingo/i });
    fireEvent.click(toggleDomingo);

    // Submit form
    const saveHorariosBtn = screen.getByRole("button", { name: /Guardar Horarios de Atención/i });
    fireEvent.click(saveHorariosBtn);

    expect(await screen.findByText(/¡Horarios de atención actualizados exitosamente!/i)).toBeDefined();
    expect(putHorariosPayload).toBeDefined();
    expect(putHorariosPayload.horarios).toHaveLength(7);
  });

  it("preserves unsaved changes in horarios against background polling and window focus revalidation", async () => {
    let fetchCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("is-admin")) {
        return {
          ok: true,
          json: async () => ({ is_admin: true, is_authenticated: true }),
        } as any;
      }
      if (urlStr.includes("dashboard")) {
        fetchCount++;
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
              },
              plan: { id: 1, nombre: "Oro", slug: "oro", modulos: [] },
              canchas: [],
              horarios_atencion: [
                { id: 1, dia_semana: 0, hora_apertura: "08:00:00", hora_cierre: "23:00:00", duracion_turno_minutos: 60 },
              ],
              stats: { total_canchas: 0, total_turnos: 0, modulos_count: 0 },
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

    // Switch to Horarios tab
    const horariosTabBtn = await screen.findByRole("button", { name: /Horarios de Atención/i });
    fireEvent.click(horariosTabBtn);

    const toggleDomingo = (await screen.findByRole("checkbox", {
      name: /Estado de atención Domingo/i,
    })) as HTMLInputElement;

    // Initially Domingo is open (checked = true because rawHorarios had dia_semana 0)
    expect(toggleDomingo.checked).toBe(true);
    expect(screen.queryByText(/Tienes cambios pendientes de guardar en los horarios/i)).toBeNull();

    // User toggles Domingo to closed
    fireEvent.click(toggleDomingo);
    expect(toggleDomingo.checked).toBe(false);

    // Dirty banner and Discard button should appear
    expect(await screen.findByText(/Tienes cambios pendientes de guardar en los horarios/i)).toBeDefined();
    const discardBtn = screen.getByRole("button", { name: /Descartar cambios/i });
    expect(discardBtn).toBeDefined();

    // Simulate background revalidation via window focus or polling
    fireEvent(window, new Event("focus"));

    // After revalidation, Domingo MUST remain closed (unsaved change preserved)
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });
    expect(toggleDomingo.checked).toBe(false);
    expect(screen.getByText(/Tienes cambios pendientes de guardar en los horarios/i)).toBeDefined();

    // User clicks "Descartar cambios"
    fireEvent.click(discardBtn);

    // Form should revert to saved server state (Domingo checked = true) and dirty banner disappears
    expect(toggleDomingo.checked).toBe(true);
    expect(screen.queryByText(/Tienes cambios pendientes de guardar en los horarios/i)).toBeNull();
  });


  it("renders and manages fixed bookings (turnos fijos) for 6 months with renewal alert in club admin panel", async () => {
    let postTurnoFijoPayload: any = null;
    let renewPayload: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
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
                owner: { name: "Dueño Central" },
              },
              plan: {
                nombre: "Oro",
                modulos: [{ slug: "reservas" }, { slug: "turnos_fijos" }],
              },
              canchas: [
                {
                  id: 1,
                  nombre: "Cancha 1 Panorámica",
                  deporte: "padel",
                  precio_base: 8000,
                  estado: "activo",
                },
              ],
              stats: { total_canchas: 1, total_turnos: 26, modulos_count: 2 },
            },
          }),
        } as any;
      }
      if (urlStr.includes("/turnos-fijos/renovar")) {
        renewPayload = JSON.parse(init?.body || "{}");
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Turno fijo renovado exitosamente por 26 semanas más.",
            cantidad_nuevos: 26,
          }),
        } as any;
      }
      if (urlStr.includes("/turnos-fijos") && init?.method === "POST") {
        postTurnoFijoPayload = JSON.parse(init?.body || "{}");
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Turnos fijos generados exitosamente.",
            cantidad: 26,
          }),
        } as any;
      }
      if (urlStr.includes("/turnos-fijos")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 101,
                cancha_id: 1,
                cancha_nombre: "Cancha 1 Panorámica",
                deporte: "padel",
                dia_semana: 1, // Lunes
                hora_inicio: "19:00",
                hora_fin: "20:30",
                precio: 8000,
                cliente_id: null,
                cliente_nombre: "Esteban Abonado",
                cliente_telefono: "1133445566",
                metodo_pago: "mostrador",
                total_turnos: 26,
                proximas_fechas_count: 2, // Expiring soon!
                proxima_fecha: "2026-09-07",
                fecha_inicio: "2026-09-01",
                fecha_fin: "2027-02-28",
                requiere_renovacion: true,
                proximas_fechas: [
                  {
                    id: 101,
                    fecha: "2026-09-07",
                    hora_inicio: "19:00",
                    hora_fin: "20:30",
                    estado: "reservado",
                    estado_pago: "pendiente",
                    precio: 8000,
                    monto_pagado: 0,
                  },
                ],
              },
            ],
          }),
        } as any;
      }
      if (urlStr.includes("/usuarios/buscar")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 88,
                name: "Franco Colapinto",
                email: "franco@f1.com",
                telefono: "1144778899",
              },
            ],
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

    // Switch to Turnos Fijos tab
    const turnosFijosTabBtn = await screen.findByRole("button", { name: /Turnos Fijos/i });
    fireEvent.click(turnosFijosTabBtn);

    expect(await screen.findByText(/Gestión de Turnos Fijos & Abonados/i)).toBeDefined();
    expect(screen.getByText(/Esteban Abonado/i)).toBeDefined();
    expect(screen.getByText(/Por Vencer \(2 sem\)/i)).toBeDefined();

    // Click "⚡ Renovar 6 Meses Más"
    const btnRenovar = screen.getByRole("button", { name: /Renovar 6 Meses Más/i });
    fireEvent.click(btnRenovar);

    await waitFor(() => {
      expect(renewPayload).toBeDefined();
      expect(renewPayload.semanas).toBe(26);
    });

    // 1. Open "➕ Asignar Nuevo Turno Fijo" modal with manual client
    const btnNuevoFijo = screen.getByRole("button", { name: /Asignar Nuevo Turno Fijo/i });
    fireEvent.click(btnNuevoFijo);

    expect(screen.getByText(/Horizonte estándar de 6 meses \(26 semanas\)/i)).toBeDefined();

    // Fill client name
    const inputNombre = screen.getByPlaceholderText(/Ej: Marcelo Gómez/i);
    fireEvent.change(inputNombre, { target: { value: "Carlos Pádel Fijo" } });

    // Submit form
    const btnSubmit = screen.getByRole("button", { name: /Asignar Turno Fijo/i });
    fireEvent.click(btnSubmit);

    await waitFor(() => {
      expect(postTurnoFijoPayload).toBeDefined();
      expect(postTurnoFijoPayload.cliente_nombre).toBe("Carlos Pádel Fijo");
      expect(postTurnoFijoPayload.semanas).toBe(26);
    });

    // 2. Open modal and test search & select for registered user
    fireEvent.click(btnNuevoFijo);
    const btnUsuarioRegistrado = screen.getByRole("button", { name: /Usuario Registrado/i });
    fireEvent.click(btnUsuarioRegistrado);

    expect(await screen.findByText(/Buscar y Seleccionar Usuario en BD/i)).toBeDefined();
    const searchInput = screen.getByPlaceholderText(/Escribe nombre, email o teléfono para buscar/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: "Franco" } });

    // Click matching user from dropdown
    const userOption = await screen.findByText(/Franco Colapinto/i);
    fireEvent.click(userOption);

    expect(screen.getByText(/Vinculado/i)).toBeDefined();
    expect(screen.getByText(/#88/i)).toBeDefined();

    // Submit form for registered user
    fireEvent.click(screen.getByRole("button", { name: /Asignar Turno Fijo/i }));

    await waitFor(() => {
      expect(postTurnoFijoPayload.cliente_id).toBe(88);
      expect(postTurnoFijoPayload.cliente_nombre).toBe("Franco Colapinto");
    });
  });

  it("renders Resumen Diario & Caja tab with financial KPIs, day by day cards and court filtering in club admin panel", async () => {
    const mockResumenData = {
      periodo: {
        fecha_desde: "2026-09-01",
        fecha_hasta: "2026-09-02",
        total_dias: 2,
        cancha_id: null,
      },
      kpis: {
        total_facturado: 45000,
        total_cobrado: 35000,
        total_saldo_pendiente: 10000,
        total_turnos: 4,
        total_turnos_fijos: 1,
        ocupacion_promedio: 75.5,
        porcentaje_cobrado: 77.8,
      },
      dias: [
        {
          fecha: "2026-09-01",
          dia_semana_numero: 2,
          dia_nombre: "Martes",
          total_turnos: 2,
          turnos_fijos: 1,
          monto_total: 25000,
          monto_cobrado: 25000,
          saldo_pendiente: 0,
          estado_cobro: "al_dia",
          ocupacion_porcentaje: 80.0,
          minutos_ocupados: 180,
          minutos_disponibles: 240,
          desglose_metodos: {
            mostrador: 25000,
            transferencia: 0,
            online: 0,
            billetera: 0,
            otro: 0,
          },
          turnos: [
            {
              id: 101,
              cancha_id: 1,
              cancha_nombre: "Cancha Central",
              cliente_nombre: "Juan Román Riquelme",
              cliente_telefono: "+5491112345678",
              hora_inicio: "18:00",
              hora_fin: "19:30",
              duracion_minutos: 90,
              precio: 15000,
              monto_pagado: 15000,
              saldo_pendiente: 0,
              estado_pago: "pagado_total",
              metodo_pago: "mostrador",
              es_fijo: false,
              estado: "reservado",
            },
          ],
        },
        {
          fecha: "2026-09-02",
          dia_semana_numero: 3,
          dia_nombre: "Miércoles",
          total_turnos: 2,
          turnos_fijos: 0,
          monto_total: 20000,
          monto_cobrado: 10000,
          saldo_pendiente: 10000,
          estado_cobro: "pendiente",
          ocupacion_porcentaje: 70.0,
          minutos_ocupados: 120,
          minutos_disponibles: 240,
          desglose_metodos: {
            mostrador: 0,
            transferencia: 10000,
            online: 0,
            billetera: 0,
            otro: 0,
          },
          turnos: [
            {
              id: 102,
              cancha_id: 1,
              cancha_nombre: "Cancha Central",
              cliente_nombre: "Martín Palermo",
              cliente_telefono: "+5491199998888",
              hora_inicio: "20:00",
              hora_fin: "21:30",
              duracion_minutos: 90,
              precio: 20000,
              monto_pagado: 10000,
              saldo_pendiente: 10000,
              estado_pago: "senado",
              metodo_pago: "transferencia",
              es_fijo: false,
              estado: "reservado",
            },
          ],
        },
      ],
      canchas: [
        {
          cancha_id: 1,
          nombre: "Cancha Central",
          deporte: "padel",
          turnos: 4,
          total_facturado: 45000,
          total_cobrado: 35000,
          saldo_pendiente: 10000,
        },
      ],
      metodos_pago: {
        mostrador: 25000,
        transferencia: 10000,
        online: 0,
        billetera: 0,
        otro: 0,
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = url.toString();
      if (urlStr.includes("/is-admin")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ is_admin: true, is_authenticated: true }),
        });
      }
      if (urlStr.includes("/resumen-diario")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: mockResumenData }),
        });
      }
      if (urlStr.includes("/dashboard")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              complejo: {
                id: 1,
                nombre: "Club Pádel Pro",
                subdominio: "padel-pro",
                deporte_principal: "padel",
                owner: { id: 1, name: "Nico Dueño", email: "nico@club.com" },
              },
              canchas: [{ id: 1, nombre: "Cancha Central", deporte: "padel", precio_base: 10000, activa: true }],
              horarios: [],
              turnos_fijos: [],
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
      <AuthProvider>
        <ClubAdminPanel />
      </AuthProvider>
    );

    // Switch to Resumen Diario & Caja tab
    const resumenTabBtn = await screen.findByRole("button", { name: /Resumen Diario & Caja/i });
    fireEvent.click(resumenTabBtn);

    // Verify Header & KPIs
    expect(await screen.findByText(/Resumen Diario & Control de Caja/i)).toBeDefined();
    expect(screen.getAllByText("$45,000").length).toBeGreaterThanOrEqual(1); // Total Facturado
    expect(screen.getAllByText("$35,000").length).toBeGreaterThanOrEqual(1); // Cobrado
    expect(screen.getAllByText("$10,000").length).toBeGreaterThanOrEqual(1); // Saldo Pendiente

    // Verify Day Rows
    expect(screen.getByText(/Martes/i)).toBeDefined();
    expect(screen.getByText(/Miércoles/i)).toBeDefined();
    expect(screen.getAllByText(/Al Día/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pendiente/i).length).toBeGreaterThanOrEqual(1);

    // Click to expand day details
    const dayRow = screen.getByText(/Miércoles/i);
    fireEvent.click(dayRow);

    // Verify detailed turnos inside expanded accordion
    expect(await screen.findByText(/Martín Palermo/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Cobrar/i })).toBeDefined();
  });
});
