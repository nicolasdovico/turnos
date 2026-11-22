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
  CloudRain,
  Flame,
  Award,
  Sliders
} from "lucide-react";
import MainFooter from "@/components/landing/MainFooter";
import ContactSection from "@/components/landing/ContactSection";

export default function TenisLandingClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Estados de la Calculadora de ROI orientada a Tenis
  const [canchasTenis, setCanchasTenis] = useState(4);
  const [precioTurnoTenis, setPrecioTurnoTenis] = useState(18000);
  const [turnosCaidosMes, setTurnosCaidosMes] = useState(8);
  const [porcentajeSena, setPorcentajeSena] = useState(50);

  const perdidaMensual = turnosCaidosMes * precioTurnoTenis;
  const perdidaAnual = perdidaMensual * 12;
  const recuperadoMes = Math.round(perdidaMensual * (porcentajeSena / 100));
  const recuperadoAnual = recuperadoMes * 12;

  // Comparativa Antes vs Después orientada a Tenis
  const beforeAfterTenis = [
    {
      pain: "Mensajes constantes por WhatsApp preguntando disponibilidad de polvo de ladrillo vs cemento o turnos de 90 minutos.",
      solution: "Grilla horaria online 24/7 donde los tenistas eligen superficie, duración (60, 90 o 120 min) y reservan en 30 segundos."
    },
    {
      pain: "Reservas de palabra para singles o dobles que no asisten a último momento, dejando una cancha entera sin facturar.",
      solution: "Seña obligatoria online con Mercado Pago. Si el jugador no se presenta, tu club ya tiene el dinero asegurado en su cuenta."
    },
    {
      pain: "Caos entre turnos de alquiler tradicional, clases particulares de profesores y escuelas formativas de tenis.",
      solution: "Agenda organizada: bloqueá horarios para profesores, administrá clases fijas y liberá las pistas restantes para el público."
    },
    {
      pain: "Tarifas uniformes que no contemplan canchas rápidas, polvo de ladrillo con riego y mantenimiento, o iluminación nocturna.",
      solution: "Precios diferenciados por superficie (Polvo, Hard Court / Rápida, Césped), recargo nocturno de luz y duración de turno."
    },
    {
      pain: "Lluvias repentinas que dejan las canchas de polvo impracticables y generan discusiones por devoluciones de dinero.",
      solution: "Protocolo de lluvia inteligente: cancelá la jornada en un click y reintegrá automáticamente en saldo o vale digital a tus socios."
    }
  ];

  // Funcionalidades clave para Clubes de Tenis
  const tenisFeatures = [
    {
      icon: <Clock className="w-5 h-5 text-emerald-400" />,
      title: "Duración Flexible (60, 90 y 120 min)",
      desc: "El tenis exige flexibilidad: adaptá tus canchas para partidos singles de 1 hora, turnos dobles de 1h y media o 2 horas completas sin huecos vacíos."
    },
    {
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      title: "Diferenciación por Superficie",
      desc: "Especificá el tipo de cancha: Polvo de Ladrillo (Clay), Rápida / Cemento (Hard Court), Césped o Sintética, con precios y cuidados específicos."
    },
    {
      icon: <Wallet className="w-5 h-5 text-emerald-400" />,
      title: "Señas Online con Mercado Pago",
      desc: "Cobrá el porcentaje o monto fijo de seña que determines antes de confirmar la reserva. Acreditación inmediata sin intermediarios."
    },
    {
      icon: <SunMoon className="w-5 h-5 text-emerald-400" />,
      title: "Tarifas Dinámicas & Luz Artificial",
      desc: "Configurá tarifas diferenciadas para horarios pico de tarde/noche y fines de semana, más el costo adicional de iluminación de reflectores."
    },
    {
      icon: <CloudRain className="w-5 h-5 text-emerald-400" />,
      title: "Protocolo de Lluvia & Vales de Crédito",
      desc: "Ante mal clima en canchas descubiertas o de arcilla, cancelá de forma masiva y emití vales tokenizados o reintegros a billetera virtual."
    },
    {
      icon: <Repeat className="w-5 h-5 text-emerald-400" />,
      title: "Abonados y Turnos Fijos Anuales",
      desc: "Gestioná fácilmente los turnos semanales fijos de tus socios habituales. Si un socio libera su horario una semana, vuelve a la venta online."
    },
    {
      icon: <Coffee className="w-5 h-5 text-emerald-400" />,
      title: "Punto de Venta (POS) & Pro-Shop",
      desc: "Controlá el buffet del club, tubos de pelotas de tenis, encordados, grips, alquiler de raquetas y bebidas directo a la cuenta del turno."
    },
    {
      icon: <Globe className="w-5 h-5 text-emerald-400" />,
      title: "Sitio Web Propio para tu Club",
      desc: "Mostrá la identidad de tu club (ej: tuclub.turnosflow.com) con fotos de tus canchas, logotipo, servicios de confitería y grilla de reservas."
    }
  ];

  const faqs = [
    {
      q: "¿El sistema permite turnos de tenis de 90 o 120 minutos?",
      a: "Sí, totalmente. A diferencia de otros sistemas rígidos que solo contemplan 60 minutos, TurnosFlow te permite configurar libremente la duración de turnos de tus canchas (60, 90 o 120 minutos) adaptándose tanto a partidos de singles como a dobles largos."
    },
    {
      q: "¿Cómo se manejan las canchas de polvo de ladrillo cuando llueve?",
      a: "TurnosFlow cuenta con un protocolo especializado para contingencias climáticas. Desde el panel podés cancelar masivamente turnos de canchas descubiertas o de arcilla, bloqueando los horarios para mantenimiento y reintegrando el dinero en billetera virtual o emitiendo un vale de crédito digital por WhatsApp."
    },
    {
      q: "¿Puedo cobrar señas automáticas por Mercado Pago?",
      a: "Sí. Podés exigir una seña (por ejemplo, el 50% o el total) para que el turno quede confirmado. Los fondos se acreditan directo en tu cuenta bancaria / Mercado Pago sin que nosotros toquemos tu dinero."
    },
    {
      q: "¿Se pueden reservar canchas para profesores o escuelas de tenis?",
      a: "Sí. Podés crear turnos recurrentes fijos o bloqueos administrativos dedicados a profesores y entrenamientos. De esa forma, esas pistas quedan apartadas del público general de forma automática."
    },
    {
      q: "¿Nos ayudan a configurar las canchas, superficies y tarifas?",
      a: "Sí, 100% bonificado. Nuestro equipo se encarga de la puesta en marcha inicial gratuita: cargamos tus pistas de polvo de ladrillo o cemento, horarios, tarifas con luz y logo para que comiences a recibir reservas desde el primer día."
    }
  ];

  const whatsappUrl = `https://wa.me/5491149790220?text=${encodeURIComponent(
    "¡Hola! Vi la propuesta de TurnosFlow para clubes de tenis y me gustaría sacarme unas dudas y coordinar una videollamada de demostración."
  )}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 1. HERO SECTION TENIS */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Especial para Clubes y Complejos de Tenis</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            El Software de Gestión y Turnos Diseñado para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Clubes de Tenis
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Eliminá el desorden de reservas manuales en papel o WhatsApp. Gestioná canchas de polvo de ladrillo y cemento con turnos flexibles (60, 90 y 120 min), señas online y protocolo ante lluvias.
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
            <span>El Antes y el Después en tu Club de Tenis</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Dejá atrás el desorden manual y profesionalizá tus canchas
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Comprobá cómo se simplifica la administración de socios, canchas y cobros en el día a día.
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
                <p className="text-xs text-rose-400">Pérdida de recaudación y ausentismo no señado</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterTenis.map((item, idx) => (
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
                <h3 className="text-lg font-black text-emerald-300">Con TurnosFlow Tenis</h3>
                <p className="text-xs text-emerald-400/80">Control total, señas cobradas y canchas llenas</p>
              </div>
            </div>

            <div className="space-y-4">
              {beforeAfterTenis.map((item, idx) => (
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

      {/* 3. CALCULADORA DE ROI PARA CLUBES DE TENIS */}
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
                ¿Cuánto dinero pierde tu club por reservas caídas?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Ajustá los valores reales de tu complejo de tenis y descubrí cuánto capital recuperás al exigir señas automáticas.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
              {/* Controles de la Calculadora */}
              <div className="lg:col-span-7 space-y-6">
                {/* Control Canchas */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Cantidad de Canchas de Tenis:</span>
                    <span className="text-emerald-400 font-mono text-base">{canchasTenis} canchas</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    value={canchasTenis}
                    onChange={(e) => setCanchasTenis(Number(e.target.value))}
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
                      ${precioTurnoTenis.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={6000}
                    max={40000}
                    step={1000}
                    value={precioTurnoTenis}
                    onChange={(e) => setPrecioTurnoTenis(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>$6.000</span>
                    <span>$20.000</span>
                    <span>$40.000</span>
                  </div>
                </div>

                {/* Control Turnos Caídos */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-200">
                    <span>Turnos que te cancelan o no van al mes:</span>
                    <span className="text-rose-400 font-mono text-base">{turnosCaidosMes} turnos vacíos</span>
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

      {/* 4. FUNCIONALIDADES ESPECÍFICAS DE TENIS */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Diseñado para Clubes de Tenis</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Todo lo que tu complejo de tenis necesita en un solo lugar
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Dejá de usar planillas desconectadas o cuadernos de mostrador. Gestioná turnos de 60/90/120 min, canchas de polvo y cemento, profesores y cobros en una única pantalla.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tenisFeatures.map((feat, idx) => (
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
            Preguntas Frecuentes de Complejos de Tenis
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
              Modernizá la gestión de tu club de tenis hoy
            </h2>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Sumate a los clubes que ya automatizan sus canchas de polvo y cemento, eliminan los turnos caídos con señas y ofrecen reservas online 24/7.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/registro-club"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
              >
                <span>Registrar mi Club de Tenis (30 Días Gratis)</span>
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
