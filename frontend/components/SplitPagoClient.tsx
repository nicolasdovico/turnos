"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Users, 
  CreditCard, 
  Calendar, 
  AlertCircle,
  Share2
} from "lucide-react";
import { formatPrecio } from "@/lib/formatters";
import { formatFechaDDMMAAAA } from "@/components/GrillaHoraria";
import { getTenantPublicUrl } from "@/lib/navigationUrls";

export interface SplitPagoClientProps {
  token: string;
}

export interface CuotaData {
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
  complejo?: {
    id: number;
    subdominio: string;
    nombre: string;
  } | null;
  partido_abierto?: {
    id: number;
    estado: string;
    tipo_partido: string;
    nivel_min?: string | null;
    nivel_max?: string | null;
    jugadores_requeridos: number;
    jugadores_actuales: number;
  } | null;
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
      techada?: boolean;
    };
  };
}

export interface DatosBancarios {
  banco?: string | null;
  cbu?: string | null;
  alias?: string | null;
  titular?: string | null;
  cuit?: string | null;
}

export default function SplitPagoClient({ token }: SplitPagoClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cuota, setCuota] = useState<CuotaData | null>(null);
  const [datosBancarios, setDatosBancarios] = useState<DatosBancarios | null>(null);

  // Formulario de pago
  const [nombreJugador, setNombreJugador] = useState("");
  const [emailJugador, setEmailJugador] = useState("");
  const [comprobanteTexto, setComprobanteTexto] = useState("");
  const [metodoPago, setMetodoPago] = useState<"mercadopago" | "transferencia">("transferencia");
  const [processing, setProcessing] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [enRevision, setEnRevision] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCuota() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/split-pagos/${token}`);
        if (!res.ok) {
          throw new Error("No se encontró la cuota de pago o el enlace ha expirado.");
        }
        const json = await res.json();
        const dataCuota = json.data?.cuota;
        const bancarios = json.data?.datos_bancarios;
        setCuota(dataCuota);
        setDatosBancarios(bancarios || null);
        if (dataCuota?.nombre_jugador) {
          setNombreJugador(dataCuota.nombre_jugador);
        }
        if (dataCuota?.email_jugador) {
          setEmailJugador(dataCuota.email_jugador);
        }
        if (dataCuota?.estado === "pagado") {
          setPagoExitoso(true);
        }
        if (dataCuota?.estado === "revision_transferencia") {
          setEnRevision(true);
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar la información del pago.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchCuota();
    }
  }, [token]);

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreJugador.trim()) {
      alert("Por favor ingresá tu nombre para confirmar el pago.");
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch(`/api/split-pagos/${token}/pagar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_jugador: nombreJugador.trim(),
          email_jugador: emailJugador.trim() || null,
          metodo_pago: metodoPago,
          comprobante_transferencia: comprobanteTexto.trim() || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Error al procesar el pago de la cuota.");
      }

      const json = await res.json();
      const updatedCuota = json.data?.cuota;
      if (updatedCuota) {
        setCuota((prev) => ({
          ...prev,
          ...updatedCuota,
          complejo: updatedCuota.complejo || prev?.complejo,
          turno: updatedCuota.turno || prev?.turno,
          partido_abierto: updatedCuota.partido_abierto || prev?.partido_abierto,
        }));
      }

      if (updatedCuota?.estado === "revision_transferencia") {
        setEnRevision(true);
      } else {
        setPagoExitoso(true);
      }
    } catch (err: any) {
      alert(err.message || "No se pudo procesar el pago.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyText = (val: string, fieldName: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(val);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Cargando datos del partido...</p>
        </div>
      </main>
    );
  }

  if (error || !cuota) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Enlace de Pago No Disponible</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "El link de pago no es válido o la convocatoria ya fue completada o cancelada."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
            >
              Ir a la Página Principal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const turno = cuota.turno;
  const cancha = turno?.cancha;
  const partido = cuota.partido_abierto;
  const subdominioClub = cuota.complejo?.subdominio;
  const urlVolverClub = subdominioClub ? getTenantPublicUrl(subdominioClub) : "/";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Cabecera / Identidad */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400">
            <Users className="w-3.5 h-3.5" />
            <span>Pago Dividido de Turno (Split Payment)</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Aboná tu parte del partido
          </h1>
          <p className="text-xs text-slate-400">
            Completá tu aporte para asegurar el turno en la cancha.
          </p>
        </div>

        {/* Tarjeta de Resumen del Turno */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                {cancha?.deporte || "Deporte"}
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                {cancha?.nombre || "Cancha Deportiva"}
              </h2>
              {cancha?.superficie && (
                <p className="text-xs text-slate-400 capitalize">
                  {cancha.superficie.replace("_", " ")} {cancha.techada ? "• Techada" : "• Descubierta"}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Cuota {cuota.cuota_numero} de {cuota.total_cuotas}</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {formatPrecio(cuota.monto)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500 font-semibold uppercase">Fecha</span>
                <span className="font-bold">{turno?.fecha ? formatFechaDDMMAAAA(turno.fecha) : "A confirmar"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500 font-semibold uppercase">Horario</span>
                <span className="font-bold">
                  {turno ? `${turno.hora_inicio?.substring(0, 5)} - ${turno.hora_fin?.substring(0, 5)} hs` : "--:--"}
                </span>
              </div>
            </div>
          </div>

          {partido && (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-400">Modalidad:</span>
                <span className="text-emerald-300 uppercase">{partido.tipo_partido}</span>
              </div>
              {(partido.nivel_min || partido.nivel_max) && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Nivel / Categoría:</span>
                  <span className="text-slate-200 font-medium">
                    {partido.nivel_min || "Abierto"} {partido.nivel_max ? `a ${partido.nivel_max}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Estado de Pago / Formulario de Pago */}
        {pagoExitoso ? (
          <div className="rounded-3xl bg-emerald-950/50 border border-emerald-500/40 p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">¡Cuota Pagada con Éxito!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu cuota individual de <strong className="text-emerald-300">{formatPrecio(cuota.monto)}</strong> ha sido confirmada.
                {cuota.nombre_jugador && <span> A nombre de: <strong>{cuota.nombre_jugador}</strong>.</span>}
                {cuota.email_jugador && <span> Se envió el comprobante a: <strong>{cuota.email_jugador}</strong>.</span>}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>{copied ? "¡Link Copiado!" : "Compartir Enlace del Partido"}</span>
              </button>

              <a
                href={urlVolverClub}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black uppercase text-slate-950 transition flex items-center justify-center gap-1.5"
              >
                <span>Volver a la Grilla de Turnos</span>
              </a>
            </div>
          </div>
        ) : enRevision ? (
          <div className="rounded-3xl bg-amber-950/40 border border-amber-500/40 p-6 sm:p-8 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ⏳
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Transferencia en Verificación</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Registramos tu aviso de transferencia por <strong className="text-amber-300">{formatPrecio(cuota.monto)}</strong>.
                {cuota.nombre_jugador && <span> A nombre de: <strong>{cuota.nombre_jugador}</strong>.</span>}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                El club ha recibido la alerta y verificará la acreditación en su cuenta. Una vez validado, tu cupo quedará 100% confirmado y recibirás el comprobante por email.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={urlVolverClub}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black uppercase text-slate-950 transition flex items-center justify-center gap-1.5"
              >
                <span>Volver a la Grilla de Turnos</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePagar} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Datos del Jugador y Medio de Pago</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tu Nombre y Apellido: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Gómez"
                  value={nombreJugador}
                  onChange={(e) => setNombreJugador(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (para comprobante una vez verificado el pago):
                </label>
                <input
                  type="email"
                  placeholder="marcos@gmail.com"
                  value={emailJugador}
                  onChange={(e) => setEmailJugador(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago("transferencia")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      metodoPago === "transferencia"
                        ? "bg-emerald-500/10 border-emerald-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="block text-xs font-bold text-emerald-400">Transferencia Bancaria</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">CBU / Alias del Club</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago("mercadopago")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      metodoPago === "mercadopago"
                        ? "bg-emerald-500/10 border-emerald-500 text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <span className="block text-xs font-bold text-emerald-400">Mercado Pago</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Tarjetas / Saldo</span>
                  </button>
                </div>
              </div>

              {metodoPago === "transferencia" && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                    <span>🏦 Datos Bancarios Oficiales del Club</span>
                    <span className="text-[10px] text-slate-400">Transferí tu cuota ({formatPrecio(cuota.monto)})</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {datosBancarios?.banco && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Banco:</span>
                        <span className="font-bold text-white">{datosBancarios.banco}</span>
                      </div>
                    )}
                    {datosBancarios?.titular && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Titular:</span>
                        <span className="font-bold text-white">{datosBancarios.titular}</span>
                      </div>
                    )}
                    {datosBancarios?.cuit && (
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">CUIT:</span>
                        <span className="font-mono text-white">{datosBancarios.cuit}</span>
                      </div>
                    )}
                    {datosBancarios?.cbu && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="overflow-hidden mr-2">
                          <span className="block text-[10px] text-slate-400 font-semibold">CBU</span>
                          <span className="font-mono text-xs text-white truncate block">{datosBancarios.cbu}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(datosBancarios.cbu!, "cbu")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-400 transition shrink-0"
                        >
                          {copiedField === "cbu" ? "¡Copiado!" : "Copiar"}
                        </button>
                      </div>
                    )}
                    {datosBancarios?.alias && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="overflow-hidden mr-2">
                          <span className="block text-[10px] text-slate-400 font-semibold">Alias</span>
                          <span className="font-mono text-xs text-emerald-300 font-bold truncate block">{datosBancarios.alias}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(datosBancarios.alias!, "alias")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-400 transition shrink-0"
                        >
                          {copiedField === "alias" ? "¡Copiado!" : "Copiar"}
                        </button>
                      </div>
                    )}
                    {!datosBancarios?.cbu && !datosBancarios?.alias && (
                      <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                        ℹ️ El club no ha configurado CBU/Alias bancario todavía. Podés informar el pago y coordinar con el club.
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      N° de Transacción / Comprobante / Titular de la cuenta que transfiere:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Operación #987654 / Banco Galicia"
                      value={comprobanteTexto}
                      onChange={(e) => setComprobanteTexto(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm uppercase tracking-wider transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : metodoPago === "transferencia" ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Informar Transferencia / Pagar Mi Cuota ({formatPrecio(cuota.monto)})</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pagar Mi Cuota con Mercado Pago ({formatPrecio(cuota.monto)})</span>
                </>
              )}
            </button>

            <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Transacción y datos protegidos</span>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
