"use client";

import React, { useState, useEffect, useRef } from "react";
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, X, Lock } from "lucide-react";

export interface Slot {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  precio?: number;
  es_fijo?: boolean;
}

export interface GrillaHorariaProps {
  canchaId: number;
  canchaNombre?: string;
  deporte?: string;
  subdomain?: string;
  fechaInicial?: string;
  apiUrl?: string;
  initialSlots?: Slot[];
  onConfirmSuccess?: (data: any) => void;
}

export interface ActiveLock {
  canchaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tokenReserva: string;
  ttlSeconds: number;
  expiresAt: number;
  precio: number;
}

export interface ToastMessage {
  id: number;
  type: "error" | "success" | "warning";
  text: string;
}

export default function GrillaHoraria({
  canchaId,
  canchaNombre = "Cancha 1",
  deporte = "padel",
  subdomain,
  fechaInicial,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api",
  initialSlots,
  onConfirmSuccess,
}: GrillaHorariaProps) {
  const getTodayString = () => new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState<string>(fechaInicial || getTodayString());
  const [slots, setSlots] = useState<Slot[]>(initialSlots || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [lockingSlot, setLockingSlot] = useState<string | null>(null);
  const [activeLock, setActiveLock] = useState<ActiveLock | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = (type: "error" | "success" | "warning", text: string) => {
    const newToast: ToastMessage = { id: Date.now() + Math.random(), type, text };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      removeToast(newToast.id);
    }, 6000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch slots availability
  const fetchDisponibilidad = async (targetFecha: string) => {
    if (initialSlots && targetFecha === fechaInicial && slots.length > 0) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/canchas/${canchaId}/disponibilidad?fecha=${targetFecha}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener la disponibilidad.");
      }

      const data = await res.json();
      if (data.data && Array.isArray(data.data.slots)) {
        setSlots(data.data.slots);
      } else if (Array.isArray(data.data)) {
        setSlots(data.data);
      } else if (Array.isArray(data.slots)) {
        setSlots(data.slots);
      }
    } catch (err) {
      addToast("error", "Error al cargar los turnos disponibles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSlots || fecha !== fechaInicial) {
      fetchDisponibilidad(fecha);
    }
  }, [fecha, canchaId]);

  // Visual countdown timer for Redis atomic lock
  useEffect(() => {
    if (!activeLock) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const secondsLeft = Math.max(0, Math.floor((activeLock.expiresAt - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);

      if (secondsLeft <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveLock(null);
        addToast("warning", "El tiempo de bloqueo de 10 minutos ha expirado. Selecciona el turno nuevamente.");
        fetchDisponibilidad(fecha);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeLock]);

  // Request atomic slot lock in Redis
  const handleSelectSlot = async (slot: Slot) => {
    if (!slot.disponible) return;
    if (activeLock && activeLock.horaInicio === slot.hora_inicio) return;

    setLockingSlot(slot.hora_inicio);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/turnos/bloquear-temporal`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cancha_id: canchaId,
          fecha,
          hora_inicio: slot.hora_inicio,
          hora_fin: slot.hora_fin,
        }),
      });

      const data = await res.json();

      if (res.status === 409 || !res.ok) {
        const errorMsg =
          data.message ||
          (data.error === "TURNO_ALREADY_LOCKED"
            ? "El turno ya se encuentra bloqueado por otro usuario."
            : "El turno ya no está disponible.");
        addToast("error", errorMsg);
        // Refresh grid
        fetchDisponibilidad(fecha);
        return;
      }

      // Lock acquired successfully (10 min TTL)
      const ttl = data.ttl || data.data?.ttl || 600;
      const token = data.token_reserva || data.data?.token_reserva || "lock-token";
      const expiresAt = Date.now() + ttl * 1000;

      setActiveLock({
        canchaId,
        fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
        tokenReserva: token,
        ttlSeconds: ttl,
        expiresAt,
        precio: slot.precio || 0,
      });

      addToast("success", `¡Turno ${slot.hora_inicio} bloqueado con éxito! Tienes 10 minutos para confirmar.`);
    } catch (err) {
      addToast("error", "Error de red al intentar bloquear el turno.");
    } finally {
      setLockingSlot(null);
    }
  };

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 relative">
      {/* Toast Alert Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl text-sm font-medium border transition-all duration-300 transform translate-y-0 ${
              toast.type === "error"
                ? "bg-rose-950/90 border-rose-600/50 text-rose-200"
                : toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
                : "bg-amber-950/90 border-amber-500/50 text-amber-200"
            }`}
          >
            {toast.type === "error" && <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug">{toast.text}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition"
              aria-label="Cerrar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {deporte}
            </span>
            <h2 className="text-2xl font-bold text-white">{canchaNombre}</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">Selecciona un horario disponible para reservar tu turno</p>
        </div>

        {/* Date Picker Input */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
          <label htmlFor="fecha-picker" className="text-xs text-slate-400 font-medium px-2">
            Fecha:
          </label>
          <input
            id="fecha-picker"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Active Lock Checkout Banner with 10-minute Visual Timer */}
      {activeLock && (
        <div
          data-testid="active-lock-banner"
          className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border border-emerald-500/40 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg animate-pulse-slow"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                Turno Retenido: <span className="text-white font-bold">{activeLock.horaInicio} - {activeLock.horaFin}</span> ({activeLock.fecha})
              </p>
              <p className="text-xs text-emerald-300/80">
                Comando atómico en Redis activo. Nadie más puede tomar este turno.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-xl border border-emerald-500/50">
              <Clock className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              <span data-testid="countdown-timer" className="text-xl font-mono font-black text-emerald-300 tracking-wider">
                {formatCountdown(remainingSeconds)}
              </span>
            </div>

            <button
              onClick={() => onConfirmSuccess?.(activeLock)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition shadow-lg"
            >
              Confirmar Reserva
            </button>
          </div>
        </div>
      )}

      {/* Grid of Time Slots */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Horarios del Día ({slots.length} turnos)
        </h3>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-800/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-800">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 font-medium">No hay turnos disponibles para la fecha seleccionada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slots.map((slot) => {
              const isLockedByMe = activeLock?.horaInicio === slot.hora_inicio;
              const isLocking = lockingSlot === slot.hora_inicio;

              let buttonClasses =
                "relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 ";

              if (!slot.disponible) {
                buttonClasses += "bg-slate-800/30 border-slate-800 text-slate-500 cursor-not-allowed opacity-60";
              } else if (isLockedByMe) {
                buttonClasses += "bg-emerald-950/80 border-emerald-500 text-white ring-2 ring-emerald-500 shadow-lg";
              } else {
                buttonClasses +=
                  "bg-slate-800/60 border-slate-700/80 text-white hover:border-emerald-500/70 hover:bg-slate-800 cursor-pointer hover:shadow-md";
              }

              return (
                <button
                  key={slot.hora_inicio}
                  disabled={!slot.disponible || isLocking}
                  onClick={() => handleSelectSlot(slot)}
                  className={buttonClasses}
                  aria-label={`Turno ${slot.hora_inicio} a ${slot.hora_fin} ${slot.disponible ? "Disponible" : "Ocupado"}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="font-mono text-lg font-extrabold tracking-tight">
                      {slot.hora_inicio}
                    </span>
                    {isLockedByMe ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    ) : slot.disponible ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Libre
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Ocupado
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex justify-between items-baseline w-full">
                    <span className="text-xs text-slate-400 font-medium">{slot.hora_fin}</span>
                    {slot.precio && (
                      <span className="text-xs font-semibold text-emerald-400">
                        ${slot.precio.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
