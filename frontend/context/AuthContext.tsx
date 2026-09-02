"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface ComplejoResumen {
  id: number;
  nombre: string;
  subdominio: string;
  estado?: string;
  deporte_principal?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  complejos?: ComplejoResumen[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setAuthSession: (user: User, token: string) => void;
  markEmailAsVerified: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from localStorage & cookie on mount, with cross-subdomain SSO transfer
  useEffect(() => {
    async function restoreSession() {
      try {
        let savedToken = typeof window !== "undefined" ? localStorage.getItem("saas_token") : null;
        let savedUser = typeof window !== "undefined" ? localStorage.getItem("saas_user") : null;

        // Check if token was passed via URL parameter during subdomain transition
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const urlToken = params.get("auth_token") || params.get("token");
          if (urlToken) {
            savedToken = urlToken;
            localStorage.setItem("saas_token", urlToken);
            document.cookie = `saas_auth_token=${urlToken}; path=/; max-age=604800; SameSite=Lax`;

            // Clean query param from browser URL bar without page reload
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }

        if (savedToken) {
          setToken(savedToken);
          document.cookie = `saas_auth_token=${savedToken}; path=/; max-age=604800; SameSite=Lax`;

          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (err) {}
          }

          // Fetch fresh user profile with latest complejos
          try {
            const res = await fetch(`${API_BASE}/auth/me`, {
              headers: {
                Authorization: `Bearer ${savedToken}`,
                Accept: "application/json",
              },
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.user) {
                setUser(data.user);
                localStorage.setItem("saas_user", JSON.stringify(data.user));
              }
            }
          } catch (fetchErr) {
            console.error("Error al actualizar perfil en background:", fetchErr);
          }
        }
      } catch (e) {
        console.error("Error al restaurar sesión:", e);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const setAuthSession = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("saas_token", newToken);
    localStorage.setItem("token", newToken);
    localStorage.setItem("saas_user", JSON.stringify(newUser));
    document.cookie = `saas_auth_token=${newToken}; path=/; max-age=604800; SameSite=Lax`;
  };

  const markEmailAsVerified = () => {
    if (user) {
      const updated = { ...user, email_verified_at: new Date().toISOString() };
      setUser(updated);
      localStorage.setItem("saas_user", JSON.stringify(updated));
    }
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
      localStorage.removeItem("token");
      localStorage.removeItem("saas_user");
      document.cookie = "saas_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, setAuthSession, markEmailAsVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

const fallbackAuth: AuthContextType = {
  user: null,
  token: null,
  isLoading: false,
  login: async () => ({ success: false, error: undefined }),
  register: async () => ({ success: false, error: undefined }),
  logout: async () => {},
  setAuthSession: () => {},
  markEmailAsVerified: () => {},
};

export function useAuth(): AuthContextType {
  try {
    if (typeof useContext === "function" && AuthContext) {
      const context = useContext(AuthContext);
      if (context) return context;
    }
  } catch {
    // Safe SSR fallback when ReactCurrentDispatcher is null
  }
  return fallbackAuth;
}
