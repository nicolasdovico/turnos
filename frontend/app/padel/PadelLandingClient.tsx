"use client";

import React from "react";
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
  ChevronDown 
} from "lucide-react";
import MainFooter from "@/components/landing/MainFooter";

export default function PadelLandingClient() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const faqs = [
    {
      q: "¿El sistema maneja turnos de 90 minutos sin desfasar la grilla?",
      a: "Sí, absolutamente. TurnosFlow está optimizado para los bloques clásicos de pádel de 90 minutos (y también 60 o 120 min), calculando de forma precisa los intervalos de disponibilidad y aplicando reglas anti-baches para evitar huecos improductivos en tus canchas."
    },
    {
      q: "¿Cómo funciona la diferenciación de precios por cancha y horario?",
      a: "Podés asignar tarifas específicas según la infraestructura de cada pista (ej: Cancha Panorámica de Cristal vs. Muro, Cancha Techada vs. Descubierta) y recargos automáticos para horarios pico nocturnos o costo de iluminación artificial LED."
    },
    {
      q: "¿Puedo cobrar señas por Mercado Pago para evitar que me 'claven' un turno?",
      a: "Sí. Podés exigir el cobro automático de una seña (ej: 50% o monto fijo) o el 100% del turno al reservar online. Los fondos se acreditan de forma instantánea y el turno solo se confirma tras el pago exitoso."
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
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* 1. HERO SECTION ESPECÍFICO DE PÁDEL */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-emerald-400/15 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="text-center max-w-4xl mx-auto space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300 px-4 py-1.5 text-xs font-black tracking-wide uppercase shadow-sm">
            <span className="text-sm">🎾</span>
            <span>Diseñado Exclusivamente para Complejos de Pádel</span>
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            El Software de Gestión y Turnos que tu{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Club de Pádel necesita
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Eliminá los audios eternos de WhatsApp y las canchas clavadas. Turnos de 90 minutos en tiempo real, cobro automático de señas, partidos abiertos por nivel y control total de caja y cantina.
          </p>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/registro-club"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <span>🚀 Comenzar Prueba Gratis (30 Días)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm transition shadow-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Coordinar Videollamada Demo</span>
            </a>
          </div>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span>✓ Configuración inicial $0 bonificada</span>
            <span>•</span>
            <span>✓ Sin tarjeta de crédito</span>
            <span>•</span>
            <span>✓ Cancela cuando quieras</span>
          </div>
        </div>
      </section>

      {/* 2. DOLORES REALES DEL PÁDEL VS SOLUCIÓN */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-black text-emerald-400 tracking-wider uppercase">
              La Realidad en las Canchas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Dejá atrás el caos operativo en la recepción de tu club
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              El pádel tiene particularidades únicas que los sistemas genéricos de turnos no resuelven.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-7 space-y-4 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center text-xl">
                ❌
              </div>
              <h3 className="text-lg font-bold text-white">El "Clavado" de Turno</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Reservan un turno de palabra a las 20:30 hs y a las 20:20 te mandan un mensaje diciendo que uno se lesionó. Perdiste la recaudación de 4 jugadores.
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>✓ Solución TurnosFlow:</span> Seña automática por Mercado Pago.
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-7 space-y-4 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-xl">
                ⏳
              </div>
              <h3 className="text-lg font-bold text-white">La Búsqueda del 4to Jugador</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                El organizador no consigue la pareja completa y te pide que le avises a alguien de 6ta o 7ma. Terminás haciendo de relacionista público en WhatsApp.
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>✓ Solución TurnosFlow:</span> Partidos Abiertos con cupos por nivel.
              </div>
            </div>

            <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-7 space-y-4 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-xl">
                🏟️
              </div>
              <h3 className="text-lg font-bold text-white">Tarifas Desparejas de Pistas</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Invertiste en una pista Panorámica techada con césped texturado, pero tu sistema viejo cobra lo mismo que una cancha descubierta de cemento.
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>✓ Solución TurnosFlow:</span> Precios diferenciados por superficie y luz.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FUNCIONALIDADES ESPECÍFICAS PARA PÁDEL */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-black text-emerald-600 tracking-wider uppercase">
            Herramientas Especializadas
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Todo lo que tu complejo de pádel necesita en una sola plataforma
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              ⏱️
            </div>
            <h3 className="text-lg font-bold text-slate-900">Grilla Elástica de 90 Minutos</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cálculo automático de slots de 1h 30m adaptados a los horarios del pádel, con protección anti-baches para evitar huecos muertos en las canchas.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              💳
            </div>
            <h3 className="text-lg font-bold text-slate-900">Mercado Pago & Split Payment</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Cobrá la seña online o permití que los 4 jugadores dividan el total del turno en partes iguales mediante links de pago individuales.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              🔁
            </div>
            <h3 className="text-lg font-bold text-slate-900">Turnos Fijos Semestrales</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Asigná el turno fijo semanal a tus abonados de confianza para los próximos 6 meses con control de cuotas y renovación con un solo clic.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              🍔
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cantina, Buffet & Pelotas</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Punto de venta integrado para vender tubos de pelotas, grips, alquiler de paletas, bebidas y snacks cargados directamente al turno del jugador.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              🏆
            </div>
            <h3 className="text-lg font-bold text-slate-900">Torneos Americanos & Playoffs</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Armá torneos de fin de semana, categorías por niveles (8va a 3ra), cuadros de llaves eliminatorias y actualización de scores en tiempo real.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
              🌐
            </div>
            <h3 className="text-lg font-bold text-slate-900">Página Web Propia del Club</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tu propio portal institucional (ej: <span className="font-mono text-xs text-emerald-600">tuclub.turnosflow.com</span>) con tus colores, fotos de tus pistas y grilla online.
            </p>
          </div>
        </div>
      </section>

      {/* 4. BENEFICIO DE BIENVENIDA / ONBOARDING */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 p-8 sm:p-12 text-white border border-emerald-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-black text-emerald-400 uppercase tracking-wider">
              🎁 Puesta en Marcha Inicial $0 Bonificada
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white">
              ¿No tenés tiempo para configurar canchas y precios?
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Pasamos tus datos por WhatsApp y nosotros configuramos todo tu complejo por vos sin costo adicional: pistas, fotos, precios pico y horarios. Empezás a recibir reservas el mismo día.
            </p>

            <div className="pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/30"
              >
                <MessageCircle className="w-5 h-5 fill-slate-950" />
                <span>Hablar por WhatsApp con un Asesor</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PREGUNTAS FRECUENTES (FAQ) DE PÁDEL */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-2">
          <span className="text-xs font-black text-emerald-600 tracking-wider uppercase">
            Preguntas Frecuentes
          </span>
          <h2 className="text-3xl font-black text-slate-900">
            Dudas habituales de administradores de pádel
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BANNER FINAL */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center border border-slate-800 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Llevá tu club de pádel al siguiente nivel
          </h2>
          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Sumate hoy a los complejos que ya operan de forma automática, sin discusiones por señas y con su propia página web.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/registro-club"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
            >
              Registrar mi Club de Pádel (30 Días Gratis)
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <MainFooter />
    </main>
  );
}
