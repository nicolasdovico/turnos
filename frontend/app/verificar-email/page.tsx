"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import OtpInput from "../../components/OtpInput";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function VerificarEmailPage() {
  const router = useRouter();
  const { user, token, markEmailAsVerified, setAuthSession } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Club context parameters from URL
  const [clubName, setClubName] = useState<string | null>(null);
  const [subdomainUrl, setSubdomainUrl] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);

  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const clubParam = params.get("club");
      const subdomainUrlParam = params.get("subdomain_url");
      const redirectParam = params.get("redirect");

      if (emailParam) {
        setEmail(emailParam);
      } else if (user?.email) {
        setEmail(user.email);
      }

      if (clubParam) setClubName(clubParam);
      if (subdomainUrlParam) setSubdomainUrl(subdomainUrlParam);
      if (redirectParam) setRedirectUrl(redirectParam);
    }
  }, [user]);

  // Countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (!code || code.length !== 6) {
      setError("Por favor ingresa el código completo de 6 dígitos.");
      return;
    }

    if (!email) {
      setError("No se especificó un correo electrónico.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email, codigo: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Código incorrecto o expirado.");
        setIsSubmitting(false);
        return;
      }

      // Establish authenticated session ONLY after OTP is validated
      if (data.token && data.user) {
        setAuthSession(data.user, data.token);
        setVerifiedToken(data.token);
      }

      markEmailAsVerified();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error de conexión al verificar el código.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    setError(null);
    setResendStatus("Enviando nuevo código...");

    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al reenviar el código.");
        setResendStatus(null);
        return;
      }

      setResendStatus("¡Código enviado con éxito!");
      setCooldown(60);
      setCanResend(false);
      setOtp("");
    } catch (err: any) {
      setError(err.message || "Error de conexión.");
      setResendStatus(null);
    }
  };

  if (success) {
    const destinationUrl = redirectUrl
      ? `${redirectUrl}?auth_token=${verifiedToken || token || ""}`
      : subdomainUrl
      ? `${subdomainUrl}/panel?auth_token=${verifiedToken || token || ""}`
      : null;

    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl border border-slate-100">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl mb-6 shadow-inner animate-bounce">
            🎉
          </div>
          <span className="inline-block rounded-full bg-emerald-50 px-4 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 mb-3">
            {clubName ? "¡Club y Cuenta Activados!" : "¡Email Confirmado!"}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {clubName ? `¡Bienvenido a ${clubName}!` : "Cuenta Verificada"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tu correo <strong className="text-slate-900">{email}</strong> ha sido verificado con éxito.
            {clubName
              ? " Tu cuenta de administrador y tu club ya están listos para operar."
              : " Ya puedes utilizar todas las funciones de la plataforma."}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {destinationUrl ? (
              <a
                href={destinationUrl}
                className="rounded-xl bg-emerald-600 py-3.5 px-6 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition block text-center"
              >
                🚀 Ir al Panel de mi Club
              </a>
            ) : null}
            <Link
              href="/"
              className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Ir al Portal Principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-3xl bg-white p-8 sm:p-10 shadow-2xl border border-slate-100 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-3xl mb-4 border border-emerald-100 shadow-sm">
            ✉️
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Verifica tu Correo
          </h1>

          {clubName && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              🏢 Activando: <strong>{clubName}</strong>
            </div>
          )}

          <p className="mt-2 text-sm text-slate-600">
            Hemos enviado un código de 6 dígitos a:
          </p>
          <div className="mt-1 font-bold text-slate-900 text-base break-all bg-slate-50 py-1.5 px-3 rounded-lg inline-block border border-slate-200">
            {email || "tu correo electrónico"}
          </div>

          {error && (
            <div className="mt-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 text-left">
              {error}
            </div>
          )}

          {resendStatus && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-700">
              {resendStatus}
            </div>
          )}

          {/* OTP Input Component */}
          <div className="my-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Ingresa el código de 6 dígitos
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              onComplete={(completedCode) => handleVerify(completedCode)}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isSubmitting || otp.length !== 6}
            className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? "Verificando..." : "Confirmar Código OTP"}
          </button>

          {/* Resend Actions */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-xs text-slate-500">
            ¿No recibiste el correo?{" "}
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Reenviar código
              </button>
            ) : (
              <span className="text-slate-400">
                Puedes solicitar un nuevo código en <strong className="text-slate-600">{cooldown}s</strong>
              </span>
            )}
          </div>
        </div>

        {/* Mailpit Development Helper Card */}
        <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white shadow-lg border border-slate-800 text-left">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 uppercase tracking-wider mb-1">
            <span>📮</span> Entorno de Desarrollo (Mailpit Activo)
          </div>
          <p className="text-xs text-slate-300">
            Los correos son interceptados localmente. Puedes ver la bandeja de entrada y copiar el código OTP abriendo:
          </p>
          <a
            href="http://localhost:8025"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-black text-emerald-400 hover:text-emerald-300 underline"
          >
            👉 Abrir Web UI de Mailpit (http://localhost:8025)
          </a>
        </div>
      </div>
    </div>
  );
}
