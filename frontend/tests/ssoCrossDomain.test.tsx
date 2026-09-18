import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../app/login/page";
import RegisterPage from "../app/registro/page";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { getAuthToken } from "../components/GrillaHoraria";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
}));

describe("Cross-Subdomain SSO & Session Transfer Suite", () => {
  const originalLocation = window.location;
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  afterEach(() => {
    // Restore window.location
    // @ts-ignore
    delete window.location;
    window.location = originalLocation;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("LoginPage with active session and returnTo transfers auth_token in return button", async () => {
    // Set active session in localStorage
    const activeUser = { id: 10, name: "Nicolas Padel", email: "nico@padel.com" };
    const activeToken = "jwt-sso-token-999";
    localStorage.setItem("saas_token", activeToken);
    localStorage.setItem("saas_user", JSON.stringify(activeUser));

    // Mock window.location with returnTo parameter
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      search: "?returnTo=http://nico-tenis.localhost:8080/",
      href: "http://localhost:8080/login?returnTo=http://nico-tenis.localhost:8080/",
      pathname: "/login",
      hostname: "localhost",
    };

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    // Expect "Sesión Activa" to be shown
    expect(await screen.findByText("Sesión Activa")).toBeDefined();
    expect(screen.getByText("nico@padel.com")).toBeDefined();

    // Verify the return button exists and contains the auth_token parameter
    const returnBtn = screen.getByRole("link", { name: /Volver al Club \/ Reserva/i });
    expect(returnBtn).toBeDefined();
    const href = returnBtn.getAttribute("href");
    expect(href).toContain("http://nico-tenis.localhost:8080/");
    expect(href).toContain("auth_token=jwt-sso-token-999");
  });

  it("LoginPage allows switching accounts via 'Ingresar con otra cuenta'", async () => {
    const activeUser = { id: 10, name: "Nicolas Padel", email: "nico@padel.com" };
    localStorage.setItem("saas_token", "jwt-sso-token-999");
    localStorage.setItem("saas_user", JSON.stringify(activeUser));

    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      search: "?returnTo=http://nico-tenis.localhost:8080/",
      href: "http://localhost:8080/login?returnTo=http://nico-tenis.localhost:8080/",
      pathname: "/login",
      hostname: "localhost",
    };

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(await screen.findByText("Sesión Activa")).toBeDefined();

    // Click "Ingresar con otra cuenta"
    const switchBtn = screen.getByRole("button", { name: /Ingresar con otra cuenta/i });
    fireEvent.click(switchBtn);

    // Form inputs should now be rendered
    await waitFor(() => {
      expect(screen.getByPlaceholderText("ejemplo@correo.com")).toBeDefined();
      expect(screen.getByText("Ingresar a mi cuenta")).toBeDefined();
    });
  });

  it("RegisterPage with active session and returnTo transfers auth_token in return button", async () => {
    const activeUser = { id: 10, name: "Nicolas Padel", email: "nico@padel.com" };
    const activeToken = "jwt-sso-token-999";
    localStorage.setItem("saas_token", activeToken);
    localStorage.setItem("saas_user", JSON.stringify(activeUser));

    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      search: "?returnTo=http://nico-tenis.localhost:8080/",
      href: "http://localhost:8080/registro?returnTo=http://nico-tenis.localhost:8080/",
      pathname: "/registro",
      hostname: "localhost",
    };

    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    expect(await screen.findByText("Ya tienes una sesión activa")).toBeDefined();
    const returnBtn = screen.getByRole("link", { name: /Continuar en mi Club \/ Reserva/i });
    expect(returnBtn).toBeDefined();
    const href = returnBtn.getAttribute("href");
    expect(href).toContain("http://nico-tenis.localhost:8080/");
    expect(href).toContain("auth_token=jwt-sso-token-999");
  });

  it("AuthProvider restores session from cross-subdomain cookie when localStorage is empty", async () => {
    localStorage.clear();
    document.cookie = "saas_auth_token=cookie-cross-token-777; path=/;";

    // Mock fetch for /auth/me
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/me")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: {
                id: 42,
                name: "Maria Tenis",
                email: "maria@tenis.com",
                complejos: [],
              },
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    function TestConsumer() {
      const { user, token, isLoading } = useAuth();
      if (isLoading) return <div>Cargando...</div>;
      return (
        <div>
          <div data-testid="user-name">{user ? user.name : "Invitado"}</div>
          <div data-testid="user-token">{token || "Sin token"}</div>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-name").textContent).toBe("Maria Tenis");
      expect(screen.getByTestId("user-token").textContent).toBe("cookie-cross-token-777");
    });

    // Verify it also synchronized localStorage on this subdomain
    expect(localStorage.getItem("saas_token")).toBe("cookie-cross-token-777");
  });

  it("GrillaHoraria getAuthToken falls back to cookie when localStorage is empty", () => {
    localStorage.clear();
    document.cookie = "saas_auth_token=direct-cookie-fallback-555; path=/;";

    const token = getAuthToken();
    expect(token).toBe("direct-cookie-fallback-555");
  });
});
