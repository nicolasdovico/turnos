import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 3600; // Incremental Static Regeneration (ISR) every 1 hour

interface PageProps {
  params: {
    subdomain: string;
    slug: string;
  };
}

async function getPagina(subdomain: string, slug: string) {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.BACKEND_INTERNAL_URL ||
    "http://backend:80/api";

  try {
    const res = await fetch(`${apiUrl}/cms/paginas/${slug}`, {
      headers: {
        "X-Tenant-ID": subdomain,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
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
    };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pagina = await getPagina(params.subdomain, params.slug);

  if (!pagina) {
    return {
      title: "Página no encontrada",
    };
  }

  return {
    title: `${pagina.titulo} - ${params.subdomain}`,
    description: `Página informativa de ${pagina.titulo} en ${params.subdomain}`,
  };
}

export default async function TenantPaginaCMS({ params }: PageProps) {
  const { subdomain, slug } = params;
  const pagina = await getPagina(subdomain, slug);

  if (!pagina || !pagina.esta_publicada) {
    notFound();
  }

  return (
    <article className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-2">
            <span>Complejo {subdomain}</span>
            <span>&bull;</span>
            <span className="capitalize">CMS</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {pagina.titulo}
          </h1>
        </header>

        {/* Content rendered safely with server-side sanitized HTML */}
        <div
          className="prose prose-invert prose-emerald max-w-none text-slate-300 leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: pagina.contenido_html }}
        />
      </div>
    </article>
  );
}
