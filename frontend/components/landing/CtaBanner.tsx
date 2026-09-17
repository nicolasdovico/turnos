"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";

export default function CtaBanner({ demoClubUrl }: { demoClubUrl: string }) {
  return (
    <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 p-8 sm:p-14 text-center text-white shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30 tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comenzá en 2 minutos</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Transformá la gestión de tu complejo hoy mismo
          </h2>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Sumate a los clubes que ya no pierden dinero en turnos vacíos ni tiempo atendiendo mensajes a deshora. Probá todas las funciones gratis por 30 días.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/registro-club"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
            >
              <span>Registrar mi Negocio (Prueba 30 Días)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={demoClubUrl}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition"
            >
              Ver Demo Club (Padel Pro)
            </a>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sin tarjeta de crédito requerida</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Cancelás cuando quieras sin penalidad</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Subdominio web propio incluido</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
