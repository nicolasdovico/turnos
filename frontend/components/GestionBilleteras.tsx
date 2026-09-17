"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  User,
  Phone,
  Mail,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  Plus,
  Minus,
  MessageCircle,
  History,
  ShieldCheck,
} from "lucide-react";

/**
 * Formatea fechas al estándar argentino dd-mm-aaaa
 */
export const formatFechaDDMMAAAA = (fechaStr?: string | null): string => {
  if (!fechaStr) return "";
  const delimiter = fechaStr.includes("T") ? "T" : " ";
  const parts = fechaStr.split(delimiter);
  const datePart = parts[0];
  const dateSub = datePart.split("-");

  if (dateSub.length === 3) {
    if (dateSub[0].length === 4) {
      // YYYY-MM-DD -> DD-MM-YYYY
      return `${dateSub[2].padStart(2, "0")}-${dateSub[1].padStart(2, "0")}-${dateSub[0]}`;
    }
    if (dateSub[2].length === 4) {
      // DD-MM-YYYY
      return `${dateSub[0].padStart(2, "0")}-${dateSub[1].padStart(2, "0")}-${dateSub[2]}`;
    }
  }
  return datePart;
};

/**
 * Formatea fechas con hora al estándar argentino dd-mm-aaaa HH:mm hs
 */
export const formatFechaHoraDDMMAAAA = (fechaHoraStr?: string | null): string => {
  if (!fechaHoraStr) return "";
  const delimiter = fechaHoraStr.includes("T") ? "T" : " ";
  const parts = fechaHoraStr.split(delimiter);
  const dateFormatted = formatFechaDDMMAAAA(parts[0]);
  if (parts.length > 1 && parts[1]) {
    const rawTime = parts[1].replace(/hs/i, "").trim();
    const timePart = rawTime.substring(0, 5);
    return `${dateFormatted} ${timePart} hs`;
  }
  return dateFormatted;
};

export interface BilleteraItem {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
    telefono?: string | null;
    created_at?: string;
  };
  saldo: number;
  saldo_formateado: string;
  total_movimientos: number;
  ultimo_movimiento?: {
    id: number;
    monto: number;
    monto_formateado: string;
    tipo: string;
    descripcion?: string | null;
    created_at: string;
  } | null;
  updated_at?: string;
}

export interface BilleterasMetricas {
  total_saldo: number;
  total_saldo_formateado: string;
  clientes_con_saldo: number;
  total_movimientos: number;
}

export interface WalletMovimientoItem {
  id: number;
  monto: number;
  monto_formateado: string;
  tipo: string;
  descripcion?: string | null;
  created_at: string;
  created_at_humano?: string;
  turno?: {
    id: number;
    fecha: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    cancha_nombre?: string | null;
  } | null;
}

interface GestionBilleterasProps {
  subdomain: string;
  token: string | null;
  apiUrl: string;
  complejoNombre?: string;
  addToast?: (type: "success" | "error" | "info" | "warning", message: string) => void;
}

export default function GestionBilleteras({
  subdomain,
  token,
  apiUrl,
  complejoNombre = "Club",
  addToast,
}: GestionBilleterasProps) {
  const [metricas, setMetricas] = useState<BilleterasMetricas | null>(null);
  const [billeteras, setBilleteras] = useState<BilleteraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [soloConSaldo, setSoloConSaldo] = useState(false);
  const [orderBy, setOrderBy] = useState("saldo_desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Historial
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<BilleteraItem | null>(null);
  const [historyMovimientos, setHistoryMovimientos] = useState<WalletMovimientoItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal Ajuste / Carga
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustCliente, setAdjustCliente] = useState<{ id: number; name: string; email?: string; saldo?: number } | null>(null);
  const [adjustTipo, setAdjustTipo] = useState<"acreditar" | "debitar">("acreditar");
  const [adjustMonto, setAdjustMonto] = useState("");
  const [adjustMotivo, setAdjustMotivo] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Búsqueda de cliente dentro del modal de carga global
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{ id: number; name: string; email: string; telefono?: string }[]>([]);
  const [userSearching, setUserSearching] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Billeteras & Metrics
  const fetchBilleteras = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        order_by: orderBy,
        solo_con_saldo: soloConSaldo ? "true" : "false",
      });
      if (debouncedSearch.trim()) {
        q.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`${apiUrl}/clubs/${subdomain}/billeteras?${q.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": subdomain,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMetricas(json.metricas);
          setBilleteras(json.billeteras?.data || []);
          setTotalPages(json.billeteras?.last_page || 1);
          setTotalCount(json.billeteras?.total || 0);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        addToast?.("error", err.message || "Error al cargar las billeteras del club.");
      }
    } catch {
      addToast?.("error", "Error de conexión al cargar las billeteras.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, subdomain, token, page, debouncedSearch, soloConSaldo, orderBy, addToast]);

  useEffect(() => {
    fetchBilleteras();
  }, [fetchBilleteras]);

  // Open History Modal
  const handleOpenHistory = async (item: BilleteraItem) => {
    setSelectedCliente(item);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${apiUrl}/clubs/${subdomain}/billeteras/${item.user_id}/movimientos`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": subdomain,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setHistoryMovimientos(json.movimientos || []);
        }
      } else {
        addToast?.("error", "No se pudieron cargar los movimientos del cliente.");
      }
    } catch {
      addToast?.("error", "Error de conexión al obtener movimientos.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Adjust Modal
  const handleOpenAdjust = (cliente?: { id: number; name: string; email?: string; saldo?: number } | null) => {
    if (cliente) {
      setAdjustCliente(cliente);
    } else {
      setAdjustCliente(null);
    }
    setAdjustTipo("acreditar");
    setAdjustMonto("");
    setAdjustMotivo("");
    setUserSearchQuery("");
    setUserSearchResults([]);
    setAdjustModalOpen(true);
  };

  // Search users for new credit allocation
  useEffect(() => {
    if (!adjustModalOpen || adjustCliente || userSearchQuery.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearching(true);
      try {
        const res = await fetch(`${apiUrl}/clubs/${subdomain}/usuarios/buscar?q=${encodeURIComponent(userSearchQuery.trim())}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "X-Tenant-ID": subdomain,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setUserSearchResults(json.data || []);
        }
      } catch {
        // ignore
      } finally {
        setUserSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, adjustModalOpen, adjustCliente, apiUrl, subdomain, token]);

  // Submit Balance Adjustment
  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustCliente) {
      addToast?.("warning", "Debes seleccionar a un cliente para realizar la operación.");
      return;
    }
    const parsedMonto = parseFloat(adjustMonto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      addToast?.("warning", "Ingresa un monto válido mayor a 0.");
      return;
    }
    if (adjustTipo === "debitar" && adjustCliente.saldo !== undefined && parsedMonto > adjustCliente.saldo) {
      addToast?.("warning", `El monto a debitar supera el saldo actual del cliente ($${adjustCliente.saldo.toLocaleString()}).`);
      return;
    }
    if (!adjustMotivo.trim()) {
      addToast?.("warning", "Debes indicar un motivo o concepto para registrar la auditoría.");
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/clubs/${subdomain}/billeteras/ajustar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tenant-ID": subdomain,
        },
        body: JSON.stringify({
          user_id: adjustCliente.id,
          monto: parsedMonto,
          tipo_operacion: adjustTipo,
          motivo: adjustMotivo.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast?.("success", json.message || "Operación realizada con éxito.");
        setAdjustModalOpen(false);
        fetchBilleteras();
        if (selectedCliente && selectedCliente.user_id === adjustCliente.id) {
          handleOpenHistory(selectedCliente);
        }
      } else {
        addToast?.("error", json.message || "No se pudo procesar el ajuste de saldo.");
      }
    } catch {
      addToast?.("error", "Error de conexión al enviar el ajuste de saldo.");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Helper badge for movement types
  const getBadgeForTipo = (tipo: string) => {
    switch (tipo) {
      case "reembolso_cancelacion":
        return {
          label: "Reembolso Cancelación",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          icon: <ArrowDownLeft className="w-3 h-3 text-emerald-400" />,
        };
      case "carga_manual":
        return {
          label: "Carga en Mostrador",
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: <Plus className="w-3 h-3 text-blue-400" />,
        };
      case "uso_reserva":
        return {
          label: "Uso en Reserva",
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          icon: <ArrowUpRight className="w-3 h-3 text-rose-400" />,
        };
      case "ajuste_manual":
      default:
        return {
          label: "Ajuste Manual",
          bg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
          icon: <Clock className="w-3 h-3 text-amber-400" />,
        };
    }
  };

  return (
    <div data-testid="gestion-billeteras-section" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Billeteras Virtuales de Clientes
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            Gestiona los saldos a favor en custodia para {complejoNombre}. Audita movimientos de créditos por cancelaciones y registra cobros adelantados en efectivo en el club.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBilleteras}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenAdjust(null)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Cargar Saldo a Cliente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Saldo total */}
        <div data-testid="kpi-total-saldo" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Total en Billeteras</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {metricas?.total_saldo_formateado || "$0,00"}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pasivo total exigible a favor de los jugadores</span>
          </p>
        </div>

        {/* Card 2: Clientes con saldo */}
        <div data-testid="kpi-clientes-con-saldo" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Clientes con Saldo Activo</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {metricas?.clientes_con_saldo ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Jugadores con fondos disponibles para reservar</span>
          </p>
        </div>

        {/* Card 3: Total transacciones */}
        <div data-testid="kpi-total-movimientos" className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Movimientos Históricos</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {metricas?.total_movimientos ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Créditos, débitos y reembolsos registrados</span>
          </p>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Switch: Solo con saldo */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-300 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700/80 transition">
          <input
            type="checkbox"
            checked={soloConSaldo}
            onChange={(e) => {
              setSoloConSaldo(e.target.checked);
              setPage(1);
            }}
            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
          />
          <span>Solo con saldo a favor (&gt; $0)</span>
        </label>

        {/* Order By */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Ordenar:</span>
          </span>
          <select
            value={orderBy}
            onChange={(e) => {
              setOrderBy(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="saldo_desc">Mayor saldo primero</option>
            <option value="saldo_asc">Menor saldo primero</option>
            <option value="nombre_asc">Nombre (A - Z)</option>
            <option value="nombre_desc">Nombre (Z - A)</option>
            <option value="recientes">Último movimiento</option>
          </select>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">Saldo Disponible</th>
                <th className="py-3.5 px-4">Último Movimiento</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-800 rounded w-32 mb-1.5" />
                      <div className="h-3 bg-slate-800/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-3 bg-slate-800 rounded w-28 mb-1" />
                      <div className="h-3 bg-slate-800/60 rounded w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-slate-800 rounded-full w-24" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 bg-slate-800 rounded w-28 mb-1" />
                      <div className="h-3 bg-slate-800/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-7 bg-slate-800 rounded-xl w-24 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : billeteras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300 text-sm">No se encontraron billeteras de clientes</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {debouncedSearch
                        ? `No hay coincidencias para "${debouncedSearch}". Prueba con otro término.`
                        : soloConSaldo
                        ? "Actualmente ningún cliente posee saldo a favor en este complejo."
                        : "Aún no se han registrado créditos ni billeteras en este complejo."}
                    </p>
                    <button
                      onClick={() => handleOpenAdjust(null)}
                      className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cargar saldo a un cliente ahora</span>
                    </button>
                  </td>
                </tr>
              ) : (
                billeteras.map((item) => {
                  const initial = (item.user?.name || "C").charAt(0).toUpperCase();
                  const hasSaldo = item.saldo > 0;
                  const cleanPhone = item.user?.telefono?.replace(/[^\d+]/g, "");

                  return (
                    <tr
                      key={item.id}
                      data-testid={`billetera-row-${item.user_id}`}
                      className="hover:bg-slate-800/40 transition"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>{item.user?.name || "Cliente Desconocido"}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">ID #{item.user_id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {item.user?.email && (
                            <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{item.user.email}</span>
                            </div>
                          )}
                          {item.user?.telefono ? (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{item.user.telefono}</span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone.replace(/\+/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded transition"
                                  title="Abrir chat en WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin teléfono</span>
                          )}
                        </div>
                      </td>

                      {/* Saldo Disponible */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-mono font-black border tracking-tight shadow-sm ${
                              hasSaldo
                                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/20"
                                : "bg-slate-800/80 text-slate-400 border-slate-700"
                            }`}
                          >
                            {item.saldo_formateado}
                          </span>
                        </div>
                      </td>

                      {/* Último Movimiento */}
                      <td className="py-3.5 px-4">
                        {item.ultimo_movimiento ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                                  getBadgeForTipo(item.ultimo_movimiento.tipo).bg
                                }`}
                              >
                                {getBadgeForTipo(item.ultimo_movimiento.tipo).icon}
                                <span>{getBadgeForTipo(item.ultimo_movimiento.tipo).label}</span>
                              </span>
                              <span
                                className={`font-mono font-bold text-[11px] ${
                                  item.ultimo_movimiento.monto > 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                {item.ultimo_movimiento.monto_formateado}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[190px]" title={item.ultimo_movimiento.descripcion || ""}>
                              {formatFechaHoraDDMMAAAA(item.ultimo_movimiento.created_at)} • {item.ultimo_movimiento.descripcion || "Sin detalle"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Sin movimientos</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            data-testid={`btn-historial-${item.user_id}`}
                            onClick={() => handleOpenHistory(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                            title="Ver extracto y detalle de movimientos"
                          >
                            <History className="w-3.5 h-3.5 text-slate-400" />
                            <span>Movimientos</span>
                          </button>
                          <button
                            data-testid={`btn-ajustar-${item.user_id}`}
                            onClick={() =>
                              handleOpenAdjust({
                                id: item.user_id,
                                name: item.user?.name || "Cliente",
                                email: item.user?.email,
                                saldo: item.saldo,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1"
                            title="Cargar o debitar saldo manualmente"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Ajustar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} clientes)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Historial de Movimientos */}
      {historyModalOpen && selectedCliente && (
        <div data-testid="modal-historial-movimientos" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <History className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Extracto de Billetera: {selectedCliente.user?.name}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedCliente.user?.email || "Sin email"} • ID #{selectedCliente.user_id}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Saldo Disponible</span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    {selectedCliente.saldo_formateado}
                  </span>
                </div>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content / Movimientos List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
                  <p className="text-xs">Cargando extracto de transacciones...</p>
                </div>
              ) : historyMovimientos.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-1">
                  <Clock className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                  <p className="text-sm font-semibold text-slate-400">Sin movimientos registrados</p>
                  <p className="text-xs">Este cliente aún no ha registrado cargos, débitos o reembolsos.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyMovimientos.map((m) => {
                    const badge = getBadgeForTipo(m.tipo);
                    const isPositive = m.monto > 0;

                    return (
                      <div
                        key={m.id}
                        data-testid={`movimiento-item-${m.id}`}
                        className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3 hover:bg-slate-800 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}
                          >
                            {badge.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{badge.label}</span>
                              {m.turno && (
                                <span className="text-[10px] font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700">
                                  {m.turno.cancha_nombre ? `${m.turno.cancha_nombre} • ` : ""}
                                  {formatFechaDDMMAAAA(m.turno.fecha)}{m.turno.hora_inicio ? ` ${m.turno.hora_inicio} hs` : ""}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{m.descripcion || "Sin descripción"}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{formatFechaHoraDDMMAAAA(m.created_at)}</span>
                              {m.created_at_humano && <span>({m.created_at_humano})</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono font-black text-sm block ${
                              isPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {m.monto_formateado}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {isPositive ? "Crédito a favor" : "Débito / Aplicado"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Total movimientos: <strong>{historyMovimientos.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHistoryModalOpen(false);
                    handleOpenAdjust({
                      id: selectedCliente.user_id,
                      name: selectedCliente.user?.name || "Cliente",
                      email: selectedCliente.user?.email,
                      saldo: selectedCliente.saldo,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
                >
                  + Cargar o Ajustar Saldo
                </button>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajustar o Cargar Saldo */}
      {adjustModalOpen && (
        <div data-testid="modal-ajustar-saldo" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Cargar o Ajustar Saldo de Cliente</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Registra un crédito o débito manual en la billetera virtual del cliente.
                </p>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="space-y-4">
              {/* Cliente Seleccionado / Buscador */}
              {adjustCliente ? (
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/40">
                      {adjustCliente.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{adjustCliente.name}</div>
                      <div className="text-[10px] text-slate-400">{adjustCliente.email || `ID #${adjustCliente.id}`}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Saldo Actual</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ${(adjustCliente.saldo || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Buscar Cliente Registrado:
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Escribe el nombre o email del cliente..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    {userSearching && (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {userSearchResults.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 divide-y divide-slate-700/50">
                      {userSearchResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setAdjustCliente({ id: u.id, name: u.name, email: u.email });
                            setUserSearchQuery("");
                            setUserSearchResults([]);
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-700/60 flex items-center justify-between text-xs transition"
                        >
                          <div>
                            <span className="font-bold text-white">{u.name}</span>
                            <span className="text-[10px] text-slate-400 block">{u.email}</span>
                          </div>
                          <span className="text-[11px] text-emerald-400 font-semibold">+ Seleccionar</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de Operación (Tabs) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Tipo de Operación:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTipo("acreditar")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      adjustTipo === "acreditar"
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50 shadow-md"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>Acreditar Saldo (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustTipo("debitar")}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      adjustTipo === "debitar"
                        ? "bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/50 shadow-md"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Minus className="w-4 h-4 text-rose-400" />
                    <span>Debitar Saldo (-)</span>
                  </button>
                </div>
              </div>

              {/* Monto */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Monto ($ ARS):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={adjustMonto}
                    onChange={(e) => setAdjustMonto(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Motivo / Concepto */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Motivo / Concepto Obligatorio:</label>
                <input
                  type="text"
                  placeholder={
                    adjustTipo === "acreditar"
                      ? "Ej: Cobro en efectivo en mostrador, Compensación por lluvia..."
                      : "Ej: Devolución de saldo en efectivo, Corrección contable..."
                  }
                  value={adjustMotivo}
                  onChange={(e) => setAdjustMotivo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  required
                />

                {/* Quick pre-filled motive buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {adjustTipo === "acreditar" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdjustMotivo("Pago adelantado en efectivo en mostrador")}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] border border-slate-700"
                      >
                        Efectivo en mostrador
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustMotivo("Transferencia bancaria recibida a cuenta")}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] border border-slate-700"
                      >
                        Transferencia
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustMotivo("Compensación climática / lluvia")}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] border border-slate-700"
                      >
                        Compensación lluvia
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setAdjustMotivo("Devolución de saldo en efectivo al cliente")}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] border border-slate-700"
                      >
                        Devolución en efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustMotivo("Corrección administrativa de saldo")}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] border border-slate-700"
                      >
                        Corrección de saldo
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={adjustSubmitting}
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting || !adjustCliente || !adjustMonto}
                  className={`px-4 py-2 rounded-xl text-slate-950 font-bold text-xs transition shadow-lg flex items-center gap-1.5 ${
                    adjustTipo === "acreditar"
                      ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-950/40"
                      : "bg-rose-500 hover:bg-rose-400 shadow-rose-950/40"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {adjustSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span>{adjustTipo === "acreditar" ? "Confirmar Acreditación" : "Confirmar Débito"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
