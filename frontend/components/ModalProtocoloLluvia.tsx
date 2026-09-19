"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CloudRain,
  Calendar,
  Clock,
  Shield,
  ShieldCheck,
  Ticket,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Send,
  Lock,
  ChevronRight,
  Info,
} from "lucide-react";

export interface ModalProtocoloLluviaProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
  apiUrl?: string;
  initialDate?: string;
  onSuccess?: (result: any) => void;
}

export interface CanchaImpacto {
  id: number;
  nombre: string;
  deporte: string;
  techada: boolean;
  tipo_cubierta: string;
  es_descubierta: boolean;
  seleccionada: boolean;
  turnos_afectados_count: number;
  monto_afectado: number;
  turnos_protegidos_count: number;
}

export interface ResumenImpacto {
  total_turnos_a_cancelar: number;
  total_clientes_afectados: number;
  total_monto_a_reembolsar: number;
  turnos_con_billetera: number;
  monto_billetera: number;
  turnos_sin_cuenta: number;
  monto_vales: number;
  total_canchas_techadas_protegidas: number;
  total_turnos_protegidos: number;
}

export interface TurnoAfectado {
  id: number;
  cancha_id: number;
  cancha_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  cliente_id: number | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  precio: number;
  monto_pagado: number;
  saldo_pendiente: number;
  tiene_cuenta: boolean;
  tipo_reembolso_estimado: string;
}

export default function ModalProtocoloLluvia({
  isOpen,
  onClose,
  subdomain,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
  initialDate,
  onSuccess,
}: ModalProtocoloLluviaProps) {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [fecha, setFecha] = useState<string>(initialDate || getTodayStr());
  const [modoHorario, setModoHorario] = useState<"desde_hora" | "todo_el_dia">("desde_hora");
  const [horaDesde, setHoraDesde] = useState<string>("16:00");
  const [selectedCanchasIds, setSelectedCanchasIds] = useState<number[]>([]);
  const [canchasDisponibles, setCanchasDisponibles] = useState<CanchaImpacto[]>([]);
  const [resumen, setResumen] = useState<ResumenImpacto | null>(null);
  const [turnosAfectados, setTurnosAfectados] = useState<TurnoAfectado[]>([]);

  const [notificarWhatsApp, setNotificarWhatsApp] = useState<boolean>(true);
  const [bloquearGrilla, setBloquearGrilla] = useState<boolean>(true);
  const [observaciones, setObservaciones] = useState<string>("Suspensión preventiva por lluvia y mal clima");

  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [resultSuccess, setResultSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token") || localStorage.getItem("token") || null;
  };

  // Cargar previsualización desde la API
  const fetchPreview = useCallback(
    async (overrideCanchas?: number[]) => {
      if (!isOpen) return;
      setLoadingPreview(true);
      setErrorMessage(null);

      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        };

        const canchasToQuery = overrideCanchas !== undefined ? overrideCanchas : selectedCanchasIds;

        const body: Record<string, any> = {
          fecha,
          hora_desde: modoHorario === "desde_hora" ? horaDesde : null,
        };

        if (canchasToQuery.length > 0) {
          body.canchas_ids = canchasToQuery;
        } else if (overrideCanchas === undefined && selectedCanchasIds.length === 0) {
          body.solo_descubiertas = true;
        } else {
          body.canchas_ids = [];
        }

        const res = await fetch(`${apiUrl}/clubs/${subdomain}/cancelacion-lluvia/preview`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Error al calcular impacto de suspensión.");
        }

        setResumen(json.resumen);
        setCanchasDisponibles(json.canchas || []);
        setTurnosAfectados(json.turnos_afectados || []);

        // Si es la carga inicial o no había selección previa, sincronizar canchas seleccionadas
        if (selectedCanchasIds.length === 0 && overrideCanchas === undefined) {
          const autoSelected = (json.canchas || [])
            .filter((c: CanchaImpacto) => c.seleccionada)
            .map((c: CanchaImpacto) => c.id);
          setSelectedCanchasIds(autoSelected);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Error al conectar con el servidor.");
      } finally {
        setLoadingPreview(false);
      }
    },
    [isOpen, fecha, modoHorario, horaDesde, selectedCanchasIds, apiUrl, subdomain]
  );

  // Inicializar o recargar cuando se abre el modal o cambian los parámetros principales
  useEffect(() => {
    if (isOpen) {
      setResultSuccess(null);
      setConfirmStep(false);
      fetchPreview();
    }
  }, [isOpen, fecha, modoHorario, horaDesde]);

  // Presets rápidos
  const aplicarPreset = (tipo: "descubiertas" | "todas" | "ninguna") => {
    let nuevosIds: number[] = [];
    if (tipo === "descubiertas") {
      nuevosIds = canchasDisponibles.filter((c) => c.es_descubierta).map((c) => c.id);
    } else if (tipo === "todas") {
      nuevosIds = canchasDisponibles.map((c) => c.id);
    } else if (tipo === "ninguna") {
      nuevosIds = [];
    }
    setSelectedCanchasIds(nuevosIds);
    fetchPreview(nuevosIds);
  };

  // Tildar / destildar cancha individual
  const toggleCancha = (id: number) => {
    const updated = selectedCanchasIds.includes(id)
      ? selectedCanchasIds.filter((cid) => cid !== id)
      : [...selectedCanchasIds, id];

    setSelectedCanchasIds(updated);
    fetchPreview(updated);
  };

  // Confirmar y Ejecutar Cancelación Masiva
  const ejecutarCancelacion = async () => {
    setExecuting(true);
    setErrorMessage(null);

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
      };

      const body = {
        fecha,
        hora_desde: modoHorario === "desde_hora" ? horaDesde : null,
        canchas_ids: selectedCanchasIds,
        notificar_whatsapp: notificarWhatsApp,
        bloquear_grilla: bloquearGrilla,
        observaciones,
      };

      const res = await fetch(`${apiUrl}/clubs/${subdomain}/cancelacion-lluvia/ejecutar`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al procesar la cancelación masiva.");
      }

      setResultSuccess(json);
      setConfirmStep(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("saas-turno-cancelled"));
      }

      if (onSuccess) {
        onSuccess(json);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al ejecutar la suspensión masiva.");
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <CloudRain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Protocolo de Suspensión por Lluvia
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Contingencia Climática
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cancelá turnos en canchas afectadas, reintegrá a Billetera o emití Vales y notificá por WhatsApp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resultSuccess ? (
            /* Vista de Éxito */
            <div className="text-center py-8 px-4 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-white">¡Suspensión Masiva Ejecutada con Éxito!</h4>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  {resultSuccess.message || "Los turnos fueron cancelados y los fondos quedaron protegidos."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <div className="text-2xl font-black text-white">{resultSuccess.total_turnos_cancelados}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Turnos Suspendidos</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <div className="text-2xl font-black text-emerald-400">
                    ${Number(resultSuccess.total_monto_reembolsado).toLocaleString("es-AR")}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Total Reintegrado</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <div className="text-2xl font-black text-cyan-400">{resultSuccess.billeteras_acreditadas_count}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Billeteras Virtuales</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                  <div className="text-2xl font-black text-amber-400">{resultSuccess.vales_emitidos_count}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Vales Tokenizados</div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
                >
                  Entendido y Finalizar
                </button>
              </div>
            </div>
          ) : confirmStep ? (
            /* Vista de Confirmación Doble Factor */
            <div className="py-6 px-4 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                  <h4 className="font-bold text-base text-amber-200">¿Confirmás la suspensión climática definitiva?</h4>
                </div>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  Esta acción cancelará{" "}
                  <strong className="text-white underline">{resumen?.total_turnos_a_cancelar || 0} turnos</strong> en las canchas
                  seleccionadas a partir de las {modoHorario === "desde_hora" ? `${horaDesde} hs` : "apertura"}. Se
                  reembolsarán automáticamente{" "}
                  <strong className="text-emerald-300">
                    ${Number(resumen?.total_monto_a_reembolsar || 0).toLocaleString("es-AR")}
                  </strong>{" "}
                  a los jugadores ({resumen?.turnos_con_billetera || 0} a Billetera Virtual directa y{" "}
                  {resumen?.turnos_sin_cuenta || 0} mediante Vales Digitales Tokenizados).
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Motivo / Observación interna para la auditoría:
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Ej: Lluvia torrencial y tormenta eléctrica"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={executing}
                  onClick={() => setConfirmStep(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Volver a Revisar
                </button>
                <button
                  type="button"
                  disabled={executing}
                  onClick={ejecutarCancelacion}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-lg shadow-rose-600/25 transition-all hover:scale-105 disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cancelando y Reintegrando...</span>
                    </>
                  ) : (
                    <>
                      <CloudRain className="w-4 h-4" />
                      <span>Confirmar Suspensión Masiva</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Vista Principal de Configuración */
            <div className="space-y-6">
              {/* Sección 1: Rango y Horario de Afectación */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 1. ¿A partir de qué momento comenzó a llover?
                  </span>
                  {loadingPreview && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Calculando...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Selector de Fecha */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">Fecha afectada:</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Selector de Rango */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">Horario de corte:</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="radio"
                          name="modoHorario"
                          checked={modoHorario === "desde_hora"}
                          onChange={() => setModoHorario("desde_hora")}
                          className="text-cyan-500 focus:ring-cyan-500"
                        />
                        <span>A partir de las:</span>
                      </label>

                      <input
                        type="time"
                        value={horaDesde}
                        disabled={modoHorario !== "desde_hora"}
                        onChange={(e) => setHoraDesde(e.target.value)}
                        className={`bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500 ${
                          modoHorario !== "desde_hora" ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      />

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 ml-2">
                        <input
                          type="radio"
                          name="modoHorario"
                          checked={modoHorario === "todo_el_dia"}
                          onChange={() => setModoHorario("todo_el_dia")}
                          className="text-cyan-500 focus:ring-cyan-500"
                        />
                        <span>Todo el día</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 2: Selección Granular de Canchas */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> 2. ¿Qué canchas se cancelan a partir de esa hora?
                  </span>

                  {/* Presets Rápidos */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => aplicarPreset("descubiertas")}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                    >
                      🟢 Solo Descubiertas
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPreset("todas")}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                    >
                      🔴 Todas las canchas
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarPreset("ninguna")}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>

                {/* Listado Interactivo de Canchas con Checkbox */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {canchasDisponibles.map((cancha) => {
                    const isSelected = selectedCanchasIds.includes(cancha.id);
                    return (
                      <div
                        key={cancha.id}
                        onClick={() => toggleCancha(cancha.id)}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer select-none transition-all duration-150 ${
                          isSelected
                            ? "bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-500/10"
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700 opacity-80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Controlled by parent div
                          className="mt-1 w-4 h-4 rounded text-cyan-500 border-slate-700 bg-slate-900 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-bold text-white truncate">{cancha.nombre}</span>
                            {cancha.techada ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                🏠 Techada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                                ☀️ Al aire libre
                              </span>
                            )}
                          </div>

                          <div className="text-xs mt-1">
                            {isSelected ? (
                              <span className="text-rose-400 font-medium">
                                ⚠️ {cancha.turnos_afectados_count} turno
                                {cancha.turnos_afectados_count === 1 ? "" : "s"} a suspender
                                {cancha.monto_afectado > 0 ? ` ($${cancha.monto_afectado.toLocaleString("es-AR")})` : ""}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {cancha.turnos_protegidos_count} turno
                                {cancha.turnos_protegidos_count === 1 ? "" : "s"} protegidos (se juegan)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sección 3: Impacto y KPIs Consolidados en Vivo */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5" /> 3. Impacto de la Suspensión (Cálculo en vivo)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-xl font-black text-white">{resumen?.total_turnos_a_cancelar || 0}</div>
                    <div className="text-[11px] text-slate-400">Turnos a suspender</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-xl font-black text-emerald-400">
                      ${Number(resumen?.total_monto_a_reembolsar || 0).toLocaleString("es-AR")}
                    </div>
                    <div className="text-[11px] text-slate-400">Total a reintegrar</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-xl font-black text-cyan-400 flex items-center gap-1">
                      <Wallet className="w-4 h-4" /> {resumen?.turnos_con_billetera || 0}
                    </div>
                    <div className="text-[11px] text-slate-400">A Billetera Virtual</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-xl font-black text-amber-400 flex items-center gap-1">
                      <Ticket className="w-4 h-4" /> {resumen?.turnos_sin_cuenta || 0}
                    </div>
                    <div className="text-[11px] text-slate-400">Vales Digitales (Rain Check)</div>
                  </div>
                </div>

                {/* Opciones Adicionales de Seguridad */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bloquearGrilla}
                      onChange={(e) => setBloquearGrilla(e.target.checked)}
                      className="rounded text-cyan-500 border-slate-700 bg-slate-950 focus:ring-0"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Bloquear slots vacíos restantes en canchas canceladas para evitar nuevas reservas online hoy
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificarWhatsApp}
                      onChange={(e) => setNotificarWhatsApp(e.target.checked)}
                      className="rounded text-cyan-500 border-slate-700 bg-slate-950 focus:ring-0"
                    />
                    <Send className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Disparar WhatsApp automático desatendido a los jugadores avisando suspensión y entregando saldo / vale
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!resultSuccess && !confirmStep && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
            <div className="text-xs text-slate-400">
              {selectedCanchasIds.length} cancha{selectedCanchasIds.length === 1 ? "" : "s"} seleccionada
              {selectedCanchasIds.length === 1 ? "" : "s"}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={loadingPreview || (resumen?.total_turnos_a_cancelar || 0) === 0}
                onClick={() => setConfirmStep(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-lg shadow-rose-600/25 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
              >
                <CloudRain className="w-4 h-4" />
                <span>
                  Suspender por Lluvia ({resumen?.total_turnos_a_cancelar || 0} Turno
                  {(resumen?.total_turnos_a_cancelar || 0) === 1 ? "" : "s"})
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
