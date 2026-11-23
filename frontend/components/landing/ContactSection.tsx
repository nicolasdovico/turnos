"use client";

import React from "react";
import { MessageCircle, Video, CheckCircle2, Gift, Sparkles, Clock } from "lucide-react";

interface ContactSectionProps {
  whatsappNumber?: string;
}

export default function ContactSection({ whatsappNumber = "5491149790220" }: ContactSectionProps) {
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "¡Hola! Vi Turnos Flow y me gustaría sacarme unas dudas sobre mi complejo y coordinar una videollamada para ver una demo en vivo."
  )}`;

  return (
    <section id="contacto" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/80 border border-emerald-500/30 p-8 sm:p-14 text-white shadow-2xl overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto space-y-10">
          {/* Encabezado */}
          <div className="text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trato Directo & Sin Burocracia</span>
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              ¿Tenés dudas o preferís ver el sistema en acción?
            </h2>

            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Sin formularios largos ni esperas de días. Escribinos directamente por WhatsApp, nos contás sobre tu club y coordinamos una <strong className="text-emerald-400 font-bold">videollamada</strong> para mostrarte la plataforma funcionando en vivo y resolver todas tus dudas sin apuro.
            </p>
          </div>

          {/* Tarjeta de Puesta en Marcha Gratuita ($0) */}
          <div className="rounded-2xl bg-slate-900/80 border border-emerald-500/40 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Gift className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">
                    Beneficio Exclusivo de Bienvenida
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Puesta en Marcha Inicial 100% Bonificada ($0)
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Sabemos que no tenés tiempo que perder. Si decidís arrancar, <strong className="text-white font-semibold">nosotros hacemos todo el trabajo pesado de configuración por vos</strong>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Cargamos tus canchas, deportes y superficies</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Configuramos tus horarios pico y de atención</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Subimos tu logotipo oficial y portada web</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Te capacitamos a vos y a tu equipo de trabajo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón de Acción Principal a WhatsApp */}
          <div className="text-center space-y-4 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base sm:text-lg uppercase tracking-wide transition shadow-2xl shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
            >
              <MessageCircle className="w-6 h-6 fill-slate-950" />
              <span>Chatear por WhatsApp & Coordinar Demo</span>
            </a>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Respuesta rápida y personalizada
              </span>
              <span>•</span>
              <a
                href="https://instagram.com/turnosflow.oficial"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-pink-400 font-semibold transition inline-flex items-center gap-1 text-slate-300"
              >
                <span>📸 @turnosflow.oficial</span>
              </a>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-400" />
                Videollamada por Google Meet / Zoom a coordinar
              </span>
              <span>•</span>
              <span>Sin compromisos de contratación</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
