"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const [currentHost, setCurrentHost] = useState("");
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");
  const [mainDomainUrl, setMainDomainUrl] = useState("");
  const [demoClubUrl, setDemoClubUrl] = useState("http://padelpro.localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      const protocol = window.location.protocol;
      setCurrentHost(hostname);

      const rootDomains = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "turnos.com",
        "www.turnos.com",
        "app.turnos.com",
      ];

      const onSubdomain = !rootDomains.includes(hostname.toLowerCase());
      setIsSubdomain(onSubdomain);

      if (onSubdomain) {
        let slug = hostname.split(".")[0];
        setTenantSlug(slug);

        let mainHost = "localhost";
        if (hostname.endsWith(".turnos.com")) {
          mainHost = "turnos.com";
        }
        setMainDomainUrl(`${protocol}//${mainHost}${port}`);
      } else {
        setMainDomainUrl("");
        let baseSubdomainHost = "localhost";
        if (hostname.endsWith("turnos.com")) {
          baseSubdomainHost = "turnos.com";
        }
        setDemoClubUrl(`${protocol}//padelpro.${baseSubdomainHost}${port}`);
      }
    }
  }, []);

  // Helper to build links: if on subdomain, global links point to mainDomainUrl
  const getGlobalLink = (path: string) => {
    if (isSubdomain && mainDomainUrl) {
      return `${mainDomainUrl}${path}`;
    }
    return path;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo & Context */}
        <div className="flex items-center gap-3">
          <Link href={getGlobalLink("/")} className="flex items-center gap-2 font-black text-xl tracking-tight text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20">
              ⚡
            </span>
            <span>Turnos<span className="text-emerald-600">SaaS</span></span>
          </Link>

          {isSubdomain && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm border border-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Club: <span className="capitalize text-white">{tenantSlug}</span>
            </span>
          )}
        </div>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {isSubdomain ? (
            <>
              <Link href="/" className="hover:text-emerald-600 transition font-semibold text-slate-900">
                Reservar Canchas
              </Link>
              <a href={getGlobalLink("/")} className="hover:text-emerald-600 transition text-slate-500">
                🌐 Portal Central
              </a>
              <a href={getGlobalLink("/planes")} className="hover:text-emerald-600 transition text-slate-500">
                Planes & Precios
              </a>
            </>
          ) : (
            <>
              <Link href="/" className="hover:text-emerald-600 transition">
                Portal
              </Link>
              <a href={demoClubUrl} className="hover:text-emerald-600 transition text-emerald-700 font-semibold">
                Demo Club (Padel Pro)
              </a>
              <Link href="/planes" className="hover:text-emerald-600 transition">
                Planes & Precios
              </Link>
            </>
          )}
        </nav>

        {/* Right Auth & CTA Actions */}
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
              <a
                href={getGlobalLink("/registro-club")}
                className="hidden sm:inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
              >
                + Crear Club
              </a>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href={getGlobalLink("/login")}
                className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Iniciar Sesión
              </a>
              <a
                href={getGlobalLink("/registro")}
                className="hidden sm:inline-flex rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Registrarse
              </a>
              <a
                href={getGlobalLink("/registro-club")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Registrar mi Club
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
