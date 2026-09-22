import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider } from "../context/AuthContext";
import ClubAdminPanel from "../app/tenants/[subdomain]/panel/page";

let mockParams: Record<string, string> = { subdomain: "nico-padel" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => mockParams,
}));

describe("Catálogo Dinámico de Deportes, Superficies y Atributos Propios en Club Panel", () => {
  beforeEach(() => {
    localStorage.clear();
    mockParams = { subdomain: "nico-padel" };
    vi.restoreAllMocks();
  });

  const mockCatalogo = {
    complejo: {
      id: 10,
      nombre: "Nico Padel & Tenis Club",
      subdominio: "nico-padel",
      deporte_principal: "padel",
      tipo_negocio: { id: 1, nombre: "Club Deportivo", slug: "club" },
      estado: "activo",
    },
    plan: {
      id: 2,
      nombre: "Plata",
      slug: "plata",
      canchas_incluidas: 4,
      precio_cancha_adicional: 8,
      precio_mensual: 49,
      modulos: [{ id: 1, nombre: "Reservas", slug: "reservas" }],
    },
    canchas: [
      {
        id: 101,
        nombre: "Pista Central Panorámica",
        deporte: "padel",
        deporte_id: 1,
        superficie: "sintetico_wpt",
        superficie_id: 1,
        precio_base: 12000,
        techada: true,
        iluminacion: true,
        camara_grabacion: true,
        marcador_digital: true,
        climatizada: false,
        estado: "activo",
        equipamientos: [
          { id: 1, nombre: "Iluminación LED Profesional", slug: "iluminacion_led", esta_activo: true },
          { id: 10, nombre: "Tribuna VIP Exclusiva", slug: "tribuna-vip-10", icono: "🏟️", es_propio: true, esta_activo: true },
        ],
      },
    ],
    stats: { total_canchas: 1, total_turnos: 25, modulos_count: 5 },
    deportes_catalogo: [
      {
        id: 1,
        nombre: "Pádel",
        slug: "padel",
        icono: "🎾",
        tiene_paredes: true,
        duracion_default_minutos: 90,
        formatos: [
          { id: "dobles", label: "Dobles (2 vs 2)" },
          { id: "single", label: "Single (1 vs 1)" },
        ],
        paredes: [
          { id: "cristal_panoramico", label: "Cristal Panorámico WPT" },
        ],
        superficies: [
          { id: "sintetico_wpt", superficie_id: 1, nombre: "Césped Sintético Texturado", label: "Césped Sintético Texturado", slug: "sintetico_wpt" },
        ],
      },
      {
        id: 6,
        nombre: "Pickleball",
        slug: "pickleball",
        icono: "🏓",
        tiene_paredes: false,
        duracion_default_minutos: 60,
        formatos: [
          { id: "dobles", label: "Dobles Oficial" },
          { id: "single", label: "Individual Single" },
        ],
        paredes: [],
        superficies: [
          { id: "resina_acrilica", superficie_id: 20, nombre: "Resina Acrílica Pro Court", label: "Resina Acrílica Pro Court", slug: "resina_acrilica" },
          { id: "cemento", superficie_id: 21, nombre: "Cemento Pulido Exterior", label: "Cemento Pulido Exterior", slug: "cemento" },
        ],
      },
    ],
    equipamientos_disponibles: [
      {
        id: 1,
        nombre: "Iluminación LED Profesional",
        slug: "iluminacion_led",
        categoria: "iluminacion",
        icono: "💡",
        descripcion: "Focos LED de alta potencia",
        es_propio: false,
        esta_activo: true,
      },
      {
        id: 2,
        nombre: "Techada / Cubierta (Indoor)",
        slug: "techada",
        categoria: "estructura",
        icono: "🏠",
        descripcion: "Pista cubierta contra lluvia",
        es_propio: false,
        esta_activo: true,
      },
      {
        id: 10,
        nombre: "Tribuna VIP Exclusiva",
        slug: "tribuna-vip-10",
        categoria: "estructura",
        icono: "🏟️",
        descripcion: "Capacidad para 50 espectadores",
        es_propio: true,
        esta_activo: true,
      },
    ],
  };

  it("renderiza badges de atributos propios en las canchas y abre modal con deportes dinámicos", async () => {
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
            data: mockCatalogo,
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

    // Verifica que el badge del atributo propio aparece en la tarjeta de cancha
    expect(await screen.findByText(/Pista Central Panorámica/i)).toBeDefined();
    expect(screen.getByText(/Tribuna VIP Exclusiva/i)).toBeDefined();

    // Abrir modal de nueva cancha
    const addBtn = screen.getByText(/\+ Nueva Cancha/i);
    fireEvent.click(addBtn);

    expect(await screen.findByText("➕ Nueva Cancha")).toBeDefined();

    // Verificar que los deportes dinámicos (Pádel y Pickleball) están en las opciones
    expect(screen.getByRole("option", { name: /Pickleball/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /Pádel/i })).toBeDefined();

    // Seleccionar Pickleball
    const deporteSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(deporteSelect, { target: { value: "pickleball" } });

    // Verificar que las superficies dinámicas de Pickleball están presentes
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Resina Acrílica Pro Court/i })).toBeDefined();
    });

    // Verificar que en la Sección 4 se muestra el atributo propio 'Tribuna VIP Exclusiva' con badge Propio
    expect(screen.getAllByText(/Tribuna VIP Exclusiva/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Propio")).toBeDefined();
  });

  it("permite guardar una nueva cancha enviando deporte_id, superficie_id y equipamientos_ids", async () => {
    let capturedPayload: any = null;

    vi.spyOn(global, "fetch").mockImplementation(async (url: any, options: any) => {
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
            data: mockCatalogo,
          }),
        } as any;
      }
      if (urlStr.endsWith("/canchas") && options?.method === "POST") {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Cancha creada exitosamente",
            data: { id: 102, ...capturedPayload },
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

    await screen.findByText(/Pista Central Panorámica/i);
    fireEvent.click(screen.getByText(/\+ Nueva Cancha/i));

    await screen.findByText("➕ Nueva Cancha");

    // Seleccionar Pickleball
    const deporteSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(deporteSelect, { target: { value: "pickleball" } });

    // Seleccionar el atributo adicional 'Tribuna VIP Exclusiva'
    const tribunaCheckbox = screen.getByLabelText(/Tribuna VIP Exclusiva/i);
    fireEvent.click(tribunaCheckbox);

    // Enviar el formulario
    const submitBtn = screen.getByRole("button", { name: /Crear Cancha/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(capturedPayload).not.toBeNull();
    });

    expect(capturedPayload.deporte).toBe("pickleball");
    expect(capturedPayload.deporte_id).toBe(6);
    expect(capturedPayload.superficie_id).toBe(20);
    expect(capturedPayload.equipamientos_ids).toContain(10);
  });

  it("permite agregar un nuevo atributo propio del club inline y queda disponible en la cancha", async () => {
    let customEquipCreated = false;

    vi.spyOn(global, "fetch").mockImplementation(async (url: any, options: any) => {
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
            data: mockCatalogo,
          }),
        } as any;
      }
      if (urlStr.includes("/equipamientos") && options?.method === "POST") {
        customEquipCreated = true;
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            message: "Equipamiento personalizado creado exitosamente.",
            data: {
              id: 99,
              nombre: body.nombre,
              slug: "cesped-azul-wpt-10",
              categoria: body.categoria || "estructura",
              icono: body.icono || "✨",
              descripcion: body.descripcion,
              es_propio: true,
              esta_activo: true,
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

    await screen.findByText(/Pista Central Panorámica/i);
    fireEvent.click(screen.getByText(/\+ Nueva Cancha/i));
    await screen.findByText("➕ Nueva Cancha");

    // Click en botón 'Agregar Atributo Propio del Club'
    const addPropioBtn = screen.getByRole("button", { name: /Agregar Atributo Propio del Club/i });
    fireEvent.click(addPropioBtn);

    // Verificar que se abrió el sub-modal
    expect(await screen.findByText(/Nuevo Atributo para mi Club/i)).toBeDefined();

    // Rellenar formulario
    const nombreInput = screen.getByPlaceholderText(/Ej\. Césped Azul WPT Oficial/i);
    fireEvent.change(nombreInput, { target: { value: "Césped Azul Super WPT" } });

    // Guardar nuevo atributo
    const guardarBtn = screen.getByRole("button", { name: /Crear Atributo/i });
    fireEvent.click(guardarBtn);

    await waitFor(() => {
      expect(customEquipCreated).toBe(true);
      expect(screen.getByText(/Césped Azul Super WPT/i)).toBeDefined();
    });
  });
});
