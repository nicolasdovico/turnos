import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BrandingClubPanel from "../components/BrandingClubPanel";

describe("BrandingClubPanel - Selector de Plantillas e Identidad Visual (Frontend Admin)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockBrandingResponse = {
    success: true,
    data: {
      complejo_id: 10,
      subdominio: "nico-padel",
      nombre: "Nico Padel Club",
      branding: {
        plantilla_slug: "booking_direct",
        logo_url: "https://example.com/logo.png",
        portada_url: "https://example.com/portada.jpg",
        color_primario: "#10b981",
        color_secundario: "#047857",
        color_acento: "#06b6d4",
        color_fondo: "#020617",
        eslogan: "El mejor pádel de la zona",
        descripcion_corta: "Club exclusivo con 4 canchas panorámicas.",
        redes_sociales: {
          instagram: "https://instagram.com/nicopadel",
          facebook: "https://facebook.com/nicopadel",
          tiktok: null,
          youtube: null,
          sitio_web: "https://nicopadel.com",
        },
      },
    },
  };

  const mockTemplatesResponse = {
    success: true,
    data: {
      plantilla_activa: "booking_direct",
      plantillas: [
        {
          slug: "booking_direct",
          nombre: "Booking Direct / Operativa",
          descripcion: "Enfoque 100% en la reserva rápida.",
          badge: "⚡ Más Rápida",
          caracteristicas: ["Cabecera compacta", "Grilla en primer plano"],
        },
        {
          slug: "institucional",
          nombre: "Club Tradicional / Institucional",
          descripcion: "Presencia institucional y vida de club.",
          badge: "🏛️ Club Social",
          caracteristicas: ["Hero banner con portada", "Menú a páginas"],
        },
        {
          slug: "modern_showcase",
          nombre: "Modern Showcase / Premium",
          descripcion: "Estética contemporánea de alto impacto.",
          badge: "✨ Boutique / Premium",
          caracteristicas: ["Tarjetas por cancha", "Insignias técnicas"],
        },
      ],
    },
  };

  it("renderiza correctamente las plantillas disponibles y los datos iniciales de branding", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    // Esperar a que finalice la carga
    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    // Verificar que las 3 plantillas se muestran
    expect(screen.getByText("Booking Direct / Operativa")).toBeDefined();
    expect(screen.getByText("Club Tradicional / Institucional")).toBeDefined();
    expect(screen.getByText("Modern Showcase / Premium")).toBeDefined();

    // Verificar que los datos iniciales se reflejan en los inputs
    const inputEslogan = screen.getByTestId("input-eslogan") as HTMLInputElement;
    expect(inputEslogan.value).toBe("El mejor pádel de la zona");

    const inputColorPrimario = screen.getByTestId("input-color-primario") as HTMLInputElement;
    expect(inputColorPrimario.value).toBe("#10b981");

    const inputInstagram = screen.getByTestId("input-instagram") as HTMLInputElement;
    expect(inputInstagram.value).toBe("https://instagram.com/nicopadel");
  });

  it("permite seleccionar una plantilla diferente y activa el estado de cambios sin guardar", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    // Inicialmente no debe haber banner de cambios sin guardar
    expect(screen.queryByTestId("dirty-alert-banner")).toBeNull();

    // Clic en la tarjeta de Modern Showcase
    const modernCard = screen.getByTestId("template-card-modern_showcase");
    fireEvent.click(modernCard);

    // Ahora debe aparecer el banner de dirty
    expect(screen.getByTestId("dirty-alert-banner")).toBeDefined();
    expect(screen.getByTestId("dirty-alert-banner").textContent).toContain("cambios sin guardar");
  });

  it("permite aplicar un preset de color y actualiza los inputs correspondientes", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    // Clic en preset "Azul Tenis Pro"
    const presetBtn = screen.getByText("Azul Tenis Pro");
    fireEvent.click(presetBtn);

    const inputColorPrimario = screen.getByTestId("input-color-primario") as HTMLInputElement;
    expect(inputColorPrimario.value).toBe("#2563eb");

    const inputColorSecundario = screen.getByTestId("input-color-secundario") as HTMLInputElement;
    expect(inputColorSecundario.value).toBe("#1d4ed8");

    // Verificar que se activó dirty
    expect(screen.getByTestId("dirty-alert-banner")).toBeDefined();
  });

  it("envía la petición PUT a /api/clubs/{subdomain}/branding al guardar cambios", async () => {
    let capturedBody: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding") && opts?.method === "PUT") {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Branding actualizado",
              data: { branding: capturedBody },
            }),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    const onSavedSpy = vi.fn();

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
        onSaved={onSavedSpy}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    // Modificar eslogan
    const inputEslogan = screen.getByTestId("input-eslogan");
    fireEvent.change(inputEslogan, { target: { value: "Nuevo Lema 2026" } });

    // Guardar
    const saveBtn = screen.getByTestId("btn-guardar-branding");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
      expect(capturedBody.eslogan).toBe("Nuevo Lema 2026");
      expect(screen.getByTestId("branding-success-msg")).toBeDefined();
      expect(onSavedSpy).toHaveBeenCalled();
    });
  });

  it("al hacer clic en Descartar revierte las modificaciones al estado original", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    const inputEslogan = screen.getByTestId("input-eslogan") as HTMLInputElement;
    fireEvent.change(inputEslogan, { target: { value: "Lema Modificado Temporal" } });
    expect(inputEslogan.value).toBe("Lema Modificado Temporal");
    expect(screen.getByTestId("dirty-alert-banner")).toBeDefined();

    // Clic en descartar
    const discardBtn = screen.getByTestId("btn-descartar-branding");
    fireEvent.click(discardBtn);

    // Debe volver al valor inicial
    expect(inputEslogan.value).toBe("El mejor pádel de la zona");
    expect(screen.queryByTestId("dirty-alert-banner")).toBeNull();
  });

  it("sube logotipo exitosamente y actualiza la previsualización del logo", async () => {
    let uploadFormData: FormData | null = null;

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding/upload") && opts?.method === "POST") {
        uploadFormData = opts.body;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Imagen subida exitosamente.",
              url: "/storage/tenants/nico-padel/branding/logo_nuevo.png",
              tipo: "logo",
            }),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    const file = new File(["dummy logo content"], "mi_logo.png", { type: "image/png" });
    const inputLogo = screen.getByTestId("logo-uploader-card").querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(inputLogo, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadFormData).not.toBeNull();
      expect(screen.getByText(/¡Logotipo subido y actualizado exitosamente!/i)).toBeDefined();
      const mockupLogo = screen.getByTestId("mockup-logo-preview") as HTMLImageElement;
      expect(mockupLogo.src).toContain("logo_nuevo.png");
    });
  });

  it("sube banner de portada exitosamente y actualiza la previsualización del hero mockup", async () => {
    let uploadFormData: FormData | null = null;

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding/upload") && opts?.method === "POST") {
        uploadFormData = opts.body;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Imagen subida exitosamente.",
              url: "/storage/tenants/nico-padel/branding/portada_nueva.jpg",
              tipo: "portada",
            }),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    const file = new File(["dummy portada content"], "mi_portada.jpg", { type: "image/jpeg" });
    const inputPortada = screen.getByTestId("portada-uploader-card").querySelector("input[type='file']") as HTMLInputElement;

    fireEvent.change(inputPortada, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadFormData).not.toBeNull();
      expect(screen.getByText(/¡Banner de portada subido y actualizado exitosamente!/i)).toBeDefined();
      const mockupPortada = screen.getByTestId("mockup-portada-preview");
      expect(mockupPortada).toBeDefined();
      expect(mockupPortada.style.backgroundImage).toContain("portada_nueva.jpg");
    });
  });

  it("permite quitar logotipo y portada con los botones correspondientes", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/branding/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplatesResponse),
        });
      }
      if (url.includes("/branding")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBrandingResponse),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <BrandingClubPanel
        subdomain="nico-padel"
        token="test-token-123"
        clubNombre="Nico Padel Club"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("branding-club-panel")).toBeDefined();
    });

    // Quitar logo
    const btnQuitarLogo = screen.getByTestId("btn-quitar-logo");
    fireEvent.click(btnQuitarLogo);
    expect(screen.getByText(/Logotipo removido/i)).toBeDefined();
    expect(screen.queryByTestId("btn-quitar-logo")).toBeNull();

    // Quitar portada
    const btnQuitarPortada = screen.getByTestId("btn-quitar-portada");
    fireEvent.click(btnQuitarPortada);
    expect(screen.getByText(/Banner de portada removido/i)).toBeDefined();
    expect(screen.queryByTestId("btn-quitar-portada")).toBeNull();
  });
});
