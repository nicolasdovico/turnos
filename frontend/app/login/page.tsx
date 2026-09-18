"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "../../components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, user, token } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const target = params.get("returnTo") || params.get("redirect");
      if (target) {
        setReturnUrl(target);
      }
    }
  }, []);

  const getTransferUrl = (targetUrl: string, authToken: string | null) => {
    if (!authToken) return targetUrl;
    const sep = targetUrl.includes("?") ? "&" : "?";
    return `${targetUrl}${sep}auth_token=${encodeURIComponent(authToken)}`;
  };

  // Auto-transfer session to returning club if already logged in
  React.useEffect(() => {
    if (user && returnUrl && !isRedirecting) {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("saas_token") : null);
      if (activeToken) {
        setIsRedirecting(true);
        const destination = getTransferUrl(returnUrl, activeToken);
        const timer = setTimeout(() => {
          window.location.href = destination;
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, returnUrl, token, isRedirecting]);

  // If already logged in
  if (user) {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("saas_token") : null);
    const destination = returnUrl ? getTransferUrl(returnUrl, activeToken) : null;

    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-slate-100">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
            {isRedirecting ? (
              <span className="animate-spin text-xl">⚡</span>
            ) : (
              <span>✓</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sesión Activa</h2>
          <p className="mt-2 text-slate-600 text-sm">
            Has iniciado sesión como <strong className="text-slate-900">{user.email}</strong>.
          </p>

          {isRedirecting && returnUrl && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 animate-pulse">
              🚀 Conectando sesión con tu club... Redirigiendo automáticamente.
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {destination ? (
              <a
                href={destination}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition text-sm flex items-center justify-center gap-2"
              >
                <span>Volver al Club / Reserva</span>
                <span>↗</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={async () => {
                await logout();
                setIsRedirecting(false);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 transition text-sm"
            >
              Ingresar con otra cuenta
            </button>

            <Link
              href="/"
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-200 transition text-sm"
            >
              Ir al Portal Principal
            </Link>

            <Link
              href="/registro-club"
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-200 transition text-sm"
            >
              Registrar un Nuevo Club
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password);

    if (!res.success) {
      setError(res.error || "No se pudo iniciar sesión. Verifica tus datos.");
      setIsSubmitting(false);
    } else {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const target = params?.get("returnTo") || params?.get("redirect") || returnUrl || "/";
      if (target.startsWith("http://") || target.startsWith("https://")) {
        const token = (res as any)?.token || (typeof window !== "undefined" ? localStorage.getItem("saas_token") : "") || "";
        const sep = target.includes("?") ? "&" : "?";
        window.location.href = `${target}${sep}auth_token=${encodeURIComponent(token)}`;
      } else {
        router.push(target);
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold text-xl mb-3 shadow-md shadow-emerald-500/20">
              ⚡
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Iniciar Sesión
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Ingresa a tu cuenta para gestionar turnos y reservas
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <PasswordInput
              label="Contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar a mi cuenta"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center text-sm text-slate-600">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Regístrate aquí
            </Link>
          </div>
        </div>

        {/* Club Owner Promo Box */}
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 p-6 text-white text-center shadow-lg">
          <h3 className="font-bold text-base">¿Tienes un Club o Canchas Deportivas?</h3>
          <p className="mt-1 text-xs text-slate-300">
            Gestiona reservas, caja, domótica y pagos con tu propio subdominio.
          </p>
          <Link
            href="/registro-club"
            className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-400 transition"
          >
            Registrar mi Club (Prueba Gratis 14 Días)
          </Link>
        </div>
      </div>
    </div>
  );
}
