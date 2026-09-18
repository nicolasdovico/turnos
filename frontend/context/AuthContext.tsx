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

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCrossDomainCookie(name: string, value: string, maxAge = 604800) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const hostname = window.location.hostname.toLowerCase();

  // Host-only cookie fallback
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;

  // Shared parent domain cookies
  if (hostname.endsWith(".localhost") || hostname === "localhost") {
    document.cookie = `${name}=${encodeURIComponent(value)}; domain=localhost; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `${name}=${encodeURIComponent(value)}; domain=.localhost; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else if (hostname.endsWith(".turnos.com") || hostname === "turnos.com") {
    document.cookie = `${name}=${encodeURIComponent(value)}; domain=.turnos.com; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    const parts = hostname.split(".");
    if (parts.length >= 2 && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const parentDomain = parts.slice(-2).join(".");
      document.cookie = `${name}=${encodeURIComponent(value)}; domain=.${parentDomain}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
  }
}

export function clearCrossDomainCookie(name: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const hostname = window.location.hostname.toLowerCase();
  const domainsToClear = [
    "",
    `domain=${hostname}; `,
    "domain=localhost; ",
    "domain=.localhost; ",
    "domain=turnos.com; ",
    "domain=.turnos.com; ",
  ];
  const parts = hostname.split(".");
  if (parts.length >= 2 && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    domainsToClear.push(`domain=.${parts.slice(-2).join(".")}; `);
  }
  domainsToClear.forEach((cd) => {
    document.cookie = `${name}=; ${cd}path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  });
}

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
            localStorage.setItem("token", urlToken);
            setCrossDomainCookie("saas_auth_token", urlToken);

            // Clean query param from browser URL bar without page reload
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }

        // If no token in localStorage or URL, check cross-subdomain cookie
        if (!savedToken && typeof window !== "undefined") {
          const cookieToken = getCookie("saas_auth_token");
          if (cookieToken) {
            savedToken = cookieToken;
            localStorage.setItem("saas_token", cookieToken);
            localStorage.setItem("token", cookieToken);
          }
        }

        if (savedToken) {
          setToken(savedToken);
          setCrossDomainCookie("saas_auth_token", savedToken);

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
                window.dispatchEvent(
                  new CustomEvent("saas-auth-changed", { detail: { user: data.user, token: savedToken } })
                );
              }
            } else if (res.status === 401 || res.status === 403) {
              // Token invalid or expired
              setToken(null);
              setUser(null);
              localStorage.removeItem("saas_token");
              localStorage.removeItem("token");
              localStorage.removeItem("saas_user");
              clearCrossDomainCookie("saas_auth_token");
              window.dispatchEvent(
                new CustomEvent("saas-auth-changed", { detail: { user: null, token: null } })
              );
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

  // Reactive cross-component and cross-tab auth state synchronization
  useEffect(() => {
    const handleAuthChange = () => {
      if (typeof window === "undefined") return;
      const savedToken = localStorage.getItem("saas_token") || localStorage.getItem("token") || getCookie("saas_auth_token");
      const savedUser = localStorage.getItem("saas_user");
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsed);
        } catch {}
      } else if (!savedToken) {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener("saas-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("saas-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const setAuthSession = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("saas_token", newToken);
    localStorage.setItem("token", newToken);
    localStorage.setItem("saas_user", JSON.stringify(newUser));
    setCrossDomainCookie("saas_auth_token", newToken);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("saas-auth-changed", { detail: { user: newUser, token: newToken } })
      );
    }
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
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("saas_token") : null);
      if (activeToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${activeToken}`,
            "Accept": "application/json",
          },
        });
      }
    } catch (e) {
      console.error("Error durante logout en backend:", e);
    } finally {
      setUser(null);
      setToken(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("saas_token");
        localStorage.removeItem("token");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("saas_user");
        try {
          sessionStorage.clear();
        } catch {}

        clearCrossDomainCookie("saas_auth_token");

        window.dispatchEvent(
          new CustomEvent("saas-auth-changed", { detail: { user: null, token: null } })
        );
      }
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
