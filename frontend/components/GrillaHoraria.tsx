"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  duracionInicial?: number;
  permiteDuracionFlexible?: boolean;
  duracionesPermitidas?: number[];
  precioBase?: number;
  precio90Min?: number;
  precio120Min?: number;
  isAdmin?: boolean;
  token?: string | null;
  apiUrl?: string;
  initialSlots?: Slot[];
  onConfirmSuccess?: (data: any) => void;
}

export interface ActiveLock {
  canchaId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionMinutos?: number;
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

export interface AntiBachesInfo {
  activa: boolean;
  total_horarios_protegidos: number;
  horarios_protegidos: Array<{
    hora_inicio: string;
    hora_fin: string;
    duracion_minutos: number;
    motivo: string;
  }>;
}

export interface RetainedLock {
  cancha_id: number;
  cancha_nombre?: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_minutos?: number;
  precio?: number;
  ttl_segundos: number;
  expira_en_segundos?: number;
  token_reserva?: string;
  is_mine?: boolean;
}

export interface TurnoOcupado {
  id: number;
  cancha_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_minutos?: number;
  precio: number;
  metodo_pago?: string;
  estado: string;
  es_fijo?: boolean;
  cliente_id?: number | null;
  cliente_nombre?: string;
  cliente_email?: string | null;
  cliente_telefono?: string | null;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  telefono?: string | null;
  is_admin?: boolean;
}

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getAuthToken = (explicitToken?: string | null): string | null => {
  if (explicitToken) return explicitToken;
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("saas_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    null
  );
};

export default function GrillaHoraria({
  canchaId,
  canchaNombre = "Cancha 1",
  deporte = "padel",
  subdomain,
  fechaInicial,
  duracionInicial = 60,
  permiteDuracionFlexible = false,
  duracionesPermitidas = [60, 90, 120],
  precioBase,
  precio90Min,
  precio120Min,
  isAdmin = false,
  token: propToken,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api",
  initialSlots,
  onConfirmSuccess,
}: GrillaHorariaProps) {
  const getTodayString = () => getLocalDateString();
  const [fecha, setFecha] = useState<string>(fechaInicial || getTodayString());
  const [duracion, setDuracion] = useState<number>(duracionInicial || (deporte?.toLowerCase() === "padel" ? 90 : 60));
  const [isFlexible, setIsFlexible] = useState<boolean>(Boolean(permiteDuracionFlexible));
  const [antiBachesInfo, setAntiBachesInfo] = useState<AntiBachesInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>(initialSlots || []);
  const [turnosOcupados, setTurnosOcupados] = useState<TurnoOcupado[]>([]);
  const [turnosRetenidos, setTurnosRetenidos] = useState<RetainedLock[]>([]);
  const [turnoToCancel, setTurnoToCancel] = useState<TurnoOcupado | null>(null);
  const [isCancelingTurno, setIsCancelingTurno] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lockingSlot, setLockingSlot] = useState<string | null>(null);
  const [activeLock, setActiveLock] = useState<ActiveLock | null>(null);
  const [myLockedSlots, setMyLockedSlots] = useState<Record<string, ActiveLock>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [registrationStep, setRegistrationStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [isResendingOtp, setIsResendingOtp] = useState<boolean>(false);
  const [pendingRegisteredUser, setPendingRegisteredUser] = useState<{ token: string; user: CurrentUser } | null>(null);
  const otpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string>("");
  const [clienteTelefono, setClienteTelefono] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("simulador_dev");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletCredit, setUseWalletCredit] = useState<boolean>(false);
  const [subscribedWaitlists, setSubscribedWaitlists] = useState<Set<string>>(new Set());
  const [subscribingSlot, setSubscribingSlot] = useState<string | null>(null);

  useEffect(() => {
    if (duracionInicial) {
      setDuracion(duracionInicial);
    }
    if (permiteDuracionFlexible !== undefined) {
      setIsFlexible(permiteDuracionFlexible);
    }
  }, [canchaId, duracionInicial, permiteDuracionFlexible]);

  const fetchWalletBalance = async () => {
    try {
      const token = getAuthToken(propToken);
      if (!token) return;
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;
      const subParam = subdomain ? `?subdomain=${subdomain}` : "";
      const res = await fetch(`${apiUrl}/wallet/saldo${subParam}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.saldo === "number") {
          setWalletBalance(data.saldo);
        }
      }
    } catch {
      // ignore
    }
  };

  // Check authenticated user session
  useEffect(() => {
    const token = getAuthToken(propToken);
    if (token && typeof fetch === "function") {
      try {
        const promise = fetch(`${apiUrl}/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
          },
        });
        if (promise && typeof promise.then === "function") {
          promise
            .then((res) => (res && res.ok ? res.json() : null))
            .then((data) => {
              if (data?.user) {
                setCurrentUser(data.user);
                if (!isAdmin) {
                  setClienteNombre(data.user.name || "");
                  setClienteTelefono(data.user.telefono || "");
                }
                fetchWalletBalance();
              }
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, [apiUrl, subdomain, isAdmin, propToken]);

  // Cooldown countdown for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      otpTimerRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, [otpCountdown]);

  const handleResendOtp = async () => {
    if (!authEmail.trim() || otpCountdown > 0) return;
    setIsResendingOtp(true);
    setAuthError(null);
    try {
      const res = await fetch(`${apiUrl}/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({ email: authEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al reenviar el código OTP.");
      }
      setOtpCountdown(60);
      addToast("success", "Se ha enviado un nuevo código de 6 dígitos a tu correo.");
    } catch (err: any) {
      setAuthError(err.message || "Error al reenviar código.");
      addToast("error", err.message || "Error al reenviar código.");
    } finally {
      setIsResendingOtp(false);
    }
  };

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
  const fetchDisponibilidad = async (targetFecha: string, targetDuracion: number = duracion) => {
    if (initialSlots && targetFecha === fechaInicial && slots.length > 0 && !targetDuracion) return;
    setLoading(true);
    try {
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const durParam = targetDuracion ? `&duracion=${targetDuracion}` : "";
      const res = await fetch(
        `${apiUrl}/canchas/${canchaId}/disponibilidad?fecha=${targetFecha}${durParam}`,
        {
          headers,
        }
      );

      if (!res.ok) {
        throw new Error("No se pudo obtener la disponibilidad.");
      }

      const data = await res.json();
      if (data.permite_duracion_flexible !== undefined) {
        setIsFlexible(Boolean(data.permite_duracion_flexible));
      }
      if (data.optimizacion_anti_baches) {
        setAntiBachesInfo(data.optimizacion_anti_baches);
      }
      if (Array.isArray(data.turnos_ocupados)) {
        setTurnosOcupados(data.turnos_ocupados);
      } else if (Array.isArray(data.data?.turnos_ocupados)) {
        setTurnosOcupados(data.data.turnos_ocupados);
      } else {
        setTurnosOcupados([]);
      }
      if (Array.isArray(data.turnos_retenidos)) {
        setTurnosRetenidos(data.turnos_retenidos);
      } else if (Array.isArray(data.data?.turnos_retenidos)) {
        setTurnosRetenidos(data.data.turnos_retenidos);
      } else {
        setTurnosRetenidos([]);
      }
      const rawSlots =
        data.slots_disponibles ||
        data.data?.slots ||
        (Array.isArray(data.data) ? data.data : null) ||
        (Array.isArray(data.slots) ? data.slots : null) ||
        [];

      if (Array.isArray(rawSlots)) {
        const formattedSlots: Slot[] = rawSlots.map((s: any) => ({
          hora_inicio: s.hora_inicio,
          hora_fin: s.hora_fin,
          disponible:
            s.disponible !== undefined
              ? Boolean(s.disponible)
              : s.estado === "disponible" || s.estado === undefined,
          precio: s.precio ? Number(s.precio) : undefined,
          es_fijo: Boolean(s.es_fijo),
        }));
        setSlots(formattedSlots);
      }
    } catch (err) {
      addToast("error", "Error al cargar los turnos disponibles.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTurno = async () => {
    if (!turnoToCancel || !subdomain) return;
    setIsCancelingTurno(true);
    try {
      const token = getAuthToken(propToken);
      const res = await fetch(`${apiUrl}/clubs/${subdomain}/turnos/${turnoToCancel.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("No se pudo liberar el turno.");
      }

      addToast("success", `Turno de las ${turnoToCancel.hora_inicio} hs liberado exitosamente.`);
      setTurnoToCancel(null);
      fetchDisponibilidad(fecha, duracion);
    } catch (err: any) {
      addToast("error", err.message || "Error al liberar el turno.");
    } finally {
      setIsCancelingTurno(false);
    }
  };

  const getLockStorageKey = (cid: number) => `active_lock_${subdomain || "club"}_${cid}`;

  const handleLiberarBloqueo = async (lock: RetainedLock | ActiveLock) => {
    try {
      const horaInicio = "hora_inicio" in lock ? lock.hora_inicio : lock.horaInicio;
      const lockFecha = lock.fecha;
      const targetCanchaId = "cancha_id" in lock ? lock.cancha_id : (lock.canchaId || canchaId);
      const token = getAuthToken(propToken);
      const tokenReserva =
        "token_reserva" in lock
          ? lock.token_reserva
          : "tokenReserva" in lock
          ? lock.tokenReserva
          : undefined;

      if (typeof window !== "undefined") {
        localStorage.removeItem(getLockStorageKey(targetCanchaId));
      }

      setMyLockedSlots((prev) => {
        const next = { ...prev };
        delete next[`${lockFecha}_${horaInicio}`];
        return next;
      });

      if (activeLock && activeLock.horaInicio === horaInicio && (activeLock.canchaId === targetCanchaId || !activeLock.canchaId)) {
        setActiveLock(null);
      }

      setTurnosRetenidos((prev) => prev.filter((r) => r.hora_inicio !== horaInicio));

      await fetch(`${apiUrl}/turnos/liberar-bloqueo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
        },
        body: JSON.stringify({
          cancha_id: targetCanchaId,
          fecha: lockFecha,
          hora_inicio: horaInicio,
          token_reserva: tokenReserva,
        }),
      });

      addToast("success", `Bloqueo de las ${horaInicio} hs cancelado / liberado correctamente.`);
      fetchDisponibilidad(fecha, duracion);
    } catch {
      addToast("error", "Error al liberar el turno retenido.");
    }
  };

  // Restore active lock for this court and date from localStorage if still valid
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = getLockStorageKey(canchaId);
    const savedLockStr = localStorage.getItem(storageKey);
    if (savedLockStr) {
      try {
        const parsed: ActiveLock = JSON.parse(savedLockStr);
        if (parsed.fecha === fecha && parsed.expiresAt > Date.now()) {
          setActiveLock(parsed);
          setMyLockedSlots((prev) => ({
            ...prev,
            [`${parsed.fecha}_${parsed.horaInicio}`]: parsed,
          }));
          const rem = Math.max(0, Math.floor((parsed.expiresAt - Date.now()) / 1000));
          setRemainingSeconds(rem);
        } else {
          localStorage.removeItem(storageKey);
          setActiveLock(null);
        }
      } catch {
        localStorage.removeItem(storageKey);
        setActiveLock(null);
      }
    } else {
      setActiveLock(null);
    }
  }, [canchaId, fecha, subdomain]);

  useEffect(() => {
    if (!initialSlots || fecha !== fechaInicial) {
      fetchDisponibilidad(fecha, duracion);
    }
  }, [fecha, canchaId, duracion]);

  // Master visual countdown timer for all active and retained locks
  useEffect(() => {
    const hasActiveLock = Boolean(activeLock);
    const hasRetained = turnosRetenidos.length > 0;

    if (!hasActiveLock && !hasRetained) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRemainingSeconds(0);
      return;
    }

    const updateTimers = () => {
      // 1. Decrement activeLock remaining seconds
      if (activeLock) {
        const secondsLeft = Math.max(0, Math.floor((activeLock.expiresAt - Date.now()) / 1000));
        setRemainingSeconds(secondsLeft);
        if (secondsLeft <= 0) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(getLockStorageKey(canchaId));
          }
          setActiveLock(null);
          addToast("warning", "El tiempo de retención del turno ha expirado. Selecciona el turno nuevamente.");
          fetchDisponibilidad(fecha, duracion);
        }
      }

      // 2. Decrement all retained locks
      setTurnosRetenidos((prev) => {
        let hasExpired = false;
        const updated = prev
          .map((r) => {
            const nextTtl = r.ttl_segundos - 1;
            if (nextTtl <= 0) hasExpired = true;
            return { ...r, ttl_segundos: nextTtl };
          })
          .filter((r) => r.ttl_segundos > 0);

        if (hasExpired) {
          fetchDisponibilidad(fecha, duracion);
        }
        return updated;
      });
    };

    updateTimers();
    timerRef.current = setInterval(updateTimers, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeLock, turnosRetenidos.length, fecha, duracion]);

  const allAdminRetainedLocks: RetainedLock[] = useMemo(() => {
    const map = new Map<string, RetainedLock>();

    turnosRetenidos.forEach((r) => {
      const myLock = myLockedSlots[`${r.fecha}_${r.hora_inicio}`] || (activeLock && activeLock.horaInicio === r.hora_inicio ? activeLock : null);
      const isMine = Boolean(myLock);
      const effectiveTtl = myLock
        ? Math.max(0, Math.floor((myLock.expiresAt - Date.now()) / 1000))
        : r.ttl_segundos;

      map.set(r.hora_inicio, {
        ...r,
        ttl_segundos: effectiveTtl,
        token_reserva: r.token_reserva || myLock?.tokenReserva,
        is_mine: isMine,
      });
    });

    if (activeLock) {
      const existing = map.get(activeLock.horaInicio);
      map.set(activeLock.horaInicio, {
        cancha_id: activeLock.canchaId,
        cancha_nombre: canchaNombre,
        fecha: activeLock.fecha,
        hora_inicio: activeLock.horaInicio,
        hora_fin: activeLock.horaFin,
        duracion_minutos: activeLock.duracionMinutos,
        precio: activeLock.precio,
        ttl_segundos: remainingSeconds,
        token_reserva: activeLock.tokenReserva,
        ...existing,
        is_mine: true,
      });
    }

    Object.values(myLockedSlots).forEach((ml) => {
      if (ml.fecha === fecha && ml.expiresAt > Date.now() && !map.has(ml.horaInicio)) {
        map.set(ml.horaInicio, {
          cancha_id: ml.canchaId,
          cancha_nombre: canchaNombre,
          fecha: ml.fecha,
          hora_inicio: ml.horaInicio,
          hora_fin: ml.horaFin,
          duracion_minutos: ml.duracionMinutos,
          precio: ml.precio,
          ttl_segundos: Math.max(0, Math.floor((ml.expiresAt - Date.now()) / 1000)),
          token_reserva: ml.tokenReserva,
          is_mine: true,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [turnosRetenidos, activeLock, myLockedSlots, remainingSeconds, canchaNombre, fecha]);

  const isSlotInPast = (slotHoraInicio: string, slotFecha: string) => {
    const today = getTodayString();
    if (slotFecha < today) return true;
    if (slotFecha > today) return false;
    // slotFecha === today: compare with current hours & minutes
    const now = new Date();
    const [slotHour, slotMin] = slotHoraInicio.split(":").map(Number);
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    if (slotHour < currentHour) return true;
    if (slotHour === currentHour && slotMin <= currentMin) return true;
    return false;
  };

  const handleFechaChange = (newFecha: string) => {
    const today = getTodayString();
    if (typeof window !== "undefined") {
      localStorage.removeItem(getLockStorageKey(canchaId));
    }
    if (newFecha && newFecha < today) {
      addToast("warning", "No se pueden seleccionar fechas del pasado.");
      setFecha(today);
      setActiveLock(null);
      fetchDisponibilidad(today);
      return;
    }
    setFecha(newFecha);
    setActiveLock(null);
    fetchDisponibilidad(newFecha);
  };

  // Request atomic slot lock in Redis
  const handleSelectSlot = async (slot: Slot) => {
    if (!slot.disponible) return;
    if (isSlotInPast(slot.hora_inicio, fecha)) {
      addToast("warning", "Este horario ya ha pasado y no puede asignarse.");
      return;
    }
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
          duracion_minutos: slot.duracion_minutos || duracion,
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

      const newLock: ActiveLock = {
        canchaId,
        fecha,
        horaInicio: slot.hora_inicio,
        horaFin: slot.hora_fin,
        tokenReserva: token,
        ttlSeconds: ttl,
        expiresAt,
        precio: slot.precio || 0,
      };

      setActiveLock(newLock);
      setMyLockedSlots((prev) => ({
        ...prev,
        [`${fecha}_${slot.hora_inicio}`]: newLock,
      }));
      if (typeof window !== "undefined") {
        localStorage.setItem(getLockStorageKey(canchaId), JSON.stringify(newLock));
      }

      addToast("success", `¡Turno ${slot.hora_inicio} bloqueado con éxito! Tienes 10 minutos para confirmar.`);
      fetchDisponibilidad(fecha, duracion);
    } catch (err) {
      addToast("error", "Error de red al intentar bloquear el turno.");
    } finally {
      setLockingSlot(null);
    }
  };

  const handleOpenConfirmation = () => {
    if (onConfirmSuccess && activeLock) {
      onConfirmSuccess(activeLock);
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLock) return;

    setIsConfirming(true);
    setAuthError(null);

    try {
      let activeToken = getAuthToken(propToken);
      let targetNombre = clienteNombre.trim();
      let targetTelefono = clienteTelefono.trim();

      // If user is a visitor (not admin and not logged in)
      if (!isAdmin && !currentUser) {
        if (authMode === "register") {
          // STEP 1: Registration form submitted -> register user, trigger OTP and switch to OTP step
          if (registrationStep === "form") {
            if (!targetNombre) {
              throw new Error("Ingresa tu Nombre y Apellido para registrarte.");
            }
            if (!authEmail.trim()) {
              throw new Error("Ingresa un correo electrónico válido.");
            }
            if (!authPassword || authPassword.length < 6) {
              throw new Error("La contraseña debe tener al menos 6 caracteres.");
            }

            const regRes = await fetch(`${apiUrl}/auth/register`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
              },
              body: JSON.stringify({
                name: targetNombre,
                email: authEmail.trim(),
                telefono: targetTelefono || undefined,
                password: authPassword,
              }),
            });

            const regData = await regRes.json();
            if (!regRes.ok) {
              throw new Error(regData.message || regData.error || "Error al crear la cuenta.");
            }

            // Save pending registration user & token
            setPendingRegisteredUser({
              token: regData.token,
              user: regData.user,
            });
            setRegistrationStep("otp");
            setOtpCountdown(60);
            setOtpCode("");
            addToast("success", `¡Código de 6 dígitos enviado a ${authEmail.trim()}! Ingrésalo para verificar.`);
            setIsConfirming(false);
            return;
          }

          // STEP 2: In-Modal OTP Verification submitted
          if (registrationStep === "otp") {
            if (otpCode.trim().length !== 6) {
              throw new Error("Ingresa el código de 6 dígitos enviado a tu correo.");
            }

            const verifyRes = await fetch(`${apiUrl}/auth/verify-otp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
              },
              body: JSON.stringify({
                email: authEmail.trim(),
                codigo: otpCode.trim(),
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || "Código de verificación incorrecto o expirado.");
            }

            // OTP verified! Set authenticated user and token
            if (pendingRegisteredUser?.token) {
              activeToken = pendingRegisteredUser.token;
              localStorage.setItem("saas_token", activeToken);
              localStorage.setItem("token", activeToken);
            }
            if (pendingRegisteredUser?.user) {
              const fullUser = {
                ...pendingRegisteredUser.user,
                ...verifyData.user,
              };
              setCurrentUser(fullUser);
              localStorage.setItem("saas_user", JSON.stringify(fullUser));
            }
          }
        } else {
          // Login mode
          if (!authEmail.trim() || !authPassword) {
            throw new Error("Ingresa tu Email y Contraseña.");
          }

          const loginRes = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              ...(subdomain ? { "X-Tenant-ID": subdomain } : {}),
            },
            body: JSON.stringify({
              email: authEmail.trim(),
              password: authPassword,
            }),
          });

          const loginData = await loginRes.json();
          if (!loginRes.ok) {
            throw new Error(loginData.message || loginData.error || "Credenciales incorrectas.");
          }

          activeToken = loginData.token;
          if (activeToken) {
            localStorage.setItem("saas_token", activeToken);
            localStorage.setItem("token", activeToken);
          }
          if (loginData.user) {
            setCurrentUser(loginData.user);
            localStorage.setItem("saas_user", JSON.stringify(loginData.user));
            targetNombre = loginData.user.name || targetNombre;
            targetTelefono = loginData.user.telefono || targetTelefono;
          }
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/turnos/confirmar`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          cancha_id: activeLock.canchaId,
          fecha: activeLock.fecha,
          hora_inicio: activeLock.horaInicio,
          hora_fin: activeLock.horaFin,
          precio: activeLock.precio,
          token_reserva: activeLock.tokenReserva,
          cliente_nombre: targetNombre || undefined,
          cliente_telefono: targetTelefono || undefined,
          metodo_pago: metodoPago,
          aplicar_credito_wallet: useWalletCredit,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Error al confirmar la reserva.");
      }

      const successMsg = isAdmin
        ? `¡Turno de las ${activeLock.horaInicio} hs asignado exitosamente a ${targetNombre || "Cliente Mostrador"}!`
        : `¡Cuenta verificada y reserva confirmada con éxito para el ${activeLock.fecha} de ${activeLock.horaInicio} a ${activeLock.horaFin} hs! Te esperamos.`;

      addToast("success", successMsg);
      if (typeof window !== "undefined") {
        localStorage.removeItem(getLockStorageKey(canchaId));
      }
      if (activeLock) {
        setMyLockedSlots((prev) => {
          const next = { ...prev };
          delete next[`${activeLock.fecha}_${activeLock.horaInicio}`];
          return next;
        });
      }
      setActiveLock(null);
      setIsConfirmModalOpen(false);
      setRegistrationStep("form");
      setOtpCode("");
      if (isAdmin) {
        setClienteNombre("");
        setClienteTelefono("");
      }
      fetchDisponibilidad(fecha);
      fetchWalletBalance();
    } catch (err: any) {
      setAuthError(err.message || "Error al procesar la solicitud.");
      addToast("error", err.message || "Error al confirmar.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSubscribeWaitlist = async (slot: Slot) => {
    try {
      const activeToken = getAuthToken(propToken);
      if (!activeToken && !currentUser) {
        addToast("warning", "Inicia sesión o regístrate para recibir la alerta cuando se libere el turno.");
        setIsConfirmModalOpen(true);
        return;
      }

      setSubscribingSlot(slot.hora_inicio);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/lista-espera`, {
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
      if (!res.ok) {
        throw new Error(data.message || "Error al suscribirse a la lista de espera.");
      }

      setSubscribedWaitlists((prev) => new Set(prev).add(`${fecha}-${slot.hora_inicio}`));
      addToast("success", `¡Listo! Te avisaremos al instante si se libera el turno de las ${slot.hora_inicio} hs.`);
    } catch (err: any) {
      addToast("error", err.message || "Error al suscribirse a la lista de espera.");
    } finally {
      setSubscribingSlot(null);
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
            min={getTodayString()}
            value={fecha}
            onChange={(e) => handleFechaChange(e.target.value)}
            style={{ colorScheme: "dark" }}
            className="bg-slate-900 text-white text-sm font-semibold rounded-xl px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          />
        </div>
      </div>

      {/* Duration Bar: Fixed Badge or Flexible Selector */}
      <div className="pt-4 pb-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isFlexible ? (
          <>
            <div className="text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span>⏱️</span> Elige la duración que deseas jugar:
              </span>
              <span className="text-slate-400 text-[11px]">
                La grilla mostrará los turnos disponibles para ese bloque
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { mins: 60, label: "60 min", sub: "1 hora" },
                { mins: 90, label: "90 min", sub: "1h 30m" },
                { mins: 120, label: "120 min", sub: "2 horas" },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => {
                    setDuracion(opt.mins);
                    setActiveLock(null);
                    fetchDisponibilidad(fecha, opt.mins);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                    duracion === opt.mins
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span>⏱️ {opt.label}</span>
                  <span className={`text-[10px] ${duracion === opt.mins ? "text-emerald-200" : "text-slate-400"}`}>
                    ({opt.sub})
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1.5">
              <span>⏱️</span> Turnos de {duracion} minutos {duracion === 90 ? "(1 hora y media)" : duracion === 120 ? "(2 horas)" : "(1 hora)"}
            </span>
            <span className="text-slate-400 text-[11px]">Duración estándar predeterminada</span>
          </div>
        )}
      </div>

      {/* Admin-Only Anti-Baches Intelligence Callout */}
      {isAdmin && antiBachesInfo && antiBachesInfo.total_horarios_protegidos > 0 && (
        <div
          data-testid="admin-anti-baches-banner"
          className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 animate-in fade-in duration-200"
        >
          <span className="text-xl shrink-0">🛡️</span>
          <div className="space-y-1.5 flex-1">
            <div className="font-bold flex items-center gap-2 text-amber-300">
              <span>Modo Administrador</span> • <span>Regla Anti-Baches en Acción</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                {antiBachesInfo.total_horarios_protegidos} {antiBachesInfo.total_horarios_protegidos === 1 ? "horario protegido" : "horarios protegidos"}
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              El algoritmo inteligente de ocupación ha ocultado de la venta pública {antiBachesInfo.total_horarios_protegidos === 1 ? "este horario" : "estos horarios"} para <strong>evitar que queden huecos huérfanos de 30 minutos invendibles</strong> contra turnos existentes. Los clientes solo ven combinaciones continuas.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {antiBachesInfo.horarios_protegidos.map((p, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-slate-950/80 border border-amber-500/30 px-2.5 py-1 text-[10px] font-mono text-amber-300"
                >
                  🚫 {p.hora_inicio} a {p.hora_fin}: <span className="text-slate-300 font-sans">{p.motivo}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Client-Only Active Lock Banner */}
      {!isAdmin && activeLock && (
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenConfirmation}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition shadow-lg"
              >
                Confirmar Reserva
              </button>
              <button
                onClick={() => activeLock && handleLiberarBloqueo(activeLock)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs font-bold transition flex items-center gap-1.5"
                title="Cancelar y liberar este turno retenido"
              >
                <span>✕</span>
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin-Only Multi-Retained Locks Container (Stacked Vertically) */}
      {isAdmin && allAdminRetainedLocks.length > 0 && (
        <div
          data-testid="admin-retained-locks-container"
          className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-amber-500/40 shadow-xl space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>⏱️</span> Turnos Retenidos en Proceso de Reserva ({allAdminRetainedLocks.length})
              </h3>
              <p className="text-xs text-slate-400">
                Turnos bloqueados temporalmente por usuarios en checkout online o asignación en recepción
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
              Vista Admin • Bloqueos en Tiempo Real
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {allAdminRetainedLocks.map((lock) => {
              const isMyLock = Boolean(lock.is_mine || (activeLock && activeLock.horaInicio === lock.hora_inicio));
              const currentTtl = isMyLock ? remainingSeconds : lock.ttl_segundos;

              return (
                <div
                  key={`${lock.fecha}-${lock.hora_inicio}`}
                  data-testid="admin-retained-lock-item"
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isMyLock
                      ? "bg-emerald-950/50 border-emerald-500/50 shadow-md shadow-emerald-950/40"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        isMyLock
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      <Lock className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-extrabold text-white">
                          ⏰ {lock.hora_inicio} - {lock.hora_fin} hs
                        </span>
                        {isMyLock ? (
                          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            👤 Asignación en Pantalla (Tu Mostrador)
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            🌐 Retenido por Usuario (Checkout Online)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isMyLock
                          ? "Has seleccionado este horario en el panel para asignarlo a un cliente."
                          : "Un usuario está en el paso de checkout completando el pago/datos."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm ${
                        currentTtl < 120
                          ? "bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse"
                          : isMyLock
                          ? "bg-slate-950 border-emerald-500/50 text-emerald-300"
                          : "bg-slate-950 border-amber-500/40 text-amber-300"
                      }`}
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span data-testid={`countdown-timer-${lock.hora_inicio}`}>
                        {formatCountdown(currentTtl)}
                      </span>
                    </div>

                    {isMyLock ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const selectedLock: ActiveLock = {
                              canchaId: lock.cancha_id || canchaId,
                              fecha: lock.fecha,
                              horaInicio: lock.hora_inicio,
                              horaFin: lock.hora_fin,
                              tokenReserva: lock.token_reserva || (activeLock?.tokenReserva || "lock-token"),
                              ttlSeconds: currentTtl,
                              expiresAt: Date.now() + currentTtl * 1000,
                              precio: lock.precio || 0,
                            };
                            setActiveLock(selectedLock);
                            if (typeof window !== "undefined") {
                              localStorage.setItem(getLockStorageKey(lock.cancha_id || canchaId), JSON.stringify(selectedLock));
                            }
                            if (onConfirmSuccess) {
                              onConfirmSuccess(selectedLock);
                            }
                            setIsConfirmModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition shadow flex items-center gap-1"
                        >
                          Confirmar Reserva
                        </button>
                        <button
                          onClick={() => handleLiberarBloqueo(lock)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs font-semibold transition flex items-center gap-1.5"
                          title="Rechazar / Cancelar asignación"
                        >
                          <span>✕</span>
                          <span>Rechazar / Cancelar</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleLiberarBloqueo(lock)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                        title="Forzar liberación del turno retenido"
                      >
                        <span>🔓</span>
                        <span>Forzar Liberación</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of Time Slots (Available only for clients, segmented for admin) */}
      <div className="mt-8">
        {(() => {
          const availableSlots = slots.filter((s) => s.disponible && !isSlotInPast(s.hora_inicio, fecha));
          return (
            <>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {isAdmin
                  ? `Horarios Disponibles para Reservar (${availableSlots.length})`
                  : `Horarios Disponibles (${availableSlots.length} turnos)`}
              </h3>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-800/40 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-800">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium">No hay turnos disponibles para la fecha seleccionada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot) => {
                    const isLockedByMe = activeLock?.horaInicio === slot.hora_inicio;
                    const isLocking = lockingSlot === slot.hora_inicio;

                    let buttonClasses =
                      "relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 ";

                    if (isLockedByMe) {
                      buttonClasses += "bg-emerald-950/80 border-emerald-500 text-white ring-2 ring-emerald-500 shadow-lg";
                    } else {
                      buttonClasses +=
                        "bg-slate-800/60 border-slate-700/80 text-white hover:border-emerald-500/70 hover:bg-slate-800 cursor-pointer hover:shadow-md";
                    }

                    return (
                      <button
                        key={slot.hora_inicio}
                        disabled={isLocking}
                        onClick={() => handleSelectSlot(slot)}
                        className={buttonClasses}
                        aria-label={`Turno ${slot.hora_inicio} a ${slot.hora_fin} Disponible`}
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
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Libre
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex justify-between items-end w-full">
                          <span className="text-xs text-slate-400 font-medium">hasta {slot.hora_fin}</span>
                          <span className="text-xs font-black text-emerald-400">
                            ${slot.precio?.toLocaleString() || precioBase || 0}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Public Waitlist for Occupied Slots */}
              {!isAdmin && slots.some((s) => !s.disponible && !isSlotInPast(s.hora_inicio, fecha)) && (
                <div data-testid="public-waitlist-section" className="mt-8 pt-6 border-t border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔔</span> ¿Buscabas otro horario? Súmate a la Lista de Espera
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Si alguien cancela su reserva, te notificaremos por push al instante para que lo aproveches
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {slots
                      .filter((s) => !s.disponible && !isSlotInPast(s.hora_inicio, fecha))
                      .map((s) => {
                        const isSubscribed = subscribedWaitlists.has(`${fecha}-${s.hora_inicio}`);
                        const isSubscribing = subscribingSlot === s.hora_inicio;

                        return (
                          <div
                            key={s.hora_inicio}
                            data-testid={`waitlist-card-${s.hora_inicio}`}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-bold text-slate-300">
                                ⏰ {s.hora_inicio}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                Ocupado
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={isSubscribed || isSubscribing}
                              onClick={() => handleSubscribeWaitlist(s)}
                              className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                                isSubscribed
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                              }`}
                            >
                              {isSubscribed ? "✓ Notificación Activa" : isSubscribing ? "Guardando..." : "🔔 Avisarme"}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Admin-Only Reserved / Occupied Turnos Section */}
      {isAdmin && (
        <div data-testid="admin-occupied-turnos-section" className="mt-10 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋</span> Turnos Reservados & Ocupados del Día ({turnosOcupados.length})
              </h3>
              <p className="text-xs text-slate-400">
                Información exclusiva del administrador para control de cancha y recepción de jugadores
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-bold">
              Vista Administrador
            </span>
          </div>

          {turnosOcupados.length === 0 ? (
            <div className="text-center py-8 bg-slate-950/50 rounded-2xl border border-slate-800/80">
              <span className="text-2xl block mb-1">✨</span>
              <p className="text-xs text-slate-400 font-medium">
                No hay turnos ocupados registrados en esta cancha para la fecha seleccionada.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {turnosOcupados.map((turno) => (
                <div
                  key={turno.id}
                  data-testid="admin-reserved-card"
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-extrabold text-white bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                        ⏰ {turno.hora_inicio} - {turno.hora_fin}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        {turno.estado || "Ocupado"}
                      </span>
                    </div>

                    <div className="text-xs space-y-2 pt-0.5">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-1">
                        <div className="font-bold text-white flex items-center justify-between gap-1.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-emerald-400 font-bold text-sm">👤</span>
                            <span className="truncate font-extrabold text-white text-[13px] tracking-tight">
                              {turno.cliente_nombre || "Cliente Mostrador"}
                            </span>
                          </span>
                          {turno.es_fijo && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold shrink-0">
                              🔁 Fijo
                            </span>
                          )}
                        </div>

                        {turno.cliente_email && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate px-0.5">
                            <span>✉️</span>
                            <span className="truncate">{turno.cliente_email}</span>
                          </div>
                        )}
                      </div>

                      {turno.cliente_telefono ? (
                        <div className="flex items-center justify-between text-slate-300 text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
                          <span className="truncate font-mono">📱 {turno.cliente_telefono}</span>
                          <a
                            href={`https://wa.me/${turno.cliente_telefono.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline text-[11px] font-bold shrink-0 ml-2"
                          >
                            WhatsApp ↗
                          </a>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-[11px] italic px-1">
                          Sin teléfono registrado
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                        <span>Pago:</span>
                        <span className="text-slate-200 capitalize font-medium">
                          {turno.metodo_pago === "online"
                            ? "💳 Mercado Pago / Online"
                            : turno.metodo_pago === "transferencia"
                            ? "📲 Transferencia"
                            : "💵 Mostrador / Efectivo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      ${turno.precio ? turno.precio.toLocaleString() : "0"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTurnoToCancel(turno)}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <span>✕</span> Liberar Turno
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Confirmación de Cancelación / Liberación de Turno (Admin) */}
      {turnoToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 text-2xl border border-rose-500/20">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Liberar este Turno?</h3>
                <p className="text-xs text-slate-400">El horario volverá a estar disponible para el público</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Horario:</span>
                <span className="font-mono font-bold text-white">{turnoToCancel.hora_inicio} a {turnoToCancel.hora_fin} hs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Titular:</span>
                <span className="font-bold text-slate-200">{turnoToCancel.cliente_nombre || "Cliente Mostrador"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monto:</span>
                <span className="font-bold text-emerald-400">${turnoToCancel.precio?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTurnoToCancel(null)}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isCancelingTurno}
                onClick={handleCancelTurno}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isCancelingTurno ? "Liberando..." : "Sí, Liberar Turno"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Checkout / Confirmación de Turno */}
      {isConfirmModalOpen && activeLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-xl border border-emerald-500/20">
                  {isAdmin ? "🏢" : "🎾"}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isAdmin ? "Asignación de Turno en Mostrador" : "Confirmar Reserva de Turno"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAdmin
                      ? "Asigna este horario al jugador presencial o telefónico"
                      : currentUser
                      ? "Confirma tu cancha con tu cuenta de jugador"
                      : "Inicia sesión o regístrate en 1 paso para confirmar tu cancha"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white transition rounded-lg p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Turno Summary Card with Seña Breakdown & Dev Simulator */}
            {(() => {
              const tarifaTotal = activeLock.precio || 0;
              const porcentajeSena = 50;
              const montoSena = Math.round((tarifaTotal * porcentajeSena) / 100);
              const saldoPendiente = tarifaTotal - montoSena;
              const descuentoWallet = useWalletCredit ? Math.min(walletBalance, montoSena) : 0;
              const montoFinalAPagar = Math.max(0, montoSena - descuentoWallet);

              return (
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Cancha:</span>
                    <span className="font-bold text-white capitalize">
                      {canchaNombre} ({deporte})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Fecha & Horario:</span>
                    <span className="font-bold text-emerald-400">
                      {activeLock.fecha} • {activeLock.horaInicio} a {activeLock.horaFin} hs
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Tarifa total del turno:</span>
                      <span className="font-bold text-slate-300">${tarifaTotal.toLocaleString()}</span>
                    </div>
                    <div data-testid="sena-breakdown" className="flex justify-between items-center text-xs bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <span className="font-bold text-emerald-300">
                        {`💳 Seña Requerida Online (${porcentajeSena}%):`}
                      </span>
                      <span className="font-extrabold text-emerald-400 text-sm">
                        ${montoSena.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-1 text-slate-400">
                      <span>Saldo a pagar en el club:</span>
                      <span className="font-medium text-slate-300">${saldoPendiente.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Wallet Credit Checkbox */}
                  {walletBalance > 0 && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="use-wallet-check"
                          checked={useWalletCredit}
                          onChange={(e) => setUseWalletCredit(e.target.checked)}
                          className="rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                        />
                        <label htmlFor="use-wallet-check" className="text-blue-200 cursor-pointer font-medium">
                          💰 Usar saldo en Billetera Virtual (${walletBalance.toLocaleString()} disponibles)
                        </label>
                      </div>
                      {useWalletCredit && (
                        <span className="font-bold text-emerald-400 font-mono">-${descuentoWallet.toLocaleString()}</span>
                      )}
                    </div>
                  )}

                  {/* DEV Payment Simulator Box */}
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                      <span>🎮 Simulador de Pasarela (Modo Desarrollo)</span>
                      <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                        DEV SANDBOX
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/80">
                      Prueba el flujo de cobro y reserva de turnos con seña sin requerir tarjetas reales.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          setMetodoPago("simulador_dev");
                          handleConfirmReservation(e);
                        }}
                        disabled={isConfirming}
                        className="flex-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow flex items-center justify-center gap-1.5"
                      >
                        💳 Simular Pago Aprobado (${montoFinalAPagar.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addToast("error", "Simulador: Pago rechazado por fondos insuficientes o rechazo bancario.");
                          setAuthError("Pago simulado rechazado por la pasarela de pagos.");
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold transition"
                      >
                        ❌ Simular Rechazo
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                    <span>⏱️ Tiempo restante de retención:</span>
                    <span className="font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {formatCountdown(remainingSeconds)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Error banner */}
            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmReservation} className="space-y-4">
              {/* CASE 1: Admin / Receptionist Walk-in Mode */}
              {isAdmin ? (
                <>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                    <span>ℹ️</span>
                    <span>Modo Recepción: Asignación directa a cliente en el club o por llamada.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nombre y Apellido del Jugador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Mariano Werner"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Teléfono / WhatsApp de Contacto
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. +54 9 11 4567-8901"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Estado / Método de Cobro
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="mostrador">💵 Cobrado en Mostrador / Efectivo</option>
                      <option value="transferencia">📲 Cobrado por Transferencia Bancaria</option>
                      <option value="pendiente">🕒 Pendiente de Pago (Paga al jugar)</option>
                      <option value="online">💳 Cobrado con Tarjeta / Online</option>
                    </select>
                  </div>
                </>
              ) : currentUser ? (
                /* CASE 2: Logged-in Customer */
                <>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>👤</span>
                      <span>
                        Reservando como <strong>{currentUser.name}</strong> ({currentUser.email})
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Teléfono / WhatsApp de Contacto
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. +54 9 11 1234-5678"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="mostrador">💵 Pagar en el Club / Mostrador</option>
                      <option value="transferencia">📲 Transferencia Bancaria</option>
                      <option value="online">💳 Mercado Pago / Tarjeta Online</option>
                    </select>
                  </div>
                </>
              ) : (
                /* CASE 3: Unauthenticated Visitor -> Model A Register or Login */
                <>
                  <div className="flex p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError(null);
                      }}
                      className={`flex-1 py-2 font-bold rounded-xl transition ${
                        authMode === "register"
                          ? "bg-emerald-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ✨ Crear Cuenta Rápida
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError(null);
                      }}
                      className={`flex-1 py-2 font-bold rounded-xl transition ${
                        authMode === "login"
                          ? "bg-emerald-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      🔑 Ya tengo Cuenta
                    </button>
                  </div>

                  {authMode === "register" ? (
                    registrationStep === "otp" ? (
                      /* STEP 2: In-Modal OTP Verification */
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-white">
                            <span>✉️</span> Código de Verificación Enviado
                          </div>
                          <p>
                            Enviamos un código de 6 dígitos a <strong className="text-white">{authEmail}</strong>. Ingrésalo para verificar tu correo y asegurar tu cancha.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-2 text-center">
                            Ingresa el Código de 6 dígitos *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            autoFocus
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full text-center text-2xl font-mono font-black tracking-[0.5em] rounded-2xl bg-slate-950 border border-slate-700 px-4 py-3 text-emerald-400 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                          <button
                            type="button"
                            disabled={otpCountdown > 0 || isResendingOtp}
                            onClick={handleResendOtp}
                            className="text-emerald-400 hover:underline font-bold disabled:text-slate-600 disabled:no-underline"
                          >
                            {isResendingOtp
                              ? "Reenviando..."
                              : otpCountdown > 0
                              ? `Reenviar código en ${otpCountdown}s`
                              : "Reenviar nuevo código"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRegistrationStep("form");
                              setAuthError(null);
                            }}
                            className="text-slate-400 hover:text-white underline font-medium"
                          >
                            ← Editar mis datos
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* STEP 1: Registration Form */
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Nombre y Apellido *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Lucas Martínez"
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Teléfono / WhatsApp *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="Ej. +54 9 11 2345-6789"
                            value={clienteTelefono}
                            onChange={(e) => setClienteTelefono(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="lucas@example.com"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Crear Contraseña (mínimo 6 caracteres) *
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            placeholder="••••••••"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Método de Pago
                          </label>
                          <select
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="mostrador">💵 Pagar en el Club / Mostrador</option>
                            <option value="transferencia">📲 Transferencia Bancaria</option>
                            <option value="online">💳 Mercado Pago / Tarjeta Online</option>
                          </select>
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="tu@email.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Contraseña *
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Método de Pago
                        </label>
                        <select
                          value={metodoPago}
                          onChange={(e) => setMetodoPago(e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="mostrador">💵 Pagar en el Club / Mostrador</option>
                          <option value="transferencia">📲 Transferencia Bancaria</option>
                          <option value="online">💳 Mercado Pago / Tarjeta Online</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setRegistrationStep("form");
                    setOtpCode("");
                    setAuthError(null);
                  }}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    if (activeLock) {
                      handleLiberarBloqueo(activeLock);
                    }
                  }}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 py-2.5 text-xs font-bold transition"
                  title="Cancelar la reserva y liberar el horario inmediatamente"
                >
                  ✕ Liberar Turno
                </button>
                <button
                  type="submit"
                  disabled={isConfirming || (authMode === "register" && registrationStep === "otp" && otpCode.length !== 6)}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isConfirming
                    ? "Procesando..."
                    : isAdmin
                    ? "📝 Asignar en Mostrador"
                    : currentUser
                    ? "✓ Confirmar Turno"
                    : authMode === "register"
                    ? registrationStep === "otp"
                      ? "✓ Verificar & Confirmar"
                      : "✨ Continuar (Paso 1/2)"
                    : "🔑 Ingresar & Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
