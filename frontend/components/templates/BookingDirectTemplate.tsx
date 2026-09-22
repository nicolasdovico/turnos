"use client";

import React from "react";
import GrillaHoraria from "@/components/GrillaHoraria";
import { Zap, ShieldCheck, Clock, MapPin } from "lucide-react";

export interface CanchaItem {
  id: number;
  nombre: string;
  deporte: string;
  superficie: string;
  precio_base: string | number;
  precio_con_luz?: string | number | null;
  techada: boolean;
  iluminacion?: boolean;
  tipo_iluminacion?: string | null;
  camara_grabacion?: boolean;
  marcador_digital?: boolean;
  climatizada?: boolean;
  tipo_cubierta?: string | null;
  tipo_pared?: string | null;
  formato?: string | null;
  duracion_minutos?: number;
  permite_duracion_flexible?: boolean;
  duraciones_permitidas?: number[];
  precio_90_min?: string | number | null;
  precio_120_min?: string | number | null;
  estado: string;
}

export interface TemplateProps {
  subdomain: string;
  complejo: {
    id: number;
    nombre: string;
    subdominio: string;
    deporte_principal: string;
    telefono: string | null;
    ciudad: string | null;
    direccion: string | null;
    latitud?: number | null;
    longitud?: number | null;
    tipo_cobro_reserva?: string;
    porcentaje_sena?: number;
    tipo_negocio?: { id: number; nombre: string; slug: string } | null;
  };
  branding: {
    plantilla_slug: string;
    logo_url: string | null;
    portada_url: string | null;
    color_primario: string;
    color_secundario: string;
    color_acento: string;
    color_fondo: string;
    eslogan: string | null;
    descripcion_corta: string | null;
    redes_sociales: {
      instagram?: string | null;
      facebook?: string | null;
      tiktok?: string | null;
      youtube?: string | null;
      sitio_web?: string | null;
    };
  };
  canchas: CanchaItem[];
  selectedCanchaId: number | null;
  onSelectCanchaId: (id: number) => void;
  selectedCancha?: CanchaItem;
  tipoNegocioLabel: string;
  distanciaUsuario: string | null;
  cleanWaNumber: string | null;
  isAdmin: boolean;
  user: any;
  token?: string | null;
  onOpenQrModal: () => void;
}

export default function BookingDirectTemplate({
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
  return (
    <div className="space-y-6" data-testid="template-booking-direct">
      {/* Quick Operational Sub-Header */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3" />
                <span>{tipoNegocioLabel} Oficial</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                <span>Reserva Directa Inmediata</span>
              </span>
              <span className="rounded-full bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 text-[10px] font-semibold capitalize">
                🏆 {complejo.deporte_principal}
              </span>
              {branding.eslogan && (
                <span className="text-xs text-slate-400 font-medium italic hidden sm:inline">
                  "{branding.eslogan}"
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Turnos Disponibles
            </h1>
            {(complejo.direccion || complejo.ciudad || (complejo.latitud && complejo.longitud)) && (
              <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap pt-0.5">
                {(complejo.direccion || complejo.ciudad) && (
                  <span className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{[complejo.direccion, complejo.ciudad].filter(Boolean).join(", ")}</span>
                  </span>
                )}
                {complejo.latitud && complejo.longitud && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${complejo.latitud},${complejo.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="btn-como-llegar"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-[11px] font-semibold transition"
                    title="Abrir cómo llegar en Google Maps"
                  >
                    <span>🗺️</span>
                    <span>Cómo llegar</span>
                    <span className="text-[9px]">↗</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bloqueo exclusivo 10 min</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmación al instante</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {canchas.length === 0 ? (
          <div className="text-center rounded-3xl bg-slate-900 border border-slate-800 p-12 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-2xl border border-amber-500/20">
              ⏸️
            </div>
            <h3 className="text-base font-bold text-white">No hay canchas disponibles para reservar</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Actualmente todas las pistas están ocupadas o en mantenimiento. Vuelve a consultar más tarde.
            </p>
          </div>
        ) : (
          <>
            {/* Court Selector Pills / Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  1. Selecciona una Cancha ({canchas.length} disponibles)
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {canchas.map((c) => {
                  const isSelected = selectedCancha?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelectCanchaId(c.id)}
                      data-testid={`btn-select-cancha-${c.id}`}
                      className={`text-left rounded-2xl p-3.5 transition border cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="font-black text-sm text-white">{c.nombre}</div>
                      <div className="text-[11px] text-slate-400 capitalize mt-0.5 font-medium flex items-center gap-1">
                        <span>{c.superficie ? c.superficie.replace(/_/g, " ") : c.deporte}</span>
                        <span>•</span>
                        <span>{c.techada ? "Cubierta" : "Descubierta"}</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-slate-500 font-medium">
                        {c.deporte} • {c.formato || "Estándar"}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Tarifa Base:
                        </span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          ${Number(c.precio_base).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timetable Schedule Grid */}
            {selectedCancha && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    2. Elige tu Turno en <span className="text-emerald-400">{selectedCancha.nombre}</span>
                  </h2>
                </div>

                <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 shadow-xl">
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
