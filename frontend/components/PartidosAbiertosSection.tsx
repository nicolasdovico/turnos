"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Calendar, Clock, Trophy, ArrowRight, Sparkles, CheckCircle2, Plus, ShieldCheck, X } from "lucide-react";
import { formatPrecio } from "@/lib/formatters";
import { formatFechaDDMMAAAA } from "@/components/GrillaHoraria";

interface CanchaItem {
  id: number;
  nombre: string;
  deporte: string;
}

interface OpcionCuota {
  num: number;
  label: string;
}

function getCuotasOptionsForSport(deporte?: string): OpcionCuota[] {
  const dep = (deporte || "").toLowerCase();
  if (dep.includes("padel") || dep.includes("pádel")) {
    return [
      { num: 4, label: "4 jugadores (Dobles estándar)" },
      { num: 2, label: "2 jugadores (Singles / Mano a mano)" },
    ];
  }
  if (dep.includes("tenis") || dep.includes("tennis")) {
    return [
      { num: 2, label: "2 jugadores (Singles)" },
      { num: 4, label: "4 jugadores (Dobles)" },
    ];
  }
  if (dep.includes("futbol") || dep.includes("fútbol")) {
    return [
      { num: 10, label: "10 jugadores (Fútbol 5)" },
      { num: 14, label: "14 jugadores (Fútbol 7)" },
      { num: 16, label: "16 jugadores (Fútbol 8)" },
      { num: 22, label: "22 jugadores (Fútbol 11)" },
    ];
  }
  if (dep.includes("basquet") || dep.includes("básquet") || dep.includes("basket")) {
    return [
      { num: 10, label: "10 jugadores (5 vs 5)" },
      { num: 6, label: "6 jugadores (3 vs 3)" },
    ];
  }
  if (dep.includes("squash") || dep.includes("racquetball")) {
    return [
      { num: 2, label: "2 jugadores (Individual)" },
    ];
  }
  if (dep.includes("pickleball")) {
    return [
      { num: 4, label: "4 jugadores (Dobles)" },
      { num: 2, label: "2 jugadores (Singles)" },
    ];
  }
  if (dep.includes("voley") || dep.includes("voleibol") || dep.includes("vóley")) {
    return [
      { num: 12, label: "12 jugadores (6 vs 6)" },
      { num: 4, label: "4 jugadores (Duplas Beach)" },
    ];
  }
  // Fallback genérico para otros deportes
  return [
    { num: 2, label: "2 jugadores" },
    { num: 4, label: "4 jugadores" },
    { num: 10, label: "10 jugadores" },
  ];
}

interface SlotItem {
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  disponible: boolean;
}

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

  // Modal para que jugadores creen su propia convocatoria
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canchas, setCanchas] = useState<CanchaItem[]>([]);
  const [selectedCanchaId, setSelectedCanchaId] = useState<string>("");
  const [selectedFecha, setSelectedFecha] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [slotsDisponibles, setSlotsDisponibles] = useState<SlotItem[]>([]);
  const [selectedHoraInicio, setSelectedHoraInicio] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [cuotasCount, setCuotasCount] = useState<number>(4);
  const [nivelMin, setNivelMin] = useState<string>("");
  const [nivelMax, setNivelMax] = useState<string>("");
  const [tipoPartido, setTipoPartido] = useState<string>("competitivo");
  const [nombreJugador, setNombreJugador] = useState<string>("");
  const [emailJugador, setEmailJugador] = useState<string>("");
  const [telefonoJugador, setTelefonoJugador] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cancha seleccionada y opciones dinámicas de jugadores
  const selectedCancha = React.useMemo(() => {
    return canchas.find((c) => String(c.id) === String(selectedCanchaId));
  }, [canchas, selectedCanchaId]);

  const opcionesCuotas = React.useMemo(() => {
    return getCuotasOptionsForSport(selectedCancha?.deporte);
  }, [selectedCancha?.deporte]);

  // Si cambia la cancha y el número de jugadores ya no es aplicable, se ajusta al predeterminado
  useEffect(() => {
    if (opcionesCuotas.length > 0) {
      const existe = opcionesCuotas.some((o) => o.num === cuotasCount);
      if (!existe) {
        setCuotasCount(opcionesCuotas[0].num);
      }
    }
  }, [opcionesCuotas, cuotasCount]);

  const fetchPartidos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/partidos-abiertos?estado=buscando", {
        headers: {
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });
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
  };

  useEffect(() => {
    fetchPartidos();
  }, [subdomain]);

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/clubs/${subdomain}/dashboard`, {
        headers: {
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        const canchasList = json?.data?.canchas || [];
        setCanchas(canchasList);
        if (canchasList.length > 0 && !selectedCanchaId) {
          setSelectedCanchaId(String(canchasList[0].id));
        }
      }
    } catch (err) {
      console.error("Error al cargar canchas:", err);
    }
  };

  useEffect(() => {
    async function loadSlots() {
      if (!isModalOpen || !selectedCanchaId || !selectedFecha) return;
      try {
        setLoadingSlots(true);
        const res = await fetch(`/api/canchas/${selectedCanchaId}/disponibilidad?fecha=${selectedFecha}`, {
          headers: {
            ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          const slots: SlotItem[] = (json.slots_disponibles || json.data?.slots || []).filter(
            (s: any) => s.disponible
          );
          setSlotsDisponibles(slots);
          if (slots.length > 0) {
            setSelectedHoraInicio(slots[0].hora_inicio);
          } else {
            setSelectedHoraInicio("");
          }
        } else {
          setSlotsDisponibles([]);
          setSelectedHoraInicio("");
        }
      } catch (err) {
        console.error("Error al cargar horarios:", err);
        setSlotsDisponibles([]);
        setSelectedHoraInicio("");
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [isModalOpen, selectedCanchaId, selectedFecha, subdomain]);

  const handleCrearConvocatoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCanchaId || !selectedFecha || !selectedHoraInicio) {
      setErrorMessage("Por favor seleccioná cancha, fecha y horario.");
      return;
    }

    if (!nombreJugador.trim()) {
      setErrorMessage("Ingresá tu nombre para organizar la convocatoria.");
      return;
    }

    try {
      setSubmitting(true);
      const slot = slotsDisponibles.find((s) => s.hora_inicio === selectedHoraInicio);

      const res = await fetch("/api/partidos-abiertos/crear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({
          cancha_id: parseInt(selectedCanchaId, 10),
          fecha: selectedFecha,
          hora_inicio: selectedHoraInicio,
          hora_fin: slot?.hora_fin || null,
          cuotas: cuotasCount,
          nivel_min: nivelMin.trim() || null,
          nivel_max: nivelMax.trim() || null,
          tipo_partido: tipoPartido,
          organizador_nombre: nombreJugador.trim(),
          organizador_email: emailJugador.trim() || null,
          organizador_telefono: telefonoJugador.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || json.error || "No se pudo crear la convocatoria.");
      }

      // Obtener el checkout de la cuota 1 del organizador para que pague su parte
      const cuotas = json?.data?.cuotas || [];
      const cuotaOrganizador = cuotas.find((c: any) => c.cuota_numero === 1);

      setIsModalOpen(false);
      fetchPartidos();

      if (cuotaOrganizador?.token_pago) {
        window.location.href = `/split-pagos/${cuotaOrganizador.token_pago}`;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar la convocatoria.");
    } finally {
      setSubmitting(false);
    }
  };

  // Si está cargando y no hay partidos, esperamos
  if (loading && partidos.length === 0) {
    return null;
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

          <div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Organizar Nueva Convocatoria</span>
            </button>
          </div>
        </div>

        {partidos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">No hay partidos abiertos buscando jugadores en este momento</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              ¿Tenés ganas de jugar pero te falta gente? Creá una convocatoria con el día, cancha y nivel que prefieras. Pagás solo tu parte y otros jugadores se suman.
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="mt-2 py-2.5 px-5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Abrir Primer Partido</span>
            </button>
          </div>
        ) : (
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
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
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
                          {formatPrecio(cuotaPendiente.monto)}
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ORGANIZAR CONVOCATORIA ABIERTA (PARTICULARES)                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Organizar Partido Abierto</h3>
                  <p className="text-xs text-slate-400">Elegí día y cancha, pagá tu cuota y convocá jugadores</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCrearConvocatoria} className="space-y-4 text-xs">
              {/* Selección de Cancha */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cancha y Deporte: *
                </label>
                <select
                  required
                  value={selectedCanchaId}
                  onChange={(e) => setSelectedCanchaId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.deporte})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Horario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha del Partido: *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={selectedFecha}
                    onChange={(e) => setSelectedFecha(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Horario Disponible: *
                  </label>
                  {loadingSlots ? (
                    <div className="py-2 text-[11px] text-slate-400 italic">Consultando horarios...</div>
                  ) : slotsDisponibles.length === 0 ? (
                    <div className="py-2 text-[11px] text-amber-400">Sin slots libres en esta fecha</div>
                  ) : (
                    <select
                      required
                      value={selectedHoraInicio}
                      onChange={(e) => setSelectedHoraInicio(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                    >
                      {slotsDisponibles.map((s) => (
                        <option key={s.hora_inicio} value={s.hora_inicio}>
                          {s.hora_inicio} a {s.hora_fin} hs ({formatPrecio(s.precio)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Cantidad de Jugadores / Cuotas inteligente según deporte */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cantidad Total de Jugadores: *
                  {selectedCancha?.deporte && (
                    <span className="ml-1.5 text-[10px] font-normal text-blue-400 capitalize">
                      (Deporte: {selectedCancha.deporte})
                    </span>
                  )}
                </label>
                <div className={`grid gap-2 ${opcionesCuotas.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
                  {opcionesCuotas.map((opcion) => (
                    <button
                      key={opcion.num}
                      type="button"
                      onClick={() => setCuotasCount(opcion.num)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold transition text-center ${
                        cuotasCount === opcion.num
                          ? "bg-blue-500 text-slate-950 border-blue-400 shadow-sm"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Niveles / Modalidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nivel Mínimo:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 7ma o Inicial"
                    value={nivelMin}
                    onChange={(e) => setNivelMin(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nivel Máximo:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 6ta o Intermedio"
                    value={nivelMax}
                    onChange={(e) => setNivelMax(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Modalidad del Encuentro:
                </label>
                <select
                  value={tipoPartido}
                  onChange={(e) => setTipoPartido(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="competitivo">Competitivo (Puntos / Ranking)</option>
                  <option value="amistoso">Amistoso (Recreativo)</option>
                  <option value="entrenamiento">Práctica / Entrenamiento</option>
                </select>
              </div>

              {/* Datos del Organizador */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="block font-bold text-white">Tus Datos (Capitán / Organizador):</span>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Tu Nombre y Apellido *"
                    value={nombreJugador}
                    onChange={(e) => setNombreJugador(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={emailJugador}
                    onChange={(e) => setEmailJugador(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (WhatsApp)"
                    value={telefonoJugador}
                    onChange={(e) => setTelefonoJugador(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting || !selectedCanchaId || !selectedFecha || !selectedHoraInicio}
                  className="px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider transition shadow-lg shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submitting ? "Creando..." : "Crear y Pagar Mi Parte"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
