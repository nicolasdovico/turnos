"use client";

import React, { useState } from "react";
import {
  Calendar,
  Wallet,
  Repeat,
  SunMoon,
  Users,
  Globe,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { LANDING_CONFIG, LandingFeature } from "@/lib/landingConfig";

const iconMap: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-5 h-5 text-emerald-400" />,
  Wallet: <Wallet className="w-5 h-5 text-emerald-400" />,
  Repeat: <Repeat className="w-5 h-5 text-emerald-400" />,
  SunMoon: <SunMoon className="w-5 h-5 text-emerald-400" />,
  Users: <Users className="w-5 h-5 text-emerald-400" />,
  Globe: <Globe className="w-5 h-5 text-emerald-400" />,
};

export default function FeaturesShowcase() {
  const activeFeatures = LANDING_CONFIG.features.filter((f) => f.status === "available");
  const [selectedId, setSelectedId] = useState<string>(activeFeatures[0]?.id || "reservas-grilla");
  const selectedFeature = activeFeatures.find((f) => f.id === selectedId) || activeFeatures[0];

  return (
    <section id="funcionalidades" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Funcionalidades Operativas Hoy</span>
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Todo lo que tu complejo necesita para funcionar de forma autónoma
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          Herramientas diseñadas específicamente para canchas de pádel, fútbol y tenis en Argentina y Latinoamérica.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Selector de Features (Pestañas a la izquierda) */}
        <div className="lg:col-span-5 space-y-2.5">
          {activeFeatures.map((f) => {
            const isSelected = f.id === selectedId;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedId(f.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isSelected
                        ? "bg-slate-800 border-slate-700"
                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                    }`}
                  >
                    {iconMap[f.iconName] || <Calendar className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {f.title}
                    </h3>
                    <p className={`text-xs truncate max-w-[210px] sm:max-w-[260px] ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                      {f.shortDesc}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {f.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detalle en profundidad de la Feature seleccionada */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900 text-white p-6 sm:p-10 border border-slate-800 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            {iconMap[selectedFeature.iconName]}
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 mb-4">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{selectedFeature.category.toUpperCase()} • 100% DISPONIBLE</span>
            </div>

            <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {selectedFeature.title}
            </h3>

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              {selectedFeature.fullDesc}
            </p>

            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Puntos clave incluidos:
              </h4>
              <ul className="space-y-2.5">
                {selectedFeature.highlights.map((h, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span>Configurable desde el Panel de Administración de tu Club</span>
            <span className="font-mono text-emerald-400 font-bold">Activo en todos los planes</span>
          </div>
        </div>
      </div>
    </section>
  );
}
