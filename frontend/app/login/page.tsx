"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in
  if (user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg border border-slate-100">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sesión Activa</h2>
          <p className="mt-2 text-slate-600">
            Has iniciado sesión como <strong className="text-slate-900">{user.email}</strong>.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 transition"
            >
              Ir al Portal Principal
            </Link>
            <Link
              href="/registro-club"
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-200 transition"
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
      router.push("/");
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contraseña
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

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
