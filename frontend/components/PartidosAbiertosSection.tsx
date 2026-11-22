"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Calendar, Clock, Trophy, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { formatMonto } from "@/lib/formatters";
import { formatFechaDDMMAAAA } from "@/components/GrillaHoraria";

interface PartidoPublico {
  id: number;
  tipo_partido: string;
  nivel_min?: string | null;
  nivel_max?: string | null;
  jugadores_requeridos: number;
  jugadores_actuales: number;
  estado: string;
  turno?: {
    id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    cancha?: {
      id: number;
      nombre: string;
      deporte: string;
    };
  };
  pagos_divididos?: {
    id: number;
    cuota_numero: number;
    monto: number;
    token_pago: string;
    estado: string;
  }[];
}

interface PartidosAbiertosSectionProps {
  subdomain: string;
  clubNombre: string;
}

export default function PartidosAbiertosSection({ subdomain, clubNombre }: PartidosAbiertosSectionProps) {
  const [partidos, setPartidos] = useState<PartidoPublico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartidos() {
      try {
        setLoading(true);
        const res = await fetch("/api/partidos-abiertos?estado=buscando");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data)) {
            setPartidos(json.data);
          } else {
            setPartidos([]);
          }
        }
      } catch (err) {
        console.error("Error al cargar partidos abiertos públicos:", err);
        setPartidos([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPartidos();
  }, [subdomain]);

  if (loading || !Array.isArray(partidos) || partidos.length === 0) {
    return null; // Si no hay partidos abiertos convocando gente, no ocupa espacio
  }

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/60 border border-blue-500/30 p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Comunidad de Jugadores</span>
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Partidos Abiertos: ¡Sumate a Jugar!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Convocatorias con lugares disponibles en {clubNombre}. Anotate, pagá tu cuota online y completá el partido.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partidos.map((partido) => {
            const turno = partido.turno;
            const cancha = turno?.cancha;
            const cuotas = partido.pagos_divididos || [];
            const cuotaPendiente = cuotas.find((c) => c.estado === "pendiente");
            const pagadas = cuotas.filter((c) => c.estado === "pagado").length;
            const total = cuotas.length || partido.jugadores_requeridos;
            const faltan = total - pagadas;

            return (
              <div
                key={partido.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 hover:border-blue-500/40 transition shadow-lg flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {cancha?.deporte || "Deporte"}
                    </span>

                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Falta {faltan} {faltan === 1 ? "jugador" : "jugadores"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">
                      {cancha?.nombre || "Cancha Deportiva"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{turno?.fecha ? formatFechaDDMMAAAA(turno.fecha) : ""}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{turno?.hora_inicio?.substring(0, 5)} hs</span>
                    </div>
                  </div>

                  {(partido.nivel_min || partido.nivel_max) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Nivel: {partido.nivel_min || "Abierto"} a {partido.nivel_max || "Libre"}</span>
                    </div>
                  )}

                  {cuotaPendiente && (
                    <div className="flex items-baseline justify-between text-xs pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Cuota por jugador:</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {formatMonto(cuotaPendiente.monto)}
                      </span>
                    </div>
                  )}
                </div>

                {cuotaPendiente ? (
                  <Link
                    href={`/split-pagos/${cuotaPendiente.token_pago}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    <span>Sumarme y Pagar Mi Parte</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="w-full py-2 text-center text-xs font-bold text-slate-500 bg-slate-950 rounded-xl">
                    Convocatoria completa
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
