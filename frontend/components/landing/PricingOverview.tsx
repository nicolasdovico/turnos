"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

export default function PricingOverview() {
  const plans = [
    {
      nombre: "Bronce",
      slug: "bronce",
      precio: "$29",
      periodo: "/mes",
      desc: "Para clubes que inician y buscan digitalizar su grilla sin complicaciones.",
      features: [
        "Motor de Reservas & Grilla en Tiempo Real",
        "Bloqueos Atómicos Anti-Sobreturno (10 min)",
        "Subdominio Propio y CMS Web Multitenant",
        "Cobro de Señas Online con Mercado Pago",
        "Billetera Virtual de Clientes",
      ],
      isPopular: false,
    },
    {
      nombre: "Plata",
      slug: "plata",
      precio: "$59",
      periodo: "/mes",
      desc: "El plan ideal para complejos con alto volumen de turnos fijos y abonados.",
      features: [
        "Todo lo incluido en el Plan Bronce",
        "Turnos Fijos Semanales (series por 6 meses)",
        "Liberación de Fechas Puntuales a Lista de Espera",
        "Tarifas Inteligentes de Luz (Horario Invierno/Verano)",
        "Arqueo y Control de Caja Diaria en Mostrador",
        "Próximamente: Punto de Venta & Buffet (POS)",
      ],
      isPopular: true,
    },
    {
      nombre: "Oro",
      slug: "oro",
      precio: "$99",
      periodo: "/mes",
      desc: "Tecnología de punta integral para clubes de primer nivel y torneos.",
      features: [
        "Todo lo incluido en el Plan Plata",
        "Soporte Prioritario VIP 24/7",
        "Subida de Imágenes a Cloudflare R2 / S3",
        "Próximamente: Gestor de Torneos, Fixtures & Brackets",
        "Próximamente: Partidos Abiertos & Split Payment",
        "Próximamente: Domótica IoT (Control Automático de Luces)",
      ],
      isPopular: false,
    },
  ];

  return (
    <section id="planes" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Precios Simples y Transparentes</span>
        </span>
        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Elegí el plan que mejor se adapte al tamaño de tu club
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          Probá cualquier plan <strong>gratis durante 30 días</strong>. Sin costo de instalación y sin tarjeta de crédito.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p) => (
          <div
            key={p.slug}
            className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
              p.isPopular
                ? "bg-slate-900 text-white shadow-2xl ring-2 ring-emerald-500 scale-100 lg:scale-105"
                : "bg-white text-slate-900 border border-slate-200/80 shadow-lg hover:shadow-xl"
            }`}
          >
            {p.isPopular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Recomendado para Clubes</span>
              </span>
            )}

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className={`text-xl font-black ${p.isPopular ? "text-white" : "text-slate-900"}`}>
                  {p.nombre}
                </h3>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  p.isPopular ? "bg-slate-800 text-emerald-400" : "bg-slate-100 text-slate-600"
                }`}>
                  30 Días Gratis
                </span>
              </div>

              <p className={`text-xs min-h-[36px] ${p.isPopular ? "text-slate-300" : "text-slate-500"}`}>
                {p.desc}
              </p>

              <div className="mt-5 mb-6 pt-5 border-t border-slate-200/40">
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black font-mono tracking-tight ${p.isPopular ? "text-white" : "text-slate-900"}`}>
                    {p.precio}
                  </span>
                  <span className={`text-xs ${p.isPopular ? "text-slate-400" : "text-slate-500"}`}>
                    USD {p.periodo}
                  </span>
                </div>
                <span className={`text-[11px] block mt-1 ${p.isPopular ? "text-emerald-400" : "text-emerald-600 font-semibold"}`}>
                  ✓ Primeros 30 días sin cargo
                </span>
              </div>

              <ul className="space-y-3 pt-2">
                {p.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        p.isPopular ? "text-emerald-400" : "text-emerald-600"
                      }`}
                    />
                    <span className={p.isPopular ? "text-slate-200" : "text-slate-700"}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/20">
              <Link
                href="/registro-club"
                className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 ${
                  p.isPopular
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                <span>Probar Plan {p.nombre} Gratis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/planes"
          className="text-xs sm:text-sm font-bold text-slate-600 hover:text-emerald-600 transition inline-flex items-center gap-1.5"
        >
          <span>Ver tabla comparativa detallada de todos los planes</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
