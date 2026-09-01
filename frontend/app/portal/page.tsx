"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function PortalPage() {
  const { user, token } = useAuth();
  const [demoClubUrl, setDemoClubUrl] = useState("http://padelpro.localhost:8080");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const hostname = window.location.hostname;
      let base = "localhost";
      if (hostname.endsWith("turnos.com")) {
        base = "turnos.com";
      }
      setDemoClubUrl(`${protocol}//padelpro.${base}${port}`);
    }
  }, []);

  const userClubs = user?.complejos || [];

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

  const getClubPublicUrl = (subdomain: string) => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const hostname = window.location.hostname;
      let baseHost = "localhost";
      if (hostname.endsWith("turnos.com")) {
        baseHost = "turnos.com";
      }
      return `${protocol}//${subdomain}.${baseHost}${port}`;
    }
    return `http://${subdomain}.localhost:8080`;
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 sm:p-10 text-center">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-10 shadow-2xl border border-slate-100">
        
        {/* Mis Establecimientos (Si el usuario es dueño de uno o más negocios) */}
        {userClubs.length > 0 && (
          <div className="mb-10 rounded-3xl bg-slate-900 text-white p-6 sm:p-8 text-left shadow-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="inline-block rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold mb-2">
                  Dueño de Establecimientos ({userClubs.length})
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Tus Paneles de Administración
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Elige a qué negocio deseas ingresar para gestionar turnos, canchas y caja:
                </p>
              </div>
              <Link
                href="/registro-club"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition shadow-sm"
              >
                + Registrar Otro Negocio
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userClubs.map((club: any) => {
                const icon = club.tipo_negocio?.slug === "complejo" ? "🏟️" : club.tipo_negocio?.slug === "gimnasio" ? "💪" : "🏆";
                const tipoBadge = club.tipo_negocio?.nombre || "Club";
                const panelUrl = getClubAdminUrl(club.subdominio);
                const publicUrl = getClubPublicUrl(club.subdominio);

                return (
                  <div
                    key={club.id}
                    className="rounded-2xl bg-slate-950/70 border border-slate-800 p-5 hover:border-emerald-500/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-500/30">
                          {tipoBadge}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{club.nombre}</h3>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        {club.subdominio}.localhost:8080
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
                      <a
                        href={panelUrl}
                        className="flex-1 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition"
                      >
                        ⚙️ Administrar {tipoBadge}
                      </a>
                      <a
                        href={publicUrl}
                        className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-300 transition"
                        title="Ver página pública de reservas"
                      >
                        🎾 Ver Reservas
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Banner */}
        <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800 mb-4 tracking-wide">
          ⚡ Marketplace & Plataforma SaaS
        </span>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Portal Global de Complejos Deportivos
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
          Encuentra tu club favorito, reserva turnos de pádel, fútbol y tenis en tiempo real, o digitaliza y administra tu propio complejo con subdominio dedicado.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/registro-club"
            className="rounded-2xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition"
          >
            🚀 Registrar mi Negocio (Prueba 14 Días)
          </Link>
          <a
            href={demoClubUrl}
            className="rounded-2xl bg-slate-100 px-7 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Ver Demo Club (Padel Pro)
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left border-t border-slate-100 pt-8">
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-bold text-slate-900 text-sm">Reservas & Agenda</h3>
            <p className="mt-1 text-xs text-slate-500">
              Grilla en tiempo real, bloqueos atómicos sin dobles reservas y cobro de señas.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-2xl mb-2">🍔</div>
            <h3 className="font-bold text-slate-900 text-sm">POS & Buffet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Control de stock, comandas asociadas a turnos y arqueo de caja diario.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="font-bold text-slate-900 text-sm">Domótica IoT</h3>
            <p className="mt-1 text-xs text-slate-500">
              Encendido y apagado automatizado de luces de canchas según horarios de turnos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
