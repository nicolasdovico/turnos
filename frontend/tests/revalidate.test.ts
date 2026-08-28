import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "../app/api/revalidate/route";

// Mock next/cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Next.js On-Demand ISR Revalidation API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REVALIDATE_SECRET_TOKEN = "turnos-secret-revalidate-token";
  });

  it("rejects request with invalid secret token (401)", async () => {
    const request = new NextRequest("http://localhost:3000/api/revalidate", {
      method: "POST",
      body: JSON.stringify({
        secret: "wrong-secret-token",
        path: "/tenants/padelpro/paginas/quienes-somos",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.message).toContain("Invalid revalidation secret token");
  });

  it("rejects request without path parameter (400)", async () => {
    const request = new NextRequest("http://localhost:3000/api/revalidate", {
      method: "POST",
      body: JSON.stringify({
        secret: "turnos-secret-revalidate-token",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Path parameter is required");
  });

  it("successfully purges ISR cache on valid POST request (200)", async () => {
    const targetPath = "/tenants/padelpro/paginas/quienes-somos";
    const request = new NextRequest("http://localhost:3000/api/revalidate", {
      method: "POST",
      body: JSON.stringify({
        secret: "turnos-secret-revalidate-token",
        subdomain: "padelpro",
        path: targetPath,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.revalidated).toBe(true);
    expect(data.path).toBe(targetPath);
  });

  it("successfully purges ISR cache on valid GET request with query params (200)", async () => {
    const targetPath = "/tenants/central/paginas/reglamento";
    const url = `http://localhost:3000/api/revalidate?secret=turnos-secret-revalidate-token&path=${encodeURIComponent(
      targetPath
    )}`;
    const request = new NextRequest(url, {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.revalidated).toBe(true);
    expect(data.path).toBe(targetPath);
  });
});
