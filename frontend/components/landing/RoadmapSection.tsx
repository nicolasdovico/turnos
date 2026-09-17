"use client";

import React from "react";
import { Coffee, Trophy, Flame, Zap, Rocket, Clock, CheckCircle2 } from "lucide-react";
import { LANDING_CONFIG } from "@/lib/landingConfig";

const roadmapIconMap: Record<string, React.ReactNode> = {
  Coffee: <Coffee className="w-6 h-6 text-amber-400" />,
  Trophy: <Trophy className="w-6 h-6 text-yellow-400" />,
  Flame: <Flame className="w-6 h-6 text-orange-400" />,
  Zap: <Zap className="w-6 h-6 text-cyan-400" />,
};

export default function RoadmapSection() {
  const roadmapFeatures = LANDING_CONFIG.features.filter((f) => f.status === "coming_soon");

  return (
    <section id="proximos-modulos" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-500 border border-amber-500/20 mb-3">
          <Rocket className="w-3.5 h-3.5" />
          <span>Evolución Continua del Software</span>
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Próximos Módulos en Desarrollo Activo
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          No compres un software estático que queda en el olvido. Nuestra plataforma suma constantemente herramientas avanzadas para digitalizar cada rincón de tu club.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {roadmapFeatures.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:scale-105 transition">
                  {roadmapIconMap[item.iconName] || <Zap className="w-6 h-6 text-amber-500" />}
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{item.badge}</span>
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {item.fullDesc}
              </p>

              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
                {item.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Se activará automáticamente al liberarse</span>
              <span className="text-emerald-700 font-bold">Sin costo de reinstalación</span>
            </div>
          </div>
        ))}
      </div>

      {/* Callout de innovación */}
      <div className="mt-10 rounded-2xl bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-white">
            ¿Tenés alguna necesidad puntual para tu complejo?
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Escuchamos a los administradores de clubes para priorizar las herramientas más útiles de nuestro roadmap.
          </p>
        </div>
        <a
          href="https://wa.me/?text=Hola%2C%20me%20gustar%C3%ADa%20consultar%20sobre%20la%20plataforma%20de%20turnos%20para%20mi%20club"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition shrink-0"
        >
          💬 Sugerir una Función
        </a>
      </div>
    </section>
  );
}
