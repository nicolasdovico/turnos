"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GrillaHoraria, { formatWhatsAppNumber } from "@/components/GrillaHoraria";
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
  tipo_cobro_reserva?: string;
  porcentaje_sena?: number;
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
  const [showPublicQrModal, setShowPublicQrModal] = useState<boolean>(false);

  const cleanWaNumber = useMemo(() => formatWhatsAppNumber(complejo?.telefono), [complejo?.telefono]);

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

            {(complejo.direccion || complejo.ciudad) && (
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <span>
                    {[complejo.direccion, complejo.ciudad].filter(Boolean).join(", ")}
                  </span>
                </span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Portal oficial de reservas de turnos en vivo. Selecciona tu cancha, fecha y horario para asegurar tu lugar al instante con confirmación inmediata.
            </p>

            {complejo.telefono && (
              <div className="pt-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowPublicQrModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500/60 transition shadow-sm cursor-pointer group text-xs font-semibold"
                  title="Escanear código QR para chatear por WhatsApp desde tu celular"
                  data-testid="header-qr-button"
                >
                  <span className="text-sm">📱</span>
                  <span>¿Estás en la PC? <strong>Escaneá el Código QR de WhatsApp</strong></span>
                  <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>
            )}
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

      {/* Floating WhatsApp Contact Button */}
      {complejo.telefono && (
        <aside
          aria-label="Contacto por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center group"
          data-testid="floating-whatsapp-widget"
        >
          <div className="hidden sm:flex items-center bg-slate-900/95 text-white text-xs font-semibold px-3 py-2 rounded-2xl shadow-xl border border-slate-700/80 mr-3 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span>¿Dudas o consultas? <strong className="text-emerald-400">¡Chateá con nosotros!</strong></span>
          </div>
          <a
            href={`https://wa.me/${cleanWaNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xl shadow-emerald-950/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Abrir chat de WhatsApp"
            aria-label="Contactar por WhatsApp"
            data-testid="floating-whatsapp-button"
          >
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.9-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </a>
        </aside>
      )}

      {/* Modal Código QR Público para Celulares */}
      {showPublicQrModal && complejo.telefono && (
        <div
          data-testid="public-qr-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <button
              type="button"
              onClick={() => setShowPublicQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
                💬
              </div>
              <h3 className="text-xl font-black text-white">Chateá por WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Apuntá con la <strong className="text-emerald-400">cámara de tu celular</strong> a este código para abrir directamente el chat con <strong>{complejo.nombre}</strong>.
              </p>
            </div>

            {/* Código QR */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Fwa.me%2F${cleanWaNumber}`}
                alt={`Código QR WhatsApp ${complejo.nombre}`}
                width={240}
                height={240}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-slate-300 bg-slate-950 border border-slate-800 py-2 px-3 rounded-xl flex items-center justify-center gap-2">
                <span className="text-emerald-400">wa.me/</span>
                <span className="font-bold text-white">{cleanWaNumber}</span>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={`https://wa.me/${cleanWaNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <span>💬</span> Abrir en WhatsApp Web ↗
                </a>
                <button
                  type="button"
                  onClick={() => setShowPublicQrModal(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
