import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  buildTenantMetadata,
  buildSportsClubSchema,
  buildCmsPageMetadata,
  buildBreadcrumbSchema,
  ClubBrandingResponse,
} from "../lib/tenantSeo";
import { GET as SitemapGET } from "../app/sitemap.xml/route";
import { GET as RobotsGET } from "../app/robots.txt/route";

describe("SEO Local, Schema.org JSON-LD & Sitemap Suite (Etapa 5)", () => {
  const mockClubData: ClubBrandingResponse = {
    complejo_id: 10,
    uuid: "test-uuid-123",
    subdominio: "padel-central",
    nombre: "Pádel Central Luján",
    deporte_principal: "pádel",
    ciudad: "Luján",
    direccion: "Av. Pellegrini 1234",
    telefono: "+54 9 11 9876-5432",
    latitud: -34.5701,
    longitud: -59.1054,
    branding: {
      plantilla_slug: "modern_showcase",
      logo_url: "https://turnos-storage.s3.amazonaws.com/logos/central.png",
      portada_url: "https://turnos-storage.s3.amazonaws.com/covers/central-cover.jpg",
      color_primario: "#10b981",
      color_secundario: "#047857",
      color_acento: "#06b6d4",
      color_fondo: "#020617",
      eslogan: "El templo del mejor pádel de la zona",
      descripcion_corta: "Complejo boutique de 6 canchas panorámicas con iluminación LED profesional.",
      redes_sociales: {
        instagram: "https://instagram.com/padelcentral",
        facebook: "https://facebook.com/padelcentrallujan",
        tiktok: "https://tiktok.com/@padelcentral",
      },
    },
    plantilla: {
      slug: "modern_showcase",
      nombre: "Modern Showcase / Premium",
    },
    navegacion: {
      header: [{ id: 1, titulo: "Reglamento", slug: "reglamento" }],
      footer: [{ id: 2, titulo: "Tarifas", slug: "tarifas" }],
    },
  };

  describe("buildTenantMetadata", () => {
    it("generates comprehensive SSR metadata with OpenGraph, Twitter Cards and canonical URL", () => {
      const metadata = buildTenantMetadata("padel-central", mockClubData);

      // Title & Description
      expect(metadata.title).toEqual({
        default: "Pádel Central Luján | El templo del mejor pádel de la zona",
        template: "%s | Pádel Central Luján",
      });
      expect(metadata.description).toBe(
        "Complejo boutique de 6 canchas panorámicas con iluminación LED profesional."
      );

      // Alternates & Canonical
      expect(metadata.alternates?.canonical).toBe("https://padel-central.turnos.com");

      // Open Graph
      expect(metadata.openGraph?.title).toBe(
        "Pádel Central Luján | El templo del mejor pádel de la zona"
      );
      expect(metadata.openGraph?.siteName).toBe("Pádel Central Luján");
      expect(metadata.openGraph?.locale).toBe("es_AR");
      expect(metadata.openGraph?.type).toBe("website");
      // @ts-ignore
      expect(metadata.openGraph?.images?.[0]?.url).toBe(
        "https://turnos-storage.s3.amazonaws.com/covers/central-cover.jpg"
      );

      // Twitter
      expect(metadata.twitter?.card).toBe("summary_large_image");
      // @ts-ignore
      expect(metadata.twitter?.images?.[0]).toBe(
        "https://turnos-storage.s3.amazonaws.com/covers/central-cover.jpg"
      );
    });

    it("falls back gracefully when club branding is minimal or null", () => {
      const metadata = buildTenantMetadata("club-demo", null);

      expect(metadata.title).toEqual({
        default: "club-demo | Reserva de Canchas de Deportes",
        template: "%s | club-demo",
      });
      expect(metadata.description).toContain("Reserva tu turno de deportes online");
      expect(metadata.alternates?.canonical).toBe("https://club-demo.turnos.com");
    });
  });

  describe("buildSportsClubSchema (JSON-LD)", () => {
    it("generates Schema.org SportsClub structured data with GPS coordinates and contact details", () => {
      const schema = buildSportsClubSchema("padel-central", mockClubData);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("SportsClub");
      expect(schema.name).toBe("Pádel Central Luján");
      expect(schema.url).toBe("https://padel-central.turnos.com");
      expect(schema.telephone).toBe("+54 9 11 9876-5432");

      // PostalAddress
      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        streetAddress: "Av. Pellegrini 1234",
        addressLocality: "Luján",
        addressCountry: "AR",
      });

      // GeoCoordinates
      expect(schema.geo).toEqual({
        "@type": "GeoCoordinates",
        latitude: -34.5701,
        longitude: -59.1054,
      });
      expect(schema.hasMap).toContain("-34.5701,-59.1054");

      // Social Links (sameAs)
      expect(schema.sameAs).toContain("https://instagram.com/padelcentral");
      expect(schema.sameAs).toContain("https://facebook.com/padelcentrallujan");
      expect(schema.sameAs).toContain("https://tiktok.com/@padelcentral");
    });
  });

  describe("buildCmsPageMetadata and buildBreadcrumbSchema", () => {
    it("generates rich article metadata for CMS institutional pages", () => {
      const pagina = {
        titulo: "Reglamento y Condiciones de Uso",
        slug: "reglamento",
        meta_descripcion: "Normas de convivencia y protocolo de reservas de Pádel Central.",
      };

      const meta = buildCmsPageMetadata("padel-central", pagina, mockClubData);

      expect(meta.title).toBe("Reglamento y Condiciones de Uso | Pádel Central Luján");
      expect(meta.description).toBe(
        "Normas de convivencia y protocolo de reservas de Pádel Central."
      );
      expect(meta.alternates?.canonical).toBe(
        "https://padel-central.turnos.com/paginas/reglamento"
      );
      expect(meta.openGraph?.type).toBe("article");
    });

    it("generates BreadcrumbList structured data for Google", () => {
      const pagina = {
        titulo: "Reglamento y Condiciones",
        slug: "reglamento",
      };

      const breadcrumb = buildBreadcrumbSchema(
        "padel-central",
        pagina,
        "Pádel Central Luján"
      );

      expect(breadcrumb["@context"]).toBe("https://schema.org");
      expect(breadcrumb["@type"]).toBe("BreadcrumbList");
      expect(breadcrumb.itemListElement).toHaveLength(3);
      expect(breadcrumb.itemListElement[0].name).toBe("Pádel Central Luján");
      expect(breadcrumb.itemListElement[1].name).toBe("Páginas");
      expect(breadcrumb.itemListElement[2].name).toBe("Reglamento y Condiciones");
      expect(breadcrumb.itemListElement[2].item).toBe(
        "https://padel-central.turnos.com/paginas/reglamento"
      );
    });
  });

  describe("Route Handlers: /sitemap.xml and /robots.txt", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("generates valid XML sitemap for tenant club with published pages", async () => {
      // Mock global fetch for backend sitemap endpoint
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            subdominio: "padel-central",
            nombre: "Pádel Central Luján",
            updated_at: "2026-09-22T12:00:00Z",
            paginas: [
              { slug: "reglamento", updated_at: "2026-09-20T10:00:00Z" },
              { slug: "tarifas", updated_at: "2026-09-21T15:00:00Z" },
            ],
          },
        }),
      } as Response);

      const request = new NextRequest("http://localhost:3000/sitemap.xml?subdomain=padel-central", {
        headers: {
          host: "padel-central.turnos.com",
        },
      });

      const response = await SitemapGET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/xml");

      const xml = await response.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain("<urlset");
      expect(xml).toContain("<loc>https://padel-central.turnos.com/</loc>");
      expect(xml).toContain("<loc>https://padel-central.turnos.com/paginas/reglamento</loc>");
      expect(xml).toContain("<loc>https://padel-central.turnos.com/paginas/tarifas</loc>");
      expect(xml).toContain("<priority>1.0</priority>");
      expect(xml).toContain("<priority>0.8</priority>");
    });

    it("generates platform XML sitemap for main domain root", async () => {
      const request = new NextRequest("http://localhost:3000/sitemap.xml", {
        headers: {
          host: "turnos.com",
        },
      });

      const response = await SitemapGET(request);
      expect(response.status).toBe(200);
      const xml = await response.text();

      expect(xml).toContain("<loc>https://turnos.com/</loc>");
      expect(xml).toContain("<loc>https://turnos.com/portal</loc>");
      expect(xml).toContain("<loc>https://turnos.com/jugar</loc>");
      expect(xml).toContain("<loc>https://turnos.com/registro-club</loc>");
      expect(xml).toContain("<loc>https://turnos.com/planes</loc>");
    });

    it("generates dynamic robots.txt with disallow for panel/admin and pointer to sitemap.xml", async () => {
      const request = new NextRequest("http://localhost:3000/robots.txt", {
        headers: {
          host: "padel-central.turnos.com",
        },
      });

      const response = await RobotsGET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");

      const text = await response.text();
      expect(text).toContain("User-agent: *");
      expect(text).toContain("Allow: /");
      expect(text).toContain("Disallow: /panel/");
      expect(text).toContain("Disallow: /admin/");
      expect(text).toContain("Disallow: /api/");
      expect(text).toContain("Sitemap: https://padel-central.turnos.com/sitemap.xml");
    });
  });
});
