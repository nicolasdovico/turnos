"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Users, 
  Clock, 
  DollarSign, 
  Layers, 
  MessageCircle, 
  Trophy, 
  ChevronDown,
  XCircle,
  Calculator,
  Calendar,
  Wallet,
  Repeat,
  SunMoon,
  Globe,
  Coffee,
  CloudRain
} from "lucide-react";
import MainFooter from "@/components/landing/MainFooter";
import ContactSection from "@/components/landing/ContactSection";

export default function HockeyLandingClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estados de la Calculadora de ROI orientada a Hockey
  const [canchasHockey, setCanchasHockey] = useState(2);
  const [precioTurnoHockey, setPrecioTurnoHockey] = useState(35000);
  const [turnosCaidosMes, setTurnosCaidosMes] = useState(6);
  const [porcentajeSena, setPorcentajeSena] = useState(50);

  const perdidaMensual = turnosCaidosMes * precioTurnoHockey;
  const perdidaAnual = perdidaMensual * 12;
  const recuperadoMes = Math.round(perdidaMensual * (porcentajeSena / 100));
  const recuperadoAnual = recuperadoMes * 12;

  // Comparativa Antes vs Después orientada a Hockey
  const beforeAfterHockey = [
    {
      pain: "Superposición caótica entre entrenamientos de categorías formativas, primera división, mami hockey y alquileres comerciales.",
      solution: "Agenda dividida inteligente: programá horarios fijos para planteles del club y habilitá la venta online de turnos libres para equipos externos."
    },
    {
      pain: "Reservas de cancha completa o media cancha de palabra que se cancelan sobre la fecha, dejando una pista de alto costo parada.",
      solution: "Cobro obligatorio de seña con Mercado Pago. Si un equipo externo suspende, los costos operativos de la cancha quedan cubiertos."
    },
    {
      pain: "Complejidad para gestionar el alquiler por 'Media Cancha' (Seven / entrenamientos reducidos) vs 'Cancha Completa'.",
      solution: "Grilla configurable que permite modularizar la pista en Cancha Completa o Mitades independientes con tarifas específicas."
    },
    {
      pain: "Pérdida de facturación en iluminación artificial nocturna y costos de regado en pistas de césped sintético de agua.",
      solution: "Cálculo automático de recargos nocturnos por encendido de torres de iluminación LED y tarifas diferenciadas por superficie (Agua vs Arena)."
    },
    {
      pain: "Cobros dispersos de cuotas de escuela formativa, alquileres y consumos del tercer tiempo anotados en cuadernos.",
      solution: "Plataforma centralizada: historial de pagos por equipo, punto de venta para la cantina del club y arqueo de caja diaria."
    }
  ];

  // Funcionalidades clave para Clubes y Canchas de Hockey
  const hockeyFeatures = [
    {
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      title: "Cancha Completa o Media Cancha",
      desc: "Flexibilidad operativa total: alquilá la pista entera para partidos de 11 o dividila automáticamente en 2 mitades para Seven o entrenamientos de técnica."
    },
    {
      icon: <Calendar className="w-5 h-5 text-emerald-400" />,
      title: "Entrenamientos & Turnos Fijos",
      desc: "Bloqueá las franjas horarias de las divisiones competitivas y escuelas formativas del club, y abrí a la venta online los horarios libres."
    },
    {
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      title: "Cobro de Señas con Mercado Pago",
      desc: "Asegurá cada reserva con el porcentaje de seña que elijas. Dinero acreditado al instante en la cuenta de tu club, evitando plantones."
    },
    {
      icon: <SunMoon className="w-5 h-5 text-emerald-400" />,
      title: "Tarifas por Superficie & Luz Nocturna",
      desc: "Diferenciá precios entre césped sintético de agua y de arena, e incorporá automáticamente el suplemento por iluminación de reflectores."
    },
    {
      icon: <Trophy className="w-5 h-5 text-emerald-400" />,
      title: "Ligas de Hockey & Torneos Seven",
      desc: "Organizá torneos de fin de semana, ligas comerciales y encuentros de mami hockey con fixtures, llaves de eliminación y tablas en vivo."
    },
    {
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      title: "Directorio de Equipos y Capitanas",
      desc: "Ficha 360° de los planteles y capitanas habituales con historial de reservas, pagos, notas internas y contacto directo por WhatsApp."
    },
    {
      icon: <Coffee className="w-5 h-5 text-emerald-400" />,
      title: "Cantina, Buffet & Tercer Tiempo",
      desc: "Punto de venta ágil para registrar las consumiciones del tercer tiempo, bebidas hidratantes, alquiler de bochas y pecheras."
    },
    {
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
      title: "Sitio Web Institucional Propio",
      desc: "Portal oficial del club (ej: tuclub.turnosflow.com) con fotos de las pistas, logotipo, sponsors institucionales y reservas online 24/7."
    }
  ];

  const faqs = [
    {
      q: "¿El sistema permite dividir una cancha de hockey en dos mitades?",
      a: "Sí. TurnosFlow te permite configurar tu pista tanto como 'Cancha Completa' (ideal para partidos de 11) como en 'Media Cancha Norte / Sur' para Seven o prácticas grupales, garantizando que si se reserva la cancha completa las mitades se bloqueen automáticamente para evitar solapamientos."
    },
    {
      q: "¿Cómo se organizan los horarios de entrenamiento del club y los turnos de alquiler?",
      a: "Podés asignar turnos recurrentes protegidos para todas las divisiones del club (infantiles, juveniles, primera y mamis). Todo horario que no esté ocupado por un plantel federado se publica automáticamente en la web para alquiler comercial de equipos externos."
    },
    {
      q: "¿Se pueden aplicar tarifas diferenciadas para césped sintético de agua y de arena?",
      a: "Sí. Podés especificar la superficie de cada cancha (Agua o Arena) y definir tarifas personalizadas, así como recargos automáticos para partidos nocturnos con uso intensivo de iluminación de reflectores LED."
    },
    {
      q: "¿Cómo protege el sistema a la cancha contra cancelaciones tardías?",
      a: "Al exigir el cobro online de una seña mediante Mercado Pago, el equipo externo adquiere un compromiso económico previo. Si no asisten o avisan fuera del plazo de cancelación, la seña queda en poder del club para amortizar los costos de la pista."
    },
    {
      q: "¿Nos ayudan a configurar las canchas y los horarios de entrenamiento?",
      a: "Sí, 100% bonificado ($0). Nuestro equipo se encarga de la puesta en marcha inicial gratuita: cargamos tus pistas, horarios de planteles, tarifas con luz y escudo del club para que arranques a operar de inmediato."
    }
  ];

  const whatsappUrl = `https://wa.me/5491149790220?text=${encodeURIComponent(
    "¡Hola! Vi la propuesta de TurnosFlow para clubes y canchas de hockey y me gustaría sacarme unas dudas y coordinar una videollamada de demostración."
  )}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. HERO SECTION HOCKEY */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Especial para Clubes y Canchas de Hockey sobre Césped</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            El Software de Gestión Diseñado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Canchas de Hockey
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Coordiná entrenamientos de planteles, escuelas formativas y alquileres externos en canchas de agua o arena. Cobrá señas automáticas por Mercado Pago y administrá tu predio con reservas online 24/7.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/registro-club"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <span>Probar 30 Días Gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Coordinar Demo por WhatsApp</span>
            </a>
          </div>

          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sin tarjeta de crédito requerida</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Configuración inicial bonificada</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Subdominio web propio incluido</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EL ANTES Y EL DESPUÉS (GESTIÓN TRADICIONAL VS TURNOSFLOW) */}
      <section id="comparativa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-300 border border-slate-700 mb-3">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>El Antes y el Después en tu Predio de Hockey</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Dejá atrás las planillas manuales y pasá a una gestión profesional
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Descubrí la tranquilidad de tener los entrenamientos organizados, las pistas libres alquiladas y los cobros de señas asegurados.
          </p>
        </div>

        {/* 2 Columnas lado a lado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Columna: Sin la Plataforma (El Pasado) */}
          <div className="rounded-3xl bg-rose-950/30 border border-rose-900/60 p-6 sm:p-8 space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 border-b border-rose-900/50">
              <span className="w-8 h-8 rounded-full bg-rose-900/60 text-rose-300 flex items-center justify-center font-bold text-lg border border-rose-700">
                ✕
              </span>
              <div>
                <h3 className="text-lg font-black text-rose-200">Gestión Tradicional (Sin Sistema)</h3>
                <p className="text-xs text-rose-400">Superposición de horarios y pistas vacías sin seña</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterHockey.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-rose-100 leading-relaxed font-medium">
                    {item.pain}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Columna: Con TurnosFlow (El Presente) */}
          <div className="rounded-3xl bg-emerald-950/40 border border-emerald-500/40 p-6 sm:p-8 space-y-5 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-bl-xl">
              Solución Inteligente
            </div>

            <div className="flex items-center gap-2.5 pb-4 border-b border-emerald-800">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
                ✓
              </span>
              <div>
                <h3 className="text-lg font-black text-emerald-300">Con TurnosFlow Hockey</h3>
                <p className="text-xs text-emerald-400/80">Canchas coordinadas, señas cobradas y orden total</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterHockey.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                    {item.solution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. CALCULADORA DE ROI PARA CANCHAS DE HOCKEY */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                <Calculator className="w-3.5 h-3.5" />
                <span>Simulador de Recuperación de Pérdidas</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ¿Cuánto dinero pierde tu predio por turnos cancelados?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Una cancha de hockey sin usar representa un alto costo operativo. Calculá cuánto recuperás exigiendo señas obligatorias.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              {/* Controles de la Calculadora */}
              <div className="lg:col-span-7 space-y-6">
                {/* Control Canchas */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Cantidad de Canchas de Hockey:</span>
                    <span className="text-emerald-400 font-mono text-base">{canchasHockey} canchas</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={canchasHockey}
                    onChange={(e) => setCanchasHockey(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 cancha</span>
                    <span>4 canchas</span>
                    <span>8 canchas</span>
                  </div>
                </div>

                {/* Control Precio Promedio */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Precio Promedio por Turno:</span>
                    <span className="text-emerald-400 font-mono text-base">
                      ${precioTurnoHockey.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15000}
                    max={80000}
                    step={2000}
                    value={precioTurnoHockey}
                    onChange={(e) => setPrecioTurnoHockey(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>$15.000</span>
                    <span>$45.000</span>
                    <span>$80.000</span>
                  </div>
                </div>

                {/* Control Turnos Caídos */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Turnos cancelados sobre la hora al mes:</span>
                    <span className="text-rose-400 font-mono text-base">{turnosCaidosMes} turnos caídos</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={turnosCaidosMes}
                    onChange={(e) => setTurnosCaidosMes(Number(e.target.value))}
                    className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 turno</span>
                    <span>10 turnos</span>
                    <span>20 turnos (Alto impacto)</span>
                  </div>
                </div>

                {/* Selector de % de seña */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="block text-xs font-bold text-slate-300">
                    Porcentaje de Seña a Cobrar:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 50, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPorcentajeSena(pct)}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition border ${
                          porcentajeSena === pct
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                            : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600"
                        }`}
                      >
                        {pct === 100 ? "100% (Total)" : `${pct}% Seña`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resultados del ROI */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl bg-rose-950/40 border border-rose-900/60 p-5 text-rose-100">
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>Pérdida mensual actual:</span>
                    <span className="text-[11px] font-normal text-rose-400">Sin señas previas</span>
                  </div>
                  <div className="text-3xl font-black text-rose-300 font-mono">
                    -${perdidaMensual.toLocaleString("es-AR")}
                  </div>
                  <p className="text-[11px] text-rose-400/80 mt-1">
                    Equivale a perder <strong className="text-rose-200">-${perdidaAnual.toLocaleString("es-AR")}</strong> al año en horas de cancha desaprovechadas.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-950/70 border border-emerald-500/50 p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                    <span>Recuperás con TurnosFlow:</span>
                    <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      +{porcentajeSena}% Asegurado
                    </span>
                  </div>
                  <div className="text-4xl font-black text-emerald-400 font-mono tracking-tight">
                    +${recuperadoMes.toLocaleString("es-AR")}
                  </div>
                  <div className="text-xs text-slate-300 mt-2 space-y-1">
                    <p>
                      Recuperás <strong className="text-emerald-300">+${recuperadoAnual.toLocaleString("es-AR")} al año</strong> que hoy se están perdiendo.
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1">
                      El costo de la plataforma se recupera con salvar apenas un solo turno al mes.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-emerald-900/60">
                    <Link
                      href="/registro-club"
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
                    >
                      <span>Quiero Recuperar Este Dinero</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FUNCIONALIDADES ESPECÍFICAS DE HOCKEY */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Diseñado para Predios y Clubes de Hockey</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Todo lo que tu complejo de hockey necesita en un único lugar
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Dejá de cruzar mensajes de WhatsApp para coordinar entrenamientos y alquileres. Gestioná canchas de agua o arena, señas automáticas y tercer tiempo en una sola pantalla.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hockeyFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-3 hover:border-emerald-500/40 transition duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {feat.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CONTACTO DIRECTO & VIDEOLLAMADA */}
      <ContactSection />

      {/* 6. PREGUNTAS FRECUENTES */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-300 border border-slate-700 mb-3">
            <span>Dudas Frecuentes</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Preguntas Frecuentes de Complejos de Hockey
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4"
                >
                  <span className="text-sm sm:text-base font-bold text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. BANNER FINAL DE CIERRE */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-8 sm:p-14 text-center border border-emerald-500/30 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Empezá en 2 minutos</span>
            </span>

            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Llevá tu club de hockey al siguiente nivel
            </h2>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Sumate a las instituciones que ya organizan sus canchas de agua o arena sin superposiciones, con señas aseguradas y reservas online 24/7.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/registro-club"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
              >
                <span>Registrar mi Predio de Hockey (30 Días Gratis)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <span>💬 Hablar por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER GENERAL CON INTERNAL LINKS */}
      <MainFooter />
    </main>
  );
}
