import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../app/login/page";
import RecuperarPasswordPage from "../app/recuperar-password/page";
import { AuthProvider } from "../context/AuthContext";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Recuperación de Contraseña Suite (Forgot Password)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renderiza el enlace '¿Olvidaste tu contraseña?' en la página de login", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    const link = screen.getByTestId("link-olvido-password");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toContain("/recuperar-password");
    expect(link.textContent).toBe("¿Olvidaste tu contraseña?");
  });

  it("permite solicitar el código de recuperación en el Paso 1 y transicionar al Paso 2", async () => {
    let capturedBody: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/auth/forgot-password")) {
        capturedBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Código de recuperación enviado.",
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<RecuperarPasswordPage />);

    expect(screen.getByText("Recuperar Contraseña")).toBeDefined();
    expect(screen.getByTestId("btn-enviar-codigo")).toBeDefined();

    // Escribir correo electrónico
    const inputEmail = screen.getByTestId("input-recuperar-email");
    fireEvent.change(inputEmail, { target: { value: "jugador@padel.com" } });

    // Enviar formulario
    fireEvent.click(screen.getByTestId("btn-enviar-codigo"));

    await waitFor(() => {
      expect(capturedBody).toEqual({ email: "jugador@padel.com" });
    });

    // Transiciona al Paso 2: Input de OTP y botón de confirmar contraseña
    await waitFor(() => {
      expect(screen.getByText(/Código de 6 Dígitos/i)).toBeDefined();
      expect(screen.getByTestId("btn-confirmar-nueva-password")).toBeDefined();
      expect(screen.getByTestId("alerta-exito-recuperar")).toBeDefined();
    });
  });

  it("valida contraseñas no coincidentes y procesa el cambio de contraseña exitoso en el Paso 2", async () => {
    let resetBody: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/auth/forgot-password")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: "Código enviado" }),
        });
      }
      if (url.includes("/api/auth/reset-password")) {
        resetBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "Contraseña actualizada exitosamente.",
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(<RecuperarPasswordPage />);

    // Avanzar a Paso 2
    fireEvent.change(screen.getByTestId("input-recuperar-email"), {
      target: { value: "test@club.com" },
    });
    fireEvent.click(screen.getByTestId("btn-enviar-codigo"));

    await waitFor(() => {
      expect(screen.getByTestId("btn-confirmar-nueva-password")).toBeDefined();
    });

    // 1. Simular OTP de 6 dígitos ingresando en inputs
    const otpInputs = screen.getAllByRole("textbox");
    // Los inputs de OTP son los primeros 6
    ['1', '2', '3', '4', '5', '6'].forEach((char, idx) => {
      fireEvent.change(otpInputs[idx], { target: { value: char } });
    });

    // 2. Ingresar contraseñas dispares
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    expect(passwordInputs.length).toBe(2);

    fireEvent.change(passwordInputs[0], { target: { value: "password123" } });
    fireEvent.change(passwordInputs[1], { target: { value: "otraPasswordDiferente" } });

    fireEvent.click(screen.getByTestId("btn-confirmar-nueva-password"));

    await screen.findByText("Las contraseñas ingresadas no coinciden.");

    // 3. Corregir contraseña coincidente
    fireEvent.change(passwordInputs[1], { target: { value: "password123" } });
    fireEvent.click(screen.getByTestId("btn-confirmar-nueva-password"));

    await waitFor(() => {
      expect(resetBody).toEqual({
        email: "test@club.com",
        codigo: "123456",
        password: "password123",
        password_confirmation: "password123",
      });
    });

    // 4. Paso 3: Renderizado de confirmación exitosa y enlace al login
    await waitFor(() => {
      expect(screen.getByTestId("seccion-password-actualizada")).toBeDefined();
      expect(screen.getByTestId("btn-ir-a-login")).toBeDefined();
    });
  });
});
