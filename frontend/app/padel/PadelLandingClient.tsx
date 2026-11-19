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

export default function PadelLandingClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estados de la Calculadora de ROI orientada a Pádel
  const [canchasPadel, setCanchasPadel] = useState(4);
  const [precioTurnoPadel, setPrecioTurnoPadel] = useState(16000);
  const [turnosCaidosMes, setTurnosCaidosMes] = useState(8);
  const [porcentajeSena, setPorcentajeSena] = useState(50);

  const perdidaMensual = turnosCaidosMes * precioTurnoPadel;
  const perdidaAnual = perdidaMensual * 12;
  const recuperadoMes = Math.round(perdidaMensual * (porcentajeSena / 100));
  const recuperadoAnual = recuperadoMes * 12;

  // Comparativa Antes vs Después orientada a Pádel
  const beforeAfterPadel = [
    {
      pain: "Audios y llamadas interminables por WhatsApp consultando si hay canchas libres a la tarde o noche.",
      solution: "Grilla interactiva online 24/7 donde los jugadores ven tus pistas de cristal o muro y reservan solos en 30 segundos."
    },
    {
      pain: "Turnos clavados un viernes a la noche: reservan de palabra, no van y tu cancha queda vacía perdiendo la recaudación.",
      solution: "Cobro de seña obligatorio por Mercado Pago para confirmar la reserva. Dinero acreditado en tu cuenta al instante."
    },
    {
      pain: "Grupos de WhatsApp buscando 'el 4to jugador' para poder completar el partido y no perder el turno.",
      solution: "Módulo de Partidos Abiertos: el jugador abre el partido por su categoría (ej: 6ta o 7ma) y los demás se suman pagando su parte."
    },
    {
      pain: "Enredo de tarifas: canchas techadas con luz LED cobradas igual que pistas descubiertas o en horarios valle.",
      solution: "Tarifas dinámicas y personalizables según pista (Panorámica vs Muro, Techada vs Abierta) y recargos automáticos por horario pico."
    },
    {
      pain: "Planillas de papel borroneadas y reclamos cruzados por los turnos fijos semanales.",
      solution: "Gestión de turnos fijos por meses con renovación automática y liberación de fechas aisladas cuando el titular avisa que no va."
    }
  ];

  // Funcionalidades clave para Clubes de Pádel
  const padelFeatures = [
    {
      icon: <Calendar className="w-5 h-5 text-emerald-400" />,
      title: "Grilla Horaria Inteligente",
      desc: "Turnos adaptados al ritmo exacto de tus canchas con protección contra sobreturnos simultáneos y visualización inmediata del estado de ocupación."
    },
    {
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      title: "Señas Online con Mercado Pago",
      desc: "Exigí el porcentaje de seña que elijas antes de confirmar la reserva. Sin comisiones extra de nuestra parte: el dinero entra directo a tu cuenta."
    },
    {
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      title: "Partidos Abiertos & Matchmaking",
      desc: "Tus clientes pueden armar partidos colaborativos por nivel o categoría. Cada jugador abona su cuota parte y la cancha se asegura completa."
    },
    {
      icon: <SunMoon className="w-5 h-5 text-emerald-400" />,
      title: "Tarifas por Pista & Horario",
      desc: "Diferenciá precios entre canchas de blindex panorámicas, muros, techadas o descubiertas. Aplicá tarifas nocturnas con iluminación incluida."
    },
    {
      icon: <Repeat className="w-5 h-5 text-emerald-400" />,
      title: "Turnos Fijos Semanales",
      desc: "Administrá los abonados fijos de todo el año. Si una semana no pueden asistir, liberás ese turno a la venta pública sin perder al cliente."
    },
    {
      icon: <Coffee className="w-5 h-5 text-emerald-400" />,
      title: "Cantina, Alquiler de Paletas y Pelotas",
      desc: "Punto de venta integrado para registrar consumos de bar, tubos de pelotas, alquiler de paletas y bebidas cargados a la cuenta de cada jugador."
    },
    {
      icon: <CloudRain className="w-5 h-5 text-emerald-400" />,
      title: "Billetera Virtual para Cancelaciones",
      desc: "Si hay lluvia o se cancela con anticipación, el saldo queda acreditado automáticamente en la billetera virtual del cliente dentro de tu club."
    },
    {
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
      title: "Tu Propia Web (Subdominio Oficial)",
      desc: "Tu club tiene su dirección exclusiva (ej: tuclub.turnosflow.com) con tus colores, logo, fotos de las instalaciones y grilla de reservas."
    }
  ];

  const faqs = [
    {
      q: "¿Cómo se adaptan los horarios y la duración de los turnos en el sistema?",
      a: "TurnosFlow te permite configurar la duración y franja horaria que mejor se adapte a tu complejo deportivo, calculando de forma precisa los intervalos de disponibilidad y evitando huecos improductivos en tus canchas."
    },
    {
      q: "¿Cómo funciona la diferenciación de precios por cancha y horario?",
      a: "Podés asignar tarifas específicas según la infraestructura de cada pista (ej: Cancha Panorámica de Cristal vs. Muro tradicional, Cancha Techada vs. Descubierta) y recargos automáticos para horarios pico nocturnos o costo de iluminación artificial LED."
    },
    {
      q: "¿Puedo cobrar señas por Mercado Pago para evitar que me 'claven' un turno?",
      a: "Sí. Podés exigir el cobro automático de una seña (ej: 50% o monto fijo) o el 100% del turno al reservar online. Los fondos se acreditan de forma instantánea en tu cuenta y el turno solo se confirma tras el pago exitoso."
    },
    {
      q: "¿Qué son los 'Partidos Abiertos' y cómo ayudan a mi complejo?",
      a: "Es la solución al clásico dolor de cabeza de armar grupos de WhatsApp para buscar el 4to jugador. Un cliente puede abrir un partido indicando su categoría (ej: 7ma o 6ta), otros jugadores se suman desde la web pagando su cuota parte, y el turno se confirma solo cuando están los 4."
    },
    {
      q: "¿Nos ayudan a cargar las canchas y precios al empezar?",
      a: "Sí, 100% bonificado. Nuestro equipo se encarga de la configuración inicial completa: cargamos tus canchas, horarios pico, tarifas y logo oficial para que empieces a recibir reservas desde el primer día sin perder tiempo."
    }
  ];

  const whatsappUrl = `https://wa.me/5491149790220?text=${encodeURIComponent(
    "¡Hola! Vi la propuesta de TurnosFlow para clubes de pádel y me gustaría sacarme unas dudas y coordinar una videollamada de demostración."
  )}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. HERO SECTION PÁDEL */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Especial para Clubes y Complejos de Pádel</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            El Software de Gestión Diseñado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Clubes de Pádel
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Eliminá el caos de WhatsApp, automatizá el cobro de señas y llená tus canchas de cristal y muro con una plataforma ágil pensada para el pádel moderno.
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
            <span>El Antes y el Después de tu Complejo</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Dejá atrás el desorden manual y pasá al control profesional
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Descubrí cómo cambia el día a día de tus canchas cuando automatizás las reservas y las señas.
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
                <p className="text-xs text-rose-400">Pérdida constante de tiempo y pistas vacías</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterPadel.map((item, idx) => (
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
                <h3 className="text-lg font-black text-white">Con TurnosFlow Pádel</h3>
                <p className="text-xs text-emerald-300">Club operativo 24/7 y recaudación asegurada</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterPadel.map((item, idx) => (
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

      {/* 3. CALCULADORA DE IMPACTO FINANCIERO (ROI PÁDEL) */}
      <section id="calculadora" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-3">
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculadora de Impacto Financiero</span>
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ¿Cuánto dinero pierde tu club de pádel por turnos colgados?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-400">
                Ajustá los números a la realidad de tus pistas y mirá cuánto dinero recuperás cobrando seña obligatoria.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Controles de la Calculadora */}
              <div className="lg:col-span-7 space-y-6 bg-slate-950/60 p-6 sm:p-8 rounded-2xl border border-slate-800">
                {/* Slider 1: Canchas */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <label htmlFor="input-canchas" className="font-bold text-slate-200">Cantidad de Canchas de Pádel:</label>
                    <span className="font-mono font-black text-emerald-400 text-base">{canchasPadel} canchas</span>
                  </div>
                  <input
                    id="input-canchas"
                    type="range"
                    min={1}
                    max={12}
                    value={canchasPadel}
                    onChange={(e) => setCanchasPadel(Number(e.target.value))}
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
                      ${precioTurnoPadel.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <input
                    id="input-precio"
                    type="range"
                    min={6000}
                    max={40000}
                    step={1000}
                    value={precioTurnoPadel}
                    onChange={(e) => setPrecioTurnoPadel(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>$6.000</span>
                    <span>$20.000</span>
                    <span>$40.000</span>
                  </div>
                </div>

                {/* Slider 3: Turnos cancelados al mes */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <label htmlFor="input-turnos-caidos" className="font-bold text-slate-200">Turnos colgados / cancelados por mes:</label>
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
                    <span>1 turno (Club ordenado)</span>
                    <span>15 turnos</span>
                    <span>30 turnos (Alto ausentismo)</span>
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
                    <span className="text-[11px] font-normal text-rose-400">Sin señas obligatorias</span>
                  </div>
                  <div className="text-3xl font-black text-rose-300 font-mono">
                    -${perdidaMensual.toLocaleString("es-AR")}
                  </div>
                  <p className="text-[11px] text-rose-400/80 mt-1">
                    Equivale a perder <strong className="text-rose-200">-${perdidaAnual.toLocaleString("es-AR")}</strong> al año en horas de cancha vacías.
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
                      El costo de la plataforma se amortiza solo con salvar apenas 1 o 2 turnos al mes.
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

      {/* 4. FUNCIONALIDADES ESPECÍFICAS DE PÁDEL */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Herramientas Diseñadas para tu Club</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Todo lo que tu complejo de pádel necesita en un solo lugar
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Dejá de usar planillas desconectadas o cuadernos de papel. Gestioná turnos, señas, bar y clientes en una única pantalla.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {padelFeatures.map((feat, idx) => (
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
            <span>Dudas Comunes</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Preguntas Frecuentes de Clubes de Pádel
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
              Llevá tu club de pádel al siguiente nivel
            </h2>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Sumate hoy a los complejos que ya operan de forma automática, sin discusiones por señas y con su propia página web de reservas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/registro-club"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
              >
                <span>Registrar mi Club de Pádel (30 Días Gratis)</span>
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
