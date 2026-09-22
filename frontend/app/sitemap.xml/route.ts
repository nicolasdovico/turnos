import { NextRequest, NextResponse } from "next/server";

interface SitemapPageItem {
  slug: string;
  updated_at: string;
}

interface ClubSitemapData {
  subdominio: string;
  nombre: string;
  updated_at: string;
  paginas: SitemapPageItem[];
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "localhost:3000";
  const cleanHost = host.split(":")[0].toLowerCase();
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const searchParams = request.nextUrl.searchParams;
  const querySubdomain = searchParams.get("subdomain");

  // Determine if requesting for a specific club tenant
  const rootDomains = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "turnos.com",
    "www.turnos.com",
    "app.turnos.com",
  ];

  let tenantSubdomain: string | null = querySubdomain;
  if (!tenantSubdomain && !rootDomains.includes(cleanHost)) {
    if (cleanHost.endsWith(".localhost")) {
      tenantSubdomain = cleanHost.replace(".localhost", "");
    } else if (cleanHost.endsWith(".turnos.com")) {
      tenantSubdomain = cleanHost.replace(".turnos.com", "");
    } else {
      tenantSubdomain = cleanHost;
    }
  }

  const currentDate = new Date().toISOString().split("T")[0];

  // 1. If it's a tenant subdomain (e.g. padel-norte.turnos.com)
  if (tenantSubdomain && tenantSubdomain !== "jugar") {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      "http://backend:80/api";

    try {
      const res = await fetch(`${apiUrl}/clubs/${tenantSubdomain}/sitemap`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600, tags: [`tenant-sitemap-${tenantSubdomain}`] },
      });

      if (res.ok) {
        const json = await res.json();
        const data: ClubSitemapData = json.data;

        const clubLastMod = data.updated_at
          ? data.updated_at.split("T")[0]
          : currentDate;

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${clubLastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

        for (const pagina of data.paginas || []) {
          const pageLastMod = pagina.updated_at
            ? pagina.updated_at.split("T")[0]
            : clubLastMod;
          xml += `
  <url>
    <loc>${baseUrl}/paginas/${pagina.slug}</loc>
    <lastmod>${pageLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }

        xml += `
</urlset>`;

        return new NextResponse(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    } catch {
      // Fallback to basic tenant home if backend fails
    }

    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(fallbackXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800",
      },
    });
  }

  // 2. Main SaaS platform sitemap
  const mainRoutes = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/portal", priority: "0.9", changefreq: "daily" },
    { path: "/jugar", priority: "0.9", changefreq: "hourly" },
    { path: "/registro-club", priority: "0.8", changefreq: "monthly" },
    { path: "/planes", priority: "0.8", changefreq: "weekly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  for (const route of mainRoutes) {
    xml += `
  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  }

  xml += `
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
