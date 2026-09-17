"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Calculator, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export default function RoiCalculator() {
  const [canchas, setCanchas] = useState(4);
  const [precioTurno, setPrecioTurno] = useState(12000);
  const [turnosCaidosMes, setTurnosCaidosMes] = useState(8);
  const [porcentajeSena, setPorcentajeSena] = useState(50);

  const perdidaMensual = turnosCaidosMes * precioTurno;
  const perdidaAnual = perdidaMensual * 12;
  const recuperadoMes = Math.round(perdidaMensual * (porcentajeSena / 100));
  const recuperadoAnual = recuperadoMes * 12;

  return (
    <section id="calculadora" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Glow background effect */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-3">
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculadora de Impacto Financiero</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ¿Cuánto dinero pierde tu club por turnos colgados?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400">
              Ajustá los números a la realidad de tu complejo y mirá cuánto dinero recuperás cobrando seña con nuestra plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Controles de la Calculadora */}
            <div className="lg:col-span-7 space-y-6 bg-slate-950/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
              {/* Slider 1: Canchas */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <label htmlFor="input-canchas" className="font-bold text-slate-200">Cantidad de Canchas:</label>
                  <span className="font-mono font-black text-emerald-400 text-base">{canchas} canchas</span>
                </div>
                <input
                  id="input-canchas"
                  type="range"
                  min={1}
                  max={12}
                  value={canchas}
                  onChange={(e) => setCanchas(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1 cancha</span>
                  <span>6 canchas</span>
                  <span>12 canchas</span>
                </div>
              </div>

              {/* Slider 2: Precio promedio por turno */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <label htmlFor="input-precio" className="font-bold text-slate-200">Precio Promedio por Turno:</label>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    ${precioTurno.toLocaleString("es-AR")}
                  </span>
                </div>
                <input
                  id="input-precio"
                  type="range"
                  min={5000}
                  max={30000}
                  step={1000}
                  value={precioTurno}
                  onChange={(e) => setPrecioTurno(Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$5.000</span>
                  <span>$15.000</span>
                  <span>$30.000</span>
                </div>
              </div>

              {/* Slider 3: Turnos caídos por mes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <label htmlFor="input-turnos-caidos" className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span>Turnos no presentados / caídos por mes:</span>
                    <span className="text-amber-400 text-[11px] font-normal">(sin seña previa)</span>
                  </label>
                  <span className="font-mono font-black text-rose-400 text-base">{turnosCaidosMes} turnos</span>
                </div>
                <input
                  id="input-turnos-caidos"
                  type="range"
                  min={1}
                  max={30}
                  value={turnosCaidosMes}
                  onChange={(e) => setTurnosCaidosMes(Number(e.target.value))}
                  className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1 turno</span>
                  <span>15 turnos</span>
                  <span>30 turnos</span>
                </div>
              </div>

              {/* Seña Selector */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block mb-2">Modalidad de cobro online:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPorcentajeSena(50)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                      porcentajeSena === 50
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    Seña del 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPorcentajeSena(100)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                      porcentajeSena === 100
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    Pago Total (100%)
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado Visual de Pérdida vs Recuperación */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card de Pérdida actual */}
              <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-900/50">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Dinero que hoy se pierde en turnos vacíos</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-rose-300">
                  ${perdidaMensual.toLocaleString("es-AR")}
                  <span className="text-xs text-rose-400 font-sans font-normal ml-1">/mes</span>
                </div>
                <p className="text-[11px] text-rose-300/80 mt-1">
                  Representa una pérdida de <strong>${perdidaAnual.toLocaleString("es-AR")}</strong> al año en horas que nadie pagó.
                </p>
              </div>

              {/* Card de Recuperación con el SaaS */}
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 shadow-lg shadow-emerald-950/50">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>Recaudación blindada con señas automáticas</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-300">
                  +${recuperadoMes.toLocaleString("es-AR")}
                  <span className="text-xs text-emerald-400 font-sans font-normal ml-1">/mes</span>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-1.5 text-xs text-emerald-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Recuperás <strong>${recuperadoAnual.toLocaleString("es-AR")}</strong> anuales garantizados.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>El costo del software se amortiza solo con 1 o 2 turnos recuperados.</span>
                  </div>
                </div>

                <Link
                  href="/registro-club"
                  className="mt-5 w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950"
                >
                  <span>Probar 30 Días Gratis sin Riesgo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
