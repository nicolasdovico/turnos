import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - static files with extensions (.png, .jpg, .svg, .css, .js, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|[\\w-]+\\.\\w+).*)",
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "localhost:3000";
  const cleanHostname = hostname.split(":")[0].toLowerCase();
  const pathname = url.pathname;

  // List of main domains for the general marketplace / SaaS portal
  const rootDomains = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "turnos.com",
    "www.turnos.com",
    "app.turnos.com",
  ];

  const isMainDomain = rootDomains.includes(cleanHostname);

  if (isMainDomain) {
    // If accessing root "/", rewrite to "/portal"
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/portal", req.url));
    }
    // Main domain routes (/registro-club, /login, /registro, /portal, etc.) pass through directly
    return NextResponse.next();
  }

  // Extract tenant identifier (subdomain or custom domain)
  let tenantIdentifier = cleanHostname;
  if (cleanHostname.endsWith(".localhost")) {
    tenantIdentifier = cleanHostname.replace(".localhost", "");
  } else if (cleanHostname.endsWith(".turnos.com")) {
    tenantIdentifier = cleanHostname.replace(".turnos.com", "");
  }

  // If request already points to /tenants/[tenantIdentifier], continue
  if (pathname.startsWith(`/tenants/${tenantIdentifier}`)) {
    return NextResponse.next();
  }

  // Rewrite subdomains and custom domains to /tenants/[subdomain]
  const targetPath = `/tenants/${tenantIdentifier}${pathname === "/" ? "" : pathname}`;
  const response = NextResponse.rewrite(new URL(targetPath, req.url));
  response.headers.set("x-tenant", tenantIdentifier);

  return response;
}
