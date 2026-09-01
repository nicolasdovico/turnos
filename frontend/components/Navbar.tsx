"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, token, isLoading, logout } = useAuth();
  const [currentHost, setCurrentHost] = useState("");
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [tenantSlug, setTenantSlug] = useState("");
  const [mainDomainUrl, setMainDomainUrl] = useState("");
  const [demoClubUrl, setDemoClubUrl] = useState("http://padelpro.localhost:3000");
  const [isClubAdmin, setIsClubAdmin] = useState(false);
  const [showClubsDropdown, setShowClubsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClubsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Check if logged in user is the owner/admin of this club
  useEffect(() => {
    if (isSubdomain && tenantSlug && user) {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("saas_token") : null);
      fetch(`/api/clubs/${tenantSlug}/is-admin`, {
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.is_admin) {
            setIsClubAdmin(true);
          } else {
            setIsClubAdmin(false);
          }
        })
        .catch(() => setIsClubAdmin(false));
    } else {
      setIsClubAdmin(false);
    }
  }, [isSubdomain, tenantSlug, user, token]);

  // User's owned club (if any)
  const userClubs = user?.complejos || [];
  const ownedClub = userClubs.length > 0 ? userClubs[0] : null;

  // Instant ownership check on current subdomain
  const isOwnerOfCurrentTenant = Boolean(
    isSubdomain &&
    tenantSlug &&
    userClubs.some((c: any) => c.subdominio.toLowerCase() === tenantSlug.toLowerCase())
  );

  const isCurrentAdmin = isClubAdmin || isOwnerOfCurrentTenant;

  // Build club admin URL from current host/protocol/port with SSO token transfer
  const getClubAdminUrl = (subdomain: string) => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("saas_token") : null);
    const tokenQuery = activeToken ? `?auth_token=${encodeURIComponent(activeToken)}` : "";

    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const hostname = window.location.hostname;
      let baseHost = "localhost";
      if (hostname.endsWith("turnos.com")) {
        baseHost = "turnos.com";
      }
      return `${protocol}//${subdomain}.${baseHost}${port}/panel${tokenQuery}`;
    }
    return `http://${subdomain}.localhost:8080/panel${tokenQuery}`;
  };

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
            <span className="flex items-center gap-1.5">
              Turnos
              {isSubdomain ? (
                <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  {tenantSlug}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                  Plataforma SaaS
                </span>
              )}
            </span>
          </Link>
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
              {!ownedClub && (
                <a href={demoClubUrl} className="hover:text-emerald-600 transition text-emerald-700 font-semibold">
                  Demo Club (Padel Pro)
                </a>
              )}
              <Link href="/planes" className="hover:text-emerald-600 transition">
                Planes & Precios
              </Link>
            </>
          )}
        </nav>

        {/* Right Auth & CTA Actions */}
        <div className="flex items-center gap-3">
          {/* Subdomain: Club Admin single button + Switcher if multiple */}
          {isSubdomain && isCurrentAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href="/panel"
                className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 px-3.5 py-2 text-xs font-extrabold border border-slate-800 shadow-sm transition"
              >
                <span>⚙️ Panel de Administrador</span>
              </Link>

              {userClubs.length > 1 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowClubsDropdown(!showClubsDropdown)}
                    className="hidden sm:inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-2 text-xs font-bold border border-slate-200 transition"
                    title="Cambiar de negocio"
                  >
                    <span>🏢 Cambiar ({userClubs.length}) ▾</span>
                  </button>

                  {showClubsDropdown && (
                    <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-2 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        Tus Negocios Registrados:
                      </div>
                      <div className="py-1 space-y-1">
                        {userClubs.map((club: any) => {
                          const isCurrent = club.subdominio.toLowerCase() === tenantSlug.toLowerCase();
                          const icon = club.tipo_negocio?.slug === "complejo" ? "🏟️" : club.tipo_negocio?.slug === "gimnasio" ? "💪" : "🏆";
                          return (
                            <a
                              key={club.id}
                              href={getClubAdminUrl(club.subdominio)}
                              onClick={() => setShowClubsDropdown(false)}
                              className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                                isCurrent
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{icon}</span>
                                <div className="text-left">
                                  <div className="text-xs font-bold">{club.nombre}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{club.subdominio}</div>
                                </div>
                              </div>
                              {isCurrent ? (
                                <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Actual</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Ir ↗</span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main Domain: Single club button OR Multi-business dropdown selector */}
          {!isSubdomain && userClubs.length === 1 && (
            <a
              href={getClubAdminUrl(userClubs[0].subdominio)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-emerald-600/20 transition"
            >
              <span>⚙️ Administrar {userClubs[0].nombre}</span>
            </a>
          )}

          {!isSubdomain && userClubs.length > 1 && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowClubsDropdown(!showClubsDropdown)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-emerald-600/20 transition"
              >
                <span>🏢 Mis Negocios ({userClubs.length})</span>
                <span className="text-[10px]">▾</span>
              </button>

              {showClubsDropdown && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white p-2 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    Elegir Panel de Administrador:
                  </div>
                  <div className="py-1 space-y-1">
                    {userClubs.map((club: any) => {
                      const icon = club.tipo_negocio?.slug === "complejo" ? "🏟️" : club.tipo_negocio?.slug === "gimnasio" ? "💪" : "🏆";
                      const tipoBadge = club.tipo_negocio?.nombre || "Club";
                      return (
                        <a
                          key={club.id}
                          href={getClubAdminUrl(club.subdominio)}
                          onClick={() => setShowClubsDropdown(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 text-slate-900 transition group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{icon}</span>
                            <div className="text-left">
                              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                                {club.nombre}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {club.subdominio}.localhost:8080
                              </div>
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-slate-200">
                            {tipoBadge} ↗
                          </span>
                        </a>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 pt-1.5 mt-1">
                    <a
                      href={getGlobalLink("/registro-club")}
                      onClick={() => setShowClubsDropdown(false)}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      <span>+ Registrar nuevo Establecimiento</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

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
              {!ownedClub && (
                <a
                  href={getGlobalLink("/registro-club")}
                  className="hidden sm:inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                >
                  + Crear Club
                </a>
              )}
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
