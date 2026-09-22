"use client";

import React from "react";
import GrillaHoraria from "@/components/GrillaHoraria";
import {
  Sparkles,
  Camera,
  Sun,
  Flame,
  CheckCircle,
  Clock,
  Layers,
  Activity,
  ArrowRight,
} from "lucide-react";
import { TemplateProps } from "./BookingDirectTemplate";

export default function ModernShowcaseTemplate({
  subdomain,
  complejo,
  branding,
  canchas,
  selectedCanchaId,
  onSelectCanchaId,
  selectedCancha,
  tipoNegocioLabel,
  isAdmin,
  user,
  token,
}: TemplateProps) {
  const scrollToGrid = () => {
    const el = document.getElementById("modern-grid-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-12" data-testid="template-modern-showcase">
      {/* Premium Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border-b border-slate-800/80 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Showcase Deportivo Premium</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {complejo.nombre}
              </h1>
              {branding.eslogan ? (
                <p className="text-sm sm:text-base text-slate-300 font-medium">
                  {branding.eslogan}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-400">
                  Instalaciones de vanguardia para deportistas de alto nivel competitivo.
                </p>
              )}
            </div>

            <button
              onClick={scrollToGrid}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition cursor-pointer self-start lg:self-auto flex items-center gap-2 shadow-lg"
            >
              <span>Ver Grilla de Horarios</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Modern Court Cards Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Pistas & Ficha Técnica</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona una pista para conocer sus atributos técnicos y consultar horarios
            </p>
          </div>
        </div>

        {canchas.length === 0 ? (
          <div className="text-center rounded-3xl bg-slate-900 border border-slate-800 p-12 space-y-4">
            <h3 className="text-base font-bold text-white">No hay canchas registradas</h3>
            <p className="text-xs text-slate-400">Vuelve a consultar más tarde.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {canchas.map((c) => {
              const isSelected = selectedCancha?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCanchaId(c.id)}
                  data-testid={`btn-select-cancha-${c.id}`}
                  className={`rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 border ${
                    isSelected
                      ? "bg-slate-900 border-emerald-500 shadow-xl ring-2 ring-emerald-500/40"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: "var(--club-primary, #10b981)",
                          boxShadow:
                            "0 0 24px -2px color-mix(in srgb, var(--club-primary, #10b981) 40%, transparent)",
                          backgroundColor:
                            "color-mix(in srgb, var(--club-primary, #10b981) 8%, #0f172a)",
                        }
                      : undefined
                  }
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {c.deporte}
                      </span>
                      {isSelected ? (
                        <span
                          className="flex items-center gap-1 text-[11px] font-bold"
                          style={{ color: "var(--club-primary, #10b981)" }}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Seleccionada</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">Click para ver</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white">{c.nombre}</h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 capitalize">
                        {c.superficie ? c.superficie.replace(/_/g, " ") : "Pista Estándar"}
                      </div>
                    </div>

                    {/* Technical Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/80">
                        {c.techada ? "🏢 Cubierta" : "🌤️ Al aire libre"}
                      </span>

                      {c.tipo_pared && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                          🪟 {c.tipo_pared.replace(/_/g, " ")}
                        </span>
                      )}

                      {c.iluminacion && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Sun className="w-3 h-3 text-amber-400" />
                          <span>Iluminación LED</span>
                        </span>
                      )}

                      {c.camara_grabacion && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-950/40 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-purple-400" />
                          <span>Cámara HD</span>
                        </span>
                      )}

                      {c.climatizada && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-blue-400" />
                          <span>Climatizada</span>
                        </span>
                      )}

                      {c.permite_duracion_flexible && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Turnos Flexibles</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Tarifa Base</div>
                      <div
                        className="text-base font-black font-mono"
                        style={{ color: "var(--club-accent, #10b981)" }}
                      >
                        ${Number(c.precio_base).toLocaleString()}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        isSelected
                          ? "text-white"
                          : "bg-slate-800 text-slate-300 group-hover:bg-slate-700"
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: "var(--club-primary, #059669)" }
                          : undefined
                      }
                    >
                      {isSelected ? "Viendo Turnos ↓" : "Elegir Pista"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Grid Reservation Section */}
      {selectedCancha && (
        <section id="modern-grid-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pt-6">
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Turnos en Vivo: {selectedCancha.nombre}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona tu franja horaria preferida y confirma tu turno de manera 100% segura
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-xl self-start sm:self-auto">
                Tarifa: ${Number(selectedCancha.precio_base).toLocaleString()}
              </div>
            </div>

            <GrillaHoraria
              key={`${selectedCancha.id}-${selectedCancha.duracion_minutos}-${selectedCancha.permite_duracion_flexible}-${user ? user.id : "anon"}`}
              canchaId={selectedCancha.id}
              canchaNombre={selectedCancha.nombre}
              deporte={selectedCancha.deporte}
              subdomain={subdomain}
              duracionInicial={selectedCancha.duracion_minutos}
              permiteDuracionFlexible={selectedCancha.permite_duracion_flexible}
              duracionesPermitidas={selectedCancha.duraciones_permitidas}
              precioBase={Number(selectedCancha.precio_base)}
              precio90Min={selectedCancha.precio_90_min ? Number(selectedCancha.precio_90_min) : undefined}
              precio120Min={selectedCancha.precio_120_min ? Number(selectedCancha.precio_120_min) : undefined}
              isAdmin={isAdmin}
              token={token}
              porcentajeSena={complejo?.porcentaje_sena}
              tipoCobroReserva={complejo?.tipo_cobro_reserva}
            />
          </div>
        </section>
      )}
    </div>
  );
}
