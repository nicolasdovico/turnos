import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TenantPage from "../app/tenants/[subdomain]/page";
import ClubHeader from "../components/templates/ClubHeader";
import ClubFooter from "../components/templates/ClubFooter";
import BookingDirectTemplate from "../components/templates/BookingDirectTemplate";
import InstitucionalTemplate from "../components/templates/InstitucionalTemplate";
import ModernShowcaseTemplate from "../components/templates/ModernShowcaseTemplate";

let mockParams = { subdomain: "la-villa" };

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock de GrillaHoraria utilizando ruta relativa para intercepción adecuada de Vitest
vi.mock("../components/GrillaHoraria", () => ({
  default: ({ canchaNombre }: { canchaNombre: string }) => (
    <div data-testid="mock-grilla-horaria">Grilla para {canchaNombre}</div>
  ),
  formatWhatsAppNumber: (tel?: string | null) => (tel ? tel.replace(/\D/g, "") : ""),
}));

describe("Módulo F - Portal Público Whitelabel y Renderizador de las 3 Plantillas", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockParams = { subdomain: "la-villa" };
    vi.restoreAllMocks();
  });

  const mockComplejo = {
    id: 10,
    uuid: "comp-uuid-123",
    nombre: "Padel Club La Villa",
    subdominio: "la-villa",
    deporte_principal: "pádel",
    telefono: "+5491112345678",
    ciudad: "Buenos Aires",
    direccion: "Av. Libertador 5500",
    latitud: -34.6037,
    longitud: -58.3816,
    estado: "activo",
    tipo_cobro_reserva: "seña",
    porcentaje_sena: 50,
    tipo_negocio: { id: 1, nombre: "Club", slug: "club" },
  };

  const mockCanchas = [
    {
      id: 101,
      nombre: "Cancha Central WPT",
      deporte: "pádel",
      superficie: "sintetico_profesional",
      precio_base: 12000,
      techada: true,
      iluminacion: true,
      tipo_pared: "cristal_panoramico",
      camara_grabacion: true,
      climatizada: true,
      duracion_minutos: 90,
      estado: "activo",
    },
    {
      id: 102,
      nombre: "Cancha 2 Panorámica",
      deporte: "pádel",
      superficie: "sintetico_estandar",
      precio_base: 10000,
      techada: false,
      iluminacion: true,
      tipo_pared: "cristal",
      camara_grabacion: false,
      climatizada: false,
      duracion_minutos: 90,
      estado: "activo",
    },
  ];

  const mockBrandingBooking = {
    plantilla_slug: "booking_direct",
    logo_url: "https://example.com/logo-lavilla.png",
    portada_url: "https://example.com/portada-lavilla.jpg",
    color_primario: "#10b981",
    color_secundario: "#047857",
    color_acento: "#06b6d4",
    color_fondo: "#020617",
    eslogan: "El mejor pádel de la zona norte",
    descripcion_corta: "Complejo boutique de 4 canchas panorámicas.",
    redes_sociales: {
      instagram: "https://instagram.com/padellavilla",
      facebook: "https://facebook.com/padellavilla",
      tiktok: null,
      youtube: "https://youtube.com/@padellavilla",
      sitio_web: "https://padellavilla.com",
    },
  };

  const mockNavegacion = {
    header: [
      { id: 1, titulo: "Reglamento", slug: "reglamento-interno", orden: 1 },
      { id: 2, titulo: "Tarifas", slug: "tarifas", orden: 2 },
    ],
    footer: [
      { id: 1, titulo: "Reglamento", slug: "reglamento-interno", orden: 1 },
      { id: 3, titulo: "Quiénes Somos", slug: "quienes-somos", orden: 3 },
    ],
  };

  it("ClubHeader renderiza logotipo, enlaces de navegación dinámicos, WhatsApp y barra de admin", () => {
    const handleQr = vi.fn();

    render(
      <ClubHeader
        subdomain="la-villa"
        clubNombre="Padel Club La Villa"
        deportePrincipal="pádel"
        logoUrl="https://example.com/logo-lavilla.png"
        headerLinks={mockNavegacion.header}
        telefono="+5491112345678"
        isAdmin={true}
        distanciaUsuario="A 1.2 km de vos"
        onOpenQrModal={handleQr}
      />
    );

    // Verificar logotipo
    expect(screen.getByTestId("header-club-logo")).toBeDefined();
    expect(screen.getAllByText("Padel Club La Villa").length).toBeGreaterThanOrEqual(1);

    // Verificar enlaces dinámicos de cabecera
    expect(screen.getByTestId("nav-header-link-reglamento-interno")).toBeDefined();
    expect(screen.getByTestId("nav-header-link-tarifas")).toBeDefined();

    // Verificar barra de administrador
    expect(screen.getByText(/Estás visualizando la vista pública como dueño/i)).toBeDefined();

    // Verificar distancia del usuario
    expect(screen.getByTestId("header-user-distance").textContent).toContain("A 1.2 km de vos");

    // Verificar botón WhatsApp
    const qrBtn = screen.getByTestId("header-qr-button");
    fireEvent.click(qrBtn);
    expect(handleQr).toHaveBeenCalled();
  });

  it("ClubFooter renderiza enlaces institucionales de footer, redes sociales y contacto", () => {
    render(
      <ClubFooter
        subdomain="la-villa"
        clubNombre="Padel Club La Villa"
        deportePrincipal="pádel"
        footerLinks={mockNavegacion.footer}
        redesSociales={mockBrandingBooking.redes_sociales}
        telefono="+5491112345678"
        direccion="Av. Libertador 5500"
        ciudad="Buenos Aires"
        latitud={-34.6037}
        longitud={-58.3816}
      />
    );

    // Enlaces de footer
    expect(screen.getByTestId("nav-footer-link-reglamento-interno")).toBeDefined();
    expect(screen.getByTestId("nav-footer-link-quienes-somos")).toBeDefined();

    // Redes sociales
    expect(screen.getByTestId("footer-social-instagram")).toBeDefined();
    expect(screen.getByTestId("footer-social-facebook")).toBeDefined();
    expect(screen.getByTestId("footer-social-youtube")).toBeDefined();
    expect(screen.getByTestId("footer-social-youtube").getAttribute("href")).toBe(
      "https://youtube.com/@padellavilla"
    );
    expect(screen.getByTestId("footer-social-web")).toBeDefined();

    // Contacto y ubicación
    expect(screen.getByText("Av. Libertador 5500")).toBeDefined();
    expect(screen.getByText("Buenos Aires")).toBeDefined();
    expect(screen.getByTestId("footer-como-llegar")).toBeDefined();
  });

  it("ClubFooter normaliza URLs de redes sociales sin protocolo (ej: @canal o youtube.com)", () => {
    render(
      <ClubFooter
        subdomain="la-villa"
        clubNombre="Padel Club La Villa"
        redesSociales={{
          instagram: "@padellavilla",
          facebook: "facebook.com/padellavilla",
          tiktok: "padeltiktok",
          youtube: "@padellavilla_tv",
          sitio_web: "www.padellavilla.com",
        }}
      />
    );

    expect(screen.getByTestId("footer-social-instagram").getAttribute("href")).toBe(
      "https://instagram.com/padellavilla"
    );
    expect(screen.getByTestId("footer-social-facebook").getAttribute("href")).toBe(
      "https://facebook.com/padellavilla"
    );
    expect(screen.getByTestId("footer-social-tiktok").getAttribute("href")).toBe(
      "https://tiktok.com/@padeltiktok"
    );
    expect(screen.getByTestId("footer-social-youtube").getAttribute("href")).toBe(
      "https://youtube.com/@padellavilla_tv"
    );
    expect(screen.getByTestId("footer-social-web").getAttribute("href")).toBe(
      "https://www.padellavilla.com"
    );
  });

  it("Plantilla 1: BookingDirectTemplate renderiza cabecera operativa y grilla inmediata", () => {
    const handleSelect = vi.fn();

    render(
      <BookingDirectTemplate
        subdomain="la-villa"
        complejo={mockComplejo}
        branding={mockBrandingBooking}
        canchas={mockCanchas}
        selectedCanchaId={101}
        onSelectCanchaId={handleSelect}
        selectedCancha={mockCanchas[0]}
        tipoNegocioLabel="Club"
        distanciaUsuario="A 1 km de vos"
        cleanWaNumber="5491112345678"
        isAdmin={false}
        user={null}
        onOpenQrModal={vi.fn()}
      />
    );

    expect(screen.getByTestId("template-booking-direct")).toBeDefined();
    expect(screen.getByTestId("booking-direct-portada")).toBeDefined();
    expect(screen.getByTestId("booking-direct-logo")).toBeDefined();
    expect(screen.getByText("Reserva Directa Inmediata")).toBeDefined();
    expect(screen.getByTestId("btn-select-cancha-101")).toBeDefined();
    expect(screen.getByTestId("btn-select-cancha-102")).toBeDefined();

    // Grilla en primer plano
    expect(screen.getByTestId("mock-grilla-horaria")).toBeDefined();

    // Reseña Corta / Sobre Nosotros
    expect(screen.getByTestId("booking-direct-descripcion-corta").textContent).toContain(
      mockBrandingBooking.descripcion_corta
    );

    // Cambiar de cancha
    fireEvent.click(screen.getByTestId("btn-select-cancha-102"));
    expect(handleSelect).toHaveBeenCalledWith(102);
  });

  it("Plantilla 2: InstitucionalTemplate renderiza Hero banner fotográfico, eslogan y pilares del club", () => {
    const mockBrandingInstitucional = {
      ...mockBrandingBooking,
      plantilla_slug: "institucional",
    };

    render(
      <InstitucionalTemplate
        subdomain="la-villa"
        complejo={mockComplejo}
        branding={mockBrandingInstitucional}
        canchas={mockCanchas}
        selectedCanchaId={101}
        onSelectCanchaId={vi.fn()}
        selectedCancha={mockCanchas[0]}
        tipoNegocioLabel="Club"
        distanciaUsuario={null}
        cleanWaNumber="5491112345678"
        isAdmin={false}
        user={null}
        onOpenQrModal={vi.fn()}
      />
    );

    expect(screen.getByTestId("template-institucional")).toBeDefined();
    expect(screen.getByTestId("institucional-portada")).toBeDefined();
    expect(screen.getByTestId("institucional-logo")).toBeDefined();
    expect(screen.getByText(`"${mockBrandingBooking.eslogan}"`)).toBeDefined();
    expect(screen.getByText(mockBrandingBooking.descripcion_corta)).toBeDefined();

    // Pilares institucionales
    expect(screen.getByText("Instalaciones Pro")).toBeDefined();
    expect(screen.getByText("Vestuarios & Confort")).toBeDefined();
    expect(screen.getByText("Buffet & Resto Bar")).toBeDefined();
    expect(screen.getByText("Predio Seguro")).toBeDefined();

    // Botón Hero
    expect(screen.getByTestId("btn-hero-reservar")).toBeDefined();
  });

  it("Plantilla 3: ModernShowcaseTemplate renderiza fichas técnicas detalladas e insignias", () => {
    const mockBrandingModern = {
      ...mockBrandingBooking,
      plantilla_slug: "modern_showcase",
    };

    render(
      <ModernShowcaseTemplate
        subdomain="la-villa"
        complejo={mockComplejo}
        branding={mockBrandingModern}
        canchas={mockCanchas}
        selectedCanchaId={101}
        onSelectCanchaId={vi.fn()}
        selectedCancha={mockCanchas[0]}
        tipoNegocioLabel="Club"
        distanciaUsuario={null}
        cleanWaNumber="5491112345678"
        isAdmin={false}
        user={null}
        onOpenQrModal={vi.fn()}
      />
    );

    expect(screen.getByTestId("template-modern-showcase")).toBeDefined();
    expect(screen.getByTestId("modern-showcase-portada")).toBeDefined();
    expect(screen.getByTestId("modern-showcase-logo")).toBeDefined();
    expect(screen.getByText("Showcase Deportivo Premium")).toBeDefined();
    expect(screen.getByText("Pistas & Ficha Técnica")).toBeDefined();

    // Reseña Corta / Sobre Nosotros
    expect(screen.getByTestId("modern-showcase-descripcion-corta").textContent).toContain(
      mockBrandingBooking.descripcion_corta
    );

    // Badges técnicos
    expect(screen.getAllByText("Iluminación LED").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cámara HD")).toBeDefined();
    expect(screen.getByText("Climatizada")).toBeDefined();
  });

  it("TenantPage orquestador carga datos de branding y renderiza la plantilla activa del club", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/dashboard")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                complejo: mockComplejo,
                canchas: mockCanchas,
              },
            }),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                branding: { ...mockBrandingBooking, plantilla_slug: "institucional" },
                navegacion: mockNavegacion,
              },
            }),
        });
      }
      if (url.includes("/is-admin")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ is_admin: false }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<TenantPage params={{ subdomain: "la-villa" }} />);

    await waitFor(() => {
      expect(screen.getByTestId("tenant-public-portal")).toBeDefined();
    });

    // Como branding devolvió 'institucional', debe renderizar InstitucionalTemplate
    expect(screen.getByTestId("template-institucional")).toBeDefined();
    expect(screen.getByText("Instalaciones Pro")).toBeDefined();
  });
});
