import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GestionPaginasCMS, { slugify, STARTER_TEMPLATES } from "../components/GestionPaginasCMS";

describe("GestionPaginasCMS - Gestor y Editor de Páginas Institucionales (Panel CMS)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockPaginas = [
    {
      id: 1,
      complejo_id: 10,
      titulo: "Reglamento General",
      slug: "reglamento-general",
      contenido_html: "<h2>Reglamento</h2><p>Normas del club.</p>",
      esta_publicada: true,
      orden: 1,
      mostrar_en_header: true,
      mostrar_en_footer: true,
      meta_descripcion: "Conoce el reglamento general y las normas de vestimenta de nuestro complejo.",
      created_at: "2026-09-22T10:00:00Z",
    },
    {
      id: 2,
      complejo_id: 10,
      titulo: "Borrador Interno",
      slug: "borrador-interno",
      contenido_html: "<p>Contenido aún en revisión.</p>",
      esta_publicada: false,
      orden: 2,
      mostrar_en_header: false,
      mostrar_en_footer: false,
      meta_descripcion: null,
      created_at: "2026-09-22T11:00:00Z",
    },
  ];

  it("función slugify genera URLs limpias y normalizadas", () => {
    expect(slugify("Reglamento General del Club")).toBe("reglamento-general-del-club");
    expect(slugify("¿Quiénes Somos? Sección #1")).toBe("quienes-somos-seccion-1");
    expect(slugify("Torneo de Pádel & Tenis 2026!")).toBe("torneo-de-padel-tenis-2026");
  });

  it("renderiza correctamente el estado vacío y las plantillas rápidas de inicio cuando no hay páginas", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    // Esperar que termine la carga y aparezca el estado vacío
    await screen.findByText("Tu club aún no tiene páginas institucionales");

    // Validar que se ofrecen las 3 plantillas rápidas
    expect(screen.getByText("Reglamento Interno y Normas de Convivencia")).toBeDefined();
    expect(screen.getByText("Quiénes Somos e Instalaciones")).toBeDefined();
    expect(screen.getByText("Tarifas, Abonos y Membresías")).toBeDefined();

    // Al hacer click en "Usar Plantilla", se debe abrir el modal con los datos precompletados
    const btnStarter = screen.getByTestId("btn-starter-template-0");
    fireEvent.click(btnStarter);

    expect(screen.getByTestId("modal-editor-pagina")).toBeDefined();
    const inputTitulo = screen.getByTestId("input-titulo-pagina") as HTMLInputElement;
    const inputSlug = screen.getByTestId("input-slug-pagina") as HTMLInputElement;

    expect(inputTitulo.value).toBe(STARTER_TEMPLATES[0].titulo);
    expect(inputSlug.value).toBe(STARTER_TEMPLATES[0].slug);
  });

  it("renderiza la lista de páginas existentes, badges de estado y métricas", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPaginas }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("tabla-paginas")).toBeDefined();
    });

    // Verificar filas
    expect(screen.getByTestId("pagina-fila-1")).toBeDefined();
    expect(screen.getByTestId("pagina-fila-2")).toBeDefined();

    // Títulos presentes
    expect(screen.getByText("Reglamento General")).toBeDefined();
    expect(screen.getByText("Borrador Interno")).toBeDefined();

    // Badges presentes
    expect(screen.getByText("Publicada")).toBeDefined();
    expect(screen.getByText("Borrador")).toBeDefined();
    expect(screen.getByText("📌 Header")).toBeDefined();
    expect(screen.getByText("🦶 Footer")).toBeDefined();
    expect(screen.getByText("Solo enlace directo")).toBeDefined();
  });

  it("abre el modal de creación y autogenera el slug a partir del título", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPaginas }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-nueva-pagina")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-nueva-pagina"));

    expect(screen.getByTestId("modal-editor-pagina")).toBeDefined();

    const inputTitulo = screen.getByTestId("input-titulo-pagina") as HTMLInputElement;
    const inputSlug = screen.getByTestId("input-slug-pagina") as HTMLInputElement;

    fireEvent.change(inputTitulo, { target: { value: "Protocolo de Sanitización & Higiene" } });

    expect(inputSlug.value).toBe("protocolo-de-sanitizacion-higiene");
  });

  it("permite alternar entre la pestaña de redacción y la vista previa en vivo renderizando el HTML", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPaginas }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-nueva-pagina")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-nueva-pagina"));

    const textarea = screen.getByTestId("textarea-contenido-pagina") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: {
        value: "<h2>Reglas Especiales</h2><h3>Instalaciones</h3><ul><li>Punto de <strong>oro</strong></li></ul><p>Punto de oro en 40 iguales.</p>",
      },
    });

    // Alternar a Vista Previa
    const tabPreview = screen.getByTestId("tab-preview");
    fireEvent.click(tabPreview);

    const previewContainer = screen.getByTestId("vista-previa-contenido");
    expect(previewContainer.innerHTML).toContain("<h2>Reglas Especiales</h2>");
    expect(previewContainer.innerHTML).toContain("<h3>Instalaciones</h3>");
    expect(previewContainer.innerHTML).toContain("<ul><li>Punto de <strong>oro</strong></li></ul>");
    expect(previewContainer.querySelector(".prose")).not.toBeNull();
    expect(previewContainer.innerHTML).toContain("Punto de oro en 40 iguales.");

    // Volver a Editor
    const tabEditor = screen.getByTestId("tab-editor");
    fireEvent.click(tabEditor);
    expect(screen.getByTestId("textarea-contenido-pagina")).toBeDefined();
  });

  it("permite guardar una nueva página enviando la petición POST con los datos de navegación y SEO", async () => {
    let requestPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/clubs/padel-norte/paginas") && options?.method === "POST") {
        requestPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Página creada exitosamente.",
              data: { id: 3, ...requestPayload },
            }),
        });
      }
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPaginas }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-nueva-pagina")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-nueva-pagina"));

    fireEvent.change(screen.getByTestId("input-titulo-pagina"), {
      target: { value: "Escuela de Menores" },
    });
    fireEvent.change(screen.getByTestId("textarea-contenido-pagina"), {
      target: { value: "<p>Clases formativas para niños de 6 a 16 años.</p>" },
    });

    // Switches
    fireEvent.click(screen.getByTestId("switch-header"));
    fireEvent.change(screen.getByTestId("input-orden"), { target: { value: "4" } });
    fireEvent.change(screen.getByTestId("textarea-meta-descripcion"), {
      target: { value: "Aprende pádel con los mejores profesores en nuestra escuela de menores." },
    });

    // Verificar Google search preview
    const googlePreview = screen.getByTestId("google-search-preview");
    expect(googlePreview.textContent).toContain("Escuela de Menores | Club Padel Norte");
    expect(googlePreview.textContent).toContain("Aprende pádel con los mejores profesores");

    // Guardar
    fireEvent.click(screen.getByTestId("btn-guardar-pagina"));

    await waitFor(() => {
      expect(requestPayload).not.toBeNull();
    });

    expect(requestPayload.titulo).toBe("Escuela de Menores");
    expect(requestPayload.slug).toBe("escuela-de-menores");
    expect(requestPayload.mostrar_en_header).toBe(true);
    expect(requestPayload.orden).toBe(4);
    expect(requestPayload.meta_descripcion).toContain("Aprende pádel con los mejores profesores");
  });

  it("permite editar una página y eliminarla con confirmación", async () => {
    let putCalled = false;
    let deleteCalled = false;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/clubs/padel-norte/paginas/1") && options?.method === "PUT") {
        putCalled = true;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Página actualizada exitosamente.",
              data: { ...mockPaginas[0], titulo: "Reglamento Editado" },
            }),
        });
      }
      if (url.includes("/api/clubs/padel-norte/paginas/1") && options?.method === "DELETE") {
        deleteCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPaginas }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-editar-pagina-1")).toBeDefined();
    });

    // 1. Abrir edición
    fireEvent.click(screen.getByTestId("btn-editar-pagina-1"));
    expect(screen.getByTestId("modal-editor-pagina")).toBeDefined();
    expect((screen.getByTestId("input-titulo-pagina") as HTMLInputElement).value).toBe("Reglamento General");

    // Modificar título y guardar
    fireEvent.change(screen.getByTestId("input-titulo-pagina"), {
      target: { value: "Reglamento Editado" },
    });
    fireEvent.click(screen.getByTestId("btn-guardar-pagina"));

    await waitFor(() => {
      expect(putCalled).toBe(true);
    });

    // 2. Eliminar página
    fireEvent.click(screen.getByTestId("btn-eliminar-pagina-1"));
    expect(screen.getByText("¿Eliminar página institucional?")).toBeDefined();

    fireEvent.click(screen.getByTestId("btn-confirmar-eliminar"));

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it("vincula automáticamente con la página existente cuando se aplica una plantilla cuyo slug ya existe (realizando PUT)", async () => {
    let capturedMethod = "";
    let capturedUrl = "";

    const paginasConQuienesSomos = [
      ...mockPaginas,
      {
        id: 7,
        complejo_id: 10,
        titulo: "Antiguo Quiénes Somos",
        slug: "quienes-somos",
        contenido_html: "<p>Texto corto viejo</p>",
        esta_publicada: true,
        orden: 3,
        mostrar_en_header: true,
        mostrar_en_footer: true,
        meta_descripcion: "Texto viejo",
        created_at: "2026-09-22T10:00:00Z",
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/clubs/padel-norte/paginas/7") && options?.method === "PUT") {
        capturedMethod = options.method;
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Página actualizada exitosamente.",
              data: { id: 7, ...JSON.parse(options.body) },
            }),
        });
      }
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: paginasConQuienesSomos }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-nueva-pagina")).toBeDefined();
    });

    // Abrir modal de nueva página
    fireEvent.click(screen.getByTestId("btn-nueva-pagina"));
    expect(screen.getByTestId("modal-editor-pagina")).toBeDefined();

    // En el modal, hacer click en la plantilla rápida "Quiénes Somos e Instalaciones" (índice 1)
    const btnTemplate = screen.getByTestId("btn-modal-starter-1");
    fireEvent.click(btnTemplate);

    const inputTitulo = screen.getByTestId("input-titulo-pagina") as HTMLInputElement;
    const inputSlug = screen.getByTestId("input-slug-pagina") as HTMLInputElement;

    expect(inputTitulo.value).toBe(STARTER_TEMPLATES[1].titulo);
    expect(inputSlug.value).toBe(STARTER_TEMPLATES[1].slug);

    // Guardar
    fireEvent.click(screen.getByTestId("btn-guardar-pagina"));

    await waitFor(() => {
      expect(capturedMethod).toBe("PUT");
    });
    expect(capturedUrl).toContain("/api/clubs/padel-norte/paginas/7");
  });

  it("bloquea el guardado en el cliente mostrando un mensaje claro si se ingresa un slug duplicado", async () => {
    let fetchCalled = false;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" || options?.method === "PUT") {
        fetchCalled = true;
      }
      if (url.includes("/api/clubs/padel-norte/paginas")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockPaginas }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <GestionPaginasCMS
        subdomain="padel-norte"
        token="token-admin"
        clubNombre="Club Padel Norte"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("btn-nueva-pagina")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("btn-nueva-pagina"));

    // Intentar crear una página con el slug "reglamento-general" que ya existe en mockPaginas (id 1)
    fireEvent.change(screen.getByTestId("input-titulo-pagina"), {
      target: { value: "Nuevo Reglamento Duplicado" },
    });
    fireEvent.change(screen.getByTestId("input-slug-pagina"), {
      target: { value: "reglamento-general" },
    });
    fireEvent.change(screen.getByTestId("textarea-contenido-pagina"), {
      target: { value: "<p>Contenido de prueba</p>" },
    });

    fireEvent.click(screen.getByTestId("btn-guardar-pagina"));

    await screen.findByText(/Ya existe una página con el enlace \(slug\) "reglamento-general"/);
    expect(fetchCalled).toBe(false);
  });
});

