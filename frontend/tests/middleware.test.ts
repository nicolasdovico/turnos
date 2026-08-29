import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

describe("Next.js Subdomain Multi-tenant Middleware", () => {
  it("rewrites root path on main domain to /portal", () => {
    const request = new NextRequest("http://localhost:3000/", {
      headers: {
        host: "localhost:3000",
      },
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/portal");
  });

  it("allows direct requests to main domain standalone routes (/registro-club, /login, /registro) without rewriting", () => {
    const reqClub = new NextRequest("http://localhost:3000/registro-club", {
      headers: { host: "localhost:3000" },
    });
    expect(middleware(reqClub).headers.get("x-middleware-rewrite")).toBeNull();

    const reqLogin = new NextRequest("http://localhost:3000/login", {
      headers: { host: "localhost:3000" },
    });
    expect(middleware(reqLogin).headers.get("x-middleware-rewrite")).toBeNull();

    const reqRegister = new NextRequest("http://localhost:3000/registro", {
      headers: { host: "localhost:3000" },
    });
    expect(middleware(reqRegister).headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("allows direct requests to /portal without rewriting", () => {
    const request = new NextRequest("http://localhost:3000/portal", {
      headers: {
        host: "localhost:3000",
      },
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("rewrites subdomain on localhost (e.g. padelpro.localhost:3000) to /tenants/padelpro", () => {
    const request = new NextRequest("http://padelpro.localhost:3000/", {
      headers: {
        host: "padelpro.localhost:3000",
      },
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://padelpro.localhost:3000/tenants/padelpro");
    expect(response.headers.get("x-tenant")).toBe("padelpro");
  });

  it("rewrites subdomain on production domain (e.g. club-central.turnos.com/turnos) to /tenants/club-central/turnos", () => {
    const request = new NextRequest("http://club-central.turnos.com/turnos", {
      headers: {
        host: "club-central.turnos.com",
      },
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://club-central.turnos.com/tenants/club-central/turnos"
    );
    expect(response.headers.get("x-tenant")).toBe("club-central");
  });

  it("rewrites custom domain (e.g. padelcenter.com/precios) to /tenants/padelcenter.com/precios", () => {
    const request = new NextRequest("http://padelcenter.com/precios", {
      headers: {
        host: "padelcenter.com",
      },
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://padelcenter.com/tenants/padelcenter.com/precios"
    );
    expect(response.headers.get("x-tenant")).toBe("padelcenter.com");
  });
});
