"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, X, Lock, DollarSign, User, Calendar, Loader2 } from "lucide-react";
import { useAuth, setCrossDomainCookie } from "@/context/AuthContext";

export interface Slot {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
  precio?: number;
  tarifa_con_luz?: boolean;
  precio_base?: number;
  recargo_luz?: number;
  es_fijo?: boolean;
  duracion_minutos?: number;
  is_mine?: boolean;
  cliente_nombre?: string;
  estado_pago?: string;
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
  porcentajeSena?: number;
  tipoCobroReserva?: string;
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
  tarifaConLuz?: boolean;
  precioBase?: number;
  recargoLuz?: number;
}

export interface ToastMessage {
  id: number;
  type: "error" | "success" | "warning" | "info";
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
  tarifa_con_luz?: boolean;
  precio_base?: number;
  recargo_luz?: number;
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
  estado_pago?: string;
  monto_pagado?: number;
  saldo_pendiente?: number;
  estado: string;
  es_fijo?: boolean;
  cliente_id?: number | null;
  cliente_nombre?: string;
  cliente_email?: string | null;
  cliente_telefono?: string | null;
  cliente_saldo_billetera?: number;
  created_at_local?: number;
  is_mine?: boolean;
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

export const formatFechaDDMMAAAA = (fechaStr?: string): string => {
  if (!fechaStr) return "";
  const parts = fechaStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
  }
  return fechaStr;
};

export const formatWhatsAppNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  let d = digits.startsWith("0") ? digits.slice(1) : digits;
  if (d.length === 10 && /^(11|[23])/.test(d)) {
    d = "549" + d;
  } else if (d.length === 11 && d.startsWith("9")) {
    d = "54" + d;
  } else if (d.length === 12 && d.startsWith("54") && !d.startsWith("549")) {
    d = "549" + d.slice(2);
  }
  return d;
};

export const getPhoneValidationError = (phone: string): string | null => {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (!/^[+0-9\s\-()]+$/.test(trimmed)) {
    return "Solo se permiten números, espacios, guiones, paréntesis y el prefijo '+'.";
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8) {
    return "El teléfono debe contener al menos 8 dígitos numéricos.";
  }
  if (digits.length > 15) {
    return "El teléfono no puede superar los 15 dígitos numéricos (estándar internacional E.164).";
  }
  return null;
};

export const getAuthToken = (explicitToken?: string | null): string | null => {
  if (explicitToken) return explicitToken;
  if (typeof window === "undefined") return null;
  const local =
    localStorage.getItem("saas_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");
  if (local) return local;

  // Fallback to cross-subdomain cookie
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)saas_auth_token=([^;]*)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
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
  porcentajeSena: propPorcentajeSena,
  tipoCobroReserva: propTipoCobroReserva,
}: GrillaHorariaProps) {
  const { setAuthSession: setGlobalAuthSession, user: globalAuthUser } = useAuth();
  const getTodayString = () => getLocalDateString();
  const [fecha, setFecha] = useState<string>(fechaInicial || getTodayString());
  const [duracion, setDuracion] = useState<number>(duracionInicial || (deporte?.toLowerCase() === "padel" ? 90 : 60));
  const [isFlexible, setIsFlexible] = useState<boolean>(Boolean(permiteDuracionFlexible));
  const [antiBachesInfo, setAntiBachesInfo] = useState<AntiBachesInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>(initialSlots || []);
  const [isComplejoCerrado, setIsComplejoCerrado] = useState<boolean>(false);
  const [turnosOcupados, setTurnosOcupados] = useState<TurnoOcupado[]>([]);
  const [turnosRetenidos, setTurnosRetenidos] = useState<RetainedLock[]>([]);
  const [turnoToCancel, setTurnoToCancel] = useState<TurnoOcupado | null>(null);
  const [isCancelingTurno, setIsCancelingTurno] = useState<boolean>(false);
  const [cancelRefundOption, setCancelRefundOption] = useState<"billetera" | "efectivo">("billetera");
  const [cancelClientEmail, setCancelClientEmail] = useState<string>("");
  const [cancelOtpStep, setCancelOtpStep] = useState<"input" | "otp">("input");
  const [cancelOtpCode, setCancelOtpCode] = useState<string>("");
  const [cancelOtpCountdown, setCancelOtpCountdown] = useState<number>(0);
  const [isSendingCancelOtp, setIsSendingCancelOtp] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [clientCancelModalTurno, setClientCancelModalTurno] = useState<TurnoOcupado | null>(null);
  const [isCancelingClientTurno, setIsCancelingClientTurno] = useState<boolean>(false);
  const [clientCancelError, setClientCancelError] = useState<string | null>(null);
  const [clubHorasLimiteCancelacion, setClubHorasLimiteCancelacion] = useState<number>(4);
  const [turnoToPay, setTurnoToPay] = useState<TurnoOcupado | null>(null);
  const [pagoMetodo, setPagoMetodo] = useState<"mostrador" | "transferencia" | "billetera" | "online">("mostrador");
  const [pagoMonto, setPagoMonto] = useState<string>("");
  const [isProcessingPago, setIsProcessingPago] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lockingSlot, setLockingSlot] = useState<string | null>(null);
  const [activeLock, setActiveLock] = useState<ActiveLock | null>(null);
  const [myLockedSlots, setMyLockedSlots] = useState<Record<string, ActiveLock>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const turnosOcupadosRef = useRef<TurnoOcupado[]>([]);
  const hasLoadedInitialRef = useRef<boolean>(false);
  const toastTimersRef = useRef<
    Map<number, { timerId: NodeJS.Timeout | null; remainingMs: number; startTs: number }>
  >(new Map());

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
  const [clienteTelefonoTouched, setClienteTelefonoTouched] = useState<boolean>(false);
  const [clienteEmail, setClienteEmail] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>(isAdmin ? "mostrador" : "online");
  const [modalidadCobro, setModalidadCobro] = useState<"sena" | "total" | "ninguno">(isAdmin ? "total" : "sena");

  // Desk client email validation & OTP states
  const [deskEmailStatus, setDeskEmailStatus] = useState<"idle" | "checking" | "registered" | "unregistered">("idle");
  const [deskRegisteredUser, setDeskRegisteredUser] = useState<{ id: number; name: string; email: string; telefono?: string; saldo_billetera?: number } | null>(null);
  const [deskOtpStep, setDeskOtpStep] = useState<"none" | "prompt" | "otp" | "skipped">("none");
  const [deskOtpCode, setDeskOtpCode] = useState<string>("");
  const [deskOtpCountdown, setDeskOtpCountdown] = useState<number>(0);
  const [isSendingDeskOtp, setIsSendingDeskOtp] = useState<boolean>(false);
  const [isCheckingDeskEmail, setIsCheckingDeskEmail] = useState<boolean>(false);

  const resetDeskForm = () => {
    if (isAdmin) {
      setClienteNombre("");
      setClienteTelefono("");
      setClienteTelefonoTouched(false);
      setClienteEmail("");
      setDeskEmailStatus("idle");
      setDeskRegisteredUser(null);
      setDeskOtpStep("none");
      setDeskOtpCode("");
      setDeskOtpCountdown(0);
      setWalletBalance(0);
      setUseWalletCredit(false);
      setMetodoPago("mostrador");
      setModalidadCobro("total");
    }
  };
  const [clubPorcentajeSena, setClubPorcentajeSena] = useState<number>(propPorcentajeSena ?? 50);
  const [clubTipoCobro, setClubTipoCobro] = useState<string>(propTipoCobroReserva ?? "sena");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletCredit, setUseWalletCredit] = useState<boolean>(false);
  const [subscribedWaitlists, setSubscribedWaitlists] = useState<Set<string>>(new Set());
  const [subscribingSlot, setSubscribingSlot] = useState<string | null>(null);
  const [confirmedTurnos, setConfirmedTurnos] = useState<TurnoOcupado[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(`confirmed_turnos_${canchaId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveConfirmedTurnos = (updater: TurnoOcupado[] | ((prev: TurnoOcupado[]) => TurnoOcupado[])) => {
    setConfirmedTurnos((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`confirmed_turnos_${canchaId}`, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (duracionInicial) {
      setDuracion(duracionInicial);
    }
    if (permiteDuracionFlexible !== undefined) {
      setIsFlexible(permiteDuracionFlexible);
    }
  }, [canchaId, duracionInicial, permiteDuracionFlexible]);

  useEffect(() => {
    if (!isAdmin && (metodoPago === "mostrador" || metodoPago === "pendiente")) {
      setMetodoPago("online");
    }
  }, [isAdmin, metodoPago]);

  useEffect(() => {
    if (propPorcentajeSena !== undefined && typeof propPorcentajeSena === "number") {
      setClubPorcentajeSena(propPorcentajeSena);
    }
    if (propTipoCobroReserva) {
      setClubTipoCobro(propTipoCobroReserva);
    }
  }, [propPorcentajeSena, propTipoCobroReserva]);

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

  const fetchMisSuscripciones = async () => {
    try {
      const token = getAuthToken(propToken);
      if (!token) return;
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;
      const res = await fetch(`${apiUrl}/lista-espera/mis-suscripciones`, { headers });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.suscripciones)) {
          setSubscribedWaitlists((prev) => {
            const next = new Set(prev);
            data.suscripciones.forEach((s: any) => {
              if (!s.notificado) {
                const sFecha = typeof s.fecha === "string" ? s.fecha.substring(0, 10) : "";
                const sHora = (s.hora_inicio || "").substring(0, 5);
                if (sFecha && sHora) {
                  next.add(`${sFecha}-${sHora}`);
                }
              }
            });
            return next;
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const syncClientActiveTurnos = async (userParam?: CurrentUser | null) => {
    const userToSync = userParam || currentUser || (globalAuthUser as CurrentUser | null);
    if (isAdmin || !userToSync) return;
    try {
      const token = getAuthToken(propToken);
      if (!token) return;
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;
      const subParam = subdomain ? `?subdomain=${subdomain}&estado=activos` : `?estado=activos`;
      const res = await fetch(`${apiUrl}/turnos/mis-turnos${subParam}`, { headers });
      if (res && res.ok) {
        const json = await res.json();
        const activeList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        const activeIds = new Set(activeList.map((t: any) => Number(t.id)));

        saveConfirmedTurnos((prev) => {
          const now = Date.now();
          const filteredPrev = prev.filter((t) => {
            const isMine =
              (t.cliente_id !== undefined && t.cliente_id !== null && Number(t.cliente_id) === Number(userToSync.id)) ||
              (t.cliente_email && userToSync.email && t.cliente_email.toLowerCase() === userToSync.email.toLowerCase()) ||
              (!t.cliente_id && !t.cliente_email);
            if (isMine && t.id) {
              const isRecentlyConfirmed = t.created_at_local && (now - t.created_at_local) < 10000;
              if (!isRecentlyConfirmed && !activeIds.has(Number(t.id))) {
                return false;
              }
            }
            return true;
          });

          // Merge active turnos belonging to this court from the server
          const serverCourtTurnos: TurnoOcupado[] = activeList
            .filter((at: any) => Number(at.cancha_id) === Number(canchaId))
            .map((at: any) => ({
              id: at.id,
              cancha_id: at.cancha_id,
              cancha_nombre: canchaNombre,
              fecha: at.fecha,
              hora_inicio: (at.hora_inicio || "").substring(0, 5),
              hora_fin: (at.hora_fin || "").substring(0, 5),
              duracion_minutos: at.duracion_minutos || duracion,
              precio: at.precio ? Number(at.precio) : undefined,
              monto_pagado: at.monto_pagado !== undefined ? Number(at.monto_pagado) : 0,
              saldo_pendiente: at.saldo_pendiente !== undefined ? Number(at.saldo_pendiente) : 0,
              estado: at.estado,
              estado_pago: at.estado_pago,
              metodo_pago: at.metodo_pago,
              cliente_id: userToSync.id,
              cliente_nombre: userToSync.name,
              cliente_email: userToSync.email,
              is_mine: true,
            }));

          const map = new Map<string, TurnoOcupado>();
          serverCourtTurnos.forEach((st) => {
            map.set(`${st.fecha}_${st.hora_inicio}`, st);
          });
          filteredPrev.forEach((pt) => {
            const k = `${pt.fecha}_${pt.hora_inicio}`;
            if (!map.has(k)) {
              map.set(k, pt);
            }
          });

          return Array.from(map.values());
        });
      }
    } catch {
      // ignore
    }
  };

  // Check authenticated user session
  useEffect(() => {
    const token = getAuthToken(propToken);
    if (!token) {
      setCurrentUser(null);
      setWalletBalance(0);
      return;
    }
    if (typeof fetch === "function") {
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
                fetchMisSuscripciones();
                syncClientActiveTurnos(data.user);
                fetchDisponibilidad(fecha, duracion, true);
              } else {
                setCurrentUser(null);
                setWalletBalance(0);
              }
            })
            .catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, [apiUrl, subdomain, isAdmin, propToken]);

  // Sync currentUser with globalAuthUser whenever AuthContext updates
  const prevUserRef = useRef<any>(globalAuthUser);
  useEffect(() => {
    if (globalAuthUser) {
      setCurrentUser(globalAuthUser as CurrentUser);
      if (!isAdmin) {
        setClienteNombre(globalAuthUser.name || "");
        if ((globalAuthUser as any).telefono) {
          setClienteTelefono((globalAuthUser as any).telefono);
        }
      }
      syncClientActiveTurnos(globalAuthUser as CurrentUser);
      fetchDisponibilidad(fecha, duracion, true);
    } else if (prevUserRef.current) {
      setCurrentUser(null);
      setClienteNombre("");
      setClienteTelefono("");
      setWalletBalance(0);
      setConfirmedTurnos([]);
    }
    prevUserRef.current = globalAuthUser;
  }, [globalAuthUser, isAdmin]);

  // Listen to global auth changes (login, register, logout)
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const detail = e?.detail;
      if (!detail?.user) {
        setCurrentUser(null);
        setClienteNombre("");
        setClienteTelefono("");
        setWalletBalance(0);
        setConfirmedTurnos([]);
        setActiveLock(null);
        setMyLockedSlots({});
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(`confirmed_turnos_${canchaId}`);
          } catch {}
        }
        fetchDisponibilidad(fecha, duracion, false);
      } else {
        setCurrentUser(detail.user);
        if (!isAdmin) {
          setClienteNombre(detail.user.name || "");
          if (detail.user.telefono) {
            setClienteTelefono(detail.user.telefono);
          }
        }
        fetchWalletBalance();
        fetchMisSuscripciones();
        syncClientActiveTurnos(detail.user);
        fetchDisponibilidad(fecha, duracion, false);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("saas-auth-changed", handleAuthChange);
      return () => window.removeEventListener("saas-auth-changed", handleAuthChange);
    }
  }, [canchaId, fecha, duracion, isAdmin]);

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

  // Cooldown countdown for cancel modal OTP resend
  useEffect(() => {
    if (cancelOtpCountdown > 0) {
      const timer = setInterval(() => {
        setCancelOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cancelOtpCountdown]);

  // Cooldown countdown for desk OTP resend
  useEffect(() => {
    if (deskOtpCountdown > 0) {
      const timer = setInterval(() => {
        setDeskOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [deskOtpCountdown]);

  const checkDeskEmail = async (emailToCheck: string) => {
    const clean = emailToCheck.trim().toLowerCase();
    if (!clean || !clean.includes("@") || !clean.includes(".")) {
      setDeskEmailStatus("idle");
      setDeskRegisteredUser(null);
      setDeskOtpStep("none");
      return;
    }

    setIsCheckingDeskEmail(true);
    try {
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/clientes/verificar-email?email=${encodeURIComponent(clean)}`, {
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.exists && data.cliente) {
          setDeskEmailStatus("registered");
          setDeskRegisteredUser(data.cliente);
          setDeskOtpStep("none");
          if (!clienteNombre.trim() && data.cliente.name) {
            setClienteNombre(data.cliente.name);
          }
          if (!clienteTelefono.trim() && data.cliente.telefono) {
            setClienteTelefono(data.cliente.telefono);
          }
          if (typeof data.cliente.saldo_billetera === "number") {
            setWalletBalance(data.cliente.saldo_billetera);
          }
        } else {
          setDeskEmailStatus("unregistered");
          setDeskRegisteredUser(null);
          setDeskOtpStep("prompt");
          setWalletBalance(0);
          setUseWalletCredit(false);
        }
      }
    } catch (err) {
      console.error("Error al verificar correo:", err);
    } finally {
      setIsCheckingDeskEmail(false);
    }
  };

  const handleSendDeskOtp = async () => {
    const clean = clienteEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      addToast("error", "Ingresa un correo electrónico válido.");
      return;
    }
    setIsSendingDeskOtp(true);
    try {
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/clientes/enviar-otp`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: clean,
          nombre: clienteNombre.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al enviar código OTP.");
      }
      addToast("success", data.message || `Código OTP enviado exitosamente a ${clean}.`);
      setDeskOtpStep("otp");
      setDeskOtpCountdown(60);
    } catch (err: any) {
      addToast("error", err.message || "No se pudo enviar el código OTP.");
    } finally {
      setIsSendingDeskOtp(false);
    }
  };

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

  const playChime = () => {
    try {
      const AudioCtx =
        typeof window !== "undefined"
          ? window.AudioContext || (window as any).webkitAudioContext
          : null;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1 (E5 / 659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2 (A5 / 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch {
      // AudioContext may be blocked before first user interaction; ignore safely
    }
  };

  const addToast = (
    type: "error" | "success" | "warning" | "info",
    text: string,
    durationMs: number = 10000
  ) => {
    const newToast: ToastMessage = { id: Date.now() + Math.random(), type, text };
    setToasts((prev) => [...prev, newToast]);

    const isVisible = typeof document === "undefined" || document.visibilityState === "visible";
    if (isVisible) {
      const timerId = setTimeout(() => {
        removeToast(newToast.id);
      }, durationMs);
      toastTimersRef.current.set(newToast.id, {
        timerId,
        remainingMs: durationMs,
        startTs: Date.now(),
      });
    } else {
      // Tab is currently hidden/in background: preserve full durationMs and do NOT start timer yet
      toastTimersRef.current.set(newToast.id, {
        timerId: null,
        remainingMs: durationMs,
        startTs: 0,
      });
    }
  };

  const removeToast = (id: number) => {
    const entry = toastTimersRef.current.get(id);
    if (entry && entry.timerId) {
      clearTimeout(entry.timerId);
    }
    toastTimersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch slots availability
  const fetchDisponibilidad = async (
    targetFecha: string,
    targetDuracion: number = duracion,
    silent: boolean = false
  ) => {
    if (initialSlots && targetFecha === fechaInicial && slots.length > 0 && !targetDuracion) return;
    if (!silent) setLoading(true);
    try {
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const durParam = targetDuracion ? `&duracion=${targetDuracion}` : "";
      const timestamp = Date.now();
      const res = await fetch(
        `${apiUrl}/canchas/${canchaId}/disponibilidad?fecha=${targetFecha}${durParam}&_t=${timestamp}`,
        {
          headers,
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("No se pudo obtener la disponibilidad.");
      }

      const data = await res.json();
      setIsComplejoCerrado(Boolean(data.complejo_cerrado || data.data?.complejo_cerrado));
      if (data.permite_duracion_flexible !== undefined) {
        setIsFlexible(Boolean(data.permite_duracion_flexible));
      }
      if (data.optimizacion_anti_baches) {
        setAntiBachesInfo(data.optimizacion_anti_baches);
      }
      if (data.porcentaje_sena !== undefined && !isNaN(Number(data.porcentaje_sena))) {
        setClubPorcentajeSena(Number(data.porcentaje_sena));
      } else if (data.data?.porcentaje_sena !== undefined && !isNaN(Number(data.data.porcentaje_sena))) {
        setClubPorcentajeSena(Number(data.data.porcentaje_sena));
      }
      if (data.tipo_cobro_reserva) {
        setClubTipoCobro(data.tipo_cobro_reserva);
      } else if (data.data?.tipo_cobro_reserva) {
        setClubTipoCobro(data.data.tipo_cobro_reserva);
      }
      if (data.horas_limite_cancelacion !== undefined && !isNaN(Number(data.horas_limite_cancelacion))) {
        setClubHorasLimiteCancelacion(Number(data.horas_limite_cancelacion));
      } else if (data.data?.horas_limite_cancelacion !== undefined && !isNaN(Number(data.data.horas_limite_cancelacion))) {
        setClubHorasLimiteCancelacion(Number(data.data.horas_limite_cancelacion));
      }

      const rawTurnosOcupados = Array.isArray(data.turnos_ocupados)
        ? data.turnos_ocupados
        : Array.isArray(data.data?.turnos_ocupados)
        ? data.data.turnos_ocupados
        : [];
      const incomingTurnos: TurnoOcupado[] = rawTurnosOcupados.map((t: any) => ({
        ...t,
        cancha_id: t.cancha_id || canchaId,
        cancha_nombre: t.cancha_nombre || canchaNombre,
        fecha: t.fecha || targetFecha,
      }));

      // Detect newly booked turnos during silent polling in admin/desk mode and notify
      if (silent && isAdmin && hasLoadedInitialRef.current) {
        const previousIds = new Set(turnosOcupadosRef.current.map((t) => t.id));
        const newlyBooked = incomingTurnos.filter((t) => !previousIds.has(t.id));
        if (newlyBooked.length > 0) {
          playChime();
          newlyBooked.forEach((nt) => {
            addToast(
              "info",
              `🔔 Nueva Reserva: ${nt.cliente_nombre || "Cliente"} en ${canchaNombre} (${nt.hora_inicio} a ${nt.hora_fin} hs)`
            );
          });
        }
      }

      hasLoadedInitialRef.current = true;
      turnosOcupadosRef.current = incomingTurnos;
      setTurnosOcupados(incomingTurnos);

      const occupiedStartTimes = new Set(incomingTurnos.map((t) => t.hora_inicio));

      // Clean up local myLockedSlots for slots that are now occupied in DB
      setMyLockedSlots((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.entries(next).forEach(([k, lock]) => {
          if (lock.fecha === targetFecha && occupiedStartTimes.has(lock.horaInicio)) {
            delete next[k];
            changed = true;
          }
        });
        if (changed) {
          saveMultiLocks(canchaId, next);
          return next;
        }
        return prev;
      });

      // Clear activeLock if it matches an occupied slot
      setActiveLock((curr) => {
        if (curr && curr.fecha === targetFecha && occupiedStartTimes.has(curr.horaInicio)) {
          return null;
        }
        return curr;
      });

      const rawRetenidos = Array.isArray(data.turnos_retenidos)
        ? data.turnos_retenidos
        : Array.isArray(data.data?.turnos_retenidos)
        ? data.data.turnos_retenidos
        : [];
      const filteredRetenidos = rawRetenidos.filter((r: any) => !occupiedStartTimes.has(r.hora_inicio));
      setTurnosRetenidos(filteredRetenidos);
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
          tarifa_con_luz: Boolean(s.tarifa_con_luz),
          precio_base: s.precio_base ? Number(s.precio_base) : undefined,
          recargo_luz: s.recargo_luz ? Number(s.recargo_luz) : undefined,
          duracion_minutos: s.duracion_minutos ? Number(s.duracion_minutos) : undefined,
          es_fijo: Boolean(s.es_fijo),
        }));
        setSlots(formattedSlots);

        const freeStartTimes = new Set(
          formattedSlots
            .filter((s) => s.disponible)
            .map((s) => (s.hora_inicio || "").substring(0, 5))
        );
        const occupiedTurnoMap = new Map<string, number>();
        incomingTurnos.forEach((t) => {
          const h = (t.hora_inicio || "").substring(0, 5);
          if (t.id) occupiedTurnoMap.set(h, Number(t.id));
        });

        saveConfirmedTurnos((prev) => {
          const now = Date.now();
          const next = prev.filter((t) => {
            if (t.fecha !== targetFecha) return true;
            const hora = (t.hora_inicio || "").substring(0, 5);
            const isRecentlyConfirmed = t.created_at_local && (now - t.created_at_local) < 10000;
            if (isRecentlyConfirmed) return true;

            // Si el horario ahora figura como DISPONIBLE/LIBRE en el backend, fue liberado o cancelado
            if (freeStartTimes.has(hora)) return false;

            // Si el horario ahora está ocupado por OTRO turno diferente en el backend
            if (t.id && occupiedTurnoMap.has(hora) && occupiedTurnoMap.get(hora) !== Number(t.id)) {
              return false;
            }

            if (t.estado === "cancelado" || (t as any).estado_pago === "reembolsado") return false;
            return true;
          });
          return next.length !== prev.length ? next : prev;
        });
      } else {
        setSlots([]);
      }
    } catch {
      if (!silent) {
        addToast("error", "Error al cargar la disponibilidad horaria.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openClientCancelModal = (turno: TurnoOcupado) => {
    setClientCancelModalTurno(turno);
    setClientCancelError(null);
  };

  const handleConfirmClientCancel = async () => {
    if (!clientCancelModalTurno) return;
    const targetTurno = clientCancelModalTurno;
    setIsCancelingClientTurno(true);
    setClientCancelError(null);
    try {
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/turnos/${targetTurno.id}/cancelar-cliente`, {
        method: "POST",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Error al cancelar la reserva.");
      }

      // Si hubo reembolso a billetera virtual, actualizar saldo local
      if (data.reembolso_acreditado && data.monto_reembolsado) {
        setWalletBalance((prev) => (prev ?? 0) + Number(data.monto_reembolsado));
      }

      // Remover el turno cancelado de las listas locales
      const targetFecha = targetTurno.fecha || fecha;
      const targetHora = (targetTurno.hora_inicio || "").substring(0, 5);

      const isTargetTurno = (t: TurnoOcupado) =>
        (Boolean(targetTurno.id) && Boolean(t.id) && String(t.id) === String(targetTurno.id)) ||
        (t.fecha === targetFecha && (t.hora_inicio || "").substring(0, 5) === targetHora);

      setConfirmedTurnos((prev) => prev.filter((t) => !isTargetTurno(t)));
      setTurnosOcupados((prev) => prev.filter((t) => !isTargetTurno(t)));

      if (typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem(`confirmed_turnos_${canchaId}`);
          if (stored) {
            const parsed: TurnoOcupado[] = JSON.parse(stored);
            const filtered = parsed.filter((t) => !isTargetTurno(t));
            sessionStorage.setItem(`confirmed_turnos_${canchaId}`, JSON.stringify(filtered));
          }
        } catch {
          // ignore
        }

        try {
          const cancelEventPayload = {
            turnoId: targetTurno.id,
            canchaId,
            fecha: targetFecha,
            horaInicio: targetHora,
            timestamp: Date.now(),
          };
          window.dispatchEvent(new CustomEvent("saas-turno-cancelled", { detail: cancelEventPayload }));
          localStorage.setItem("saas_last_cancelled_turno", JSON.stringify(cancelEventPayload));
        } catch {
          // ignore
        }
      }

      addToast("success", data.message || "Tu turno fue cancelado correctamente.");
      setClientCancelModalTurno(null);
      if (targetFecha !== fecha) {
        setFecha(targetFecha);
      }
      await fetchDisponibilidad(targetFecha, duracion);
    } catch (err: any) {
      setClientCancelError(err.message || "Error al cancelar el turno.");
      addToast("error", err.message || "Error al cancelar el turno.");
    } finally {
      setIsCancelingClientTurno(false);
    }
  };

  const openCancelModal = (turno: TurnoOcupado) => {
    setTurnoToCancel(turno);
    setCancelRefundOption("billetera");
    setCancelClientEmail(turno.cliente_email || "");
    setCancelOtpStep("input");
    setCancelOtpCode("");
    setCancelOtpCountdown(0);
    setCancelError(null);
  };

  const handleSendCancelOtp = async () => {
    if (!cancelClientEmail || !cancelClientEmail.includes("@")) {
      setCancelError("Por favor ingresa un correo electrónico válido.");
      return;
    }
    setIsSendingCancelOtp(true);
    setCancelError(null);
    try {
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/clientes/enviar-otp`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: cancelClientEmail.trim(),
          nombre: turnoToCancel?.cliente_nombre || "Cliente Mostrador",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al enviar el código OTP.");
      }

      if (data.already_verified) {
        addToast("info", "El cliente ya cuenta con usuario verificado en el sistema. Puedes confirmar el reembolso directamente.");
      } else {
        setCancelOtpStep("otp");
        setCancelOtpCountdown(60);
        addToast("success", `¡Código OTP enviado a ${cancelClientEmail.trim()}! Pídeselo al cliente.`);
      }
    } catch (err: any) {
      setCancelError(err.message || "Error al solicitar código OTP.");
      addToast("error", err.message || "Error al solicitar código OTP.");
    } finally {
      setIsSendingCancelOtp(false);
    }
  };

  const handleCancelTurno = async () => {
    if (!turnoToCancel) return;
    const targetTurno = turnoToCancel;
    const montoPagado = Number(targetTurno.monto_pagado || 0);

    if (montoPagado > 0 && cancelRefundOption === "billetera") {
      const emailAUsar = cancelClientEmail.trim() || targetTurno.cliente_email?.trim() || "";
      if (!emailAUsar) {
        setCancelError("Ingresa el correo electrónico del cliente para acreditar el saldo en su billetera virtual.");
        return;
      }
      if (!targetTurno.cliente_email && cancelOtpStep === "input") {
        setCancelError("Para dar de alta al nuevo cliente debes enviar y verificar el código OTP.");
        return;
      }
      if (cancelOtpStep === "otp" && (!cancelOtpCode || cancelOtpCode.trim().length !== 6)) {
        setCancelError("Ingresa el código numérico de 6 dígitos.");
        return;
      }
    }

    try {
      setIsCancelingTurno(true);
      setCancelError(null);
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const bodyPayload = {
        accion_reembolso: montoPagado > 0 ? cancelRefundOption : "ninguno",
        cliente_email: cancelClientEmail.trim() || targetTurno.cliente_email || undefined,
        cliente_nombre: targetTurno.cliente_nombre || undefined,
        cliente_telefono: targetTurno.cliente_telefono || undefined,
        otp_codigo: cancelOtpStep === "otp" ? cancelOtpCode.trim() : undefined,
      };

      const endpoint = montoPagado > 0
        ? `${apiUrl}/clubs/${subdomain || "club"}/turnos/${targetTurno.id}/cancelar`
        : `${apiUrl}/clubs/${subdomain || "club"}/turnos/${targetTurno.id}`;

      const res = await fetch(endpoint, {
        method: montoPagado > 0 ? "POST" : "DELETE",
        headers,
        ...(montoPagado > 0 ? { body: JSON.stringify(bodyPayload) } : {}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Error al cancelar el turno.");
      }

      addToast("success", data.message || `Turno de las ${targetTurno.hora_inicio} hs liberado correctamente.`);
      setTurnoToCancel(null);

      const targetFecha = targetTurno.fecha || fecha;
      const targetHora = (targetTurno.hora_inicio || "").substring(0, 5);

      const isTargetTurno = (t: TurnoOcupado) =>
        (Boolean(targetTurno.id) && Boolean(t.id) && String(t.id) === String(targetTurno.id)) ||
        (t.fecha === targetFecha && (t.hora_inicio || "").substring(0, 5) === targetHora);

      setConfirmedTurnos((prev) => prev.filter((t) => !isTargetTurno(t)));
      setTurnosOcupados((prev) => prev.filter((t) => !isTargetTurno(t)));

      if (typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem(`confirmed_turnos_${canchaId}`);
          if (stored) {
            const parsed: TurnoOcupado[] = JSON.parse(stored);
            const filtered = parsed.filter((t) => !isTargetTurno(t));
            sessionStorage.setItem(`confirmed_turnos_${canchaId}`, JSON.stringify(filtered));
          }
        } catch {
          // ignore
        }

        try {
          const cancelEventPayload = {
            turnoId: targetTurno.id,
            canchaId,
            fecha: targetFecha,
            horaInicio: targetHora,
            timestamp: Date.now(),
          };
          window.dispatchEvent(new CustomEvent("saas-turno-cancelled", { detail: cancelEventPayload }));
          localStorage.setItem("saas_last_cancelled_turno", JSON.stringify(cancelEventPayload));
        } catch {
          // ignore
        }
      }

      fetchDisponibilidad(fecha);
    } catch (err: any) {
      setCancelError(err.message || "Error al liberar el turno.");
      addToast("error", err.message || "Error al liberar el turno.");
    } finally {
      setIsCancelingTurno(false);
    }
  };

  const handleLiberarFechaPuntual = async () => {
    if (!turnoToCancel) return;
    const targetTurno = turnoToCancel;
    try {
      setIsCancelingTurno(true);
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/turnos/${targetTurno.id}/liberar-fecha`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al liberar la fecha puntual.");
      }

      addToast("success", `Fecha puntual del ${targetTurno.fecha} (${targetTurno.hora_inicio} hs) liberada. La recurrencia futura continúa.`);
      setTurnoToCancel(null);
      fetchDisponibilidad(fecha);
    } catch (err: any) {
      addToast("error", err.message || "Error al liberar la fecha puntual.");
    } finally {
      setIsCancelingTurno(false);
    }
  };

  const handleDarDeBajaSerie = async () => {
    if (!turnoToCancel) return;
    const targetTurno = turnoToCancel;
    try {
      setIsCancelingTurno(true);
      const token = getAuthToken(propToken);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      if (subdomain) headers["X-Tenant-ID"] = subdomain;

      const fechaDate = new Date(targetTurno.fecha + "T12:00:00");
      const diaSemana = fechaDate.getDay();

      const res = await fetch(`${apiUrl}/clubs/${subdomain || "club"}/turnos-fijos/serie`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          cancha_id: targetTurno.cancha_id || canchaId,
          dia_semana: diaSemana,
          hora_inicio: targetTurno.hora_inicio,
          cliente_id: targetTurno.cliente_id,
          cliente_nombre: targetTurno.cliente_nombre,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al dar de baja la serie de turnos fijos.");
      }

      addToast("success", `Turno fijo dado de baja definitivamente (${data.turnos_cancelados ?? "todas las"} semanas futuras canceladas).`);
      setTurnoToCancel(null);
      fetchDisponibilidad(fecha);
    } catch (err: any) {
      addToast("error", err.message || "Error al dar de baja la serie.");
    } finally {
      setIsCancelingTurno(false);
    }
  };

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnoToPay) return;
    const targetTurno = turnoToPay;
    const montoCobrado = pagoMonto ? parseFloat(pagoMonto) : (targetTurno.saldo_pendiente ?? targetTurno.precio);
    try {
      setIsProcessingPago(true);
      const token = getAuthToken(propToken);
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al registrar el pago.");
      }

      // Actualización optimista inmediata en la grilla (y en cascada para otros turnos del mismo cliente)
      const nuevoSaldoRestante = Math.max(0, Number(targetTurno.cliente_saldo_billetera || 0) - montoCobrado);
      setTurnosOcupados((prev) =>
        prev.map((t) => {
          if (t.id === targetTurno.id) {
            return {
              ...t,
              estado_pago: data.estado_pago || "pagado",
              estado: "pagado",
              monto_pagado: data.monto_pagado !== undefined ? data.monto_pagado : targetTurno.precio,
              saldo_pendiente: data.saldo_pendiente !== undefined ? data.saldo_pendiente : 0,
              metodo_pago: pagoMetodo,
              cliente_saldo_billetera: pagoMetodo === "billetera" ? nuevoSaldoRestante : t.cliente_saldo_billetera,
            };
          }
          if (pagoMetodo === "billetera" && t.cliente_id && t.cliente_id === targetTurno.cliente_id) {
            return { ...t, cliente_saldo_billetera: nuevoSaldoRestante };
          }
          return t;
        })
      );

      addToast("success", `¡Pago registrado exitosamente con ${pagoMetodo.toUpperCase()}!`);
      setTurnoToPay(null);
      setPagoMonto("");
      await fetchDisponibilidad(fecha);
      fetchWalletBalance();
    } catch (err: any) {
      addToast("error", err.message || "Error al registrar el pago.");
    } finally {
      setIsProcessingPago(false);
    }
  };

  const getLockStorageKey = (cid: number) => `active_lock_${subdomain || "club"}_${cid}`;
  const getMultiLocksStorageKey = (cid: number) => `multi_locks_${subdomain || "club"}_${cid}`;

  const getSavedMultiLocks = (cid: number): Record<string, ActiveLock> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(getMultiLocksStorageKey(cid));
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const now = Date.now();
      const valid: Record<string, ActiveLock> = {};
      Object.entries(parsed).forEach(([k, v]: [string, any]) => {
        if (v && v.expiresAt > now) {
          valid[k] = v;
        }
      });
      return valid;
    } catch {
      return {};
    }
  };

  const saveMultiLocks = (cid: number, locks: Record<string, ActiveLock>) => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const valid: Record<string, ActiveLock> = {};
    Object.entries(locks).forEach(([k, v]) => {
      if (v && v.expiresAt > now) {
        valid[k] = v;
      }
    });
    localStorage.setItem(getMultiLocksStorageKey(cid), JSON.stringify(valid));
  };

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

      const targetKey = `${lockFecha}_${horaInicio}`;
      setMyLockedSlots((prev) => {
        const next = { ...prev };
        delete next[targetKey];
        saveMultiLocks(targetCanchaId, next);
        return next;
      });

      if (activeLock && activeLock.horaInicio === horaInicio && (activeLock.canchaId === targetCanchaId || !activeLock.canchaId)) {
        setActiveLock(null);
        resetDeskForm();
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

  // Restore active locks for this court and date from localStorage if still valid
  useEffect(() => {
    if (typeof window === "undefined") return;
    const validLocks = getSavedMultiLocks(canchaId);
    setMyLockedSlots(validLocks);
    const locksForDate = Object.values(validLocks).filter(
      (l) => l.fecha === fecha && l.expiresAt > Date.now()
    );
    if (locksForDate.length > 0) {
      const latest = locksForDate[locksForDate.length - 1];
      setActiveLock(latest);
      setRemainingSeconds(Math.max(0, Math.floor((latest.expiresAt - Date.now()) / 1000)));
    } else {
      setActiveLock(null);
      setRemainingSeconds(0);
    }
  }, [canchaId, fecha, subdomain]);

  useEffect(() => {
    if (!initialSlots || fecha !== fechaInicial) {
      fetchDisponibilidad(fecha, duracion);
    }
  }, [fecha, canchaId, duracion]);

  // Smart background polling and window focus revalidation (SWR pattern)
  useEffect(() => {
    const POLL_INTERVAL = 30000; // 30 seconds
    const intervalId = setInterval(() => {
      fetchDisponibilidad(fecha, duracion, true);
      syncClientActiveTurnos();
    }, POLL_INTERVAL);

    const onWindowFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchDisponibilidad(fecha, duracion, true);
        syncClientActiveTurnos();
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onWindowFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onWindowFocus);
    };
  }, [fecha, canchaId, duracion]);

  // Revalidate availability immediately when a turno is cancelled anywhere in this or other tabs
  useEffect(() => {
    const handleRemoteCancel = (e: any) => {
      let cancelledCanchaId: number | null = null;
      let cancelledFecha: string | null = null;
      let cancelledTurnoId: number | null = null;
      let cancelledHoraInicio: string | null = null;

      if (e?.type === "saas-turno-cancelled" && e.detail) {
        cancelledCanchaId = e.detail.canchaId;
        cancelledFecha = e.detail.fecha;
        cancelledTurnoId = e.detail.turnoId;
        cancelledHoraInicio = e.detail.horaInicio;
      } else if (e?.type === "storage" && e.key === "saas_last_cancelled_turno" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          cancelledCanchaId = parsed.canchaId;
          cancelledFecha = parsed.fecha;
          cancelledTurnoId = parsed.turnoId;
          cancelledHoraInicio = parsed.horaInicio;
        } catch {}
      }

      if (!cancelledCanchaId || cancelledCanchaId === canchaId) {
        if (!cancelledFecha || cancelledFecha === fecha) {
          if (cancelledTurnoId || cancelledHoraInicio) {
            const isCancelled = (t: TurnoOcupado) =>
              (cancelledTurnoId && String(t.id) === String(cancelledTurnoId)) ||
              (cancelledHoraInicio && t.fecha === (cancelledFecha || fecha) && (t.hora_inicio || "").substring(0, 5) === cancelledHoraInicio.substring(0, 5));

            setConfirmedTurnos((prev) => prev.filter((t) => !isCancelled(t)));
            setTurnosOcupados((prev) => prev.filter((t) => !isCancelled(t)));

            if (typeof window !== "undefined") {
              try {
                const stored = sessionStorage.getItem(`confirmed_turnos_${canchaId}`);
                if (stored) {
                  const parsed: TurnoOcupado[] = JSON.parse(stored);
                  sessionStorage.setItem(`confirmed_turnos_${canchaId}`, JSON.stringify(parsed.filter((t) => !isCancelled(t))));
                }
              } catch {}
            }
          }
          fetchDisponibilidad(fecha, duracion, true);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("saas-turno-cancelled", handleRemoteCancel);
      window.addEventListener("storage", handleRemoteCancel);
      return () => {
        window.removeEventListener("saas-turno-cancelled", handleRemoteCancel);
        window.removeEventListener("storage", handleRemoteCancel);
      };
    }
  }, [canchaId, fecha, duracion]);

  // Smart Visibility Toast Manager: Pauses countdown when tab is hidden, resumes when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;
      const isVisible = document.visibilityState === "visible";
      const now = Date.now();

      if (isVisible) {
        // Resume countdown for all paused toasts with their remainingMs
        toastTimersRef.current.forEach((entry, id) => {
          if (!entry.timerId && entry.remainingMs > 0) {
            const timerId = setTimeout(() => {
              removeToast(id);
            }, entry.remainingMs);
            entry.timerId = timerId;
            entry.startTs = now;
          }
        });
      } else {
        // Pause all running toast timers and preserve remaining time
        toastTimersRef.current.forEach((entry) => {
          if (entry.timerId) {
            clearTimeout(entry.timerId);
            entry.timerId = null;
            if (entry.startTs > 0) {
              const elapsed = now - entry.startTs;
              entry.remainingMs = Math.max(1000, entry.remainingMs - elapsed);
              entry.startTs = 0;
            }
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      toastTimersRef.current.forEach((entry) => {
        if (entry.timerId) clearTimeout(entry.timerId);
      });
      toastTimersRef.current.clear();
    };
  }, []);

  // Master visual countdown timer for all active and retained locks
  useEffect(() => {
    const hasActiveLock = Boolean(activeLock);
    const hasRetained = turnosRetenidos.length > 0;
    const hasMyLocks = Object.keys(myLockedSlots).length > 0;

    if (!hasActiveLock && !hasRetained && !hasMyLocks) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRemainingSeconds(0);
      return;
    }

    const updateTimers = () => {
      const now = Date.now();

      // 1. Decrement activeLock remaining seconds
      if (activeLock) {
        const secondsLeft = Math.max(0, Math.floor((activeLock.expiresAt - now) / 1000));
        setRemainingSeconds(secondsLeft);
        if (secondsLeft <= 0) {
          setActiveLock(null);
          addToast("warning", "El tiempo de retención del turno ha expirado. Selecciona el turno nuevamente.");
          fetchDisponibilidad(fecha, duracion);
        }
      }

      // 2. Decrement myLockedSlots and remove expired only when changed
      setMyLockedSlots((prev) => {
        let changed = false;
        const updated: Record<string, ActiveLock> = {};
        Object.entries(prev).forEach(([k, lock]) => {
          if (lock.expiresAt > now) {
            updated[k] = lock;
          } else {
            changed = true;
          }
        });
        if (changed) {
          saveMultiLocks(canchaId, updated);
          return updated;
        }
        return prev;
      });

      // 3. Decrement all retained locks
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
  }, [activeLock?.horaInicio, turnosRetenidos.length, Object.keys(myLockedSlots).length, fecha, duracion]);

  const allAdminRetainedLocks: RetainedLock[] = useMemo(() => {
    const map = new Map<string, RetainedLock>();
    const now = Date.now();
    const occupiedTimes = new Set([
      ...turnosOcupados.map((t) => (t.hora_inicio || "").substring(0, 5)),
      ...confirmedTurnos.filter((t) => t.fecha === fecha).map((t) => (t.hora_inicio || "").substring(0, 5)),
    ]);

    // 1. Add server retained locks for this court/date
    turnosRetenidos.forEach((r) => {
      const hora = (r.hora_inicio || "").substring(0, 5);
      if (occupiedTimes.has(hora)) return;
      const myLock = myLockedSlots[`${r.fecha}_${r.hora_inicio}`] || (activeLock && activeLock.horaInicio === r.hora_inicio ? activeLock : null);
      const isMine = Boolean(myLock);
      const effectiveTtl = myLock
        ? Math.max(0, Math.floor((myLock.expiresAt - now) / 1000))
        : r.ttl_segundos;

      map.set(hora, {
        ...r,
        hora_inicio: hora,
        ttl_segundos: effectiveTtl,
        token_reserva: r.token_reserva || myLock?.tokenReserva,
        is_mine: isMine,
      });
    });

    // 2. Add local myLockedSlots for this date (in case server response is pending or offline)
    Object.values(myLockedSlots).forEach((ml) => {
      const hora = (ml.horaInicio || "").substring(0, 5);
      if (ml.fecha === fecha && ml.expiresAt > now && !occupiedTimes.has(hora)) {
        const ttl = Math.max(0, Math.floor((ml.expiresAt - now) / 1000));
        const existing = map.get(hora);
        map.set(hora, {
          ...existing,
          cancha_id: ml.canchaId,
          cancha_nombre: canchaNombre,
          fecha: ml.fecha,
          hora_inicio: hora,
          hora_fin: (ml.horaFin || "").substring(0, 5),
          duracion_minutos: ml.duracionMinutos || duracion,
          precio: ml.precio,
          tarifa_con_luz: ml.tarifaConLuz ?? existing?.tarifa_con_luz,
          precio_base: ml.precioBase ?? existing?.precio_base,
          recargo_luz: ml.recargoLuz ?? existing?.recargo_luz,
          token_reserva: ml.tokenReserva,
          is_mine: true,
          ttl_segundos: ttl,
        });
      }
    });

    // 3. Add activeLock if not already in map
    if (activeLock && activeLock.fecha === fecha && activeLock.expiresAt > now) {
      const hora = (activeLock.horaInicio || "").substring(0, 5);
      if (!occupiedTimes.has(hora)) {
        const ttl = Math.max(0, Math.floor((activeLock.expiresAt - now) / 1000));
        const existing = map.get(hora);
        map.set(hora, {
          ...existing,
          cancha_id: activeLock.canchaId,
          cancha_nombre: canchaNombre,
          fecha: activeLock.fecha,
          hora_inicio: hora,
          hora_fin: (activeLock.horaFin || "").substring(0, 5),
          duracion_minutos: activeLock.duracionMinutos || duracion,
          precio: activeLock.precio,
          tarifa_con_luz: activeLock.tarifaConLuz ?? existing?.tarifa_con_luz,
          precio_base: activeLock.precioBase ?? existing?.precio_base,
          recargo_luz: activeLock.recargoLuz ?? existing?.recargo_luz,
          token_reserva: activeLock.tokenReserva,
          is_mine: true,
          ttl_segundos: ttl,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [turnosRetenidos, turnosOcupados, confirmedTurnos, activeLock, myLockedSlots, remainingSeconds, canchaNombre, fecha, duracion]);

  const visibleRetainedLocks = useMemo(() => {
    return isAdmin
      ? allAdminRetainedLocks
      : allAdminRetainedLocks.filter((l) => l.is_mine);
  }, [isAdmin, allAdminRetainedLocks]);

  const clientConfirmedTurnos = useMemo(() => {
    if (isAdmin) return [];
    const list: TurnoOcupado[] = [];
    const seen = new Set<string>();

    const freeStartTimes = new Set(
      slots.filter((s) => s.disponible).map((s) => (s.hora_inicio || "").substring(0, 5))
    );
    const occupiedTurnoMap = new Map<string, number>();
    turnosOcupados.forEach((t) => {
      const h = (t.hora_inicio || "").substring(0, 5);
      if (t.id) occupiedTurnoMap.set(h, Number(t.id));
    });

    const now = Date.now();

    // 1. Locally confirmed turnos in this session
    confirmedTurnos.forEach((t) => {
      const hora = (t.hora_inicio || "").substring(0, 5);
      const tFecha = t.fecha || fecha;
      if (tFecha === fecha && !seen.has(hora)) {
        const isRecentlyConfirmed = t.created_at_local && (now - t.created_at_local) < 10000;
        if (!isRecentlyConfirmed) {
          if (freeStartTimes.has(hora)) return;
          if (t.id && occupiedTurnoMap.has(hora) && occupiedTurnoMap.get(hora) !== Number(t.id)) return;
        }

        if (t.estado === "cancelado" || (t as any).estado_pago === "reembolsado") return;

        if (currentUser) {
          const matches =
            (t as any).is_mine ||
            !t.cliente_id ||
            Number(t.cliente_id) === Number(currentUser.id) ||
            (t.cliente_email && t.cliente_email.toLowerCase() === currentUser.email.toLowerCase());
          if (matches) {
            seen.add(hora);
            list.push({ ...t, fecha: tFecha, hora_inicio: hora, is_mine: true });
          }
        } else {
          // If logged out / guest, ONLY show reservations made as an unauthenticated guest
          if (!t.cliente_id) {
            seen.add(hora);
            list.push({ ...t, fecha: tFecha, hora_inicio: hora });
          }
        }
      }
    });

    // 2. Turnos in turnosOcupados matching currentUser or is_mine (ONLY when user is authenticated!)
    if (currentUser) {
      turnosOcupados.forEach((t) => {
        const hora = (t.hora_inicio || "").substring(0, 5);
        const tFecha = t.fecha || fecha;
        if (tFecha === fecha && !seen.has(hora)) {
          if (t.estado === "cancelado" || (t as any).estado_pago === "reembolsado") return;
          const isMine =
            (t as any).is_mine ||
            (t.cliente_id && Number(t.cliente_id) === Number(currentUser.id)) ||
            (t.cliente_email && currentUser.email && t.cliente_email.toLowerCase() === currentUser.email.toLowerCase());
          if (isMine) {
            seen.add(hora);
            list.push({ ...t, fecha: tFecha, hora_inicio: hora, is_mine: true });
          }
        }
      });
    }

    return list.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  }, [isAdmin, confirmedTurnos, turnosOcupados, slots, currentUser, fecha]);

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

    resetDeskForm();
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
        tarifaConLuz: Boolean(slot.tarifa_con_luz),
        precioBase: slot.precio_base,
        recargoLuz: slot.recargo_luz,
      };

      setActiveLock(newLock);
      setRemainingSeconds(ttl);
      setMyLockedSlots((prev) => {
        const updated = {
          ...prev,
          [`${fecha}_${slot.hora_inicio}`]: newLock,
        };
        saveMultiLocks(canchaId, updated);
        return updated;
      });

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
    resetDeskForm();
    if (!isAdmin) {
      setMetodoPago("online");
      setModalidadCobro("sena");
    }
    setIsConfirmModalOpen(true);
  };

  const handleConfirmReservation = async (e: React.FormEvent, overrideMetodoPago?: string) => {
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
            if (!targetTelefono) {
              setClienteTelefonoTouched(true);
              throw new Error("Ingresa tu número de WhatsApp para registrarte.");
            }
            const phoneErr = getPhoneValidationError(targetTelefono);
            if (phoneErr) {
              setClienteTelefonoTouched(true);
              throw new Error(phoneErr);
            }
            if (!authEmail.trim()) {
              throw new Error("Ingresa tu correo electrónico.");
            }
            if (!authPassword || authPassword.length < 6) {
              throw new Error("La contraseña debe tener al menos 6 caracteres.");
            }

            const regHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              Accept: "application/json",
            };
            if (subdomain) regHeaders["X-Tenant-ID"] = subdomain;

            const regRes = await fetch(`${apiUrl}/auth/register`, {
              method: "POST",
              headers: regHeaders,
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

          // STEP 2: OTP verification step -> verify code and finalize reservation
          if (registrationStep === "otp") {
            if (!otpCode || otpCode.trim().length !== 6) {
              throw new Error("Ingresa el código numérico de 6 dígitos que recibiste en tu email.");
            }

            const verifyHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              Accept: "application/json",
            };
            if (subdomain) verifyHeaders["X-Tenant-ID"] = subdomain;

            const verifyRes = await fetch(`${apiUrl}/auth/verify-otp`, {
              method: "POST",
              headers: verifyHeaders,
              body: JSON.stringify({
                email: authEmail.trim(),
                codigo: otpCode.trim(),
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.message || verifyData.error || "Código de verificación inválido o expirado.");
            }

            // Successfully verified: store token & user
            const validToken = verifyData.token || pendingRegisteredUser?.token;
            const validUser = verifyData.user || pendingRegisteredUser?.user;
            if (validToken) {
              localStorage.setItem("saas_token", validToken);
              localStorage.setItem("token", validToken);
              setCrossDomainCookie("saas_auth_token", validToken);
              activeToken = validToken;
            }
            if (validUser) {
              localStorage.setItem("saas_user", JSON.stringify(validUser));
              setCurrentUser(validUser);
              targetNombre = validUser.name;
              targetTelefono = validUser.telefono || targetTelefono;
              if (validToken && setGlobalAuthSession) {
                setGlobalAuthSession(validUser as any, validToken);
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("saas-auth-changed", { detail: { user: validUser, token: validToken } })
                );
              }
            }
          }
        } else {
          // Login existing user
          if (!authEmail.trim() || !authPassword) {
            throw new Error("Ingresa tu email y contraseña para continuar.");
          }

          const loginHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
          };
          if (subdomain) loginHeaders["X-Tenant-ID"] = subdomain;

          const loginRes = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: loginHeaders,
            body: JSON.stringify({
              email: authEmail.trim(),
              password: authPassword,
            }),
          });

          const loginData = await loginRes.json();
          if (!loginRes.ok) {
            throw new Error(loginData.message || loginData.error || "Credenciales incorrectas.");
          }

          const loggedToken = loginData.token;
          const loggedUser = loginData.user;
          if (loggedToken) {
            localStorage.setItem("saas_token", loggedToken);
            localStorage.setItem("token", loggedToken);
            setCrossDomainCookie("saas_auth_token", loggedToken);
            activeToken = loggedToken;
          }
          if (loggedUser) {
            localStorage.setItem("saas_user", JSON.stringify(loggedUser));
            setCurrentUser(loggedUser);
            targetNombre = loggedUser.name;
            targetTelefono = loggedUser.telefono || targetTelefono;
            if (loggedToken && setGlobalAuthSession) {
              setGlobalAuthSession(loggedUser as any, loggedToken);
            }
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("saas-auth-changed", { detail: { user: loggedUser, token: loggedToken } })
              );
            }
          }
        }
      }

      // Desk booking email verification & OTP check
      if (isAdmin && clienteEmail.trim()) {
        const clean = clienteEmail.trim().toLowerCase();
        if (deskEmailStatus === "idle") {
          setIsCheckingDeskEmail(true);
          try {
            const token = getAuthToken(propToken);
            const chkHeaders: Record<string, string> = {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };
            if (subdomain) chkHeaders["X-Tenant-ID"] = subdomain;

            const chkRes = await fetch(
              `${apiUrl}/clubs/${subdomain || "club"}/clientes/verificar-email?email=${encodeURIComponent(clean)}`,
              { headers: chkHeaders }
            );
            const chkData = await chkRes.json();
            if (chkRes.ok && chkData.success) {
              if (chkData.exists && chkData.cliente) {
                setDeskEmailStatus("registered");
                setDeskRegisteredUser(chkData.cliente);
                if (typeof chkData.cliente.saldo_billetera === "number") {
                  setWalletBalance(chkData.cliente.saldo_billetera);
                }
              } else {
                setDeskEmailStatus("unregistered");
                setDeskRegisteredUser(null);
                setDeskOtpStep("prompt");
                setIsConfirming(false);
                return;
              }
            }
          } catch (err) {
            console.error("Error al verificar correo:", err);
          } finally {
            setIsCheckingDeskEmail(false);
          }
        } else if (deskEmailStatus === "unregistered" && deskOtpStep === "prompt") {
          setAuthError("El correo no está registrado. Selecciona si deseas registrarlo con código OTP o continuar sin cuenta.");
          setIsConfirming(false);
          return;
        } else if (deskOtpStep === "otp" && deskOtpCode.trim().length !== 6) {
          setAuthError("Debes ingresar el código OTP de 6 dígitos enviado al cliente para crear su cuenta o cancelar el registro.");
          setIsConfirming(false);
          return;
        }
      }

      // Execute final booking confirmation
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
          cliente_email: isAdmin ? (clienteEmail.trim() || undefined) : (authEmail.trim() || currentUser?.email || undefined),
          codigo_otp: (isAdmin && deskOtpStep === "otp" && deskOtpCode.trim().length === 6) ? deskOtpCode.trim() : undefined,
          metodo_pago: overrideMetodoPago || (modalidadCobro === "ninguno" ? "pendiente" : metodoPago),
          aplicar_credito_wallet: useWalletCredit,
          modalidad_pago: modalidadCobro,
          pago_completo: modalidadCobro === "total",
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

      if (data.turno) {
        const confirmedItem: TurnoOcupado = {
          id: data.turno.id,
          cancha_id: data.turno.cancha_id,
          fecha: data.turno.fecha,
          hora_inicio: typeof data.turno.hora_inicio === "string" ? data.turno.hora_inicio.substring(0, 5) : activeLock.horaInicio,
          hora_fin: typeof data.turno.hora_fin === "string" ? data.turno.hora_fin.substring(0, 5) : activeLock.horaFin,
          precio: Number(data.turno.precio),
          monto_pagado: Number(data.turno.monto_pagado || 0),
          saldo_pendiente: Number(data.turno.saldo_pendiente || 0),
          estado_pago: data.turno.estado_pago || (modalidadCobro === "ninguno" ? "pendiente" : modalidadCobro === "total" ? "pagado_total" : "senado"),
          metodo_pago: data.turno.metodo_pago || overrideMetodoPago || (modalidadCobro === "ninguno" ? "pendiente" : metodoPago),
          estado: "reservado",
          cliente_id: data.turno.cliente_id || (currentUser ? currentUser.id : undefined),
          cliente_email: data.turno.cliente_email || (currentUser ? currentUser.email : undefined),
          cliente_nombre: targetNombre,
          cliente_telefono: targetTelefono,
          created_at_local: Date.now(),
        };
        saveConfirmedTurnos((prev) => [confirmedItem, ...prev.filter((t) => t.hora_inicio !== confirmedItem.hora_inicio)]);
      }

      if (activeLock) {
        const targetHora = (activeLock.horaInicio || "").substring(0, 5);
        const targetFecha = activeLock.fecha;
        setTurnosRetenidos((prev) => prev.filter((r) => (r.hora_inicio || "").substring(0, 5) !== targetHora));
        setMyLockedSlots((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (next[k]?.fecha === targetFecha && (next[k]?.horaInicio || "").substring(0, 5) === targetHora) {
              delete next[k];
            }
          });
          delete next[`${targetFecha}_${activeLock.horaInicio}`];
          delete next[`${targetFecha}_${targetHora}`];
          saveMultiLocks(canchaId, next);
          return next;
        });
      }
      setActiveLock(null);
      setIsConfirmModalOpen(false);
      setRegistrationStep("form");
      setOtpCode("");
      resetDeskForm();
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

  const handleUnsubscribeWaitlist = async (slot: Slot) => {
    try {
      const activeToken = getAuthToken(propToken);
      if (!activeToken && !currentUser) {
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
        method: "DELETE",
        headers,
        body: JSON.stringify({
          cancha_id: canchaId,
          fecha,
          hora_inicio: slot.hora_inicio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al desuscribirse de la lista de espera.");
      }

      setSubscribedWaitlists((prev) => {
        const next = new Set(prev);
        next.delete(`${fecha}-${slot.hora_inicio}`);
        return next;
      });
      addToast("info", `Desactivaste el aviso para el turno de las ${slot.hora_inicio} hs.`);
    } catch (err: any) {
      addToast("error", err.message || "Error al desuscribirse de la lista de espera.");
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
                : toast.type === "info"
                ? "bg-sky-950/95 border-sky-500/60 text-sky-200 shadow-sky-900/40 animate-in fade-in slide-in-from-top-2"
                : "bg-amber-950/90 border-amber-500/50 text-amber-200"
            }`}
          >
            {toast.type === "error" && <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {toast.type === "info" && <span className="text-base shrink-0 select-none">🔔</span>}
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

      {/* Unified Retained Locks Container (Stacked Vertically) */}
      {visibleRetainedLocks.length > 0 && (
        <div
          data-testid="active-lock-banner"
          className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-amber-500/40 shadow-xl space-y-3"
        >
          {isAdmin ? (
            <div
              data-testid="admin-retained-locks-container"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80"
            >
              <div>
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <span>⏱️</span> Turnos Retenidos en Proceso de Reserva ({visibleRetainedLocks.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Turnos bloqueados temporalmente por usuarios en checkout online o asignación en recepción
                </p>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                Vista Admin • Bloqueos en Tiempo Real
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <span>⏱️</span> Tus Turnos Retenidos ({visibleRetainedLocks.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Turnos reservados temporalmente en tu pantalla para completar checkout
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {visibleRetainedLocks.map((lock) => {
              const isMyLock = Boolean(lock.is_mine || (activeLock && activeLock.horaInicio === lock.hora_inicio));
              const currentTtl = lock.ttl_segundos;

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
                      <span
                        data-testid={isMyLock && activeLock?.horaInicio === lock.hora_inicio ? "countdown-timer" : `countdown-timer-${lock.hora_inicio}`}
                      >
                        {formatCountdown(currentTtl)}
                      </span>
                    </div>

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
                            tarifaConLuz: Boolean(lock.tarifa_con_luz ?? activeLock?.tarifaConLuz),
                            precioBase: lock.precio_base ?? activeLock?.precioBase,
                            recargoLuz: lock.recargo_luz ?? activeLock?.recargoLuz,
                          };
                          setActiveLock(selectedLock);
                          if (onConfirmSuccess) {
                            onConfirmSuccess(selectedLock);
                          }
                          resetDeskForm();
                          setIsConfirmModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition shadow flex items-center gap-1"
                      >
                        Confirmar Reserva
                      </button>
                      <button
                        onClick={() => handleLiberarBloqueo(lock)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs font-semibold transition flex items-center gap-1.5"
                        title={isMyLock ? "Rechazar / Cancelar asignación" : "Forzar liberación inmediata"}
                      >
                        <span>✕</span>
                        <span>{isMyLock ? "Cancelar" : "Forzar Liberación"}</span>
                      </button>
                    </div>
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
          const availableSlots = slots.filter(
            (s) =>
              s.disponible &&
              !isSlotInPast(s.hora_inicio, fecha) &&
              !clientConfirmedTurnos.some(
                (ct) => (ct.hora_inicio || "").substring(0, 5) === (s.hora_inicio || "").substring(0, 5)
              )
          );

          // In client view, combine available slots and occupied slots into the unified grid
          const occupiedMap = new Map<string, Slot>();
          turnosOcupados.forEach((t) => {
            const hInicio = (t.hora_inicio || "").substring(0, 5);
            const hFin = (t.hora_fin || "").substring(0, 5);
            if (hInicio && !isSlotInPast(hInicio, fecha) && !availableSlots.some((a) => (a.hora_inicio || "").substring(0, 5) === hInicio)) {
              const isMine =
                Boolean((t as any).is_mine) ||
                Boolean(currentUser && (
                  (t.cliente_id && Number(t.cliente_id) === Number(currentUser.id)) ||
                  (t.cliente_email && currentUser.email && t.cliente_email.toLowerCase() === currentUser.email.toLowerCase())
                ));
              occupiedMap.set(hInicio, {
                hora_inicio: hInicio,
                hora_fin: hFin,
                disponible: false,
                precio: t.precio ? Number(t.precio) : undefined,
                duracion_minutos: t.duracion_minutos,
                is_mine: isMine,
                cliente_nombre: t.cliente_nombre,
                estado_pago: (t as any).estado_pago || t.estado,
              });
            }
          });

          // Also merge clientConfirmedTurnos so anything in clientConfirmedTurnos is represented in occupiedMap as is_mine: true
          clientConfirmedTurnos.forEach((ct) => {
            const hInicio = (ct.hora_inicio || "").substring(0, 5);
            const hFin = (ct.hora_fin || "").substring(0, 5);
            if (hInicio && !isSlotInPast(hInicio, fecha)) {
              const existing = occupiedMap.get(hInicio);
              occupiedMap.set(hInicio, {
                hora_inicio: hInicio,
                hora_fin: hFin || existing?.hora_fin || "",
                disponible: false,
                precio: ct.precio ? Number(ct.precio) : existing?.precio,
                duracion_minutos: ct.duracion_minutos || existing?.duracion_minutos,
                is_mine: true,
                cliente_nombre: ct.cliente_nombre || existing?.cliente_nombre,
                estado_pago: (ct as any).estado_pago || ct.estado || existing?.estado_pago,
              });
            }
          });

          slots
            .filter((s) => !s.disponible && !isSlotInPast(s.hora_inicio, fecha))
            .forEach((s) => {
              const hInicio = (s.hora_inicio || "").substring(0, 5);
              if (hInicio && !availableSlots.some((a) => (a.hora_inicio || "").substring(0, 5) === hInicio)) {
                if (!occupiedMap.has(hInicio)) {
                  occupiedMap.set(hInicio, {
                    hora_inicio: hInicio,
                    hora_fin: (s.hora_fin || "").substring(0, 5),
                    disponible: false,
                    precio: s.precio ? Number(s.precio) : undefined,
                    duracion_minutos: s.duracion_minutos,
                  });
                }
              }
            });

          const displaySlots: Slot[] = isAdmin
            ? availableSlots
            : [
                ...availableSlots,
                ...Array.from(occupiedMap.values()),
              ].sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));

          const hasOccupied = !isAdmin && displaySlots.some((s) => !s.disponible && !s.is_mine);

          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {isAdmin
                    ? `Horarios Disponibles para Reservar (${availableSlots.length})`
                    : `Turnos del Día (${displaySlots.length} horarios • ${availableSlots.length} disponibles)`}
                </h3>
                {hasOccupied && (
                  <span
                    data-testid="public-waitlist-section"
                    className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20"
                  >
                    <span>🔔</span> ¿Buscabas otro horario? Súmate a la <strong>Lista de Espera</strong>
                  </span>
                )}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 bg-slate-800/40 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : isComplejoCerrado ? (
                <div className="text-center py-12 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Clock className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <p className="text-amber-300 font-bold">Complejo cerrado este día</p>
                  <p className="text-slate-400 text-sm mt-1">El club no cuenta con horarios de atención habilitados para la fecha seleccionada.</p>
                </div>
              ) : displaySlots.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-800">
                  <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium">No hay turnos disponibles para la fecha seleccionada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {displaySlots.map((slot) => {
                    if (slot.disponible) {
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
                              <div className="flex items-center gap-1">
                                {slot.tarifa_con_luz && (
                                  <span
                                    title="Tarifa con luz artificial incluida"
                                    className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5"
                                  >
                                    💡 Con Luz
                                  </span>
                                )}
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Libre
                                </span>
                              </div>
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
                    }

                    // Client's own reservation tile
                    if (slot.is_mine) {
                      const isPagado =
                        slot.estado_pago === "pagado" ||
                        slot.estado_pago === "pagado_total" ||
                        slot.estado_pago === "completado";
                      const isSenado =
                        !isPagado &&
                        (slot.estado_pago === "senado" || slot.estado_pago === "sena_pagada");

                      return (
                        <div
                          key={slot.hora_inicio}
                          data-testid={`client-own-slot-${slot.hora_inicio}`}
                          className="relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40 text-white shadow-sm"
                          aria-label={`Turno ${slot.hora_inicio} a ${slot.hora_fin} Tu Reserva`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="font-mono text-lg font-extrabold tracking-tight text-white">
                              {slot.hora_inicio}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Tu Reserva</span>
                            </span>
                          </div>

                          <div className="mt-3 flex justify-between items-end w-full">
                            <span className="text-xs text-slate-400 font-medium">hasta {slot.hora_fin}</span>
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              {isPagado ? "✓ 100% Abonado" : isSenado ? "✓ Seña Abonada" : "✓ Confirmado"}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Occupied Slot Tile (Same grid, identical dimensions, elegant dark styling)
                    const isSubscribed = subscribedWaitlists.has(`${fecha}-${slot.hora_inicio}`);
                    const isSubscribing = subscribingSlot === slot.hora_inicio;

                    return (
                      <div
                        key={slot.hora_inicio}
                        data-testid={`waitlist-card-${slot.hora_inicio}`}
                        className="relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all duration-200 bg-slate-900/80 border-slate-800/90 text-slate-400"
                        aria-label={`Turno ${slot.hora_inicio} a ${slot.hora_fin} Ocupado`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-mono text-lg font-extrabold tracking-tight text-slate-400">
                            {slot.hora_inicio}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-rose-400/90 border border-rose-500/20">
                            Ocupado
                          </span>
                        </div>

                        <div className="mt-3 flex justify-between items-center w-full gap-1.5">
                          <span className="text-xs text-slate-500 font-medium">hasta {slot.hora_fin}</span>
                          <button
                            type="button"
                            disabled={isSubscribing}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSubscribed) {
                                handleUnsubscribeWaitlist(slot);
                              } else {
                                handleSubscribeWaitlist(slot);
                              }
                            }}
                            className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              isSubscribed
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 cursor-pointer"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer shadow-sm"
                            }`}
                            title={isSubscribed ? "Clic para desactivar aviso" : "Avisarme si se libera"}
                          >
                            {isSubscribed ? (
                              <>
                                <span>✓</span> Notificación Activa
                              </>
                            ) : isSubscribing ? (
                              "Guardando..."
                            ) : (
                              <>
                                <span>🔔</span> Avisarme
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Client's Confirmed Reservations Section */}
      {!isAdmin && clientConfirmedTurnos.length > 0 && (
        <div data-testid="client-confirmed-turnos-section" className="mt-10 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span>🎉</span> Tus Reservas Confirmadas ({clientConfirmedTurnos.length})
              </h3>
              <p className="text-xs text-slate-400">
                Detalle de tus turnos reservados para el día {fecha}. ¡Te esperamos en el club!
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Reserva Exitosa</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientConfirmedTurnos.map((turno) => {
              const isPagado =
                (turno.estado_pago === "pagado" ||
                  turno.estado_pago === "pagado_total" ||
                  turno.estado === "pagado" ||
                  turno.estado === "completado") &&
                (turno.saldo_pendiente === undefined || turno.saldo_pendiente <= 0) &&
                (turno.monto_pagado || 0) > 0;

              const isSenado =
                !isPagado &&
                (turno.estado_pago === "senado" ||
                  turno.estado_pago === "sena_pagada" ||
                  ((turno.monto_pagado || 0) > 0 && (turno.saldo_pendiente || 0) > 0));

              return (
                <div
                  key={`client-res-${turno.id || turno.hora_inicio}`}
                  data-testid="client-reserved-card"
                  className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 shadow-lg shadow-emerald-950/30 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-extrabold text-white bg-slate-900 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                        ⏰ {turno.hora_inicio} - {turno.hora_fin} hs
                      </span>
                      {isPagado ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>100% Abonado</span>
                        </span>
                      ) : isSenado ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-blue-400" />
                          <span>Seña Abonada</span>
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Pago Pendiente</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Titular: <strong className="text-white">{turno.cliente_nombre || currentUser?.name || "Jugador"}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cancha: <strong className="text-slate-200">{canchaNombre}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Abonado Online</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          ${(turno.monto_pagado || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Saldo en Club</span>
                        <span className="font-mono font-bold text-slate-200 text-xs">
                          ${(turno.saldo_pendiente !== undefined ? turno.saldo_pendiente : Math.max(0, (turno.precio || 0) - (turno.monto_pagado || 0))).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Total: <strong className="text-white">${(turno.precio || 0).toLocaleString()}</strong></span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-medium">✓ Cancha confirmada</span>
                      {turno.id && (
                        <button
                          type="button"
                          data-testid={`client-cancel-btn-${turno.id}`}
                          onClick={() => openClientCancelModal(turno)}
                          className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span>✕</span> Cancelar Turno
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              {turnosOcupados.map((turno) => {
                const isFixed = Boolean(turno.es_fijo);
                const isPagado =
                  (turno.estado_pago === "pagado" ||
                    turno.estado_pago === "pagado_total" ||
                    turno.estado === "pagado" ||
                    turno.estado === "completado") &&
                  (turno.saldo_pendiente === undefined || turno.saldo_pendiente <= 0) &&
                  (turno.monto_pagado || 0) > 0;

                const isSenado =
                  !isPagado &&
                  (turno.estado_pago === "senado" ||
                    turno.estado_pago === "sena_pagada" ||
                    ((turno.monto_pagado || 0) > 0 && (turno.saldo_pendiente || 0) > 0));

                return (
                  <div
                    key={turno.id}
                    data-testid="admin-reserved-card"
                    className={`p-4 rounded-2xl transition flex flex-col justify-between gap-3 shadow-sm ${
                      isFixed
                        ? "bg-amber-950/20 border border-amber-500/40 ring-1 ring-amber-500/20 hover:border-amber-400"
                        : "bg-slate-950 border border-slate-800/90 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-extrabold text-white bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                          ⏰ {turno.hora_inicio} - {turno.hora_fin}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isFixed && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1">
                              <span>🔁</span> Fijo
                            </span>
                          )}
                          <span
                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                              isPagado
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : isSenado
                                ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {isPagado ? "✓ Pagado" : isSenado ? "💳 Seña Pagada" : "⏳ Pendiente"}
                          </span>
                        </div>
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

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>Método:</span>
                          <span className="text-slate-200 capitalize font-medium">
                            {turno.metodo_pago === "online"
                              ? "💳 Online"
                              : turno.metodo_pago === "transferencia"
                              ? "📲 Transferencia"
                              : turno.metodo_pago === "billetera"
                              ? "👛 Billetera"
                              : "💵 Mostrador"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          ${turno.precio ? turno.precio.toLocaleString() : "0"}
                        </span>
                        {isSenado && turno.saldo_pendiente !== undefined && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            Resta: ${turno.saldo_pendiente.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!isPagado && (
                          <button
                            type="button"
                            onClick={() => {
                              setTurnoToPay(turno);
                              setPagoMetodo("mostrador");
                              setPagoMonto(
                                turno.saldo_pendiente !== undefined && turno.saldo_pendiente > 0
                                  ? String(turno.saldo_pendiente)
                                  : turno.precio
                                  ? String(turno.precio)
                                  : ""
                              );
                              const targetUserId = turno.cliente_id;
                              const targetEmail = turno.cliente_email;
                              if (targetUserId || targetEmail) {
                                const token = getAuthToken(propToken);
                                const queryParam = targetUserId ? `user_id=${targetUserId}` : `email=${encodeURIComponent(targetEmail || "")}`;
                                fetch(`${apiUrl}/wallet/saldo?subdomain=${subdomain || "club"}&${queryParam}`, {
                                  headers: {
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                    Accept: "application/json",
                                  },
                                })
                                  .then((r) => r.json())
                                  .then((res) => {
                                    if (res.success && typeof res.saldo === "number") {
                                      setTurnoToPay((curr) => (curr && curr.id === turno.id ? { ...curr, cliente_saldo_billetera: res.saldo } : curr));
                                      setTurnosOcupados((prev) =>
                                        prev.map((t) => (
                                          (targetUserId && t.cliente_id === targetUserId) ||
                                          (targetEmail && t.cliente_email === targetEmail)
                                            ? { ...t, cliente_saldo_billetera: res.saldo }
                                            : t
                                        ))
                                      );
                                    }
                                  })
                                  .catch(() => {});
                              }
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <span>💵</span> {isSenado ? "Cobrar Saldo" : "Cobrar"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openCancelModal(turno)}
                          className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <span>✕</span> Liberar Turno
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Confirmación de Cancelación de Turno por el Cliente */}
      {clientCancelModalTurno && (() => {
        const now = new Date();
        const [y, m, d] = (clientCancelModalTurno.fecha || fecha).split("-").map(Number);
        const [hh, mm] = (clientCancelModalTurno.hora_inicio || "00:00").split(":").map(Number);
        const slotStart = new Date(y, m - 1, d, hh, mm);
        const diffMs = slotStart.getTime() - now.getTime();
        const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
        const dentroDeTiempo = diffHours >= clubHorasLimiteCancelacion;
        const montoPagado = Number(clientCancelModalTurno.monto_pagado || 0);

        return (
          <div
            data-testid="client-cancel-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl border bg-rose-500/10 text-rose-400 border-rose-500/20">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Cancelar tu Reserva?</h3>
                  <p className="text-xs text-slate-400">
                    {canchaNombre} • {formatFechaDDMMAAAA(clientCancelModalTurno.fecha || fecha)}
                  </p>
                </div>
              </div>

              {/* Detalle del Turno */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Horario:</span>
                  <span className="font-mono font-bold text-white">
                    {clientCancelModalTurno.hora_inicio} a {clientCancelModalTurno.hora_fin} hs
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Titular:</span>
                  <span className="font-semibold text-slate-200">
                    {clientCancelModalTurno.cliente_nombre || currentUser?.name || "Jugador"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Abonado Online:</span>
                  <span className={`font-mono font-bold ${montoPagado > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                    ${montoPagado.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Explicación de Políticas y Billetera Virtual */}
              {montoPagado > 0 ? (
                dentroDeTiempo ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-1.5 text-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <span>✓</span>
                      <span>Reembolso 100% en Billetera Virtual</span>
                    </div>
                    <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                      Faltan aproximadamente <strong>{diffHours} horas</strong> para el inicio de tu turno (política del club: mínimo {clubHorasLimiteCancelacion} hs). Se acreditarán <strong>${montoPagado.toLocaleString()}</strong> de forma inmediata en tu Billetera Virtual de este club.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-1.5 text-amber-200">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <span>⚠️</span>
                      <span>Cancelación fuera de término</span>
                    </div>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Faltan menos de {clubHorasLimiteCancelacion} horas para el turno. Por política de cancelaciones tardías del club, la seña abonada de <strong>${montoPagado.toLocaleString()}</strong> no es reembolsable y quedará retenida en concepto de penalidad.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300">
                  <p className="text-[11px] leading-relaxed">
                    No habías abonado una seña previa para este turno. El turno se cancelará y el horario quedará liberado para otros jugadores.
                  </p>
                </div>
              )}

              {clientCancelError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                  {clientCancelError}
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isCancelingClientTurno}
                  onClick={() => setClientCancelModalTurno(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="button"
                  data-testid="confirm-client-cancel-btn"
                  disabled={isCancelingClientTurno}
                  onClick={handleConfirmClientCancel}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-900/30 cursor-pointer disabled:opacity-50"
                >
                  {isCancelingClientTurno ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelando...</span>
                    </>
                  ) : (
                    <span>Confirmar Cancelación</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Confirmación de Cancelación / Liberación de Turno (Admin) */}
      {turnoToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl border ${
                turnoToCancel.es_fijo
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                {turnoToCancel.es_fijo ? "🔁" : "⚠️"}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {turnoToCancel.es_fijo ? "Gestión de Turno Fijo" : "¿Liberar este Turno?"}
                </h3>
                <p className="text-xs text-slate-400">
                  {turnoToCancel.es_fijo
                    ? "Elige si deseas liberar sólo la fecha puntual o dar de baja la serie completa"
                    : "El horario volverá a estar disponible para el público"}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha y Horario:</span>
                <span className="font-mono font-bold text-white">{turnoToCancel.fecha} ({turnoToCancel.hora_inicio} a {turnoToCancel.hora_fin} hs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Titular:</span>
                <span className="font-bold text-slate-200">{turnoToCancel.cliente_nombre || "Cliente Mostrador"}</span>
              </div>
              {turnoToCancel.cliente_email && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-300">{turnoToCancel.cliente_email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Monto Abonado:</span>
                <span className={`font-bold ${Number(turnoToCancel.monto_pagado || 0) > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                  ${Number(turnoToCancel.monto_pagado || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo de Reserva:</span>
                <span className={`font-bold ${turnoToCancel.es_fijo ? "text-amber-400" : "text-slate-300"}`}>
                  {turnoToCancel.es_fijo ? "🔁 Turno Fijo Recurrente" : "Turno Ocasional"}
                </span>
              </div>
            </div>

            {/* Gestión de Reembolso si el turno tiene dinero abonado */}
            {Number(turnoToCancel.monto_pagado || 0) > 0 && !turnoToCancel.es_fijo && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span>💰</span>
                  <span>Gestión del Reembolso (${Number(turnoToCancel.monto_pagado || 0).toLocaleString()})</span>
                </div>

                {/* Selector Billetera vs Devolución en Efectivo */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCancelRefundOption("billetera")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      cancelRefundOption === "billetera"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>💼</span>
                      <span>Billetera Virtual</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Crédito a favor en el club
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCancelRefundOption("efectivo")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      cancelRefundOption === "efectivo"
                        ? "bg-amber-500/10 border-amber-500 text-amber-300 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>💵</span>
                      <span>Devolver en Caja</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Devolución física en efectivo
                    </p>
                  </button>
                </div>

                {/* Detalle Billetera Virtual */}
                {cancelRefundOption === "billetera" && (
                  <div className="space-y-2.5 pt-1">
                    {turnoToCancel.cliente_email ? (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>
                          El saldo se acreditará automáticamente en la cuenta de <strong>{turnoToCancel.cliente_email}</strong>.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                          ⚠️ Cliente sin cuenta registrada. Para conservar el crédito, ingresa su correo y valida el código OTP de 6 dígitos que recibirá.
                        </div>

                        {cancelOtpStep === "input" ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Correo Electrónico del Cliente *
                              </label>
                              <input
                                type="email"
                                placeholder="ejemplo@gmail.com"
                                value={cancelClientEmail}
                                onChange={(e) => setCancelClientEmail(e.target.value)}
                                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={isSendingCancelOtp || !cancelClientEmail.includes("@")}
                              onClick={handleSendCancelOtp}
                              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {isSendingCancelOtp ? "Enviando código..." : "✉️ Enviar Código OTP al Cliente"}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Código enviado a:</span>
                              <span className="font-mono font-bold text-emerald-400">{cancelClientEmail}</span>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Código de 6 dígitos (OTP)
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                placeholder="123456"
                                value={cancelOtpCode}
                                onChange={(e) => setCancelOtpCode(e.target.value.replace(/\D/g, ""))}
                                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-center tracking-[0.3em] font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-400">
                              <button
                                type="button"
                                onClick={() => setCancelOtpStep("input")}
                                className="text-slate-400 hover:text-white underline"
                              >
                                Cambiar correo
                              </button>
                              <button
                                type="button"
                                disabled={cancelOtpCountdown > 0 || isSendingCancelOtp}
                                onClick={handleSendCancelOtp}
                                className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                              >
                                {cancelOtpCountdown > 0 ? `Reenviar en ${cancelOtpCountdown}s` : "Reenviar código"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Detalle Devolución Efectivo */}
                {cancelRefundOption === "efectivo" && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                    <span>💵</span>
                    <span>
                      Recuerda entregar <strong>${Number(turnoToCancel.monto_pagado || 0).toLocaleString()}</strong> en mano al cliente desde la caja.
                    </span>
                  </div>
                )}

                {cancelError && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{cancelError}</span>
                  </div>
                )}
              </div>
            )}

            {turnoToCancel.es_fijo ? (
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={isCancelingTurno}
                  onClick={handleLiberarFechaPuntual}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 px-3 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>🗓️</span> {isCancelingTurno ? "Liberando..." : "Liberar SOLO esta fecha puntual"}
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Conserva el turno fijo del cliente para todas las semanas siguientes.
                </p>

                <div className="border-t border-slate-800 my-2"></div>

                <button
                  type="button"
                  disabled={isCancelingTurno}
                  onClick={handleDarDeBajaSerie}
                  className="w-full rounded-xl bg-rose-600/90 hover:bg-rose-500 py-2.5 px-3 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>🚫</span> {isCancelingTurno ? "Cancelando..." : "Dar de BAJA Turno Fijo Definitivamente"}
                </button>
                <p className="text-[11px] text-rose-300/80 text-center">
                  Cancela todas las semanas futuras de este horario.
                </p>

                <button
                  type="button"
                  onClick={() => setTurnoToCancel(null)}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-slate-300 transition mt-1"
                >
                  Volver sin cambios
                </button>
              </div>
            ) : (
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
                  disabled={
                    isCancelingTurno ||
                    (Number(turnoToCancel.monto_pagado || 0) > 0 &&
                      cancelRefundOption === "billetera" &&
                      !turnoToCancel.cliente_email &&
                      cancelOtpStep !== "otp")
                  }
                  onClick={handleCancelTurno}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                    Number(turnoToCancel.monto_pagado || 0) > 0 && cancelRefundOption === "billetera"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                      : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
                  }`}
                >
                  {isCancelingTurno
                    ? "Procesando..."
                    : Number(turnoToCancel.monto_pagado || 0) > 0
                    ? cancelRefundOption === "billetera"
                      ? turnoToCancel.cliente_email
                        ? "Acreditar en Billetera"
                        : "✓ Verificar OTP y Acreditar"
                      : "Liberar con Devolución Efectivo"
                    : "Sí, Liberar Turno"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Registrar Pago de Turno (Admin) */}
      {turnoToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-xl border border-emerald-500/20">
                  💵
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Cobro de Turno</h3>
                  <p className="text-xs text-slate-400">{turnoToPay.fecha} • {turnoToPay.hora_inicio} a {turnoToPay.hora_fin} hs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTurnoToPay(null)}
                className="text-slate-400 hover:text-white transition rounded-lg p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegistrarPago} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Titular:</span>
                  <span className="font-bold text-white">{turnoToPay.cliente_nombre || "Cliente Mostrador"}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Precio Acordado:</span>
                  <span className="font-bold text-slate-200 font-mono">${turnoToPay.precio?.toLocaleString()}</span>
                </div>
                {turnoToPay.monto_pagado !== undefined && turnoToPay.monto_pagado > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Seña Ya Pagada:</span>
                    <span className="font-bold font-mono">-${turnoToPay.monto_pagado.toLocaleString()}</span>
                  </div>
                )}
                {turnoToPay.saldo_pendiente !== undefined && turnoToPay.saldo_pendiente > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800/80 pt-1">
                    <span>Saldo Restante a Cobrar:</span>
                    <span className="font-mono">${turnoToPay.saldo_pendiente.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "mostrador", label: "💵 Efectivo / Mostrador" },
                    { id: "transferencia", label: "📲 Transferencia" },
                    ...(Number(turnoToPay.cliente_saldo_billetera || 0) > 0
                      ? [
                          {
                            id: "billetera",
                            label: `👛 Billetera Virtual ($${Number(turnoToPay.cliente_saldo_billetera).toLocaleString()} disp.)`,
                          },
                        ]
                      : []),
                    { id: "online", label: "💳 Online / Tarjeta" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPagoMetodo(m.id as any);
                        const saldoPend = turnoToPay.saldo_pendiente !== undefined && turnoToPay.saldo_pendiente > 0
                          ? turnoToPay.saldo_pendiente
                          : turnoToPay.precio || 0;
                        if (m.id === "billetera") {
                          const saldoDisp = Number(turnoToPay.cliente_saldo_billetera || 0);
                          setPagoMonto(String(Math.min(saldoPend, saldoDisp)));
                        } else if (pagoMetodo === "billetera") {
                          setPagoMonto(String(saldoPend));
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left font-bold transition text-xs ${
                        pagoMetodo === m.id
                          ? "bg-emerald-500/20 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Monto a Cobrar ($):
                </label>
                <input
                  type="number"
                  value={pagoMonto}
                  onChange={(e) => setPagoMonto(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  placeholder={String(turnoToPay.saldo_pendiente !== undefined && turnoToPay.saldo_pendiente > 0 ? turnoToPay.saldo_pendiente : turnoToPay.precio || 0)}
                  min="0"
                  step="100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTurnoToPay(null)}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPago}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessingPago ? "Procesando..." : "✓ Confirmar Cobro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Checkout / Confirmación de Turno */}
      {isConfirmModalOpen && activeLock && (() => {
        const tarifaTotal = activeLock.precio || 0;
        const porcentajeSena = clubPorcentajeSena || 50;
        const montoSena = Math.round((tarifaTotal * porcentajeSena) / 100);
        const esSoloTotal = clubTipoCobro === "total" || clubTipoCobro === "pago_total";
        const modalidadEfectiva: "ninguno" | "sena" | "total" = isAdmin
          ? modalidadCobro
          : esSoloTotal
          ? "total"
          : (modalidadCobro as "sena" | "total");

        const montoBaseACobrar = modalidadEfectiva === "ninguno"
          ? 0
          : modalidadEfectiva === "total"
          ? tarifaTotal
          : montoSena;
        const saldoPendiente = Math.max(0, tarifaTotal - montoBaseACobrar);
        const descuentoWallet = useWalletCredit ? Math.min(walletBalance, montoBaseACobrar) : 0;
        const montoFinalAPagar = Math.max(0, montoBaseACobrar - descuentoWallet);

        return (
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
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    resetDeskForm();
                  }}
                  className="text-slate-400 hover:text-white transition rounded-lg p-1 text-base font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Turno Summary Card with Seña Breakdown */}
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

                  {/* Selector ¿Cuánto se cobra ahora? */}
                  {isAdmin ? (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <label className="block text-xs font-bold text-slate-300">
                        ¿Cuánto se cobra ahora en mostrador?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setModalidadCobro("ninguno");
                            setMetodoPago("pendiente");
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            modalidadCobro === "ninguno"
                              ? "bg-amber-500/15 border-amber-500 text-white shadow ring-1 ring-amber-500/50"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold">🕒 Sin cobro</span>
                            {modalidadCobro === "ninguno" && (
                              <span className="text-amber-400 text-xs font-black">✓</span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-amber-400 mt-1">
                            $0
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Paga al jugar
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalidadCobro("sena");
                            if (metodoPago === "pendiente") setMetodoPago("mostrador");
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            modalidadCobro === "sena"
                              ? "bg-emerald-500/15 border-emerald-500 text-white shadow ring-1 ring-emerald-500/50"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold">💳 Seña ({porcentajeSena}%)</span>
                            {modalidadCobro === "sena" && (
                              <span className="text-emerald-400 text-xs font-black">✓</span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-emerald-400 mt-1">
                            ${montoSena.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Resta ${(tarifaTotal - montoSena).toLocaleString()}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalidadCobro("total");
                            if (metodoPago === "pendiente") setMetodoPago("mostrador");
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            modalidadCobro === "total"
                              ? "bg-emerald-500/15 border-emerald-500 text-white shadow ring-1 ring-emerald-500/50"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] font-bold">🎉 Total (100%)</span>
                            {modalidadCobro === "total" && (
                              <span className="text-emerald-400 text-xs font-black">✓</span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-emerald-400 mt-1">
                            ${tarifaTotal.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-emerald-300/80 mt-0.5">
                            100% saldado
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Selector para clientes públicos (2 columnas: Seña vs Total) */
                    !esSoloTotal && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-2">
                        <label className="block text-xs font-bold text-slate-300">
                          ¿Cuánto deseas abonar ahora?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setModalidadCobro("sena")}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                              modalidadEfectiva === "sena"
                                ? "bg-emerald-500/15 border-emerald-500 text-white shadow ring-1 ring-emerald-500/50"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] font-bold">💳 Seña ({porcentajeSena}%)</span>
                              {modalidadEfectiva === "sena" && (
                                <span className="text-emerald-400 text-xs font-black">✓</span>
                              )}
                            </div>
                            <div className="text-sm font-extrabold text-emerald-400 mt-1">
                              ${montoSena.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              Restan ${(tarifaTotal - montoSena).toLocaleString()} en el club
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalidadCobro("total")}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                              modalidadEfectiva === "total"
                                ? "bg-emerald-500/15 border-emerald-500 text-white shadow ring-1 ring-emerald-500/50"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] font-bold">🎉 Total (100%)</span>
                              {modalidadEfectiva === "total" && (
                                <span className="text-emerald-400 text-xs font-black">✓</span>
                              )}
                            </div>
                            <div className="text-sm font-extrabold text-emerald-400 mt-1">
                              ${tarifaTotal.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-emerald-300/80 mt-0.5">
                              Turno 100% saldado
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    {activeLock.tarifaConLuz && (
                      <div
                        data-testid="nocturnal-tariff-banner"
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300"
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          <span>💡</span> Tarifa Nocturna (Luz artificial incluida)
                        </span>
                        <span className="font-mono font-extrabold text-amber-200">
                          ${tarifaTotal.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        {activeLock.tarifaConLuz ? "Tarifa total del turno (con luz):" : "Tarifa total del turno:"}
                      </span>
                      <span className="font-bold text-slate-300">${tarifaTotal.toLocaleString()}</span>
                    </div>
                    <div data-testid="sena-breakdown" className="flex justify-between items-center text-xs bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <span className="font-bold text-emerald-300">
                        {modalidadEfectiva === "ninguno"
                          ? "🕒 Cobro ahora en mostrador:"
                          : modalidadEfectiva === "total"
                          ? "🎉 Pago Total (100%):"
                          : `💳 Seña a Cobrar (${porcentajeSena}%):`}
                      </span>
                      <span className={`font-extrabold text-sm ${modalidadEfectiva === "ninguno" ? "text-amber-400" : "text-emerald-400"}`}>
                        ${montoBaseACobrar.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs px-1 text-slate-400">
                      <span>Saldo a pagar en el club:</span>
                      <span className={`font-medium ${saldoPendiente === 0 ? "text-emerald-400 font-bold" : "text-slate-300"}`}>
                        ${saldoPendiente.toLocaleString()}
                      </span>
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

                  {/* Discrete Sandbox / Testing Reminder (Option 1) */}
                  <div
                    data-testid="dev-mode-reminder"
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <span>🧪</span> Modo Pruebas Activo
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          addToast("error", "Simulador: Pago rechazado por fondos insuficientes o rechazo bancario.");
                          setAuthError("Pago simulado rechazado por la pasarela de pagos.");
                        }}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition underline underline-offset-2"
                        title="Simular un error bancario para verificar el manejo de rechazos"
                      >
                        Probar rechazo de pago
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      En desarrollo, al confirmar la reserva el pago online se aprueba automáticamente sin cobro real. En producción se integrará la pasarela definitiva (Mercado Pago / Stripe).
                    </p>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                    <span>⏱️ Tiempo restante de retención:</span>
                    <span className="font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {formatCountdown(remainingSeconds)}
                    </span>
                  </div>
                </div>

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
                      onChange={(e) => setClienteTelefono(e.target.value.replace(/[^0-9+\s\-()]/g, ""))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Correo Electrónico (opcional)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="cliente@ejemplo.com (para vincular cuenta / billetera virtual)"
                        value={clienteEmail}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClienteEmail(val);
                          setDeskEmailStatus("idle");
                          setDeskRegisteredUser(null);
                          setDeskOtpStep("none");
                          setDeskOtpCode("");
                        }}
                        onBlur={() => checkDeskEmail(clienteEmail)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {isCheckingDeskEmail ? (
                        <div className="absolute right-3 top-2.5 text-xs text-slate-400 flex items-center gap-1">
                          <span className="inline-block animate-spin">⏳</span>
                          <span className="text-[10px]">Verificando...</span>
                        </div>
                      ) : (
                        clienteEmail.trim().includes("@") && deskEmailStatus === "idle" && (
                          <button
                            type="button"
                            onClick={() => checkDeskEmail(clienteEmail)}
                            className="absolute right-2 top-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition"
                          >
                            Verificar
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Registered client badge */}
                  {deskEmailStatus === "registered" && deskRegisteredUser && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>✓</span>
                        <span>
                          Cliente registrado: <strong>{deskRegisteredUser.name}</strong> ({deskRegisteredUser.email})
                        </span>
                      </div>
                      {typeof deskRegisteredUser.saldo_billetera === "number" && deskRegisteredUser.saldo_billetera > 0 && (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                          Billetera: ${deskRegisteredUser.saldo_billetera.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Unregistered client warning & OTP registration prompt */}
                  {deskEmailStatus === "unregistered" && deskOtpStep === "prompt" && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="text-base leading-none">⚠️</span>
                        <div>
                          <p className="font-bold text-amber-300">
                            El correo no está registrado en el sistema
                          </p>
                          <p className="text-[11px] text-amber-200/80 mt-0.5">
                            No se encontró ninguna cuenta asociada a <strong className="font-mono text-white">{clienteEmail.trim()}</strong>. ¿Deseas registrar al cliente ahora con validación por código OTP?
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isSendingDeskOtp}
                          onClick={handleSendDeskOtp}
                          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 text-xs transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isSendingDeskOtp ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              <span>Enviando código...</span>
                            </>
                          ) : (
                            <>
                              <span>✉️</span>
                              <span>Registrar y Enviar OTP</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeskOtpStep("skipped")}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 px-3 text-xs transition"
                        >
                          Continuar sin cuenta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Desk OTP code input */}
                  {deskOtpStep === "otp" && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs space-y-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Validando cuenta nueva:</span>
                        <span className="font-mono font-bold text-emerald-400">{clienteEmail.trim()}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Ingresa el código OTP de 6 dígitos que enviamos al correo del cliente para crear su cuenta verificada:
                      </p>
                      <div>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={deskOtpCode}
                          onChange={(e) => setDeskOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-xl bg-slate-950 border border-emerald-500/50 px-3 py-2.5 text-center tracking-[0.35em] font-mono text-base font-bold text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <button
                          type="button"
                          onClick={() => {
                            setDeskOtpStep("skipped");
                            setDeskOtpCode("");
                          }}
                          className="text-slate-400 hover:text-white underline"
                        >
                          Cancelar registro (continuar sin cuenta)
                        </button>
                        <button
                          type="button"
                          disabled={deskOtpCountdown > 0 || isSendingDeskOtp}
                          onClick={handleSendDeskOtp}
                          className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 font-medium"
                        >
                          {deskOtpCountdown > 0 ? `Reenviar en ${deskOtpCountdown}s` : "Reenviar código"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Skipped registration badge */}
                  {deskOtpStep === "skipped" && (
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] flex items-center justify-between">
                      <span>ℹ️ Se confirmará como cliente no registrado.</span>
                      <button
                        type="button"
                        onClick={() => setDeskOtpStep("prompt")}
                        className="text-emerald-400 hover:underline text-[10px]"
                      >
                        Registrar con OTP
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Medio / Canal de Cobro
                    </label>
                    <select
                      value={metodoPago}
                      disabled={modalidadCobro === "ninguno"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMetodoPago(val);
                      }}
                      className={`w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        modalidadCobro === "ninguno" ? "opacity-90 cursor-not-allowed bg-slate-900/60" : ""
                      }`}
                    >
                      {modalidadCobro === "ninguno" ? (
                        <option value="pendiente">🕒 Pendiente de Pago (Paga al jugar)</option>
                      ) : (
                        <>
                          <option value="mostrador">💵 Cobrado en Mostrador / Efectivo</option>
                          <option value="transferencia">📲 Cobrado por Transferencia Bancaria</option>
                          <option value="online">💳 Cobrado con Tarjeta / Online</option>
                        </>
                      )}
                    </select>
                    {modalidadCobro === "ninguno" && (
                      <p className="text-[11px] text-amber-400/90 mt-1.5 flex items-center gap-1.5">
                        <span>ℹ️</span>
                        <span>No se registra cobro ahora. El saldo total (${tarifaTotal.toLocaleString()}) quedará pendiente para cuando el cliente asista al club.</span>
                      </p>
                    )}
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
                      onChange={(e) => setClienteTelefono(e.target.value.replace(/[^0-9+\s\-()]/g, ""))}
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
                      <option value="online">💳 Mercado Pago / Tarjeta Online</option>
                      <option value="transferencia">📲 Transferencia Bancaria</option>
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
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-300">
                              Teléfono / WhatsApp *
                            </label>
                            {clienteTelefono.trim() && (
                              <span
                                data-testid="whatsapp-validation-badge"
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  getPhoneValidationError(clienteTelefono)
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                              >
                                {getPhoneValidationError(clienteTelefono)
                                  ? "⚠️ Incompleto"
                                  : `✓ Válido (${clienteTelefono.replace(/\D/g, "").length} dígitos)`}
                              </span>
                            )}
                          </div>
                          <input
                            type="tel"
                            required
                            placeholder="Ej. +54 9 11 2345-6789"
                            value={clienteTelefono}
                            onBlur={() => setClienteTelefonoTouched(true)}
                            onChange={(e) => {
                              setClienteTelefonoTouched(true);
                              const clean = e.target.value.replace(/[^0-9+\s\-()]/g, "");
                              setClienteTelefono(clean);
                            }}
                            className={`w-full rounded-xl bg-slate-950 border px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition ${
                              clienteTelefonoTouched && getPhoneValidationError(clienteTelefono)
                                ? "border-rose-500/70 focus:border-rose-500 focus:ring-rose-500"
                                : clienteTelefono.trim() && !getPhoneValidationError(clienteTelefono)
                                ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500"
                                : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500"
                            }`}
                          />
                          {clienteTelefonoTouched && getPhoneValidationError(clienteTelefono) ? (
                            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium" data-testid="whatsapp-error-msg">
                              <span>⚠️</span>
                              <span>{getPhoneValidationError(clienteTelefono)}</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-500 mt-1">
                              Ingresá tu WhatsApp con código de área (entre 8 y 15 dígitos) para recibir confirmaciones y recordatorios.
                            </p>
                          )}
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
                            <option value="online">💳 Mercado Pago / Tarjeta Online</option>
                            <option value="transferencia">📲 Transferencia Bancaria</option>
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
                          <option value="online">💳 Mercado Pago / Tarjeta Online</option>
                          <option value="transferencia">📲 Transferencia Bancaria</option>
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
                    resetDeskForm();
                  }}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    resetDeskForm();
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
                  disabled={
                    isConfirming ||
                    (authMode === "register" && registrationStep === "otp" && otpCode.length !== 6) ||
                    (isAdmin && deskOtpStep === "otp" && deskOtpCode.length !== 6)
                  }
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isConfirming
                    ? "Procesando..."
                    : isAdmin
                    ? deskOtpStep === "otp"
                      ? `✓ Verificar OTP & Asignar ($${montoFinalAPagar.toLocaleString()})`
                      : modalidadCobro === "ninguno"
                      ? "📝 Asignar en Mostrador (Sin Cobro)"
                      : modalidadCobro === "sena"
                      ? `📝 Asignar en Mostrador (Seña: $${montoFinalAPagar.toLocaleString()})`
                      : `📝 Asignar en Mostrador ($${montoFinalAPagar.toLocaleString()})`
                    : currentUser
                    ? `✓ Confirmar Turno ($${montoFinalAPagar.toLocaleString()})`
                    : authMode === "register"
                    ? registrationStep === "otp"
                      ? `✓ Verificar & Confirmar ($${montoFinalAPagar.toLocaleString()})`
                      : "✨ Continuar (Paso 1/2)"
                    : `🔑 Ingresar & Confirmar ($${montoFinalAPagar.toLocaleString()})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    })()}
    </div>
  );
}
