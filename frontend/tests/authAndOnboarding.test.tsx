import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Navbar from "../components/Navbar";
import LoginPage from "../app/login/page";
import RegisterPage from "../app/registro/page";
import RegistroClubPage from "../app/registro-club/page";
import { AuthProvider } from "../context/AuthContext";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import PlanesPage from "../app/planes/page";

describe("Frontend Auth & Club Onboarding Suite", () => {
  it("renders Navbar with guest navigation buttons", () => {
    render(
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    );

    expect(screen.getByText(/Turnos/i)).toBeDefined();
    expect(screen.getByText(/Iniciar Sesión/i)).toBeDefined();
    expect(screen.getByText(/Planes & Precios/i)).toBeDefined();
    expect(screen.getByText(/Registrar mi Club/i)).toBeDefined();
  });

  it("renders Planes & Precios page with pricing cards, comparison matrix and FAQ", () => {
    render(<PlanesPage />);

    expect(screen.getByText("Planes diseñados para potenciar tu Club")).toBeDefined();
    expect(screen.getAllByText("Bronce").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Plata").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Oro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Comparativa Detallada de Funcionalidades")).toBeDefined();
    expect(screen.getByText("Preguntas Frecuentes")).toBeDefined();
  });

  it("renders Login page with email, password fields and link to register club", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByPlaceholderText("ejemplo@correo.com")).toBeDefined();
    expect(screen.getByPlaceholderText("••••••••")).toBeDefined();
    expect(screen.getByText("Ingresar a mi cuenta")).toBeDefined();
    expect(screen.getByText(/Registrar mi Club/i)).toBeDefined();
  });

  it("renders User Register page and validates password mismatch", async () => {
    render(
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    );

    const nameInput = screen.getByPlaceholderText("Ej. Juan Pérez");
    const emailInput = screen.getByPlaceholderText("juan@ejemplo.com");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");

    fireEvent.change(nameInput, { target: { value: "Test User" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInputs[0], { target: { value: "pass12345" } });
    fireEvent.change(passwordInputs[1], { target: { value: "mismatchpass" } });

    const submitBtn = screen.getByText("Crear mi Cuenta");
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeDefined();
  });

  it("renders Club Onboarding page with plan cards, court management and subdomain inputs", () => {
    render(
      <AuthProvider>
        <RegistroClubPage />
      </AuthProvider>
    );

    expect(screen.getByText("Registra tu Club Deportivo")).toBeDefined();
    expect(screen.getByPlaceholderText("Ej. Pádel Master Center")).toBeDefined();
    expect(screen.getByText("Bronce")).toBeDefined();
    expect(screen.getByText("Plata")).toBeDefined();
    expect(screen.getByText("Oro")).toBeDefined();
    expect(screen.getByText("+ Agregar Cancha")).toBeDefined();
    expect(screen.getByText(/Crear mi Club y Comenzar Prueba Gratis/i)).toBeDefined();
  });
});
