import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = body.secret || request.nextUrl.searchParams.get("secret");
    const path = body.path || request.nextUrl.searchParams.get("path");

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

    // Purge ISR cache for the specified path
    revalidatePath(path);

    return NextResponse.json({
      revalidated: true,
      path,
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

  revalidatePath(path);

  return NextResponse.json({
    revalidated: true,
    path,
    now: Date.now(),
  });
}
