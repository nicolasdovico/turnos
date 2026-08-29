"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20">
              ⚡
            </span>
            <span>Turnos<span className="text-emerald-600">SaaS</span></span>
          </Link>
        </div>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-emerald-600 transition">
            Portal
          </Link>
          <a href="http://padelpro.localhost:3000" className="hover:text-emerald-600 transition">
            Demo Club
          </a>
          <Link href="/registro-club" className="hover:text-emerald-600 transition">
            Planes & Precios
          </Link>
        </nav>

        {/* Right Auth Buttons */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 border border-slate-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white uppercase">
                  {user.name.charAt(0)}
                </span>
                <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>
              <Link
                href="/registro-club"
                className="hidden sm:inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
              >
                + Crear Club
              </Link>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registro"
                className="hidden sm:inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Registrarse
              </Link>
              <Link
                href="/registro-club"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Registrar mi Club
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
