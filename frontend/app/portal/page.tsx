"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getTenantAdminUrl, getTenantPublicUrl, getTenantDisplayDomain } from "@/lib/navigationUrls";
import HeroSection from "@/components/landing/HeroSection";
import BeforeAfterSection from "@/components/landing/BeforeAfterSection";
import FeaturesShowcase from "@/components/landing/FeaturesShowcase";
import RoiCalculator from "@/components/landing/RoiCalculator";
import RoadmapSection from "@/components/landing/RoadmapSection";
import PricingOverview from "@/components/landing/PricingOverview";
import ContactSection from "@/components/landing/ContactSection";
import FaqSection from "@/components/landing/FaqSection";
import CtaBanner from "@/components/landing/CtaBanner";
import JsonLd from "@/components/landing/JsonLd";
import MainFooter from "@/components/landing/MainFooter";

export default function PortalPage() {
  const { user, token } = useAuth();
  const [demoClubUrl, setDemoClubUrl] = useState("/tenants/padelpro");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      const hostname = window.location.hostname || "localhost";
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === "::1" || hostname.includes(":");

      if (isIp) {
        setDemoClubUrl("/tenants/padelpro");
      } else {
        let base = "localhost";
        if (hostname && (hostname.endsWith("turnosflow.com") || hostname === "turnosflow.com")) {
          base = "turnosflow.com";
        } else if (hostname && (hostname.endsWith("turnos.com") || hostname === "turnos.com")) {
          base = "turnos.com";
        }
        setDemoClubUrl(`${protocol}//padelpro.${base}${port}`);
      }
    }
  }, []);

  const userClubs = user?.complejos || [];
  const playerClubs = user?.clubes_jugador || [];
  const isOwner = userClubs.length > 0;
  const isPlayer = playerClubs.length > 0;

  const getClubAdminUrl = (subdomain: string) => getTenantAdminUrl(subdomain, token);
  const getClubPublicUrl = (subdomain: string) => getTenantPublicUrl(subdomain);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Mis Clubes como Jugador (Si el usuario autenticado tiene historial de turnos/reservas en clubes) */}
      {isPlayer && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 text-left shadow-xl border border-emerald-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="inline-block rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold mb-2">
                  🎾 Perfil de Jugador ({playerClubs.length} {playerClubs.length === 1 ? "Club" : "Clubes"})
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Tus Clubes para Reservar Turnos
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Accedé rápidamente a la web y grilla horaria de tus clubes habituales:
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/jugar"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition shadow-md shadow-emerald-900/30"
                >
                  📍 Explorar Más Canchas
                </Link>
                {!isOwner && (
                  <Link
                    href="/registro-club"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition"
                  >
                    + Registrar mi Club
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playerClubs.map((club: any) => {
                const publicUrl = getClubPublicUrl(club.subdominio);
                return (
                  <div
                    key={club.id}
                    className="rounded-2xl bg-slate-900/90 border border-emerald-900/40 p-5 hover:border-emerald-500/60 transition flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      {club.logo_url ? (
                        <img
                          src={club.logo_url}
                          alt={club.nombre}
                          className="w-12 h-12 rounded-xl object-cover bg-white p-1 border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xl">
                          🎾
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">{club.nombre}</h3>
                        <p className="text-xs text-emerald-400 font-medium capitalize mt-0.5">
                          {club.deporte_principal || "Pádel"}
                        </p>
                        {club.ciudad && (
                          <p className="text-[11px] text-slate-400 mt-1">📍 {club.ciudad}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {getTenantDisplayDomain(club.subdominio)}
                      </span>
                      <a
                        href={publicUrl}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                      >
                        Reservar Turno →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
                        {getTenantDisplayDomain(club.subdominio)}
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

      {/* 7. Contacto Directo, Videollamada & Onboarding Bonificado */}
      <ContactSection />

      {/* 8. Preguntas Frecuentes */}
      <FaqSection />

      {/* 9. Banner Final de Cierre (CTA) */}
      <CtaBanner demoClubUrl={demoClubUrl} />

      {/* 10. Footer General del SaaS con Links Internos SEO */}
      <MainFooter />

      {/* Botón flotante de WhatsApp comercial de TurnosFlow */}
      <aside
        aria-label="Contacto comercial por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center group"
        data-testid="landing-floating-whatsapp-widget"
      >
        <div className="hidden sm:flex items-center bg-slate-900/95 text-white text-xs font-semibold px-3 py-2 rounded-2xl shadow-xl border border-slate-700/80 mr-3 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span>¿Querés probar TurnosFlow en tu club? <strong className="text-emerald-400">¡Chateá con nosotros!</strong></span>
        </div>
        <a
          href="https://wa.me/5491149790220?text=%C2%A1Hola!%20Vi%20TurnosFlow%20y%20quiero%20hacer%20unas%20consultas%20para%20implementarlo%20en%20mi%20complejo."
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xl shadow-emerald-950/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Consultar por WhatsApp con un asesor"
          aria-label="Consultar por WhatsApp con un asesor comercial"
          data-testid="landing-floating-whatsapp-button"
        >
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.9-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </span>
        </a>
      </aside>

      {/* SEO: Marcado Estructurado JSON-LD (Schema.org SoftwareApplication, Organization & FAQPage) */}
      <JsonLd />
    </main>
  );
}
