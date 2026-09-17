"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import HeroSection from "@/components/landing/HeroSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import FeaturesShowcase from "@/components/landing/FeaturesShowcase";
import RoiCalculator from "@/components/landing/RoiCalculator";
import RoadmapSection from "@/components/landing/RoadmapSection";
import PricingOverview from "@/components/landing/PricingOverview";
import FaqSection from "@/components/landing/FaqSection";
import CtaBanner from "@/components/landing/CtaBanner";

export default function PortalPage() {
  const { user, token } = useAuth();
  const [demoClubUrl, setDemoClubUrl] = useState("http://padelpro.localhost:8080");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const hostname = window.location.hostname || "localhost";
      let base = "localhost";
      if (hostname && hostname.endsWith("turnos.com")) {
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
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Barra de navegación ancla rápida */}
      <nav className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-16 z-40 text-xs font-semibold text-slate-600 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-11">
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
              Portal Global de Complejos Deportivos
            </span>
            <a href="#comparativa" className="hover:text-emerald-600 transition">
              El Antes vs Después
            </a>
            <a href="#funcionalidades" className="hover:text-emerald-600 transition">
              Funcionalidades
            </a>
            <a href="#calculadora" className="hover:text-emerald-600 transition">
              Calculadora de Pérdidas
            </a>
            <a href="#proximos-modulos" className="hover:text-emerald-600 transition">
              Próximos Módulos
            </a>
            <a href="#planes" className="hover:text-emerald-600 transition">
              Planes & Precios
            </a>
            <a href="#faq" className="hover:text-emerald-600 transition">
              Preguntas Frecuentes
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={demoClubUrl}
              className="text-slate-500 hover:text-slate-900 transition text-[11px]"
            >
              Ver Demo Club
            </a>
            <Link
              href="/registro-club"
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-sm"
            >
              Prueba 30 Días Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Mis Establecimientos (Si el usuario autenticado es dueño de uno o más negocios) */}
      {userClubs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 text-left shadow-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="inline-block rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold mb-2">
                  Dueño de Establecimientos ({userClubs.length})
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Tus Paneles de Administración
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Ingresá a tu complejo para gestionar turnos, canchas, billeteras y caja:
                </p>
              </div>
              <Link
                href="/registro-club"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition shadow-sm"
              >
                + Registrar Otro Negocio
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userClubs.map((club: any) => {
                const icon =
                  club.tipo_negocio?.slug === "complejo"
                    ? "🏟️"
                    : club.tipo_negocio?.slug === "gimnasio"
                    ? "💪"
                    : "🏆";
                const tipoBadge = club.tipo_negocio?.nombre || "Club";
                const panelUrl = getClubAdminUrl(club.subdominio);
                const publicUrl = getClubPublicUrl(club.subdominio);

                return (
                  <div
                    key={club.id}
                    className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 hover:border-emerald-500/50 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-2xl">{icon}</span>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-500/30">
                          {tipoBadge}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{club.nombre}</h3>
                      <div className="text-xs text-slate-400 font-mono mt-1">
                        {club.subdominio}.localhost:8080
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2">
                      <a
                        href={panelUrl}
                        className="flex-1 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition"
                      >
                        ⚙️ Administrar
                      </a>
                      <a
                        href={publicUrl}
                        className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition"
                        title="Ver página pública de reservas"
                      >
                        🎾 Reservas
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. Hero Section con Headline de Dolor & Pitch */}
      <HeroSection demoClubUrl={demoClubUrl} />

      {/* 2. El Antes vs El Después */}
      <BeforeAfterSection />

      {/* 3. Funcionalidades Operativas Hoy */}
      <FeaturesShowcase />

      {/* 4. Calculadora Interactiva de Impacto Financiero (ROI) */}
      <RoiCalculator />

      {/* 5. Próximos Módulos en Desarrollo (Evolución del Software) */}
      <RoadmapSection />

      {/* 6. Planes & Precios (Prueba 30 Días) */}
      <PricingOverview />

      {/* 7. Preguntas Frecuentes */}
      <FaqSection />

      {/* 8. Banner Final de Cierre (CTA) */}
      <CtaBanner demoClubUrl={demoClubUrl} />
    </main>
  );
}
