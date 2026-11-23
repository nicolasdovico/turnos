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
  estado: "pendiente" | "revision_transferencia" | "pagado" | "cancelado";
  nombre_jugador?: string | null;
  email_jugador?: string | null;
  metodo_pago?: string | null;
  pagado_en?: string | null;
  comprobante_transferencia?: string | null;
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

interface CanchaSimple {
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

interface SlotSimple {
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  disponible: boolean;
}

export default function GestionPartidosAbiertos({ subdomain }: GestionPartidosAbiertosProps) {
  const [partidos, setPartidos] = useState<PartidoAbiertoItem[]>([]);
  const [canchasClub, setCanchasClub] = useState<CanchaSimple[]>([]);
  const [slotsDisponibles, setSlotsDisponibles] = useState<SlotSimple[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "buscando" | "completo" | "cancelado">("todos");

  // Modal Crear Convocatoria
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCanchaId, setSelectedCanchaId] = useState<string>("");
  const [selectedFecha, setSelectedFecha] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [selectedHoraInicio, setSelectedHoraInicio] = useState<string>("");
  const [cuotasCount, setCuotasCount] = useState<number>(4);
  const [nivelMin, setNivelMin] = useState<string>("");
  const [nivelMax, setNivelMax] = useState<string>("");
  const [tipoPartido, setTipoPartido] = useState<string>("competitivo");
  const [organizadorNombre, setOrganizadorNombre] = useState<string>("");
  const [organizadorEmail, setOrganizadorEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Cancha actualmente seleccionada y sus opciones de cuotas según el deporte
  const selectedCancha = useMemo(() => {
    return canchasClub.find((c) => String(c.id) === String(selectedCanchaId));
  }, [canchasClub, selectedCanchaId]);

  const opcionesCuotas = useMemo(() => {
    return getCuotasOptionsForSport(selectedCancha?.deporte);
  }, [selectedCancha?.deporte]);

  // Si cambia la cancha y la cantidad de cuotas actual no es válida para ese deporte, ajustamos automáticamente a la recomendada
  useEffect(() => {
    if (opcionesCuotas.length > 0) {
      const existe = opcionesCuotas.some((o) => o.num === cuotasCount);
      if (!existe) {
        setCuotasCount(opcionesCuotas[0].num);
      }
    }
  }, [opcionesCuotas, cuotasCount]);

  // Modal Ver Detalle / Links
  const [selectedPartido, setSelectedPartido] = useState<PartidoAbiertoItem | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Toast / Notificaciones estilizadas
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((current) => (current?.text === text ? null : current));
    }, 4000);
  };

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

  const fetchCanchasYTurnos = async () => {
    try {
      const res = await fetch(`/api/clubs/${subdomain}/dashboard`, {
        headers: {
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        const canchas = json?.data?.canchas || [];
        setCanchasClub(canchas);
        if (canchas.length > 0 && !selectedCanchaId) {
          setSelectedCanchaId(String(canchas[0].id));
        }
      }
    } catch (err) {
      console.error("Error al cargar canchas del club:", err);
    }
  };

  const fetchSlotsDisponibles = async (canchaId: string, fecha: string) => {
    if (!canchaId || !fecha) return;
    try {
      setLoadingSlots(true);
      const res = await fetch(`/api/canchas/${canchaId}/disponibilidad?fecha=${fecha}`, {
        headers: {
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        const slots: SlotSimple[] = (json.slots_disponibles || json.data?.slots || []).filter(
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
      console.error("Error al cargar slots disponibles:", err);
      setSlotsDisponibles([]);
      setSelectedHoraInicio("");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && selectedCanchaId && selectedFecha) {
      fetchSlotsDisponibles(selectedCanchaId, selectedFecha);
    }
  }, [isModalOpen, selectedCanchaId, selectedFecha]);

  const handleOpenCreateModal = () => {
    fetchCanchasYTurnos();
    setIsModalOpen(true);
  };

  const handleCrearSplit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCanchaId || !selectedFecha || !selectedHoraInicio) {
      showToast("error", "Seleccioná la cancha, fecha y horario para la convocatoria.");
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

      showToast("success", "¡Convocatoria de partido abierto creada con éxito!");
      setIsModalOpen(false);
      fetchPartidos();
    } catch (err: any) {
      showToast("error", err.message || "No se pudo crear la convocatoria.");
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
        showToast("success", "Partido abierto cancelado correctamente.");
        fetchPartidos();
        if (selectedPartido?.id === partidoId) {
          setSelectedPartido(null);
        }
      } else {
        showToast("error", "Error al cancelar el partido abierto.");
      }
    } catch (err) {
      showToast("error", "Error al procesar la cancelación.");
    }
  };

  const handleRegistrarPagoCuota = async (tokenPago: string, verificadoPorClub: boolean = false) => {
    try {
      const res = await fetch(`/api/split-pagos/${tokenPago}/pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({
          metodo_pago: verificadoPorClub ? "transferencia" : "efectivo",
          verificado_por_club: true,
        }),
      });

      if (res.ok) {
        showToast("success", verificadoPorClub ? "¡Transferencia bancaria verificada y comprobante enviado!" : "Cuota registrada como pagada con éxito.");
        fetchPartidos();
        if (selectedPartido) {
          // Refrescar el modal
          const updatedCuotas = selectedPartido.pagos_divididos?.map((c) =>
            c.token_pago === tokenPago ? { ...c, estado: "pagado" as const, metodo_pago: verificadoPorClub ? "transferencia" : "efectivo" } : c
          );
          setSelectedPartido({ ...selectedPartido, pagos_divididos: updatedCuotas });
        }
      } else {
        showToast("error", "No se pudo registrar el pago de la cuota.");
      }
    } catch (err) {
      showToast("error", "Error al registrar el cobro.");
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
    let transferenciasPendientesTotal = 0;

    partidos.forEach((p) => {
      p.pagos_divididos?.forEach((c) => {
        if (c.estado === "pagado") cuotasPagadasTotal++;
        if (c.estado === "pendiente") cuotasPendientesTotal++;
        if (c.estado === "revision_transferencia") {
          transferenciasPendientesTotal++;
          cuotasPendientesTotal++;
        }
      });
    });

    return { total, activos, completos, cuotasPagadasTotal, cuotasPendientesTotal, transferenciasPendientesTotal };
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
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                {/* Cancha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cancha: *
                  </label>
                  <select
                    required
                    value={selectedCanchaId}
                    onChange={(e) => setSelectedCanchaId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    {canchasClub.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.deporte})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Fecha: *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedFecha}
                      onChange={(e) => setSelectedFecha(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  {/* Horario */}
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
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
              </div>

              {/* Cantidad de Cuotas inteligente según deporte */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cantidad de Jugadores / Cuotas a Dividir: *
                  {selectedCancha?.deporte && (
                    <span className="ml-1.5 text-[10px] font-normal text-emerald-400 capitalize">
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
                          ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {opcion.label}
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
                  disabled={
                    submitting || !selectedCanchaId || !selectedFecha || !selectedHoraInicio
                  }
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {submitting ? "Generando..." : "Crear Convocatoria"}
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
                const isRevision = cuota.estado === "revision_transferencia";
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
                        : isRevision
                        ? "bg-amber-950/30 border-amber-500/40"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          Cuota {cuota.cuota_numero}
                        </span>
                        {cuota.nombre_jugador && (
                          <span className="text-slate-300 font-semibold">({cuota.nombre_jugador})</span>
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
                              : isRevision
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {isPaid ? "Pagado" : isRevision ? "⏳ Por Verificar (Transferencia)" : "Pendiente"}
                        </span>
                      </div>
                    </div>

                    {isRevision && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] space-y-1">
                        <div className="font-bold text-amber-300 flex items-center justify-between">
                          <span>🔔 Transferencia bancaria informada por el jugador</span>
                        </div>
                        {cuota.email_jugador && (
                          <div className="text-slate-300">
                            Email jugador: <span className="font-mono text-white">{cuota.email_jugador}</span>
                          </div>
                        )}
                        {cuota.comprobante_transferencia && (
                          <div className="text-slate-300">
                            Detalle / Referencia: <span className="font-medium text-white">{cuota.comprobante_transferencia}</span>
                          </div>
                        )}
                        <div className="pt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleRegistrarPagoCuota(cuota.token_pago, true)}
                            className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verificar y Confirmar Pago</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!isPaid && !isRevision ? (
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
                          onClick={() => handleRegistrarPagoCuota(cuota.token_pago, false)}
                          className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-bold transition cursor-pointer"
                        >
                          Cobrar en Mostrador
                        </button>
                      </div>
                    ) : isPaid ? (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Abonado vía {cuota.metodo_pago || "Mercado Pago"}</span>
                      </div>
                    ) : null}
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

      {/* ========================================================================= */}
      {/* NOTIFICACIÓN TOAST ESTILO DEL SITIO                                       */}
      {/* ========================================================================= */}
      {toastMessage && (
        <div
          data-testid="toast-partidos-abiertos"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-xs sm:text-sm font-semibold border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50"
              : toastMessage.type === "error"
              ? "bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-rose-950/50"
              : "bg-blue-950/95 border-blue-500/50 text-blue-200 shadow-blue-950/50"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastMessage.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Users className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
