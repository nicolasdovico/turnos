"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/OtpInput";
import { ArrowLeft, CheckCircle2, AlertTriangle, KeyRound, Mail, RefreshCw } from "lucide-react";

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function RecuperarPasswordPage() {
  const router = useRouter();

  // Step 1: Request Code / Step 2: Validate OTP & Set New Password / Step 3: Success
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cooldown timer for resending OTP
  const [cooldown, setCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Pre-fill email from URL if provided (e.g. from login link)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, []);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown > 0) {
      setCanResend(false);
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  // Handle Step 1: Send OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429 && data.cooldown) {
        setCooldown(data.remaining_seconds || 60);
        throw new Error(data.message || "Espera antes de solicitar otro código.");
      }

      if (!res.ok && !data.success) {
        throw new Error(data.message || "No se pudo procesar la solicitud.");
      }

      setSuccessMessage(data.message || "Código de verificación enviado.");
      setCooldown(60);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (!canResend || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429 && data.cooldown) {
        setCooldown(data.remaining_seconds || 60);
        throw new Error(data.message || "Espera antes de solicitar otro código.");
      }

      if (!res.ok && !data.success) {
        throw new Error(data.message || "No se pudo reenviar el código.");
      }

      setSuccessMessage("Se ha enviado un nuevo código de 6 dígitos a tu correo.");
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Error al reenviar el código.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 2: Validate OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Por favor ingresa los 6 dígitos del código de verificación.");
      return;
    }

    if (password.length < 6) {
      setError("La nueva contraseña debe contener al menos 6 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Las contraseñas ingresadas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          codigo: otp,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        let msg = data.message || "No se pudo restablecer la contraseña.";
        if (data.intentos_restantes !== undefined) {
          msg += ` (Intentos restantes: ${data.intentos_restantes})`;
        }
        throw new Error(msg);
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || "Error al procesar el cambio de contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100 shadow-sm">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Recuperar Contraseña
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {step === 1 && "Ingresa tu email para recibir un código de recuperación"}
              {step === 2 && `Ingresa el código enviado a ${email}`}
              {step === 3 && "¡Contraseña actualizada exitosamente!"}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div
              data-testid="alerta-error-recuperar"
              className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && step === 2 && (
            <div
              data-testid="alerta-exito-recuperar"
              className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: Solicitud de Correo */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tunombre@correo.com"
                    data-testid="input-recuperar-email"
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                data-testid="btn-enviar-codigo"
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Enviando código..." : "Enviar Código de Recuperación"}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Iniciar Sesión</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Ingreso de OTP y Nueva Contraseña */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 text-center">
                  Código de 6 Dígitos
                </label>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (error) setError(null);
                  }}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-3 pt-2">
                <PasswordInput
                  label="Nueva Contraseña (mínimo 6 caracteres)"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />

                <PasswordInput
                  label="Confirmar Nueva Contraseña"
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6 || !password || !passwordConfirmation}
                data-testid="btn-confirmar-nueva-password"
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Restableciendo..." : "Restablecer Contraseña"}
              </button>

              {/* Resend OTP button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Cambiar email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || isSubmitting}
                  data-testid="btn-reenviar-otp"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
                  <span>
                    {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Éxito y Redirección */}
          {step === 3 && (
            <div className="space-y-6 text-center py-4" data-testid="seccion-password-actualizada">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">
                  ¡Contraseña Modificada!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión con tu nueva clave en cualquier momento.
                </p>
              </div>

              <Link
                href="/login"
                data-testid="btn-ir-a-login"
                className="w-full inline-block rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition cursor-pointer text-center"
              >
                Iniciar Sesión Ahora →
              </Link>
            </div>
          )}
        </div>

        {/* Security advice card */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <span>🔒 Acceso seguro con encriptación de extremo a extremo • TurnosFlow</span>
        </div>
      </div>
    </div>
  );
}
