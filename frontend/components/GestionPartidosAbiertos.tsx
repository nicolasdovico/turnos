"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Copy,
  ChevronRight,
  MessageCircle,
  HelpCircle,
  Trophy,
  Filter
} from "lucide-react";
import { formatPrecio } from "@/lib/formatters";
import { formatFechaDDMMAAAA } from "@/components/GrillaHoraria";

interface GestionPartidosAbiertosProps {
  subdomain: string;
}

interface CuotaItem {
  id: number;
  cuota_numero: number;
  total_cuotas: number;
  monto: number;
  token_pago: string;
  estado: "pendiente" | "pagado" | "cancelado";
  nombre_jugador?: string | null;
  email_jugador?: string | null;
  metodo_pago?: string | null;
  pagado_en?: string | null;
  checkout_url?: string;
}

interface PartidoAbiertoItem {
  id: number;
  complejo_id: number;
  turno_id: number;
  organizador_id?: number | null;
  nivel_min?: string | null;
  nivel_max?: string | null;
  jugadores_requeridos: number;
  jugadores_actuales: number;
  estado: "buscando" | "completo" | "cancelado";
  tipo_partido: string;
  created_at: string;
  turno?: {
    id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    precio: number;
    estado: string;
    cancha?: {
      id: number;
      nombre: string;
      deporte: string;
      superficie?: string;
    };
  };
  organizador?: {
    id: number;
    name: string;
    email: string;
  } | null;
  pagos_divididos?: CuotaItem[];
}

interface TurnoElegible {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  estado: string;
  cancha?: {
    id: number;
    nombre: string;
    deporte: string;
  };
  cliente?: {
    id: number;
    name: string;
  } | null;
}

export default function GestionPartidosAbiertos({ subdomain }: GestionPartidosAbiertosProps) {
  const [partidos, setPartidos] = useState<PartidoAbiertoItem[]>([]);
  const [turnosElegibles, setTurnosElegibles] = useState<TurnoElegible[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "buscando" | "completo" | "cancelado">("todos");

  // Modal Crear Convocatoria
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTurnoId, setSelectedTurnoId] = useState<string>("");
  const [cuotasCount, setCuotasCount] = useState<number>(4);
  const [nivelMin, setNivelMin] = useState<string>("");
  const [nivelMax, setNivelMax] = useState<string>("");
  const [tipoPartido, setTipoPartido] = useState<string>("competitivo");
  const [organizadorNombre, setOrganizadorNombre] = useState<string>("");
  const [organizadorEmail, setOrganizadorEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Modal Ver Detalle / Links
  const [selectedPartido, setSelectedPartido] = useState<PartidoAbiertoItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchPartidos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/partidos-abiertos", {
        headers: {
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setPartidos(json.data || []);
      }
    } catch (err) {
      console.error("Error al cargar partidos abiertos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTurnosElegibles = async () => {
    try {
      const res = await fetch("/api/turnos-para-split", {
        headers: {
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setTurnosElegibles(json.data || []);
      }
    } catch (err) {
      console.error("Error al cargar turnos para split:", err);
    }
  };

  useEffect(() => {
    fetchPartidos();
  }, [subdomain]);

  const handleOpenCreateModal = () => {
    fetchTurnosElegibles();
    setIsModalOpen(true);
  };

  const handleCrearSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurnoId) {
      alert("Seleccioná un turno para fraccionar.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/turnos/${selectedTurnoId}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({
          cuotas: cuotasCount,
          es_partido_abierto: true,
          nivel_min: nivelMin || null,
          nivel_max: nivelMax || null,
          tipo_partido: tipoPartido,
          organizador_nombre: organizadorNombre.trim() || null,
          organizador_email: organizadorEmail.trim() || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Error al crear el partido abierto.");
      }

      alert("¡Convocatoria de partido abierto creada con éxito!");
      setIsModalOpen(false);
      setSelectedTurnoId("");
      fetchPartidos();
    } catch (err: any) {
      alert(err.message || "No se pudo crear la convocatoria.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelarPartido = async (partidoId: number) => {
    if (!confirm("¿Estás seguro de cancelar esta convocatoria? Se cancelarán las cuotas pendientes.")) {
      return;
    }

    try {
      const res = await fetch(`/api/partidos-abiertos/${partidoId}/cancelar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({ motivo: "Cancelado desde el panel de administración" }),
      });

      if (res.ok) {
        alert("Partido abierto cancelado correctamente.");
        fetchPartidos();
        if (selectedPartido?.id === partidoId) {
          setSelectedPartido(null);
        }
      } else {
        alert("Error al cancelar el partido abierto.");
      }
    } catch (err) {
      alert("Error al procesar la cancelación.");
    }
  };

  const handleRegistrarPagoCuota = async (tokenPago: string) => {
    try {
      const res = await fetch(`/api/split-pagos/${tokenPago}/pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({
          metodo_pago: "efectivo",
          nombre_jugador: "Abonado en mostrador",
        }),
      });

      if (res.ok) {
        alert("Cuota registrada como pagada con éxito.");
        fetchPartidos();
        if (selectedPartido) {
          // Refrescar el modal
          const updatedCuotas = selectedPartido.pagos_divididos?.map((c) =>
            c.token_pago === tokenPago ? { ...c, estado: "pagado" as const, metodo_pago: "efectivo" } : c
          );
          setSelectedPartido({ ...selectedPartido, pagos_divididos: updatedCuotas });
        }
      } else {
        alert("No se pudo registrar el pago de la cuota.");
      }
    } catch (err) {
      alert("Error al registrar el cobro.");
    }
  };

  const handleCopy = (text: string, token: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = partidos.length;
    const activos = partidos.filter((p) => p.estado === "buscando").length;
    const completos = partidos.filter((p) => p.estado === "completo").length;
    let cuotasPagadasTotal = 0;
    let cuotasPendientesTotal = 0;

    partidos.forEach((p) => {
      p.pagos_divididos?.forEach((c) => {
        if (c.estado === "pagado") cuotasPagadasTotal++;
        if (c.estado === "pendiente") cuotasPendientesTotal++;
      });
    });

    return { total, activos, completos, cuotasPagadasTotal, cuotasPendientesTotal };
  }, [partidos]);

  // Filtrado
  const filteredPartidos = useMemo(() => {
    return partidos.filter((p) => {
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const canchaNom = p.turno?.cancha?.nombre?.toLowerCase() || "";
        const deporte = p.turno?.cancha?.deporte?.toLowerCase() || "";
        const orgNom = p.organizador?.name?.toLowerCase() || "";
        return canchaNom.includes(query) || deporte.includes(query) || orgNom.includes(query);
      }
      return true;
    });
  }, [partidos, filtroEstado, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header con Título y Botón Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>💳 Partidos Abiertos & Split Payment</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Convocatorias abiertas de partidos, matchmaking por nivel y cobro de turnos dividido en cuotas individuales.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Convocatoria / Split</span>
        </button>
      </div>

      {/* 2. Métricas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Convocatorias Activas
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {stats.activos}
          </div>
          <p className="text-[11px] text-slate-500">Buscando jugadores</p>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Partidos Completados
          </span>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {stats.completos}
          </div>
          <p className="text-[11px] text-slate-500">100% de cuotas abonadas</p>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Cuotas Pagadas
          </span>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            {stats.cuotasPagadasTotal}
          </div>
          <p className="text-[11px] text-slate-500">Cobros acreditados</p>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Cuotas Pendientes
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {stats.cuotasPendientesTotal}
          </div>
          <p className="text-[11px] text-slate-500">Por cobrar o unirse</p>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cancha, deporte u organizador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(["todos", "buscando", "completo", "cancelado"] as const).map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition capitalize cursor-pointer border ${
                filtroEstado === est
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {est === "todos" ? "Todos" : est === "buscando" ? "Buscando" : est}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchPartidos}
            title="Refrescar lista"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. Listado de Partidos Abiertos */}
      {loading ? (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">Cargando convocatorias activas...</p>
        </div>
      ) : filteredPartidos.length === 0 ? (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No hay convocatorias que coincidan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Creá un nuevo partido abierto o dividí el turno de un cliente para comenzar a recibir jugadores.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Convocatoria</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartidos.map((partido) => {
            const turno = partido.turno;
            const cancha = turno?.cancha;
            const cuotas = partido.pagos_divididos || [];
            const pagadas = cuotas.filter((c) => c.estado === "pagado").length;
            const total = cuotas.length || partido.jugadores_requeridos;

            const isCompleto = partido.estado === "completo" || pagadas === total;
            const isCancelado = partido.estado === "cancelado";

            return (
              <div
                key={partido.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {cancha?.deporte || "Deporte"}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">
                        {cancha?.nombre || "Cancha"}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isCancelado
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : isCompleto
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse"
                      }`}
                    >
                      {isCancelado ? "Cancelado" : isCompleto ? "Completo" : "Buscando"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{turno?.fecha ? formatFechaDDMMAAAA(turno.fecha) : "Fecha no especificada"}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{turno ? `${turno.hora_inicio?.substring(0, 5)} hs` : "--:--"}</span>
                    </div>

                    {(partido.nivel_min || partido.nivel_max) && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Nivel: {partido.nivel_min || "Abierto"} a {partido.nivel_max || "Libre"}</span>
                      </div>
                    )}
                  </div>

                  {/* Barra de progreso de jugadores / cuotas */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Cuotas Pagadas:</span>
                      <span className="font-bold text-white font-mono">
                        {pagadas} / {total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCompleto ? "bg-blue-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.round((pagadas / (total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPartido(partido)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver Cuotas & Links</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {!isCancelado && !isCompleto && (
                    <button
                      type="button"
                      onClick={() => handleCancelarPartido(partido.id)}
                      title="Cancelar Convocatoria"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR PARTIDO ABIERTO / SPLIT                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Nueva Convocatoria / Split</h3>
                  <p className="text-xs text-slate-400">Dividí un turno o abrí un partido a la comunidad</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearSplit} className="space-y-4 text-xs">
              {/* Selección de Turno */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Seleccionar Cancha y Turno: *
                </label>
                {turnosElegibles.length === 0 ? (
                  <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                    No se encontraron turnos disponibles para fraccionar en los próximos días. Verificá tu grilla horaria.
                  </p>
                ) : (
                  <select
                    required
                    value={selectedTurnoId}
                    onChange={(e) => setSelectedTurnoId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="">-- Elegir Turno --</option>
                    {turnosElegibles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatFechaDDMMAAAA(t.fecha)} • {t.hora_inicio?.substring(0, 5)} hs • {t.cancha?.nombre} ({t.cancha?.deporte}) — Total: {formatPrecio(t.precio)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cantidad de Cuotas */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cantidad de Jugadores / Cuotas a Dividir: *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCuotasCount(num)}
                      className={`py-2 rounded-xl border text-xs font-bold transition ${
                        cuotasCount === num
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {num} {num === 2 ? "(Singles/2)" : num === 4 ? "(Pádel/4)" : num === 10 ? "(Fútbol/10)" : "Cuotas"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Niveles / Categorías */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nivel / Cat. Mínima:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 7ma o Principiante"
                    value={nivelMin}
                    onChange={(e) => setNivelMin(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nivel / Cat. Máxima:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 6ta o Intermedio"
                    value={nivelMax}
                    onChange={(e) => setNivelMax(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Tipo de Partido */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Modalidad del Partido:
                </label>
                <select
                  value={tipoPartido}
                  onChange={(e) => setTipoPartido(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="competitivo">Competitivo (Suma puntos / ranking)</option>
                  <option value="amistoso">Amistoso (Recreativo / Tercer tiempo)</option>
                  <option value="entrenamiento">Práctica / Entrenamiento</option>
                </select>
              </div>

              {/* Organizador Opcional */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="block font-bold text-slate-300">
                  Organizador / Capitán Inicial (Opcional):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del Capitán"
                    value={organizadorNombre}
                    onChange={(e) => setOrganizadorNombre(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <input
                    type="email"
                    placeholder="Email del Capitán"
                    value={organizadorEmail}
                    onChange={(e) => setOrganizadorEmail(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
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
                  disabled={submitting || !selectedTurnoId}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? "Generando..." : "Crear y Fraccionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER DETALLE DE CUOTAS Y LINKS DE PAGO                              */}
      {/* ========================================================================= */}
      {selectedPartido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {selectedPartido.turno?.cancha?.deporte || "Deporte"}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Cuotas de {selectedPartido.turno?.cancha?.nombre}
                </h3>
                <p className="text-xs text-slate-400">
                  {formatFechaDDMMAAAA(selectedPartido.turno?.fecha)} • {selectedPartido.turno?.hora_inicio?.substring(0, 5)} hs
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPartido(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Listado de cuotas */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Enlaces Individuales de Pago ({selectedPartido.pagos_divididos?.length || 0} cuotas):
              </h4>

              {selectedPartido.pagos_divididos?.map((cuota) => {
                const isPaid = cuota.estado === "pagado";
                const isCopied = copiedToken === cuota.token_pago;
                const linkPago = typeof window !== "undefined"
                  ? `${window.location.origin}/split-pagos/${cuota.token_pago}`
                  : `/split-pagos/${cuota.token_pago}`;

                const fechaFormateada = formatFechaDDMMAAAA(selectedPartido.turno?.fecha);
                const whatsappText = encodeURIComponent(
                  `¡Hola! Te paso el link para abonar tu parte del turno de ${selectedPartido.turno?.cancha?.deporte} del ${fechaFormateada} • ${selectedPartido.turno?.hora_inicio?.substring(0, 5)} hs en ${selectedPartido.turno?.cancha?.nombre}: ${linkPago}`
                );

                return (
                  <div
                    key={cuota.id}
                    className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                      isPaid
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          Cuota {cuota.cuota_numero}
                        </span>
                        {cuota.nombre_jugador && (
                          <span className="text-slate-400">({cuota.nombre_jugador})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">
                          {formatPrecio(cuota.monto)}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isPaid
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {isPaid ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                    </div>

                    {!isPaid ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleCopy(linkPago, cuota.token_pago)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isCopied ? "¡Copiado!" : "Copiar Link"}</span>
                        </button>

                        <a
                          href={`https://wa.me/?text=${whatsappText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
                          <span>WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRegistrarPagoCuota(cuota.token_pago)}
                          className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-bold transition cursor-pointer"
                        >
                          Cobrar en Mostrador
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Abonado vía {cuota.metodo_pago || "Mercado Pago"}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPartido(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
