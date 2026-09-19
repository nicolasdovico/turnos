"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Ticket,
  CloudRain,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  Wallet,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";

interface ValeData {
  id: number;
  codigo: string;
  token_seguro: string;
  monto: number;
  saldo_restante: number;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  estado: string;
  es_valido: boolean;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  complejo?: {
    id: number;
    nombre: string;
    subdominio: string;
    logo_url?: string | null;
    telefono?: string | null;
  };
  turno_origen?: {
    id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    cancha_nombre: string;
    deporte: string;
  };
}

export default function PaginaValeDigital() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [vale, setVale] = useState<ValeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  const fetchVale = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/vales/${token}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "No se encontró el vale digital solicitado.");
      }
      setVale(json);
    } catch (err: any) {
      setError(err.message || "Error al cargar el vale de lluvia.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVale();
    }
  }, [token]);

  const copyCode = () => {
    if (vale?.codigo) {
      navigator.clipboard.writeText(vale.codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCanjearBilletera = async () => {
    const authToken = localStorage.getItem("auth_token") || localStorage.getItem("token");
    if (!authToken) {
      // Si no está logueado, redirigir al login guardando returnTo
      router.push(`/login?returnTo=/vales/${token}`);
      return;
    }

    setClaiming(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/vales/${token}/canjear-billetera`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Error al canjear el vale.");
      }

      setClaimSuccess(json.message || "¡Saldo acreditado exitosamente!");
      fetchVale();
    } catch (err: any) {
      setError(err.message || "No se pudo canjear el vale a tu billetera.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-sm text-slate-400">Cargando tu Vale Digital...</p>
      </div>
    );
  }

  if (error || !vale) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Vale No Encontrado</h2>
          <p className="text-sm text-slate-400">{error || "El enlace ingresado es inválido o ha expirado."}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    );
  }

  const isActivo = vale.estado === "activo" && vale.saldo_restante > 0;
  const clubNombre = vale.complejo?.nombre || "Club Deportivo";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Card Principal del Vale */}
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl overflow-hidden">
          {/* Header Superior con efecto lluvia */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border-b border-slate-800/80">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-inner">
                  <CloudRain className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" /> Rain Check • Vale de Lluvia
                  </div>
                  <h1 className="text-xl font-black text-white">{clubNombre}</h1>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                  isActivo
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {vale.estado === "activo" ? "Activo" : vale.estado.replace("_", " ")}
              </div>
            </div>
          </div>

          {/* Monto y Código Destacado */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Saldo a Favor Disponible
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                ${Number(vale.saldo_restante).toLocaleString("es-AR")}
              </div>
              <p className="text-xs text-slate-400">
                100% de la seña/pago del turno suspendido por mal clima.
              </p>
            </div>

            {/* Código Alfanumérico con Botón Copiar */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Código de Canje / Mostrador
                </div>
                <div className="font-mono text-lg sm:text-xl font-black tracking-widest text-cyan-400">
                  {vale.codigo}
                </div>
              </div>

              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Detalle del Turno Original */}
            {vale.turno_origen && (
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2.5 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" /> Detalle del turno suspendido:
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{vale.turno_origen.fecha}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{vale.turno_origen.hora_inicio} hs</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{vale.turno_origen.cancha_nombre}</span>
                  </div>
                </div>
                {vale.fecha_vencimiento && (
                  <div className="pt-2 border-t border-slate-700/40 text-[11px] text-slate-400">
                    Vigencia: Válido hasta el{" "}
                    <strong className="text-slate-300">{vale.fecha_vencimiento}</strong>.
                  </div>
                )}
              </div>
            )}

            {claimSuccess && (
              <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{claimSuccess}</span>
              </div>
            )}

            {/* Acciones para el Jugador */}
            {isActivo && (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push(`/?subdomain=${vale.complejo?.subdominio || ""}`)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-black shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Reservar Nuevo Turno con este Vale</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={claiming}
                  onClick={handleCanjearBilletera}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  {claiming ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <Wallet className="w-4 h-4 text-cyan-400" />
                  )}
                  <span>Vincular y Pasar Saldo a mi Billetera Virtual</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Podés presentar este código o enlace en la recepción del club para descontarlo de tu próximo partido.
        </p>
      </div>
    </div>
  );
}
