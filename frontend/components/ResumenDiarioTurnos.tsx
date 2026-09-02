"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  CreditCard,
  Building2,
  Sparkles,
  Phone,
  User,
  X,
  ArrowRight,
  Repeat,
} from "lucide-react";

export interface TurnoDetalle {
  id: number;
  cancha_id: number;
  cancha_nombre: string;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  hora_inicio: string;
  hora_fin: string;
  duracion_minutos: number;
  precio: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado_pago: string;
  metodo_pago: string;
  es_fijo: boolean;
  estado: string;
}

export interface DiaResumen {
  fecha: string;
  dia_semana_numero: number;
  dia_nombre: string;
  total_turnos: number;
  turnos_fijos: number;
  monto_total: number;
  monto_cobrado: number;
  saldo_pendiente: number;
  estado_cobro: "al_dia" | "pendiente" | "sin_turnos";
  ocupacion_porcentaje: number;
  minutos_ocupados: number;
  minutos_disponibles: number;
  desglose_metodos: Record<string, number>;
  turnos: TurnoDetalle[];
}

export interface CanchaResumen {
  cancha_id: number;
  nombre: string;
  deporte: string;
  turnos: number;
  total_facturado: number;
  total_cobrado: number;
  saldo_pendiente: number;
}

export interface ResumenDiarioData {
  periodo: {
    fecha_desde: string;
    fecha_hasta: string;
    total_dias: number;
    cancha_id: number | null;
  };
  kpis: {
    total_facturado: number;
    total_cobrado: number;
    total_saldo_pendiente: number;
    total_turnos: number;
    total_turnos_fijos: number;
    ocupacion_promedio: number;
    porcentaje_cobrado: number;
  };
  dias: DiaResumen[];
  canchas: CanchaResumen[];
  metodos_pago: Record<string, number>;
}

export interface ResumenDiarioTurnosProps {
  subdomain: string;
  token?: string | null;
  canchas?: Array<{ id: number; nombre: string; deporte?: string }>;
  apiUrl?: string;
}

export default function ResumenDiarioTurnos({
  subdomain,
  token: propToken,
  canchas = [],
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api",
}: ResumenDiarioTurnosProps) {
  // Helper for local date YYYY-MM-DD
  const getLocalDate = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getMonthStart = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getMonthEnd = (d: Date = new Date()) => {
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return getLocalDate(end);
  };

  // Preset Filters
  const [filterPreset, setFilterPreset] = useState<"hoy" | "esta_semana" | "este_mes" | "mes_anterior" | "personalizado">("este_mes");
  const [fechaDesde, setFechaDesde] = useState<string>(getMonthStart());
  const [fechaHasta, setFechaHasta] = useState<string>(getMonthEnd());
  const [selectedCanchaId, setSelectedCanchaId] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendientes">("todos");

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ResumenDiarioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Accordion open/collapsed day cards
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Desk checkout modal
  const [turnoToPay, setTurnoToPay] = useState<TurnoDetalle | null>(null);
  const [pagoMetodo, setPagoMetodo] = useState<"mostrador" | "transferencia" | "billetera" | "online">("mostrador");
  const [pagoMonto, setPagoMonto] = useState<string>("");
  const [isProcessingPago, setIsProcessingPago] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getAuthToken = () => {
    if (propToken) return propToken;
    if (typeof window !== "undefined") {
      return localStorage.getItem("saas_token") || localStorage.getItem("token");
    }
    return null;
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Preset filter logic
  const handleApplyPreset = (preset: "hoy" | "esta_semana" | "este_mes" | "mes_anterior" | "personalizado") => {
    setFilterPreset(preset);
    const now = new Date();

    if (preset === "hoy") {
      const todayStr = getLocalDate(now);
      setFechaDesde(todayStr);
      setFechaHasta(todayStr);
    } else if (preset === "esta_semana") {
      const currentDay = now.getDay(); // 0 is Sunday
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFechaDesde(getLocalDate(monday));
      setFechaHasta(getLocalDate(sunday));
    } else if (preset === "este_mes") {
      setFechaDesde(getMonthStart(now));
      setFechaHasta(getMonthEnd(now));
    } else if (preset === "mes_anterior") {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setFechaDesde(getMonthStart(prevMonth));
      setFechaHasta(getMonthEnd(prevMonth));
    }
  };

  const fetchResumen = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const params = new URLSearchParams();
      if (fechaDesde) params.append("fecha_desde", fechaDesde);
      if (fechaHasta) params.append("fecha_hasta", fechaHasta);
      if (selectedCanchaId !== "todas") params.append("cancha_id", selectedCanchaId);

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/resumen-diario?${params.toString()}`, {
        headers,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al obtener el resumen diario.");
      }

      setData(json.data);
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || "Error al conectar con el servidor.");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initial and reactive fetch
  useEffect(() => {
    fetchResumen();
  }, [subdomain, fechaDesde, fechaHasta, selectedCanchaId]);

  // SWR Silent Polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchResumen(true);
    }, 30000);

    const onFocus = () => {
      fetchResumen(true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [subdomain, fechaDesde, fechaHasta, selectedCanchaId]);

  const toggleDayExpansion = (fecha: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [fecha]: !prev[fecha],
    }));
  };

  const toggleExpandAll = () => {
    if (!data?.dias) return;
    const allExpanded = data.dias.every((d) => expandedDays[d.fecha]);
    const nextState: Record<string, boolean> = {};
    data.dias.forEach((d) => {
      nextState[d.fecha] = !allExpanded;
    });
    setExpandedDays(nextState);
  };

  // Desk payment registration handler
  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoToPay) return;
    const targetTurno = turnoToPay;
    const montoCobrado = pagoMonto ? parseFloat(pagoMonto) : targetTurno.saldo_pendiente;

    try {
      setIsProcessingPago(true);
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/turnos/${targetTurno.id}/registrar-pago`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          metodo_pago: pagoMetodo,
          monto: montoCobrado,
          estado_pago: "pagado",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al registrar el cobro.");
      }

      showToast("success", `¡Cobro de $${montoCobrado.toLocaleString()} registrado con éxito (${pagoMetodo.toUpperCase()})!`);
      setTurnoToPay(null);
      setPagoMonto("");
      await fetchResumen(true);
    } catch (err: any) {
      showToast("error", err.message || "Error al registrar el cobro.");
    } finally {
      setIsProcessingPago(false);
    }
  };

  // Filter days list
  const filteredDias = useMemo(() => {
    if (!data?.dias) return [];
    if (statusFilter === "pendientes") {
      return data.dias.filter((d) => d.saldo_pendiente > 0);
    }
    return data.dias;
  }, [data, statusFilter]);

  const todayString = getLocalDate(new Date());

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold border transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/95 border-rose-500/50 text-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Controls Panel */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl backdrop-blur-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Resumen Diario & Control de Caja
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Control financiero día a día de turnos reservados, cobranzas realizadas y saldos pendientes de mostrador.
            </p>
          </div>

          <button
            onClick={() => fetchResumen(false)}
            disabled={loading}
            className="self-start lg:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Período:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("hoy")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterPreset === "hoy"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60"
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("esta_semana")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterPreset === "esta_semana"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60"
              }`}
            >
              Esta Semana
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("este_mes")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterPreset === "este_mes"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60"
              }`}
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("mes_anterior")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterPreset === "mes_anterior"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60"
              }`}
            >
              Mes Anterior
            </button>
          </div>

          {/* Date Range Inputs & Court Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 font-medium">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setFilterPreset("personalizado");
                }}
                className="bg-transparent text-white font-mono font-semibold focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 font-medium">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setFilterPreset("personalizado");
                }}
                className="bg-transparent text-white font-mono font-semibold focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Court Dropdown */}
            <select
              value={selectedCanchaId}
              onChange={(e) => setSelectedCanchaId(e.target.value)}
              className="bg-slate-950/60 border border-slate-800 text-xs font-semibold text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="todas">🏟️ Todas las Canchas</option>
              {canchas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.deporte?.toUpperCase() || "CANCHA"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Facturado Total */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
              <span>Total Generado / Facturado</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight font-mono">
              ${data.kpis.total_facturado.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">{data.kpis.total_turnos} turnos</span>
              <span>en el período</span>
              {data.kpis.total_turnos_fijos > 0 && (
                <span className="text-indigo-300 font-semibold">({data.kpis.total_turnos_fijos} fijos)</span>
              )}
            </div>
          </div>

          {/* Cobrado en Caja */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-2">
              <span>Cobrado en Caja (Real)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-300 tracking-tight font-mono">
              ${data.kpis.total_cobrado.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.kpis.porcentaje_cobrado)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-emerald-400 font-mono">
                {data.kpis.porcentaje_cobrado}%
              </span>
            </div>
          </div>

          {/* Saldo Pendiente */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-2">
              <span>Saldo Pendiente por Cobrar</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 tracking-tight font-mono">
              ${data.kpis.total_saldo_pendiente.toLocaleString()}
            </div>
            <p className="mt-2 text-[11px] text-amber-200/70">
              {data.kpis.total_saldo_pendiente > 0
                ? "Cobrar en mostrador al llegar los jugadores"
                : "✓ Todos los turnos están 100% saldados"}
            </p>
          </div>

          {/* Ocupación Promedio */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
              <span>Ocupación de Canchas</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-300 tracking-tight font-mono">
              {data.kpis.ocupacion_promedio}%
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data.kpis.ocupacion_promedio)}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400">Capacidad total</span>
            </div>
          </div>
        </div>
      )}

      {/* Methods & Courts Mini-Summary */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Desglose por Medio de Pago */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" /> Cobranzas por Canal / Medio
              </span>
              <span className="text-slate-500">Caja Real</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">💵 Mostrador</div>
                <div className="text-sm font-black text-white font-mono mt-1">
                  ${(data.metodos_pago.mostrador || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">📲 Transf.</div>
                <div className="text-sm font-black text-white font-mono mt-1">
                  ${(data.metodos_pago.transferencia || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">💳 Online</div>
                <div className="text-sm font-black text-white font-mono mt-1">
                  ${(data.metodos_pago.online || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] uppercase font-bold text-slate-400">👛 Billetera</div>
                <div className="text-sm font-black text-white font-mono mt-1">
                  ${(data.metodos_pago.billetera || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Desglose por Cancha */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" /> Rendimiento por Cancha
              </span>
              <span className="text-slate-500">{data.canchas.length} canchas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {data.canchas.map((c) => (
                <div key={c.cancha_id} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[130px]">{c.nombre}</div>
                    <div className="text-[10px] text-slate-400">{c.turnos} turnos reservados</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs font-black text-emerald-400">${c.total_cobrado.toLocaleString()}</div>
                    {c.saldo_pendiente > 0 && (
                      <div className="text-[10px] text-amber-400/90 font-bold">Resta: ${c.saldo_pendiente.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day by Day List / Breakdown Table */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📅 Desglose Día por Día ({filteredDias.length} días)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Haz clic en cualquier día para ver la lista completa de turnos, jugadores y registrar cobros en mostrador.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter by status */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter("todos")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  statusFilter === "todos" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter("pendientes")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  statusFilter === "pendientes" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
                }`}
              >
                ⏳ Con Saldo Pendiente
              </button>
            </div>

            <button
              onClick={toggleExpandAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition"
            >
              Expandir / Contraer Todo
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs font-semibold">Cargando métricas y turnos del club...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : filteredDias.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold">No se encontraron turnos para los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredDias.map((dia) => {
              const isToday = dia.fecha === todayString;
              const isExpanded = Boolean(expandedDays[dia.fecha]);

              return (
                <div key={dia.fecha} className={`transition ${isToday ? "bg-emerald-950/10" : "hover:bg-slate-850/50"}`}>
                  {/* Row Summary Bar */}
                  <div
                    onClick={() => toggleDayExpansion(dia.fecha)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    {/* Left: Date & Badges */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {dia.dia_nombre} {dia.fecha.split("-").reverse().slice(0, 2).join("/")}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30 uppercase">
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{dia.total_turnos} turnos</span>
                          {dia.turnos_fijos > 0 && (
                            <span className="text-indigo-400 font-medium flex items-center gap-1">
                              <Repeat className="w-3 h-3" /> {dia.turnos_fijos} fijos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center: Ocupación & Capacidad */}
                    <div className="flex-1 max-w-xs">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                        <span>Ocupación</span>
                        <span className="text-slate-300 font-mono">{dia.ocupacion_porcentaje}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            dia.ocupacion_porcentaje >= 75
                              ? "bg-emerald-500"
                              : dia.ocupacion_porcentaje >= 40
                              ? "bg-blue-500"
                              : "bg-slate-600"
                          }`}
                          style={{ width: `${Math.min(100, dia.ocupacion_porcentaje)}%` }}
                        />
                      </div>
                    </div>

                    {/* Right: Financial Numbers */}
                    <div className="flex items-center gap-6 justify-between md:justify-end">
                      <div className="text-left md:text-right font-mono">
                        <div className="text-xs text-slate-400">Total Día</div>
                        <div className="text-sm font-bold text-white">${dia.monto_total.toLocaleString()}</div>
                      </div>

                      <div className="text-left md:text-right font-mono">
                        <div className="text-xs text-emerald-400 font-semibold">Cobrado</div>
                        <div className="text-sm font-black text-emerald-400">
                          ${dia.monto_cobrado.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-left md:text-right font-mono min-w-[90px]">
                        <div className="text-xs text-amber-400 font-semibold">Por Cobrar</div>
                        <div className={`text-sm font-black ${dia.saldo_pendiente > 0 ? "text-amber-400" : "text-slate-500"}`}>
                          ${dia.saldo_pendiente.toLocaleString()}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="hidden sm:block min-w-[110px] text-right">
                        {dia.total_turnos === 0 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold">
                            Sin turnos
                          </span>
                        ) : dia.saldo_pendiente <= 0 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Al Día
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-end gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Accordion: Turnos Details for this Day */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6">
                      <div className="rounded-2xl bg-slate-950/70 border border-slate-800/80 p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-2">
                          <span>DETALLE DE TURNOS DEL DÍA ({dia.turnos.length})</span>
                          <span>ESTADO FINANCIERO Y COBRO</span>
                        </div>

                        {dia.turnos.length === 0 ? (
                          <p className="text-xs text-slate-500 py-3 text-center">
                            No hay turnos registrados en esta fecha.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {dia.turnos.map((t) => {
                              const isPaid = t.saldo_pendiente <= 0 || t.estado_pago === "pagado" || t.estado_pago === "pagado_total";

                              return (
                                <div
                                  key={t.id}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition"
                                >
                                  {/* Left: Time & Player */}
                                  <div className="flex items-start gap-3">
                                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-white font-mono text-xs font-black shrink-0">
                                      {t.hora_inicio} - {t.hora_fin}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white flex items-center gap-1">
                                          <User className="w-3 h-3 text-slate-400" /> {t.cliente_nombre}
                                        </span>
                                        {t.es_fijo && (
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                                            🔁 Fijo
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                        <span>{t.cancha_nombre}</span>
                                        {t.cliente_telefono && (
                                          <span className="text-slate-400 font-mono flex items-center gap-1">
                                            <Phone className="w-2.5 h-2.5" /> {t.cliente_telefono}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Payment Details & Checkout Button */}
                                  <div className="flex items-center gap-4 justify-between sm:justify-end font-mono">
                                    <div className="text-right">
                                      <div className="text-xs font-bold text-white">${t.precio.toLocaleString()}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {t.monto_pagado > 0 ? (
                                          <span className="text-emerald-400">Pagó ${t.monto_pagado.toLocaleString()}</span>
                                        ) : (
                                          <span>Sin pagos</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Method Badge */}
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                      {t.metodo_pago === "mostrador"
                                        ? "💵 Mostrador"
                                        : t.metodo_pago === "transferencia"
                                        ? "📲 Transf."
                                        : t.metodo_pago === "billetera"
                                        ? "👛 Billetera"
                                        : "💳 Online"}
                                    </span>

                                    {/* Paid / Pending Status & Action */}
                                    {isPaid ? (
                                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                                        ✓ Pagado
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <div className="text-right">
                                          <span className="text-[10px] font-bold text-amber-400 uppercase block">
                                            Resta: ${t.saldo_pendiente.toLocaleString()}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTurnoToPay(t);
                                            setPagoMonto(t.saldo_pendiente.toString());
                                            setPagoMetodo("mostrador");
                                          }}
                                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow transition flex items-center gap-1 cursor-pointer"
                                        >
                                          💵 Cobrar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desk Checkout Modal */}
      {turnoToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-white">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Caja Mostrador
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Registrar Cobro de Turno #{turnoToPay.id}
                </h3>
              </div>
              <button
                onClick={() => setTurnoToPay(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <span className="font-bold text-white">{turnoToPay.cliente_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cancha & Horario:</span>
                <span className="font-bold text-slate-200">
                  {turnoToPay.cancha_nombre} ({turnoToPay.hora_inicio} a {turnoToPay.hora_fin} hs)
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800/60 pt-2 font-mono">
                <span className="text-slate-400">Precio Total:</span>
                <span className="text-white">${turnoToPay.precio.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Ya Pagado:</span>
                <span className="text-emerald-400">${turnoToPay.monto_pagado.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-mono font-bold text-amber-400 text-sm border-t border-slate-800/60 pt-2">
                <span>Saldo Pendiente:</span>
                <span>${turnoToPay.saldo_pendiente.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Medio de Pago:
                </label>
                <select
                  value={pagoMetodo}
                  onChange={(e) => setPagoMetodo(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                >
                  <option value="mostrador">💵 Efectivo / Mostrador</option>
                  <option value="transferencia">📲 Transferencia Bancaria (Alias / CBU)</option>
                  <option value="online">💳 Tarjeta / MercadoPago</option>
                  <option value="billetera">👛 Billetera Virtual del Cliente</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Monto a Cobrar ($):
                </label>
                <input
                  type="number"
                  step="any"
                  value={pagoMonto}
                  onChange={(e) => setPagoMonto(e.target.value)}
                  placeholder={turnoToPay.saldo_pendiente.toString()}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Por defecto se cobra el saldo pendiente total (${turnoToPay.saldo_pendiente.toLocaleString()}).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTurnoToPay(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPago}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                >
                  {isProcessingPago ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Confirmar Cobro</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
