"use client";

import React from "react";
import { XCircle, CheckCircle2, Zap } from "lucide-react";
import { LANDING_CONFIG } from "@/lib/landingConfig";

export default function BeforeAfterSection() {
  return (
    <section id="comparativa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-300 border border-slate-700 mb-3">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>El Antes y el Después de tu Club</span>
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Dejá atrás el caos manual y pasá al control profesional
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          Descubrí cómo cambia el día a día de tu complejo deportivo cuando automatizás las reservas y los cobros.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Columna: Sin la Plataforma (El Pasado) */}
        <div className="rounded-3xl bg-rose-50/70 border border-rose-200/80 p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 pb-4 border-b border-rose-200">
            <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg">
              ✕
            </span>
            <div>
              <h3 className="text-lg font-black text-rose-950">Gestión Tradicional (Sin Sistema)</h3>
              <p className="text-xs text-rose-700">Pérdida constante de tiempo y turnos vacíos</p>
            </div>
          </div>

          <div className="space-y-4">
            {LANDING_CONFIG.beforeAfter.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-rose-900 leading-relaxed font-medium">
                  {item.pain}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: Con la Plataforma (El Presente) */}
        <div className="rounded-3xl bg-emerald-950 border border-emerald-500/40 p-6 sm:p-8 space-y-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-bl-xl">
            Solución Inteligente
          </div>

          <div className="flex items-center gap-2.5 pb-4 border-b border-emerald-800">
            <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
              ✓
            </span>
            <div>
              <h3 className="text-lg font-black text-white">Con Nuestra Plataforma SaaS</h3>
              <p className="text-xs text-emerald-300">Club operativo 24/7 y recaudación asegurada</p>
            </div>
          </div>

          <div className="space-y-4">
            {LANDING_CONFIG.beforeAfter.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-medium">
                  {item.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
