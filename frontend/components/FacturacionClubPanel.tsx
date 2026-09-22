"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  FileText,
  UploadCloud,
  Check,
  Info,
} from "lucide-react";

export const formatFechaDDMMAAAA = (fechaStr?: string | null): string => {
  if (!fechaStr) return "";
  const cleanStr = fechaStr.split("T")[0].split(" ")[0];
  const parts = cleanStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
  }
  return fechaStr;
};

interface FacturacionClubPanelProps {
  subdomain: string;
  token?: string | null;
  apiUrl?: string;
  onRefreshSummary?: () => void;
  autoOpenPaymentModal?: boolean;
  onClosePaymentModal?: () => void;
  refreshTrigger?: any;
}

interface ResumenFacturacion {
  periodo: string;
  suscripcion: {
    estado: "activa" | "trial" | "gracia" | "vencida" | "cancelada";
    esta_activa: boolean;
    en_gracia: boolean;
    dias_restantes: number | null;
    trial_vence_at: string | null;
    proximo_vencimiento: string | null;
    gracia_vence_at: string | null;
  };
  plan: {
    id: number;
    nombre: string;
    slug: string;
    precio_mensual_usd: number;
    canchas_incluidas: number;
    precio_cancha_adicional_usd: number;
    comision_marketplace_porcentaje: number;
  };
  canchas: {
    totales: number;
    cupo_incluido: number;
    excedentes: number;
    precio_unitario_extra_usd: number;
    monto_extras_usd: number;
  };
  marketplace: {
    porcentaje_comision: number;
    cantidad_turnos_no_facturados: number;
    monto_turnos_bruto?: number;
    monto_comisiones_usd?: number;
    total_comisiones_usd?: number;
    total_comisiones_ars?: number;
    turnos?: Array<{
      id: number;
      fecha: string;
      hora_inicio: string;
      precio: number;
      comision_porcentaje: number;
      comision_marketplace: number;
    }>;
  };
  totales: {
    plan_base_usd: number;
    canchas_extras_usd: number;
    comisiones_marketplace_usd: number;
    comisiones_marketplace_ars?: number;
    total_usd: number;
    tipo_cambio_ars: number;
    total_ars: number;
  };
  factura_actual: FacturaItem | null;
}

export interface FacturaItem {
  id: number;
  uuid: string;
  numero_factura: string;
  periodo: string;
  monto_plan_base_usd: string | number;
  canchas_totales: number;
  canchas_incluidas_plan: number;
  canchas_excedentes: number;
  monto_canchas_extras_usd: string | number;
  cantidad_turnos_marketplace: number;
  monto_comisiones_marketplace_usd: string | number;
  total_usd: string | number;
  tipo_cambio_ars: string | number;
  total_ars: string | number;
  estado: "pendiente" | "pagada" | "vencida" | "en_revision" | "anulada";
  metodo_pago: string | null;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_gracia_vencimiento: string | null;
  fecha_pago: string | null;
  comprobante_transferencia_url: string | null;
  comprobante_transferencia_notas: string | null;
  plan?: { id: number; nombre: string; slug: string };
}

const API_BASE = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api");

export default function FacturacionClubPanel({
  subdomain,
  token,
  apiUrl,
  onRefreshSummary,
  autoOpenPaymentModal,
  onClosePaymentModal,
  refreshTrigger,
}: FacturacionClubPanelProps) {
  const effectiveApiUrl =
    (typeof window !== "undefined" && (!apiUrl || apiUrl.startsWith("http://localhost") || apiUrl.startsWith("http://127.0.0.1")))
      ? "/api"
      : (apiUrl || (typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api")));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenFacturacion | null>(null);
  const [facturas, setFacturas] = useState<FacturaItem[]>([]);
  const [showMarketplaceDetails, setShowMarketplaceDetails] = useState(false);

  // Modal de Pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaItem | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<"mercadopago" | "stripe" | "transferencia">("mercadopago");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Formulario Transferencia
  const [comprobanteUrl, setComprobanteUrl] = useState("");
  const [comprobanteNotas, setComprobanteNotas] = useState("");

  const getAuthHeaders = useCallback(() => {
    let activeToken = token;
    if (!activeToken && typeof window !== "undefined") {
      activeToken =
        localStorage.getItem("saas_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token");
    }
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      "X-Tenant-ID": subdomain,
    };
  }, [token, subdomain]);

  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      const [resumenRes, facturasRes] = await Promise.all([
        fetch(`${effectiveApiUrl}/clubs/${subdomain}/facturacion/resumen`, { headers }),
        fetch(`${effectiveApiUrl}/clubs/${subdomain}/facturacion/facturas`, { headers }),
      ]);

      if (!resumenRes.ok) {
        let errorMsg = "Error al obtener resumen de facturación.";
        try {
          const errData = await resumenRes.json();
          if (errData?.message) errorMsg = errData.message;
        } catch {
          errorMsg = `Error del servidor (${resumenRes.status}): ${resumenRes.statusText || "Respuesta inválida"}`;
        }
        throw new Error(errorMsg);
      }

      const resumenJson = await resumenRes.json();
      setResumen(resumenJson.data);

      if (facturasRes.ok) {
        const facturasJson = await facturasRes.json();
        setFacturas(facturasJson.data || []);
      }
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || "No se pudo cargar la información de facturación.");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [subdomain, getAuthHeaders, effectiveApiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Revalidación inteligente por foco de ventana y sondeo periódico en segundo plano
  useEffect(() => {
    const POLL_INTERVAL = 15000; // 15 segundos
    const intervalId = setInterval(() => {
      fetchData(true);
    }, POLL_INTERVAL);

    const onWindowFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchData(true);
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onWindowFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onWindowFocus);
    };
  }, [fetchData]);

  // Revalidar cuando el panel principal notifica cambios de suscripción
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchData(true);
    }
  }, [refreshTrigger, fetchData]);

  const handleClosePaymentModal = useCallback(() => {
    setPaymentModalOpen(false);
    onClosePaymentModal?.();
  }, [onClosePaymentModal]);

  const handleOpenPayment = useCallback((factura?: FacturaItem) => {
    const targetFactura = factura || resumen?.factura_actual || facturas.find((f) => f.estado !== "pagada") || null;
    setFacturaSeleccionada(targetFactura);
    setActionAlert(null);
    setPaymentModalOpen(true);
  }, [resumen, facturas]);

  useEffect(() => {
    if (autoOpenPaymentModal) {
      handleOpenPayment();
    }
  }, [autoOpenPaymentModal, handleOpenPayment]);

  useEffect(() => {
    if (paymentModalOpen && !facturaSeleccionada) {
      const targetFactura = resumen?.factura_actual || facturas.find((f) => f.estado !== "pagada") || null;
      if (targetFactura) {
        setFacturaSeleccionada(targetFactura);
      }
    }
  }, [paymentModalOpen, facturaSeleccionada, resumen, facturas]);

  const handlePayMercadoPago = async () => {
    try {
      setIsProcessingPayment(true);
      setActionAlert(null);
      const headers = getAuthHeaders();

      const res = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/facturacion/pagar-mercadopago`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          factura_uuid: facturaSeleccionada?.uuid,
          back_url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al generar preferencia de Mercado Pago.");
      }

      if (data.init_point) {
        window.open(data.init_point, "_blank");
        setActionAlert({
          type: "success",
          message: "Se abrió la pasarela de Mercado Pago. Una vez completado el pago, el servicio se actualizará automáticamente.",
        });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error al procesar con Mercado Pago." });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayStripe = async () => {
    try {
      setIsProcessingPayment(true);
      setActionAlert(null);
      const headers = getAuthHeaders();

      const res = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/facturacion/pagar-stripe`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          factura_uuid: facturaSeleccionada?.uuid,
          back_url: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al inicializar sesión de Stripe.");
      }

      if (data.checkout_url) {
        window.open(data.checkout_url, "_blank");
        setActionAlert({
          type: "success",
          message: "Se abrió el checkout seguro de Stripe. El pago se validará inmediatamente tras completarse.",
        });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error al procesar con Stripe." });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubmitTransferReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comprobanteUrl.trim()) {
      setActionAlert({ type: "error", message: "Ingresa el enlace o identificador del comprobante bancario." });
      return;
    }

    try {
      setIsProcessingPayment(true);
      setActionAlert(null);
      const headers = getAuthHeaders();

      const res = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/facturacion/comprobante-transferencia`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          factura_uuid: facturaSeleccionada?.uuid,
          comprobante_url: comprobanteUrl.trim(),
          notas: comprobanteNotas.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al informar comprobante.");
      }

      setActionAlert({
        type: "success",
        message: "¡Comprobante enviado con éxito! El equipo de administración revisará la acreditación bancaria.",
      });
      setComprobanteUrl("");
      setComprobanteNotas("");
      fetchData();
      if (onRefreshSummary) onRefreshSummary();
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error al enviar comprobante." });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading && !resumen) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
        <p className="text-sm font-semibold">Cargando estado de facturación y pasarelas de pago...</p>
      </div>
    );
  }

  if (error && !resumen) {
    return (
      <div className="rounded-3xl bg-rose-950/40 border border-rose-800 p-8 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Error de Facturación</h3>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const sub = resumen?.suscripcion;
  const tot = resumen?.totales;
  const mkt = resumen?.marketplace;
  const can = resumen?.canchas;
  const pln = resumen?.plan;

  const periodoDisplay = (resumen as any)?.periodo_actual || resumen?.periodo || "Mes actual";
  const estaActiva = sub?.esta_activa ?? (sub as any)?.es_valida;
  const planBaseUsd = tot?.plan_base_usd ?? (tot as any)?.base_plan_usd ?? (pln as any)?.precio_mensual ?? 0;
  const canchasCupo = can?.cupo_incluido ?? (can as any)?.incluidas ?? pln?.canchas_incluidas ?? 2;
  const canchasExcedentes = can?.excedentes ?? 0;
  const canchasTotales = can?.totales ?? 0;
  const precioExtraUsd = can?.precio_unitario_extra_usd ?? pln?.precio_cancha_adicional_usd ?? (pln as any)?.precio_cancha_adicional ?? 8;
  const montoExtrasUsd = tot?.canchas_extras_usd ?? (can as any)?.costo_adicional_total ?? 0;
  const mktTurnosCount = mkt?.cantidad_turnos_no_facturados ?? (mkt as any)?.turnos_captados_count ?? 0;
  const mktPorcentaje = mkt?.porcentaje_comision ?? (mkt as any)?.porcentaje_aplicado ?? pln?.comision_marketplace_porcentaje ?? (pln as any)?.comision_marketplace_pct ?? 5;
  const mktComisionesUsd = tot?.comisiones_marketplace_usd ?? (mkt as any)?.total_comisiones_usd ?? 0;
  const mktComisionesArs = tot?.comisiones_marketplace_ars ?? (mkt as any)?.total_comisiones_ars ?? 0;
  const totalUsd = tot?.total_usd ?? (Number(planBaseUsd) + Number(montoExtrasUsd) + Number(mktComisionesUsd));
  const tipoCambioArs = tot?.tipo_cambio_ars ?? 1350;
  const totalArs = tot?.total_ars ?? (totalUsd * tipoCambioArs);

  return (
    <div className="space-y-8" data-testid="seccion-facturacion-abono">
      {/* Barra de Estado de Suscripción */}
      <div
        className={`rounded-3xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          sub?.en_gracia
            ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
            : sub?.estado === "vencida"
            ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
            : sub?.estado === "trial"
            ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200"
            : "bg-slate-900/80 border-slate-800 text-slate-200"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              sub?.en_gracia
                ? "bg-amber-500/20 text-amber-400"
                : sub?.estado === "vencida"
                ? "bg-rose-500/20 text-rose-400"
                : sub?.estado === "trial"
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {sub?.en_gracia ? "⚠️" : sub?.estado === "vencida" ? "🚨" : sub?.estado === "trial" ? "✨" : "✓"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white capitalize">
                Suscripción SaaS: {sub?.estado === "trial" ? "Prueba Gratuita" : sub?.estado === "gracia" ? "En Período de Gracia" : sub?.estado === "activa" ? "Activa" : sub?.estado}
              </h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  sub?.en_gracia
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : sub?.estado === "vencida"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {sub?.en_gracia ? "Gracia 7 Días" : estaActiva ? "Operativo" : "Suspendido"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {sub?.en_gracia
                ? `Abono mensual vencido. Cuentas con ${sub?.dias_restantes ?? 7} días de gracia para regularizar el pago antes de que se bloqueen las funciones de reserva del club.`
                : sub?.estado === "vencida"
                ? "El período de gracia ha finalizado. Las funciones operativas están temporalmente suspendidas hasta regularizar el pago."
                : sub?.estado === "trial"
                ? `Disfruta del acceso completo. Tu prueba gratuita vence el ${formatFechaDDMMAAAA(sub?.trial_vence_at) || "próximamente"}.`
                : `Próximo vencimiento programado: ${sub?.proximo_vencimiento ? formatFechaDDMMAAAA(sub.proximo_vencimiento) : "Fin de mes"}.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenPayment()}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 flex items-center gap-2 shrink-0"
          data-testid="btn-pagar-abono"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pagar Abono</span>
        </button>
      </div>

      {/* Grid de Métricas de Facturación del Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Plan Base */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Abono Base</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white capitalize">{pln?.nombre || "Plan Base"}</div>
          <p className="text-xs text-slate-400">
            Incluye hasta <strong className="text-white">{canchasCupo} canchas</strong> base en la tarifa fija.
          </p>
          <div className="pt-1 text-sm font-bold text-emerald-400">${Number(planBaseUsd).toFixed(2)} USD / mes</div>
        </div>

        {/* Card 2: Canchas Extras */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Canchas Extras</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {canchasExcedentes} <span className="text-xs font-normal text-slate-400">excedentes</span>
          </div>
          <p className="text-xs text-slate-400">
            Total administradas: <strong className="text-white">{canchasTotales} canchas</strong> (${Number(precioExtraUsd).toFixed(2)} USD c/u).
          </p>
          <div className="pt-1 text-sm font-bold text-cyan-400">${Number(montoExtrasUsd).toFixed(2)} USD</div>
        </div>

        {/* Card 3: Marketplace Attribution */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Marketplace (jugar.)</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {mktTurnosCount} <span className="text-xs font-normal text-slate-400">turnos</span>
          </div>
          <p className="text-xs text-slate-400">
            Comisión pactada: <strong className="text-white">{mktPorcentaje}%</strong> por cliente nuevo canalizado.
          </p>
          <div className="pt-1 text-sm font-bold text-purple-400 flex items-baseline gap-1.5 flex-wrap">
            <span>${Number(mktComisionesUsd).toFixed(2)} USD</span>
            {Number(mktComisionesArs) > 0 && (
              <span className="text-xs text-slate-400 font-normal">
                (${Number(mktComisionesArs).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS)
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Total Liquidación */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase">
            <span>Total Período</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">${Number(totalUsd).toFixed(2)} USD</div>
          <p className="text-xs text-slate-300 flex items-center gap-1 font-mono">
            <span>ARS:</span>
            <strong className="text-emerald-300 font-black">
              ${Number(totalArs).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </strong>
          </p>
          <div className="pt-1 text-[11px] text-slate-400">
            TC Oficial: ${Number(tipoCambioArs).toFixed(2)} ARS/USD
          </div>
        </div>
      </div>

      {/* Desglose Detallado del Período Actual */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Desglose de Liquidación — Período {periodoDisplay}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cálculo en tiempo real conforme al plan base, canchas en uso y atribución por buscador.
            </p>
          </div>

          {mktTurnosCount > 0 && (
            <button
              onClick={() => setShowMarketplaceDetails(!showMarketplaceDetails)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1"
            >
              <span>{showMarketplaceDetails ? "Ocultar Turnos Marketplace" : "Ver Turnos Marketplace"}</span>
              <span>{showMarketplaceDetails ? "▲" : "▼"}</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-300">
              Abono Base ({pln?.nombre}): Incluye {canchasCupo} canchas
            </span>
            <span className="font-bold text-white font-mono">${Number(planBaseUsd).toFixed(2)} USD</span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <span className="text-slate-300">
              Canchas Adicionales: {canchasExcedentes} cancha(s) excedente(s) x ${Number(precioExtraUsd).toFixed(2)} USD
            </span>
            <span className="font-bold text-white font-mono">${Number(montoExtrasUsd).toFixed(2)} USD</span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="text-slate-300">
                Comisiones de Marketplace ({mktPorcentaje}% sobre {mktTurnosCount} turnos):
              </span>
              {Number(mktComisionesArs) > 0 && (
                <span className="text-slate-400 block text-[11px] font-normal mt-0.5">
                  Comisión acumulada en turnos: ${Number(mktComisionesArs).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS
                </span>
              )}
            </div>
            <span className="font-bold text-white font-mono">${Number(mktComisionesUsd).toFixed(2)} USD</span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold text-sm">
            <span className="text-white">Total a Pagar (Período {periodoDisplay}):</span>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-white text-base">${Number(totalUsd).toFixed(2)} USD</span>
              <span className="text-slate-400 font-normal">≈</span>
              <span className="text-emerald-400 text-base">
                ${Number(totalArs).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS
              </span>
            </div>
          </div>
        </div>

        {/* Detalle Desplegable de Turnos Marketplace */}
        {showMarketplaceDetails && mkt && (mkt as any).turnos && (
          <div className="mt-4 rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Turnos canalizados por jugar.turnos.com pendientes de liquidación
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold">
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Hora</th>
                    <th className="pb-2">Precio Turno (ARS)</th>
                    <th className="pb-2">Comisión %</th>
                    <th className="pb-2 text-right">Comisión Retenida (ARS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                  {((mkt as any).turnos || []).map((t: any) => (
                    <tr key={t.id}>
                      <td className="py-2 text-slate-200 font-bold">{formatFechaDDMMAAAA(t.fecha)}</td>
                      <td className="py-2">{t.hora_inicio ? String(t.hora_inicio).substring(0, 5) : ""}</td>
                      <td className="py-2">${Number(t.precio).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS</td>
                      <td className="py-2">{t.comision_porcentaje}%</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">
                        ${Number(t.comision_marketplace).toLocaleString("es-AR", { minimumFractionDigits: 2 })} ARS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Facturas Emitidas */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Historial de Facturas & Abonos B2B</h3>
            <p className="text-xs text-slate-400">Comprobantes de facturación mensual del servicio multitenant.</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1"
            title="Refrescar facturación"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>

        {facturas.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Aún no hay facturas emitidas registradas para este club.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="tabla-facturas-club">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="pb-3">N° Factura</th>
                  <th className="pb-3">Período</th>
                  <th className="pb-3">Emisión</th>
                  <th className="pb-3">Vencimiento</th>
                  <th className="pb-3">Total USD</th>
                  <th className="pb-3">Total ARS</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Método</th>
                  <th className="pb-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {facturas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 font-mono font-bold text-white">{f.numero_factura}</td>
                    <td className="py-3">{f.periodo}</td>
                    <td className="py-3">{formatFechaDDMMAAAA(f.fecha_emision)}</td>
                    <td className="py-3">{formatFechaDDMMAAAA(f.fecha_vencimiento)}</td>
                    <td className="py-3 font-mono font-bold text-white">${Number(f.total_usd).toFixed(2)}</td>
                    <td className="py-3 font-mono text-emerald-400">
                      ${Number(f.total_ars).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          f.estado === "pagada"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : f.estado === "en_revision"
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            : f.estado === "vencida"
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {f.estado === "en_revision" ? "En Revisión" : f.estado}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-slate-400">
                      {f.metodo_pago ? f.metodo_pago.replace("_", " ") : "-"}
                    </td>
                    <td className="py-3 text-right">
                      {f.estado !== "pagada" ? (
                        <button
                          onClick={() => handleOpenPayment(f)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow"
                        >
                          Pagar
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                          <Check className="w-3 h-3" /> Saldada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Pago Integrado con Mercado Pago, Stripe y Transferencia */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <span>Abonar Servicio SaaS</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Factura: <strong className="text-slate-200">{facturaSeleccionada?.numero_factura || "Mes en curso"}</strong> • Período {facturaSeleccionada?.periodo || resumen?.periodo}
                </p>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActivePaymentMethod("mercadopago")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  activePaymentMethod === "mercadopago"
                    ? "bg-sky-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                data-testid="btn-metodo-mp"
              >
                <span>Mercado Pago</span>
                <span className="text-[10px] font-normal opacity-80">ARS (Pesos)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentMethod("stripe")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  activePaymentMethod === "stripe"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                data-testid="btn-metodo-stripe"
              >
                <span>Stripe</span>
                <span className="text-[10px] font-normal opacity-80">USD (Dólares)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePaymentMethod("transferencia")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                  activePaymentMethod === "transferencia"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                data-testid="btn-metodo-transferencia"
              >
                <span>Transferencia</span>
                <span className="text-[10px] font-normal opacity-80">CBU / Alias</span>
              </button>
            </div>

            {/* Notificaciones del Modal */}
            {actionAlert && (
              <div
                className={`rounded-2xl p-4 text-xs flex items-start gap-2 ${
                  actionAlert.type === "success"
                    ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-200"
                    : "bg-rose-950/60 border border-rose-500/40 text-rose-200"
                }`}
              >
                {actionAlert.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{actionAlert.message}</span>
              </div>
            )}

            {/* Vista Mercado Pago */}
            {activePaymentMethod === "mercadopago" && (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Importe Base en USD:</span>
                    <span className="font-bold text-white font-mono">
                      ${Number(facturaSeleccionada?.total_usd || tot?.total_usd || 0).toFixed(2)} USD
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cotización de Conversión:</span>
                    <span className="font-mono text-slate-300">
                      ${Number(facturaSeleccionada?.tipo_cambio_ars || tot?.tipo_cambio_ars || 1350).toFixed(2)} ARS
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                    <span className="text-white">Total Final a Abonar:</span>
                    <span className="text-sky-400 font-mono text-base">
                      $
                      {Number(facturaSeleccionada?.total_ars || tot?.total_ars || 0).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ARS
                    </span>
                  </div>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  Vas a ser redirigido a la pasarela oficial de Mercado Pago para abonar con tarjeta de crédito, débito o dinero en cuenta. La acreditación e impacto en tu suscripción es automática e inmediata.
                </p>

                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handlePayMercadoPago}
                  className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs transition shadow-lg shadow-sky-900/50 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  <span>Pagar Ahora con Mercado Pago</span>
                </button>
              </div>
            )}

            {/* Vista Stripe */}
            {activePaymentMethod === "stripe" && (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Moneda de Facturación:</span>
                    <span className="font-bold text-white font-mono">USD (Dólares)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                    <span className="text-white">Total a Abonar:</span>
                    <span className="text-indigo-400 font-mono text-base">
                      ${Number(facturaSeleccionada?.total_usd || tot?.total_usd || 0).toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <p className="text-slate-400 leading-relaxed">
                  Paga con cualquier tarjeta de crédito o débito internacional (Visa, Mastercard, Amex) a través del checkout seguro y cifrado de Stripe.
                </p>

                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handlePayStripe}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs transition shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  <span>Continuar a Stripe Checkout</span>
                </button>
              </div>
            )}

            {/* Vista Transferencia */}
            {activePaymentMethod === "transferencia" && (
              <form onSubmit={handleSubmitTransferReceipt} className="space-y-4 text-xs">
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2 font-mono">
                  <div className="text-emerald-400 font-bold uppercase text-[11px] font-sans pb-1">
                    Datos Bancarios Oficiales de la Plataforma
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>CBU:</span>
                    <span className="text-white select-all">0000003100010000000001</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Alias:</span>
                    <span className="text-white select-all">TURNOS.SAAS.PAGOS</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Titular:</span>
                    <span className="text-white">Turnos S.A.S.</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Monto ARS a transferir:</span>
                    <span className="text-emerald-400 font-bold">
                      $
                      {Number(facturaSeleccionada?.total_ars || tot?.total_ars || 0).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Enlace o URL del Comprobante / N° de Transacción *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://drive.google.com/... o nro comprobante 839210"
                      value={comprobanteUrl}
                      onChange={(e) => setComprobanteUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Notas o aclaraciones adicionales</label>
                    <input
                      type="text"
                      placeholder="Ej: Transferido desde cuenta Banco Galicia de Club SRL"
                      value={comprobanteNotas}
                      onChange={(e) => setComprobanteNotas(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs transition shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Informar Transferencia Realizada</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
