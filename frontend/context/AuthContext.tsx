"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAuthSession: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from localStorage & cookie on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("saas_token");
      const savedUser = localStorage.getItem("saas_user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        document.cookie = `saas_auth_token=${savedToken}; path=/; max-age=604800; SameSite=Lax`;
      }
    } catch (e) {
      console.error("Error al restaurar sesión:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuthSession = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("saas_token", newToken);
    localStorage.setItem("saas_user", JSON.stringify(newUser));
    document.cookie = `saas_auth_token=${newToken}; path=/; max-age=604800; SameSite=Lax`;
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || "Credenciales incorrectas" };
      }

      setAuthSession(data.user, data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión con el servidor" };
    }
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || "Error al registrar la cuenta" };
      }

      setAuthSession(data.user, data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión con el servidor" };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        });
      }
    } catch (e) {
      console.error("Error durante logout en backend:", e);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem("saas_token");
      localStorage.removeItem("saas_user");
      document.cookie = "saas_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setAuthSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de un AuthProvider");
  }
  return context;
}
