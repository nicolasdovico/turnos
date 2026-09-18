import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GoogleLoginButton from "../components/GoogleLoginButton";
import LoginPage from "../app/login/page";
import RegisterPage from "../app/registro/page";
import { AuthProvider, useAuth } from "../context/AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
}));

describe("Google OAuth 2.0 Frontend Suite", () => {
  const originalLocation = window.location;
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  afterEach(() => {
    // @ts-ignore
    delete window.location;
    window.location = originalLocation;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders GoogleLoginButton with default text and Google icon", () => {
    render(<GoogleLoginButton />);
    const btn = screen.getByTestId("google-login-btn");
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain("Continuar con Google");
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("renders GoogleLoginButton with custom text and dark variant", () => {
    render(
      <GoogleLoginButton
        text="Registrarse con Google"
        variant="dark"
        dataTestId="custom-google-btn"
      />
    );
    const btn = screen.getByTestId("custom-google-btn");
    expect(btn.textContent).toContain("Registrarse con Google");
    expect(btn.className).toContain("bg-slate-900");
  });

  it("navigates to Google redirect endpoint with encoded returnTo on click", () => {
    // Mock window.location
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://nico-padel.localhost:8080/canchas",
      origin: "http://nico-padel.localhost:8080",
      search: "",
    };

    render(
      <GoogleLoginButton
        returnTo="http://nico-padel.localhost:8080/reservas"
      />
    );

    const btn = screen.getByTestId("google-login-btn");
    fireEvent.click(btn);

    expect(window.location.href).toContain("/auth/google/redirect?returnTo=");
    expect(window.location.href).toContain(encodeURIComponent("http://nico-padel.localhost:8080/reservas"));
  });

  it("converts relative returnTo to full tenant origin URL", () => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://nico-tenis.localhost:8080/login",
      origin: "http://nico-tenis.localhost:8080",
      search: "",
    };

    render(<GoogleLoginButton returnTo="/mis-turnos" />);

    const btn = screen.getByTestId("google-login-btn");
    fireEvent.click(btn);

    expect(window.location.href).toContain(encodeURIComponent("http://nico-tenis.localhost:8080/mis-turnos"));
  });

  it("LoginPage renders Google login button and divider", () => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://localhost:8080/login",
      search: "",
      pathname: "/login",
    };

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByText("Continuar con Google")).toBeDefined();
    expect(screen.getByText("o continuar con")).toBeDefined();
  });

  it("LoginPage displays error when redirected back with google_login=error", async () => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://localhost:8080/login?google_login=error&message=Cuenta+bloqueada",
      search: "?google_login=error&message=Cuenta+bloqueada",
      pathname: "/login",
    };

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Cuenta bloqueada")).toBeDefined();
    });
  });

  it("LoginPage displays cancellation message when google_login=cancelled", async () => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://localhost:8080/login?google_login=cancelled",
      search: "?google_login=cancelled",
      pathname: "/login",
    };

    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Inicio de sesión con Google cancelado.")).toBeDefined();
    });
  });

  it("RegisterPage renders Google registration button and divider", () => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://localhost:8080/registro",
      search: "",
      pathname: "/registro",
    };

    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    expect(screen.getByText("Registrarse con Google")).toBeDefined();
    expect(screen.getByText("o registrarse con")).toBeDefined();
  });

  it("AuthProvider automatically ingests auth_token and sets session from Google redirect", async () => {
    const mockUser = {
      id: 88,
      name: "Usuario Google",
      email: "googleuser@gmail.com",
      email_verified_at: "2026-09-18T17:00:00Z",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: mockUser }),
    } as any);

    // Mock window.location after redirect from Google callback
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: "http://nico-padel.localhost:8080/reservas?auth_token=google-oauth-token-xyz&google_login=success",
      search: "?auth_token=google-oauth-token-xyz&google_login=success",
      pathname: "/reservas",
      hostname: "nico-padel.localhost",
      replaceState: vi.fn(),
    };

    function TestConsumer() {
      const { user, token, isLoading } = useAuth();
      if (isLoading) return <div>Cargando...</div>;
      return (
        <div>
          <span data-testid="user-email">{user?.email || "anonimo"}</span>
          <span data-testid="user-token">{token || "sin-token"}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-email").textContent).toBe("googleuser@gmail.com");
      expect(screen.getByTestId("user-token").textContent).toBe("google-oauth-token-xyz");
    });

    expect(localStorage.getItem("saas_token")).toBe("google-oauth-token-xyz");
    expect(document.cookie).toContain("saas_auth_token=google-oauth-token-xyz");
  });
});
