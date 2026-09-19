"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface PlanItem {
  id: number;
  nombre: string;
  slug: string;
  precio_mensual: number;
  canchas_incluidas?: number;
  precio_cancha_adicional?: number;
  modulos?: { id: number; nombre: string; slug: string }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function PlanesPage() {
  const [calculadoraCanchas, setCalculadoraCanchas] = useState<number>(4);
  const [planes, setPlanes] = useState<PlanItem[]>([
    {
      id: 1,
      nombre: "Bronce",
      slug: "bronce",
      precio_mensual: 29,
      canchas_incluidas: 2,
      precio_cancha_adicional: 8,
      modulos: [
        { id: 1, nombre: "Reservas y Agenda en Tiempo Real", slug: "reservas" },
        { id: 2, nombre: "CMS Web & Landing Page Propia", slug: "cms_web" },
        { id: 3, nombre: "Subdominio Personalizado", slug: "subdominio" },
        { id: 4, nombre: "Soporte Estándar", slug: "soporte" },
      ],
    },
    {
      id: 2,
      nombre: "Plata",
      slug: "plata",
      precio_mensual: 59,
      canchas_incluidas: 4,
      precio_cancha_adicional: 10,
      modulos: [
        { id: 1, nombre: "Todo lo del Plan Bronce", slug: "reservas" },
        { id: 2, nombre: "Turnos Fijos y Recurrentes", slug: "turnos_fijos" },
        { id: 3, nombre: "Partidos Abiertos & Split Payment", slug: "split_payment" },
        { id: 4, nombre: "Punto de Venta (POS) & Control de Buffet", slug: "pos_buffet" },
        { id: 5, nombre: "Arqueo Ciego de Caja Diaria", slug: "caja" },
      ],
    },
    {
      id: 3,
      nombre: "Oro",
      slug: "oro",
      precio_mensual: 99,
      canchas_incluidas: 6,
      precio_cancha_adicional: 12,
      modulos: [
        { id: 1, nombre: "Todo lo del Plan Plata", slug: "plata" },
        { id: 2, nombre: "Gestor de Torneos, Llaves y Fixtures", slug: "torneos" },
        { id: 3, nombre: "Domótica IoT: Control Automático de Luces", slug: "domotica" },
        { id: 4, nombre: "Subida a S3/R2 con Presigned URLs", slug: "storage" },
        { id: 5, nombre: "Soporte Prioritario 24/7", slug: "soporte_oro" },
      ],
    },
  ]);

  useEffect(() => {
    fetch(`${API_BASE}/planes`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setPlanes(data.data);
        }
      })
      .catch((e) => console.log("Usando lista local de planes:", e));
  }, []);

  const courtCapacityComparison = [
    { name: "Canchas base incluidas", bronce: "Hasta 2 canchas", plata: "Hasta 4 canchas", oro: "Hasta 6 canchas" },
    { name: "Costo por cancha extra", bronce: "+$8 / mes c/u", plata: "+$10 / mes c/u", oro: "+$12 / mes c/u" },
    { name: "Límite máximo de canchas", bronce: "Ilimitadas (escalable)", plata: "Ilimitadas (escalable)", oro: "Ilimitadas (escalable)" },
  ];

  const featuresComparison = [
    { name: "Motor de Reservas y Grilla Horaria", bronce: true, plata: true, oro: true },
    { name: "Subdominio y CMS Web Multitenant", bronce: true, plata: true, oro: true },
    { name: "Bloqueos Atómicos Anti Doble Reserva (Redis)", bronce: true, plata: true, oro: true },
    { name: "Turnos Fijos y Recurrentes Semanales", bronce: false, plata: true, oro: true },
    { name: "Matchmaking & Split Payment (Pago Fraccionado)", bronce: false, plata: true, oro: true },
    { name: "Punto de Venta (POS) & Inventario de Buffet", bronce: false, plata: true, oro: true },
    { name: "Arqueo y Control de Caja Diaria", bronce: false, plata: true, oro: true },
    { name: "Gestor de Torneos, Fixtures y Tablas", bronce: false, plata: false, oro: true },
    { name: "Domótica IoT (Encendido Automático de Luces)", bronce: false, plata: false, oro: true },
    { name: "Subida Segura de Imágenes S3/Cloudflare R2", bronce: false, plata: false, oro: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800 mb-4 tracking-wide">
          ⚡ Precios Simples y Transparentes
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          Planes diseñados para potenciar tu Club
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Digitaliza tu complejo deportivo con grilla interactiva, pagos automáticos y control total. 
          Prueba cualquier plan gratis durante 14 días sin necesidad de ingresar tarjeta.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {planes.map((p) => {
          const isPopular = p.slug === "plata" || p.slug === "oro";
          const isOro = p.slug === "oro";
          const canchasBase = p.canchas_incluidas ?? (p.slug === "bronce" ? 2 : p.slug === "plata" ? 4 : 6);
          const precioExtra = p.precio_cancha_adicional ?? (p.slug === "bronce" ? 8 : p.slug === "plata" ? 10 : 12);

          return (
            <div
              key={p.slug}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                isOro
                  ? "bg-slate-900 text-white shadow-2xl ring-2 ring-emerald-500 scale-105"
                  : "bg-white text-slate-900 border border-slate-200 shadow-lg hover:shadow-xl"
              }`}
            >
              {isOro && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                  Más Completo
                </span>
              )}

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-2xl font-black capitalize ${isOro ? "text-white" : "text-slate-900"}`}>
                    {p.nombre}
                  </h3>
                  {p.slug === "plata" && (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1">
                      Popular
                    </span>
                  )}
                </div>

                <p className={`text-xs mb-6 ${isOro ? "text-slate-300" : "text-slate-500"}`}>
                  {p.slug === "bronce" && "Ideal para clubes que inician con reservas y presencia digital básica."}
                  {p.slug === "plata" && "Para complejos en crecimiento que requieren buffet, caja y pagos divididos."}
                  {p.slug === "oro" && "Solución definitiva con torneos oficiales, domótica IoT y máxima automatización."}
                </p>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tight">${p.precio_mensual}</span>
                  <span className={`text-sm ${isOro ? "text-slate-400" : "text-slate-500"}`}>/ mes</span>
                </div>

                {/* Cupo de Canchas y Costo Extra */}
                <div className={`mb-6 rounded-2xl p-4 border transition ${
                  isOro 
                    ? "bg-slate-800/80 border-slate-700 text-slate-200" 
                    : "bg-emerald-50/50 border-emerald-100 text-slate-700"
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>🏟️</span> Capacidad base:
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      isOro ? "bg-emerald-500 text-slate-950" : "bg-emerald-600 text-white"
                    }`}>
                      Hasta {canchasBase} canchas
                    </span>
                  </div>
                  <div className={`text-[11px] ${isOro ? "text-slate-300" : "text-slate-600"}`}>
                    +${precioExtra}/mes por cancha extra
                  </div>
                </div>

                <div className="border-t border-slate-200/20 pt-6">
                  <div className={`text-xs font-bold uppercase tracking-wider mb-4 ${isOro ? "text-emerald-400" : "text-slate-500"}`}>
                    Módulos Incluidos:
                  </div>
                  <ul className="space-y-3 text-sm">
                    {p.modulos?.map((m, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="text-emerald-500 font-bold text-base leading-none">✓</span>
                        <span className={isOro ? "text-slate-200" : "text-slate-700"}>{m.nombre}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href={`/registro-club?plan=${p.slug}`}
                  className={`block w-full text-center rounded-2xl py-3.5 text-sm font-extrabold shadow-md transition ${
                    isOro
                      ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                  }`}
                >
                  Comenzar Prueba Gratis (14 Días)
                </Link>
                <div className={`text-center text-[11px] mt-2.5 ${isOro ? "text-slate-400" : "text-slate-500"}`}>
                  Sin tarjeta requerida • Cancela cuando quieras
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* SIMULADOR / CALCULADORA INTERACTIVA DE PRESUPUESTO */}
      {/* =================================================================== */}
      <div className="mt-20 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 sm:p-12 text-white shadow-2xl border border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 mb-4 tracking-wide">
            🧮 Calculadora de Presupuesto Transparente
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            ¿Cuántas canchas tiene tu complejo?
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Ajusta la cantidad de canchas y descubre al instante el abono mensual exacto para cada plan.
          </p>

          {/* Slider & Selector */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 bg-slate-950/70 p-6 rounded-2xl border border-slate-700/80 max-w-xl mx-auto shadow-inner">
            <div className="flex items-center gap-4 w-full sm:w-72">
              <button
                type="button"
                onClick={() => setCalculadoraCanchas(Math.max(1, calculadoraCanchas - 1))}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xl transition cursor-pointer select-none"
                aria-label="Disminuir canchas"
              >
                -
              </button>
              <input
                type="range"
                min="1"
                max="20"
                value={calculadoraCanchas}
                onChange={(e) => setCalculadoraCanchas(parseInt(e.target.value) || 1)}
                className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setCalculadoraCanchas(Math.min(25, calculadoraCanchas + 1))}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xl transition cursor-pointer select-none"
                aria-label="Aumentar canchas"
              >
                +
              </button>
            </div>
            <div className="text-center sm:text-left min-w-[130px]">
              <div className="text-3xl font-black text-emerald-400">
                {calculadoraCanchas} {calculadoraCanchas === 1 ? "cancha" : "canchas"}
              </div>
              <div className="text-[11px] text-slate-400">a administrar</div>
            </div>
          </div>
        </div>

        {/* Simulador Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {planes.map((p) => {
            const baseQuota = p.canchas_incluidas ?? (p.slug === "bronce" ? 2 : p.slug === "plata" ? 4 : 6);
            const extraPrice = p.precio_cancha_adicional ?? (p.slug === "bronce" ? 8 : p.slug === "plata" ? 10 : 12);
            const extraCount = Math.max(0, calculadoraCanchas - baseQuota);
            const extraCost = extraCount * extraPrice;
            const totalCost = Number(p.precio_mensual) + extraCost;
            const isOro = p.slug === "oro";

            return (
              <div
                key={`calc-${p.slug}`}
                className={`rounded-2xl p-6 border flex flex-col justify-between transition ${
                  isOro
                    ? "bg-slate-800/90 border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30"
                    : "bg-slate-900/80 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-lg text-white capitalize">Plan {p.nombre}</h3>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Base: {baseQuota} canchas
                    </span>
                  </div>

                  <div className="space-y-2 text-xs py-3 border-y border-slate-800 my-3">
                    <div className="flex justify-between text-slate-300">
                      <span>Tarifa base plan:</span>
                      <span className="font-bold text-white">${p.precio_mensual}/mes</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Canchas extras ({extraCount}):</span>
                      <span className={`font-bold ${extraCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {extraCount > 0 ? `+$${extraCost}/mes ($${extraPrice} c/u)` : "$0 (dentro del cupo)"}
                      </span>
                    </div>
                  </div>

                  <div className="my-4">
                    <span className="text-xs text-slate-400 block mb-0.5">Total mensual estimado:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-emerald-400">${totalCost}</span>
                      <span className="text-xs text-slate-400">/ mes</span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/registro-club?plan=${p.slug}`}
                  className="mt-4 block w-full text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs transition shadow-md shadow-emerald-600/20"
                >
                  Elegir {p.nombre} para {calculadoraCanchas} {calculadoraCanchas === 1 ? "cancha" : "canchas"} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="mt-24 rounded-3xl bg-white p-8 sm:p-12 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 text-center mb-8">
          Comparativa Detallada de Funcionalidades y Capacidad
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-4 font-bold text-slate-900">Característica / Capacidad</th>
                <th className="pb-4 font-bold text-slate-900 text-center">Bronce ($29)</th>
                <th className="pb-4 font-bold text-slate-900 text-center">Plata ($59)</th>
                <th className="pb-4 font-bold text-slate-900 text-center text-emerald-600">Oro ($99)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Sección Capacidad de Canchas */}
              <tr className="bg-slate-50/70">
                <td colSpan={4} className="py-2.5 px-3 text-xs font-black uppercase tracking-wider text-slate-600">
                  🏟️ Capacidad y Escala de Canchas
                </td>
              </tr>
              {courtCapacityComparison.map((c, i) => (
                <tr key={`cap-${i}`} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-medium text-slate-800">{c.name}</td>
                  <td className="py-3.5 text-center font-bold text-slate-700">{c.bronce}</td>
                  <td className="py-3.5 text-center font-bold text-slate-700">{c.plata}</td>
                  <td className="py-3.5 text-center font-bold text-emerald-600">{c.oro}</td>
                </tr>
              ))}

              {/* Sección Módulos y Funcionalidades */}
              <tr className="bg-slate-50/70">
                <td colSpan={4} className="py-2.5 px-3 text-xs font-black uppercase tracking-wider text-slate-600">
                  ⚡ Módulos y Herramientas del Software
                </td>
              </tr>
              {featuresComparison.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-medium text-slate-800">{f.name}</td>
                  <td className="py-3.5 text-center">
                    {f.bronce ? <span className="text-emerald-600 font-bold text-lg">✓</span> : <span className="text-slate-300 font-bold">—</span>}
                  </td>
                  <td className="py-3.5 text-center">
                    {f.plata ? <span className="text-emerald-600 font-bold text-lg">✓</span> : <span className="text-slate-300 font-bold">—</span>}
                  </td>
                  <td className="py-3.5 text-center">
                    {f.oro ? <span className="text-emerald-600 font-bold text-lg">✓</span> : <span className="text-slate-300 font-bold">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-20 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-slate-900 text-center mb-10">
          Preguntas Frecuentes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-2">¿Cómo funciona la prueba gratuita de 14 días?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Puedes registrar tu club y acceder inmediatamente a todas las funcionalidades del plan seleccionado sin necesidad de ingresar datos de tarjeta de crédito.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-2">¿Puedo cambiar de plan más adelante?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sí, puedes subir de plan (upgrade) o cambiar de módulos individuales en cualquier momento desde el panel de administración de tu club.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-2">¿Qué incluye el subdominio propio?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cada complejo obtiene una dirección web exclusiva (ej: <code>miclub.turnos.com</code> o <code>miclub.localhost</code>) con su propia landing page, grilla y reservas.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-2">¿Cómo funciona la domótica IoT para luces?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El sistema se conecta con relés y dispositivos inteligentes para encender automáticamente las luces antes de cada turno y apagarlas al finalizar el horario.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-20 rounded-3xl bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 p-10 sm:p-16 text-center text-white shadow-2xl">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
          ¿Listo para transformar la gestión de tu Club?
        </h2>
        <p className="mt-3 text-slate-300 max-w-xl mx-auto text-base">
          Crea tu cuenta en 2 minutos y comienza a recibir reservas automáticas hoy mismo.
        </p>
        <Link
          href="/registro-club"
          className="mt-8 inline-block rounded-2xl bg-emerald-500 px-10 py-4 text-base font-extrabold text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 transition"
        >
          🚀 Registrar mi Club Gratis
        </Link>
      </div>
    </div>
  );
}
