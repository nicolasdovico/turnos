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

export default function FutbolLandingClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estados de la Calculadora de ROI orientada a Fútbol
  const [canchasFutbol, setCanchasFutbol] = useState(4);
  const [precioTurnoFutbol, setPrecioTurnoFutbol] = useState(25000);
  const [turnosCaidosMes, setTurnosCaidosMes] = useState(8);
  const [porcentajeSena, setPorcentajeSena] = useState(50);

  const perdidaMensual = turnosCaidosMes * precioTurnoFutbol;
  const perdidaAnual = perdidaMensual * 12;
  const recuperadoMes = Math.round(perdidaMensual * (porcentajeSena / 100));
  const recuperadoAnual = recuperadoMes * 12;

  // Comparativa Antes vs Después orientada a Fútbol
  const beforeAfterFutbol = [
    {
      pain: "Reservas de palabra por WhatsApp un martes o jueves a la noche: a las 21:00 hs te avisan que 'no juntaron los 10' y tu cancha queda vacía perdiendo la recaudación.",
      solution: "Seña obligatoria online con Mercado Pago. Si no completan los jugadores o cancelan a último momento, tu predio tiene los costos cubiertos."
    },
    {
      pain: "Llamadas y audios constantes preguntando si hay Fútbol 5, 7 u 11, o si la cancha es techada o descubierta.",
      solution: "Grilla horaria online 24/7 donde los capitanes eligen tipo de cancha (F5, F7, F11), horario disponible y reservan en 30 segundos sin que atiendas el teléfono."
    },
    {
      pain: "Grupos de WhatsApp buscando 'el arquero' o 2 jugadores que faltan para no suspender el partido.",
      solution: "Módulo de Partidos Abiertos: crean la convocatoria comunitaria con cupos faltantes, otros jugadores se suman pagando su parte y el partido se salva."
    },
    {
      pain: "Organización caótica de torneos los fines de semana en cuadernos o planillas Excel con quejas por fixtures y tablas de posiciones.",
      solution: "Gestor integral de torneos: generación automática de llaves de eliminación o fase de grupos, carga de resultados en vivo y tabla de goleadores/posiciones pública."
    },
    {
      pain: "Pérdidas en la cantina y tercer tiempo: anotaciones sueltas en comandas de papel de bebidas, alquiler de pecheras o pelotas que no se cobran.",
      solution: "Punto de Venta (POS) integrado: cargá las bebidas, choripanes, hamburguesas y alquiler de chalecos a la cuenta del turno y cerrá la caja sin diferencias."
    }
  ];

  // Funcionalidades clave para Predios y Complejos de Fútbol
  const futbolFeatures = [
    {
      icon: <Calendar className="w-5 h-5 text-emerald-400" />,
      title: "Grilla para F5, F7 y F11",
      desc: "Administrá simultáneamente canchas de césped sintético, alfombra o pasto natural, techadas y descubiertas, con control anti-solapamiento en tiempo real."
    },
    {
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      title: "Cobro de Señas con Mercado Pago",
      desc: "Exigí el 50% o el total del turno antes de confirmar. Dinero acreditado al instante en la cuenta de tu complejo, eliminando el ausentismo de raíz."
    },
    {
      icon: <Trophy className="w-5 h-5 text-emerald-400" />,
      title: "Gestor de Torneos & Fixtures",
      desc: "Armá ligas nocturnas y torneos de fin de semana. Generación de llaves, tablas de clasificación automatizadas y estadísticas visibles para los equipos."
    },
    {
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      title: "Partidos Abiertos & Split Payment",
      desc: "Los capitanes pueden dividir el valor del turno entre los jugadores del equipo, permitiendo que cada uno abone su cuota online de forma individual."
    },
    {
      icon: <SunMoon className="w-5 h-5 text-emerald-400" />,
      title: "Tarifas Nocturnas con Luz LED",
      desc: "Configurá precios diferenciales para horarios pico nocturnos y fines de semana, agregando automáticamente el costo adicional de reflectores."
    },
    {
      icon: <Repeat className="w-5 h-5 text-emerald-400" />,
      title: "Turnos Fijos Semanales (Abonados)",
      desc: "Gestioná los clásicos partidos semanales de tus clientes habituales. Si una semana no van, liberás el horario para que otro grupo lo reserve."
    },
    {
      icon: <Coffee className="w-5 h-5 text-emerald-400" />,
      title: "Cantina, Buffet & Tercer Tiempo",
      desc: "Punto de Venta táctil para ventas de mostrador: cervezas, gaseosas, snacks, pelotas y alquiler de pecheras cargados al turno del equipo."
    },
    {
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
      title: "Sitio Web Propio de tu Predio",
      desc: "Página web exclusiva (ej: tupredio.turnosflow.com) con tus colores, escudo, fotos de las canchas, servicios y botón directo de reserva online."
    }
  ];

  const faqs = [
    {
      q: "¿Cómo ayuda TurnosFlow a evitar que los grupos 'claven' el turno a último momento?",
      a: "El principal problema de las canchas de fútbol es la reserva de palabra donde a último momento el grupo se desarma y no asiste. Con TurnosFlow exigís el cobro de una seña previa online (vía Mercado Pago o transferencia). Al tener dinero comprometido, el ausentismo se reduce en más de un 90% y, si no van, tu predio tiene el turno cubierto."
    },
    {
      q: "¿El sistema sirve para canchas de Fútbol 5, Fútbol 7 y Fútbol 11 a la vez?",
      a: "Sí. Podés dar de alta tantas canchas como tenga tu predio, especificando la modalidad (F5, F7, F8, F9, F11), superficie (césped sintético con caucho, alfombra, césped natural), si es techada o descubierta, y fijar tarifas diferentes para cada una."
    },
    {
      q: "¿Podemos organizar torneos de fútbol los fines de semana?",
      a: "Sí. TurnosFlow incluye un gestor completo de torneos y ligas. Podés inscribir equipos, generar fixtures con llaves de eliminación directa o fases de grupos, cargar resultados y permitir que los jugadores consulten la tabla de posiciones en vivo desde la web."
    },
    {
      q: "¿Cómo funciona la cantina o buffet y el control de caja diaria?",
      a: "El sistema cuenta con un módulo de Punto de Venta (POS) pensado para el tercer tiempo: podés registrar ventas rápidas de bebidas, comidas, botellas de agua y alquiler de pecheras. Al final de la jornada realizás un arqueo ciego de caja comparando efectivo y cobros digitales."
    },
    {
      q: "¿Nos ayudan a cargar las canchas, fotos y horarios?",
      a: "Sí, la puesta en marcha inicial es 100% bonificada ($0). Nuestro equipo se encarga de cargar tus canchas, configurar tus horarios pico, tarifas con luz y logo para que arranques a operar sin perder tiempo."
    }
  ];

  const whatsappUrl = `https://wa.me/5491149790220?text=${encodeURIComponent(
    "¡Hola! Vi la propuesta de TurnosFlow para predios de fútbol y me gustaría sacarme unas dudas y coordinar una videollamada de demostración."
  )}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. HERO SECTION FÚTBOL */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Especial para Predios y Canchas de Fútbol 5, 7 y 11</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            El Software de Gestión Diseñado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Canchas de Fútbol
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Terminá con los turnos caídos porque 'no juntaron los 10'. Cobrá señas automáticas por Mercado Pago, organizá torneos, controlá la cantina y llená tu predio con reservas online 24/7.
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
            <span>El Antes y el Después en tu Predio de Fútbol</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Dejá atrás el descontrol manual y profesionalizá tu complejo
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Mirá la diferencia real entre gestionar canchas con planillas de papel o WhatsApp versus automatizar reservas y cobros.
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
                <p className="text-xs text-rose-400">Pérdida constante de turnos pico y descontrol de cobros</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterFutbol.map((item, idx) => (
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
                <h3 className="text-lg font-black text-emerald-300">Con TurnosFlow Fútbol</h3>
                <p className="text-xs text-emerald-400/80">Turnos asegurados con seña y predio 100% lleno</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterFutbol.map((item, idx) => (
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

      {/* 3. CALCULADORA DE ROI PARA PREDIOS DE FÚTBOL */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                <Calculator className="w-3.5 h-3.5" />
                <span>Simulador de Pérdidas por Turnos Vacíos</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ¿Cuánto dinero deja de ingresar a tu predio cada mes?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Ingresá los datos de tu complejo de fútbol y calculá cuánto dinero recuperás al asegurar las reservas con seña digital previa.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              {/* Controles de la Calculadora */}
              <div className="lg:col-span-7 space-y-6">
                {/* Control Canchas */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Cantidad de Canchas de Fútbol:</span>
                    <span className="text-emerald-400 font-mono text-base">{canchasFutbol} canchas</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    value={canchasFutbol}
                    onChange={(e) => setCanchasFutbol(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1 cancha</span>
                    <span>8 canchas</span>
                    <span>16 canchas</span>
                  </div>
                </div>

                {/* Control Precio Promedio */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Precio Promedio por Turno:</span>
                    <span className="text-emerald-400 font-mono text-base">
                      ${precioTurnoFutbol.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={60000}
                    step={1000}
                    value={precioTurnoFutbol}
                    onChange={(e) => setPrecioTurnoFutbol(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>$10.000</span>
                    <span>$35.000</span>
                    <span>$60.000</span>
                  </div>
                </div>

                {/* Control Turnos Caídos */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Turnos que te cancelan sobre la hora al mes:</span>
                    <span className="text-rose-400 font-mono text-base">{turnosCaidosMes} turnos caídos</span>
                  </div>
                  <input
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
                    <span>30 turnos (Ausentismo crítico)</span>
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
                    <span className="text-[11px] font-normal text-rose-400">Sin cobro de señas</span>
                  </div>
                  <div className="text-3xl font-black text-rose-300 font-mono">
                    -${perdidaMensual.toLocaleString("es-AR")}
                  </div>
                  <p className="text-[11px] text-rose-400/80 mt-1">
                    Representa una pérdida de <strong className="text-rose-200">-${perdidaAnual.toLocaleString("es-AR")}</strong> al año en horas de cancha vacías.
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
                      Recuperás <strong className="text-emerald-300">+${recuperadoAnual.toLocaleString("es-AR")} al año</strong> que hoy se están escapando.
                    </p>
                    <p className="text-[11px] text-slate-400 pt-1">
                      El sistema se paga solo con apenas 1 turno salvado al mes.
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

      {/* 4. FUNCIONALIDADES ESPECÍFICAS DE FÚTBOL */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Diseñado para Predios y Canchas de Fútbol</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Todo lo que tu complejo de fútbol necesita en una sola plataforma
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Dejá de pelear con reservas de palabra, cuadernos y discusiones de mostrador. Gestioná turnos de F5 a F11, torneos, señas y cantina desde un solo lugar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {futbolFeatures.map((feat, idx) => (
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
            Preguntas Frecuentes de Complejos de Fútbol
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
              Potenciá tu predio de fútbol hoy mismo
            </h2>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Sumate a los complejos de fútbol que ya operan sin ausentismo gracias al cobro de señas, organizan torneos automatizados y cuentan con su propia web de reservas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/registro-club"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
              >
                <span>Registrar mi Predio de Fútbol (30 Días Gratis)</span>
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
