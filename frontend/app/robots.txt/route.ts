import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "turnos.com";
  const protocol =
    host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";

  const robots = `User-agent: *
Allow: /
Disallow: /panel/
Disallow: /admin/
Disallow: /api/

Sitemap: ${protocol}://${host}/sitemap.xml
`;

  return new NextResponse(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
