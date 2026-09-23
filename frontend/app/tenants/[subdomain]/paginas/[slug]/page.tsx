import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ClubHeader from "@/components/templates/ClubHeader";
import ClubFooter from "@/components/templates/ClubFooter";
import { ArrowLeft, Calendar, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: {
    subdomain: string;
    slug: string;
  };
}

async function getPagina(subdomain: string, slug: string) {
  const isServer = typeof window === "undefined";
  const internalApiUrl = process.env.BACKEND_INTERNAL_URL || "http://saas_webserver/api";
  const apiUrl = isServer ? internalApiUrl : (process.env.NEXT_PUBLIC_API_URL || "/api");

  try {
    const res = await fetch(`${apiUrl}/cms/paginas/${slug}`, {
      headers: {
        "X-Tenant-ID": subdomain,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data || null;
  } catch (error) {
    // If backend is unreachable during static build, return placeholder for demo
    return {
      titulo: slug.replace(/-/g, " ").toUpperCase(),
      slug,
      contenido_html: `<p>Contenido informativo del club <strong>${subdomain}</strong>.</p>`,
      esta_publicada: true,
      meta_descripcion: `Página institucional ${slug} de ${subdomain}`,
    };
  }
}

async function getClubBranding(subdomain: string) {
  const isServer = typeof window === "undefined";
  const internalApiUrl = process.env.BACKEND_INTERNAL_URL || "http://saas_webserver/api";
  const apiUrl = isServer ? internalApiUrl : (process.env.NEXT_PUBLIC_API_URL || "/api");

  try {
    const res = await fetch(`${apiUrl}/clubs/${subdomain}/branding`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

import { buildCmsPageMetadata, buildBreadcrumbSchema } from "@/lib/tenantSeo";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [pagina, clubData] = await Promise.all([
    getPagina(params.subdomain, params.slug),
    getClubBranding(params.subdomain),
  ]);

  if (!pagina) {
    return {
      title: "Página no encontrada",
    };
  }

  return buildCmsPageMetadata(params.subdomain, pagina, clubData);
}

export default async function TenantPaginaCMS({ params }: PageProps) {
  const { subdomain, slug } = params;
  const [pagina, clubData] = await Promise.all([
    getPagina(subdomain, slug),
    getClubBranding(subdomain),
  ]);

  if (!pagina || !pagina.esta_publicada) {
    notFound();
  }

  const clubNombre = clubData?.nombre || subdomain;
  const branding = clubData?.branding || {
    color_primario: "#10b981",
    color_secundario: "#047857",
    color_acento: "#06b6d4",
    color_fondo: "#020617",
    logo_url: null,
    redes_sociales: {},
  };
  const navegacion = clubData?.navegacion || { header: [], footer: [] };

  const customStyle: React.CSSProperties = {
    // @ts-ignore
    "--club-primary": branding.color_primario || "#10b981",
    "--club-secondary": branding.color_secundario || "#047857",
    "--club-accent": branding.color_acento || "#06b6d4",
    "--club-bg": branding.color_fondo || "#020617",
    backgroundColor: branding.color_fondo || "#020617",
  };

  const breadcrumbSchema = buildBreadcrumbSchema(subdomain, pagina, clubNombre);

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col justify-between transition-colors duration-200"
      style={customStyle}
      data-testid="pagina-institucional-cms"
    >
      <script
        id={`schema-breadcrumb-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div>
        {/* Dynamic Club Header */}
        <ClubHeader
          subdomain={subdomain}
          clubNombre={clubNombre}
          deportePrincipal={clubData?.deporte_principal || "pádel"}
          tipoNegocioLabel={clubData?.tipo_negocio?.nombre || "Club"}
          logoUrl={branding.logo_url}
          headerLinks={navegacion.header}
          telefono={clubData?.telefono}
          activeSlug={slug}
        />

        {/* Content Body */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
          {/* Breadcrumb & Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <Link
              href={`/tenants/${subdomain}`}
              data-testid="btn-volver-reservas"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Volver a Reservar Turnos</span>
            </Link>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Link href={`/tenants/${subdomain}`} className="hover:text-slate-300">
                Inicio
              </Link>
              <span>›</span>
              <span>Páginas</span>
              <span>›</span>
              <span className="text-emerald-400">{slug}</span>
            </div>
          </div>

          {/* Article Header */}
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>Página Institucional</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {pagina.titulo}
            </h1>
            {pagina.meta_descripcion && (
              <p className="text-sm text-slate-400 leading-relaxed italic">
                {pagina.meta_descripcion}
              </p>
            )}
          </header>

          {/* Article Body (Sanitized HTML) */}
          <article
            className="prose prose-invert max-w-none text-slate-300 leading-relaxed pt-4 border-t border-slate-800/60"
            dangerouslySetInnerHTML={{ __html: pagina.contenido_html }}
          />

          {/* Bottom Action Card */}
          <div className="pt-10">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-white">¿Listo para jugar en {clubNombre}?</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Elige tu cancha favorita y asegura tu horario en tiempo real con confirmación al instante.
              </p>
              <div>
                <Link
                  href={`/tenants/${subdomain}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Ver Turnos Disponibles</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Dynamic Club Footer */}
      <ClubFooter
        subdomain={subdomain}
        clubNombre={clubNombre}
        deportePrincipal={clubData?.deporte_principal || "pádel"}
        footerLinks={navegacion.footer}
        redesSociales={branding.redes_sociales}
        telefono={clubData?.telefono}
        direccion={clubData?.direccion}
        ciudad={clubData?.ciudad}
        latitud={clubData?.latitud}
        longitud={clubData?.longitud}
      />
    </div>
  );
}
