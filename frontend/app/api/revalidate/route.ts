import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = body.secret || request.nextUrl.searchParams.get("secret");
    const path = body.path || request.nextUrl.searchParams.get("path");
    const subdomain = body.subdomain || request.nextUrl.searchParams.get("subdomain");

    const expectedSecret =
      process.env.REVALIDATE_SECRET_TOKEN || "turnos-secret-revalidate-token";

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { message: "Invalid revalidation secret token" },
        { status: 401 }
      );
    }

    if (!path) {
      return NextResponse.json(
        { message: "Path parameter is required for revalidation" },
        { status: 400 }
      );
    }

    const revalidatedPaths: string[] = [path];

    // Purge ISR cache for the specified path
    revalidatePath(path);

    // If subdomain is provided and path is root or tenant-related, purge tenant route and sitemap
    if (subdomain) {
      const tenantPath = `/tenants/${subdomain}`;
      if (path === "/" || path === tenantPath) {
        if (!revalidatedPaths.includes(tenantPath)) {
          revalidatePath(tenantPath);
          revalidatedPaths.push(tenantPath);
        }
      }
      revalidatePath("/sitemap.xml");
      revalidatedPaths.push("/sitemap.xml");

      try {
        revalidateTag(`tenant-${subdomain}`);
        revalidateTag(`tenant-sitemap-${subdomain}`);
      } catch {
        // Tag revalidation unsupported in certain environments
      }
    }

    return NextResponse.json({
      revalidated: true,
      path,
      paths: revalidatedPaths,
      subdomain: subdomain || null,
      now: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Error during revalidation", error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const path = request.nextUrl.searchParams.get("path");
  const subdomain = request.nextUrl.searchParams.get("subdomain");

  const expectedSecret =
    process.env.REVALIDATE_SECRET_TOKEN || "turnos-secret-revalidate-token";

  if (secret !== expectedSecret) {
    return NextResponse.json(
      { message: "Invalid revalidation secret token" },
      { status: 401 }
    );
  }

  if (!path) {
    return NextResponse.json(
      { message: "Path parameter is required for revalidation" },
      { status: 400 }
    );
  }

  const revalidatedPaths: string[] = [path];
  revalidatePath(path);

  if (subdomain) {
    const tenantPath = `/tenants/${subdomain}`;
    if (path === "/" || path === tenantPath) {
      if (!revalidatedPaths.includes(tenantPath)) {
        revalidatePath(tenantPath);
        revalidatedPaths.push(tenantPath);
      }
    }
    revalidatePath("/sitemap.xml");
    revalidatedPaths.push("/sitemap.xml");

    try {
      revalidateTag(`tenant-${subdomain}`);
      revalidateTag(`tenant-sitemap-${subdomain}`);
    } catch {
      // Tag revalidation unsupported in certain environments
    }
  }

  return NextResponse.json({
    revalidated: true,
    path,
    paths: revalidatedPaths,
    subdomain: subdomain || null,
    now: Date.now(),
  });
}
