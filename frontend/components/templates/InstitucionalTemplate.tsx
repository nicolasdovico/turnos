"use client";

import React from "react";
import GrillaHoraria from "@/components/GrillaHoraria";
import {
  Trophy,
  Coffee,
  Sparkles,
  Car,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { TemplateProps } from "./BookingDirectTemplate";

export default function InstitucionalTemplate({
  subdomain,
  complejo,
  branding,
  canchas,
  selectedCanchaId,
  onSelectCanchaId,
  selectedCancha,
  tipoNegocioLabel,
  isAdmin,
  user,
  token,
}: TemplateProps) {
  const scrollToReservas = () => {
    const el = document.getElementById("seccion-reservas-club");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-12" data-testid="template-institucional">
      {/* Hero Banner Panorámico */}
      <section className="relative overflow-hidden bg-slate-900 border-b border-slate-800">
        {/* Background Cover Image or Default Gradient */}
        {branding.portada_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 transform scale-105 filter blur-[1px]"
            style={{ backgroundImage: `url(${branding.portada_url})` }}
          />
        ) : (
          <div
            className="absolute inset-0 opacity-20 bg-gradient-to-tr from-emerald-950 via-slate-900 to-slate-950"
            style={{
              background: `radial-gradient(circle at 50% 20%, var(--club-primary, #10b981) 0%, transparent 60%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950" />

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 backdrop-blur-sm text-xs font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize">{tipoNegocioLabel} Oficial</span>
            <span>•</span>
            <span className="text-emerald-400 capitalize">{complejo.deporte_principal}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto">
            {complejo.nombre}
          </h1>

          {branding.eslogan && (
            <p className="text-base sm:text-xl text-emerald-300/90 font-medium max-w-2xl mx-auto italic">
              "{branding.eslogan}"
            </p>
          )}

          {branding.descripcion_corta && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {branding.descripcion_corta}
            </p>
          )}

          {(complejo.direccion || complejo.ciudad) && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{[complejo.direccion, complejo.ciudad].filter(Boolean).join(", ")}</span>
            </div>
          )}

          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={scrollToReservas}
              data-testid="btn-hero-reservar"
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition shadow-xl shadow-emerald-950/60 cursor-pointer flex items-center gap-2"
            >
              <span>Reservar mi Cancha</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* Institutional Highlights / Amenities Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white">Instalaciones Pro</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Canchas con estándares de competición, iluminación LED y mantenimiento continuo.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white">Vestuarios & Confort</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Duchas de alta presión, espacios climatizados y lockers seguros para tu tranquilidad.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
              <Coffee className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white">Buffet & Resto Bar</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Espacio social y terraza panorámica para disfrutar el tercer tiempo entre amigos.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
              <Car className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white">Predio Seguro</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Estacionamiento propio y seguridad en todo el predio durante tu estadía.
            </p>
          </div>
        </div>
      </section>

      {/* Reservation Section */}
      <section id="seccion-reservas-club" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Reservá tu Cancha en {complejo.nombre}
          </h2>
          <p className="text-xs text-slate-400">
            Elegí la cancha de tu preferencia y consultá los turnos disponibles en tiempo real.
          </p>
        </div>

        {canchas.length === 0 ? (
          <div className="text-center rounded-3xl bg-slate-900 border border-slate-800 p-12 space-y-4">
            <h3 className="text-base font-bold text-white">No hay canchas disponibles</h3>
            <p className="text-xs text-slate-400">Vuelve a consultar más tarde.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Court Selector */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {canchas.map((c) => {
                const isSelected = selectedCancha?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectCanchaId(c.id)}
                    data-testid={`btn-select-cancha-${c.id}`}
                    className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                        : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    <span>{c.nombre}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      ${Number(c.precio_base).toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Timetable Schedule Grid */}
            {selectedCancha && (
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-8 shadow-2xl">
                <GrillaHoraria
                  key={`${selectedCancha.id}-${selectedCancha.duracion_minutos}-${selectedCancha.permite_duracion_flexible}-${user ? user.id : "anon"}`}
                  canchaId={selectedCancha.id}
                  canchaNombre={selectedCancha.nombre}
                  deporte={selectedCancha.deporte}
                  subdomain={subdomain}
                  duracionInicial={selectedCancha.duracion_minutos}
                  permiteDuracionFlexible={selectedCancha.permite_duracion_flexible}
                  duracionesPermitidas={selectedCancha.duraciones_permitidas}
                  precioBase={Number(selectedCancha.precio_base)}
                  precio90Min={selectedCancha.precio_90_min ? Number(selectedCancha.precio_90_min) : undefined}
                  precio120Min={selectedCancha.precio_120_min ? Number(selectedCancha.precio_120_min) : undefined}
                  isAdmin={isAdmin}
                  token={token}
                  porcentajeSena={complejo?.porcentaje_sena}
                  tipoCobroReserva={complejo?.tipo_cobro_reserva}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
