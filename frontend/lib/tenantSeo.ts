import type { Metadata } from "next";

export interface ClubBrandingResponse {
  complejo_id?: number;
  uuid?: string;
  subdominio: string;
  nombre: string;
  deporte_principal?: string;
  ciudad?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  branding?: {
    plantilla_slug?: string;
    logo_url?: string | null;
    portada_url?: string | null;
    color_primario?: string;
    color_secundario?: string;
    color_acento?: string;
    color_fondo?: string;
    eslogan?: string | null;
    descripcion_corta?: string | null;
    redes_sociales?: {
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      youtube?: string;
      whatsapp?: string;
      web?: string;
    };
  };
  plantilla?: {
    slug: string;
    nombre: string;
  };
  navegacion?: {
    header: Array<{ id: number; titulo: string; slug: string }>;
    footer: Array<{ id: number; titulo: string; slug: string }>;
  };
}

export async function fetchClubData(subdomain: string): Promise<ClubBrandingResponse | null> {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    "http://backend:80/api";

  try {
    const res = await fetch(`${apiUrl}/clubs/${subdomain}/branding`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600, tags: [`tenant-${subdomain}`] },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export function buildTenantMetadata(subdomain: string, clubData: ClubBrandingResponse | null): Metadata {
  const clubName = clubData?.nombre || subdomain;
  const deporte = clubData?.deporte_principal || "deportes";
  const ciudad = clubData?.ciudad ? ` en ${clubData.ciudad}` : "";
  const eslogan = clubData?.branding?.eslogan;
  const descCorta = clubData?.branding?.descripcion_corta;

  const title = eslogan
    ? `${clubName} | ${eslogan}`
    : `${clubName} | Reserva de Canchas de ${deporte.charAt(0).toUpperCase() + deporte.slice(1)}${ciudad}`;

  const description =
    descCorta ||
    eslogan ||
    `Reserva tu turno de ${deporte} online en ${clubName}${ciudad}. Consulta disponibilidad en vivo y asegura tu cancha al instante.`;

  const baseUrl = `https://${subdomain}.turnos.com`;
  const shareImage = clubData?.branding?.portada_url || clubData?.branding?.logo_url || "/icons/icon-512x512.png";

  return {
    title: {
      default: title,
      template: `%s | ${clubName}`,
    },
    description,
    keywords: [
      clubName,
      deporte,
      "reserva de turnos",
      "canchas",
      clubData?.ciudad || "",
      "alquiler de canchas",
      "turnos online",
    ].filter(Boolean),
    authors: [{ name: clubName }],
    creator: clubName,
    publisher: "Turnos SaaS",
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: clubName,
      images: [
        {
          url: shareImage,
          width: 1200,
          height: 630,
          alt: `${clubName} - Reserva de Canchas`,
        },
      ],
      locale: "es_AR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
      creator: "@turnos",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export function buildSportsClubSchema(subdomain: string, clubData: ClubBrandingResponse | null) {
  const clubName = clubData?.nombre || subdomain;
  const deporte = clubData?.deporte_principal || "deportes";
  const baseUrl = `https://${subdomain}.turnos.com`;
  const logo = clubData?.branding?.logo_url;
  const image = clubData?.branding?.portada_url || logo;

  const socialLinks = Object.values(clubData?.branding?.redes_sociales || {}).filter(
    (url): url is string => Boolean(url && typeof url === "string" && url.startsWith("http"))
  );

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "SportsClub",
    "@id": `${baseUrl}/#sportsclub`,
    name: clubName,
    url: baseUrl,
    description:
      clubData?.branding?.descripcion_corta ||
      clubData?.branding?.eslogan ||
      `Complejo deportivo de ${deporte} en ${clubData?.ciudad || "Argentina"}.`,
    priceRange: "$$",
  };

  if (image) {
    schema.image = image;
  }
  if (logo) {
    schema.logo = logo;
  }
  if (clubData?.telefono) {
    schema.telephone = clubData.telefono;
  }

  if (clubData?.direccion || clubData?.ciudad) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: clubData.direccion || "",
      addressLocality: clubData.ciudad || "",
      addressCountry: "AR",
    };
  }

  if (clubData?.latitud && clubData?.longitud) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(clubData.latitud),
      longitude: Number(clubData.longitud),
    };
    schema.hasMap = `https://www.google.com/maps/search/?api=1&query=${clubData.latitud},${clubData.longitud}`;
  }

  if (socialLinks.length > 0) {
    schema.sameAs = socialLinks;
  }

  return schema;
}

export function buildCmsPageMetadata(
  subdomain: string,
  pagina: { titulo: string; slug: string; meta_descripcion?: string | null; updated_at?: string },
  clubData: ClubBrandingResponse | null
): Metadata {
  const clubName = clubData?.nombre || subdomain;
  const title = `${pagina.titulo} | ${clubName}`;
  const description =
    pagina.meta_descripcion ||
    `Página institucional ${pagina.titulo} en el complejo deportivo ${clubName}.`;
  const url = `https://${subdomain}.turnos.com/paginas/${pagina.slug}`;
  const shareImage =
    clubData?.branding?.portada_url ||
    clubData?.branding?.logo_url ||
    "/icons/icon-512x512.png";

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: clubName,
      images: [
        {
          url: shareImage,
          width: 1200,
          height: 630,
          alt: `${pagina.titulo} - ${clubName}`,
        },
      ],
      locale: "es_AR",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
  };
}

export function buildBreadcrumbSchema(
  subdomain: string,
  pagina: { titulo: string; slug: string },
  clubName: string
) {
  const baseUrl = `https://${subdomain}.turnos.com`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: clubName,
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Páginas",
        item: `${baseUrl}/paginas`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pagina.titulo,
        item: `${baseUrl}/paginas/${pagina.slug}`,
      },
    ],
  };
}
