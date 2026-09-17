"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  ShieldCheck,
  SunMoon,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { LANDING_CONFIG } from "@/lib/landingConfig";

export default function HeroSection({ demoClubUrl }: { demoClubUrl: string }) {
  return (
    <section className="relative pt-8 pb-16 sm:pt-14 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-emerald-400/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="text-center max-w-4xl mx-auto">
        {/* Category Badge */}
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-4 py-1.5 text-xs font-black tracking-wide uppercase shadow-sm mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>{LANDING_CONFIG.hero.badge}</span>
        </span>

        {/* Main Pitch Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
          Llená las canchas de tu club y cobrá señas{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
            sin vivir atado a WhatsApp
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          {LANDING_CONFIG.hero.subtitle}
        </p>

        {/* Dual Call To Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/registro-club"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            <span>🚀 Registrar mi Negocio (Prueba 30 Días)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href={demoClubUrl}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>🎾 Ver Demo Club (Padel Pro)</span>
          </a>
        </div>

        {/* Free trial guarantee text */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Prueba 100% gratuita por 30 días • Sin tarjeta de crédito • Activación inmediata</span>
        </div>

        {/* KPI / Stats Ribbon */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm max-w-3xl mx-auto">
          {LANDING_CONFIG.hero.stats.map((st, i) => (
            <div key={i} className="text-center p-2">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
                {st.value}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {st.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Visual Mockup: The Power of the Real-Time Grid */}
      <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-slate-950 border border-slate-800 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Window Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-mono text-[11px] text-slate-500 hidden sm:inline">
              padelpro.localhost:8080/panel
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Grilla en Vivo</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
              Viernes 18-09-2026
            </span>
          </div>
        </div>

        {/* Mock Scheduling Grid Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Cancha 1 */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs">Cancha 1 Panorámica</h4>
                <span className="text-[10px] text-slate-400">Pádel • Cristal 12mm</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                $12.000 / h
              </span>
            </div>

            {/* Turno Ocupado con Seña */}
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-left space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-300">18:00 - 19:30 hs</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase">
                  Seña 50% Abonada
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-200 truncate">
                Agustín Tapia • Turno Fijo
              </p>
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Cobro online confirmado</span>
              </div>
            </div>

            {/* Turno con Tarifa Luz Artificial */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-amber-500/30 text-left space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-amber-300">20:00 - 21:30 hs</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center gap-1">
                  <SunMoon className="w-3 h-3" />
                  <span>Tarifa con Luz</span>
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-300">
                Federico Chingotto • Turno Ocasional
              </p>
              <div className="text-[10px] text-slate-400">
                Abonado total: <strong>$15.000</strong> (con luz)
              </div>
            </div>
          </div>

          {/* Cancha 2 */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs">Cancha 2 Techada</h4>
                <span className="text-[10px] text-slate-400">Pádel • Césped Pro</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                $14.000 / h
              </span>
            </div>

            {/* Turno Libre Bloqueado Temporalmente */}
            <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-500/40 text-left space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-blue-300">19:00 - 20:30 hs</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>08:42 min restantes</span>
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Cliente reservando en checkout...
              </p>
              <span className="text-[9px] text-slate-400 block">
                Bloqueo atómico anti-doble reserva
              </span>
            </div>

            {/* Turno Disponible */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-center space-y-1 hover:border-emerald-500/60 transition cursor-pointer">
              <span className="font-bold text-slate-300 text-[11px] block">21:00 - 22:30 hs</span>
              <span className="text-[10px] text-emerald-400 font-bold inline-flex items-center gap-1">
                <span>Libre para Reservar</span>
              </span>
            </div>
          </div>

          {/* Cancha 3 & Widget Billetera */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-xs">Billetera Virtual del Club</h4>
                <span className="text-[10px] text-slate-400">Retención de fondos & Clientes</span>
              </div>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>

            {/* Widget Mini Extracto Billetera */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[10px]">Saldo en Custodia</span>
                <span className="font-mono font-bold text-emerald-400">$84.500,00</span>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>+ Reembolso lluvia Cancha 1</span>
                  <span className="text-emerald-400 font-mono">+$6.000</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>- Uso en reserva nocturna</span>
                  <span className="text-rose-400 font-mono">-$6.000</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-center">
              <p className="text-[10px] text-emerald-300 font-semibold">
                🛡️ Si llueve, el dinero no sale del club: queda en saldo para el próximo turno.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
