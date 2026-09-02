"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GrillaHoraria from "@/components/GrillaHoraria";
import { useAuth } from "@/context/AuthContext";

interface ComplejoData {
  id: number;
  uuid: string;
  nombre: string;
  subdominio: string;
  tipo_negocio?: { id: number; nombre: string; slug: string } | null;
  deporte_principal: string;
  telefono: string | null;
  ciudad: string | null;
  direccion: string | null;
  estado: string;
}

interface CanchaItem {
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function TenantPage({ params }: { params?: { subdomain: string } }) {
  const urlParams = useParams();
  const subdomain = (urlParams?.subdomain as string) || params?.subdomain || "demo";
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complejo, setComplejo] = useState<ComplejoData | null>(null);
  const [canchas, setCanchas] = useState<CanchaItem[]>([]);
  const [selectedCanchaId, setSelectedCanchaId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get active token from AuthContext, URL or localStorage
        let activeToken = token;
        if (!activeToken && typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search);
          activeToken =
            searchParams.get("auth_token") ||
            searchParams.get("token") ||
            localStorage.getItem("saas_token");
        }

        // 2. Check admin status for this club
        try {
          const adminRes = await fetch(`${API_BASE}/clubs/${subdomain}/is-admin`, {
            headers: {
              Accept: "application/json",
              ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
          });
          const adminData = await adminRes.json();
          if (adminData.is_admin) {
            setIsAdmin(true);
          }
        } catch {
          // Non-blocking
        }

        // 3. Fetch public club data & courts
        const res = await fetch(`${API_BASE}/clubs/${subdomain}/dashboard`);
        const data = await res.json();

        if (!res.ok || !data.data?.complejo) {
          setError(data.message || `No se encontró el club o complejo "${subdomain}".`);
          return;
        }

        const compData = data.data.complejo;
        setComplejo(compData);

        // Filter only active courts and sort them naturally by name
        const rawCanchas: CanchaItem[] = data.data.canchas || [];
        const activeCanchas = rawCanchas
          .filter((c) => c.estado === "activo")
          .sort((a, b) =>
            (a.nombre || "").localeCompare(b.nombre || "", undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );

        setCanchas(activeCanchas);
        if (activeCanchas.length > 0) {
          setSelectedCanchaId(activeCanchas[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, [subdomain, token]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">
            Cargando portal de reservas de {subdomain}...
          </p>
        </div>
      </main>
    );
  }

  if (error || !complejo) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="mx-auto max-w-md text-center rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 text-3xl border border-rose-500/20">
            🏟️
          </div>
          <h1 className="text-xl font-bold text-white">Establecimiento No Encontrado</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || `El establecimiento "${subdomain}" no existe o se encuentra inactivo temporalmente.`}
          </p>
          <div className="pt-2">
            <a
              href="http://localhost:8080/portal"
              className="inline-block rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition"
            >
              ← Ir al Portal de Complejos
            </a>
          </div>
        </div>
      </main>
    );
  }

  const selectedCancha = canchas.find((c) => c.id === selectedCanchaId) || canchas[0];
  const tipoNegocioLabel = complejo.tipo_negocio?.nombre || "Club";

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Admin Quick Access Bar */}
      {isAdmin && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 text-xs font-semibold text-emerald-300">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Estás visualizando la vista pública como dueño / administrador de <strong>{complejo.nombre}</strong>.
              </span>
            </div>
            <Link
              href="/panel"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow transition"
            >
              ⚙️ Abrir Panel de Control →
            </Link>
          </div>
        </div>
      )}

      {/* Hero Header Section */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
                {tipoNegocioLabel} Oficial
              </span>
              <span className="rounded-full bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 text-xs font-semibold capitalize">
                🏆 {complejo.deporte_principal}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white capitalize">
              {complejo.nombre}
            </h1>

            {(complejo.direccion || complejo.ciudad || complejo.telefono) && (
              <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-slate-400 flex-wrap">
                {(complejo.direccion || complejo.ciudad) && (
                  <span className="flex items-center gap-1">
                    <span>📍</span>
                    <span>
                      {[complejo.direccion, complejo.ciudad].filter(Boolean).join(", ")}
                    </span>
                  </span>
                )}
                {complejo.telefono && (
                  <span className="flex items-center gap-1">
                    <span>📞</span>
                    <span>{complejo.telefono}</span>
                  </span>
                )}
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Portal oficial de reservas de turnos en vivo. Selecciona tu cancha, fecha y horario para asegurar tu lugar al instante con confirmación inmediata.
            </p>
          </div>
        </div>
      </div>

      {/* Main Reservation Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8">
        {canchas.length === 0 ? (
          <div className="text-center rounded-3xl bg-slate-900 border border-slate-800 p-12 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-3xl border border-amber-500/20">
              ⏸️
            </div>
            <h3 className="text-lg font-bold text-white">No hay canchas disponibles para reservar</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Actualmente todas las canchas se encuentran en mantenimiento o no hay canchas activas registradas. Vuelve a consultar más tarde.
            </p>
          </div>
        ) : (
          <>
            {/* Court Selection Tabs / Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">1. Selecciona la Cancha</h2>
                  <p className="text-xs text-slate-400">
                    Elige entre las {canchas.length} canchas activas de {complejo.nombre}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {canchas.map((c) => {
                  const isSelected = selectedCancha?.id === c.id;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCanchaId(c.id)}
                      className={`text-left rounded-2xl p-4 transition border ${
                        isSelected
                          ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-white">{c.nombre}</div>
                          <div className="text-xs text-slate-400 capitalize mt-0.5 font-medium">
                            {c.deporte} • {c.superficie}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isSelected
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isSelected ? "✓ Seleccionada" : "Elegir"}
                        </span>
                      </div>

                      {/* Attribute Chips */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        <span className="rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                          {c.permite_duracion_flexible
                            ? "⏱️ Flexible (60/90/120m)"
                            : `⏱️ ${c.duracion_minutos || 60}m ${(c.duracion_minutos || 60) === 90 ? "(1h 30m)" : (c.duracion_minutos || 60) === 120 ? "(2h)" : "(1h)"}`}
                        </span>
                        <span className="rounded-md bg-slate-950 border border-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {c.techada ? "🏠 Techada" : "☀️ Descubierta"}
                        </span>
                        {c.iluminacion !== false && (
                          <span className="rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 text-[10px]">
                            💡 Luz {c.tipo_iluminacion || "LED"}
                          </span>
                        )}
                        {c.camara_grabacion && (
                          <span className="rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 text-[10px]">
                            📹 Grabación
                          </span>
                        )}
                        {c.marcador_digital && (
                          <span className="rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.5 text-[10px]">
                            🔢 Marcador
                          </span>
                        )}
                        {c.climatizada && (
                          <span className="rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 text-[10px]">
                            ❄️ Clima
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Tarifa {c.permite_duracion_flexible ? "desde (60m):" : `(${c.duracion_minutos || 60}m):`}
                        </span>
                        <span className="font-extrabold text-emerald-400">${c.precio_base}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Turnos Grid (Grilla Horaria) */}
            {selectedCancha && (
              <div className="pt-4 border-t border-slate-800">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-white">
                    2. Elige tu Turno en <span className="text-emerald-400">{selectedCancha.nombre}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Bloqueo temporal exclusivo de 10 minutos para completar tu reserva sin solapamientos
                  </p>
                </div>

                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-xl">
                  <GrillaHoraria
                    key={`${selectedCancha.id}-${selectedCancha.duracion_minutos}-${selectedCancha.permite_duracion_flexible}`}
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
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Subtle White-Label Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span>© {new Date().getFullYear()} {complejo.nombre}. Todos los derechos reservados.</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>Sistema de gestión con</span>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-semibold transition inline-flex items-center gap-0.5"
          >
            <span>⚡ Turnos SaaS</span>
            <span>↗</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
