"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wallet,
  Receipt,
} from "lucide-react";

interface GestionCajaArqueoProps {
  subdomain: string;
  token?: string | null;
}

const API_BASE = "/api";

export default function GestionCajaArqueo({ subdomain, token }: GestionCajaArqueoProps) {
  const [cajaResumen, setCajaResumen] = useState<any>(null);
  const [loadingCaja, setLoadingCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState("10000");
  const [montoCierre, setMontoCierre] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  const [isCajaSubmitting, setIsCajaSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getHeaders = () => {
    const activeToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("saas_token") || localStorage.getItem("token")
        : null);

    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Tenant-Subdomain": subdomain,
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
  };

  const fetchCajaResumen = async () => {
    try {
      setLoadingCaja(true);
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/caja/resumen-diario`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setCajaResumen(data.data || data);
      } else {
        throw new Error(data.message || "Error al obtener resumen de caja.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoadingCaja(false);
    }
  };

  useEffect(() => {
    fetchCajaResumen();
  }, [subdomain]);

  const handleAperturaCaja = async () => {
    setIsCajaSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/caja/apertura`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ monto_apertura: Number(montoApertura) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al abrir caja.");
      setSuccessMsg("Caja abierta exitosamente.");
      fetchCajaResumen();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCajaSubmitting(false);
    }
  };

  const handleCierreCaja = async () => {
    setIsCajaSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/caja/cierre`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          monto_cierre_declarado: Number(montoCierre),
          notas_cierre: notasCierre || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al cerrar caja.");
      setSuccessMsg("Caja cerrada y arqueo completado exitosamente.");
      setMontoCierre("");
      setNotasCierre("");
      fetchCajaResumen();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCajaSubmitting(false);
    }
  };

  const sesionAbierta = cajaResumen?.sesiones?.find((s: any) => s.estado === "abierta");

  return (
    <div className="space-y-6" data-testid="gestion-caja-arqueo">
      {/* Notificaciones */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header con botón refrescar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Control de Caja Diaria & Arqueo Ciego</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de turnos de caja, apertura de fondo inicial, control de cobros en mostrador y cierre ciego de efectivo.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchCajaResumen}
          disabled={loadingCaja}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingCaja ? "animate-spin text-emerald-400" : ""}`} />
          <span>Actualizar Caja</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta Resumen Operativo Diario */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Resumen Operativo Diario</span>
            </h3>
            {sesionAbierta ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sesión Abierta
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold">
                Caja Cerrada
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-bold">
                Turnos de Canchas
              </span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                ${(cajaResumen?.total_turnos_reservados ?? cajaResumen?.total_recaudado) ? Number(cajaResumen.total_turnos_reservados ?? cajaResumen.total_recaudado).toLocaleString() : "0"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Cobrado en mostrador / señas
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-bold">
                Ventas de Buffet / POS
              </span>
              <div className="text-xl font-black text-white mt-1">
                ${(cajaResumen?.total_ventas_pos ?? cajaResumen?.total_buffet) ? Number(cajaResumen.total_ventas_pos ?? cajaResumen.total_buffet).toLocaleString() : "0"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Efectivo: ${Number(cajaResumen?.total_ventas_efectivo || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-300 font-bold uppercase">
                Ingresos Brutos del Día
              </div>
              <div className="text-xs text-slate-400">
                Suma consolidada de canchas y mostrador
              </div>
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono">
              ${cajaResumen?.total_ingresos_brutos ? Number(cajaResumen.total_ingresos_brutos).toLocaleString() : "0"}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            El arqueo de caja sincroniza los pagos de alquiler de canchas con los consumos de mostrador y cantina del club.
          </p>
        </div>

        {/* Operaciones de Turno de Caja */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-4">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Operaciones de Turno de Caja</span>
          </h3>

          {/* Apertura */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Apertura con Fondo Inicial:
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                disabled={Boolean(sesionAbierta)}
                value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                placeholder="Monto en efectivo..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isCajaSubmitting || Boolean(sesionAbierta)}
                onClick={handleAperturaCaja}
                data-testid="btn-apertura-caja"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold text-xs transition"
              >
                Abrir Caja
              </button>
            </div>
            {sesionAbierta && (
              <p className="text-[11px] text-emerald-400 font-medium">
                ✓ Hay una sesión abierta iniciada con ${Number(sesionAbierta.monto_apertura).toLocaleString()}.
              </p>
            )}
          </div>

          {/* Cierre */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300">
              Cierre y Conteo Ciego de Efectivo:
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  disabled={!sesionAbierta}
                  value={montoCierre}
                  onChange={(e) => setMontoCierre(e.target.value)}
                  placeholder="Efectivo contado en el cajón..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={isCajaSubmitting || !montoCierre || !sesionAbierta}
                  onClick={handleCierreCaja}
                  data-testid="btn-cierre-caja"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-bold text-xs transition"
                >
                  Cerrar y Arqueo
                </button>
              </div>
              <input
                type="text"
                disabled={!sesionAbierta}
                value={notasCierre}
                onChange={(e) => setNotasCierre(e.target.value)}
                placeholder="Observaciones de cierre (opcional)..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-600 disabled:opacity-50"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Al cerrar, el sistema contrasta el dinero físico que contaste contra lo que debió entrar según las ventas y canchas.
            </p>
          </div>
        </div>
      </div>

      {/* TABLA HISTORIAL DE SESIONES Y RESULTADO DE ARQUEOS */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Historial de Sesiones y Resultados de Arqueo
          </span>
          <span className="text-xs text-slate-400 font-normal">
            {cajaResumen?.sesiones?.length || 0} sesiones registradas
          </span>
        </h3>

        {(!cajaResumen?.sesiones || cajaResumen.sesiones.length === 0) ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No hay sesiones de caja para esta fecha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Apertura</th>
                  <th className="py-2.5 px-3">Cierre</th>
                  <th className="py-2.5 px-3 text-right">Fondo Inicial</th>
                  <th className="py-2.5 px-3 text-right">Ventas Efectivo</th>
                  <th className="py-2.5 px-3 text-right">Esperado en Caja</th>
                  <th className="py-2.5 px-3 text-right">Contado (Declarado)</th>
                  <th className="py-2.5 px-3 text-right">Diferencia</th>
                  <th className="py-2.5 px-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {cajaResumen.sesiones.map((s: any) => {
                  const diff = Number(s.diferencia || 0);
                  const isClosed = s.estado === "cerrada";
                  const isExact = isClosed && diff === 0;
                  const isShort = isClosed && diff < 0;
                  const isSurplus = isClosed && diff > 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        {isClosed ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-sans font-bold">
                            Cerrada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-sans font-bold animate-pulse">
                            Abierta
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">
                        {s.fecha_apertura ? new Date(s.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                        {s.fecha_cierre ? new Date(s.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "En curso"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        ${Number(s.monto_apertura).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        ${Number(s.total_ventas_efectivo || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                        {isClosed ? `$${Number(s.total_esperado_efectivo).toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right text-white font-bold">
                        {isClosed ? `$${Number(s.monto_cierre_declarado).toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {!isClosed ? (
                          <span className="text-slate-500">-</span>
                        ) : isExact ? (
                          <span className="text-emerald-400">$0</span>
                        ) : isShort ? (
                          <span className="text-rose-400">-${Math.abs(diff).toLocaleString()}</span>
                        ) : (
                          <span className="text-cyan-400">+${diff.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {!isClosed ? (
                          <span className="text-[10px] text-slate-500 font-sans">En curso</span>
                        ) : isExact ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-sans font-bold">
                            Cuadrada ✓
                          </span>
                        ) : isShort ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-sans font-bold">
                            Faltante ✗
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-sans font-bold">
                            Sobrante !
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
