"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

interface PlanItem {
  id: number;
  nombre: string;
  slug: string;
  precio_mensual: number;
  modulos?: { id: number; nombre: string; slug: string }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function RegistroClubPage() {
  const { user, token, setAuthSession, login } = useAuth();

  // Plans state
  const [planes, setPlanes] = useState<PlanItem[]>([
    {
      id: 1,
      nombre: "Bronce",
      slug: "bronce",
      precio_mensual: 29,
      modulos: [{ id: 1, nombre: "Reservas y Agenda", slug: "reservas" }, { id: 2, nombre: "CMS Web", slug: "cms_web" }],
    },
    {
      id: 2,
      nombre: "Plata",
      slug: "plata",
      precio_mensual: 59,
      modulos: [{ id: 1, nombre: "Reservas", slug: "reservas" }, { id: 2, nombre: "Turnos Fijos", slug: "turnos_fijos" }, { id: 3, nombre: "Split Payment", slug: "split_payment" }, { id: 4, nombre: "POS & Buffet", slug: "pos_buffet" }],
    },
    {
      id: 3,
      nombre: "Oro",
      slug: "oro",
      precio_mensual: 99,
      modulos: [{ id: 1, nombre: "Todo Incluido", slug: "reservas" }, { id: 2, nombre: "Torneos y Brackets", slug: "torneos" }, { id: 3, nombre: "Domótica IoT", slug: "domotica" }, { id: 4, nombre: "Split Payment", slug: "split_payment" }],
    },
  ]);

  // Form states
  const [nombreClub, setNombreClub] = useState("");
  const [subdominio, setSubdominio] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [subdomainMsg, setSubdomainMsg] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("oro");
  const [deporte, setDeporte] = useState("padel");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");

  // Canchas iniciales
  const [canchas, setCanchas] = useState<string[]>(["Cancha 1 (Cristal)", "Cancha 2 (Sintético)"]);

  // Guest admin inputs
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [passwordAdmin, setPasswordAdmin] = useState("");

  // Existing user quick login accordion
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ complejo: any; subdomain_url: string } | null>(null);

  // Fetch planes from backend
  useEffect(() => {
    fetch(`${API_BASE}/planes`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setPlanes(data.data);
        }
      })
      .catch((e) => console.log("Usando planes por defecto:", e));
  }, []);

  // Read plan query parameter (e.g. ?plan=plata)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get("plan");
      if (planParam && ["bronce", "plata", "oro"].includes(planParam.toLowerCase())) {
        setSelectedPlan(planParam.toLowerCase());
      }
    }
  }, []);
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Auto-generate subdomain from club name if not manually modified
  const handleNombreClubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNombreClub(val);
    if (subdomainStatus === "idle" || subdominio === slugify(nombreClub)) {
      const generated = slugify(val);
      setSubdominio(generated);
      if (generated.length >= 3) {
        checkSubdomainAvailability(generated);
      }
    }
  };

  // Check subdomain availability
  const checkSubdomainAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSubdomainStatus("idle");
      setSubdomainMsg("Mínimo 3 caracteres alfanuméricos");
      return;
    }

    setSubdomainStatus("checking");
    try {
      const res = await fetch(`${API_BASE}/clubs/check-subdomain?subdomain=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (res.ok && data.available) {
        setSubdomainStatus("available");
        setSubdomainMsg("¡Subdominio disponible!");
      } else {
        setSubdomainStatus("unavailable");
        setSubdomainMsg(data.message || "Subdominio no disponible");
      }
    } catch {
      setSubdomainStatus("available");
      setSubdomainMsg("Formato válido");
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = slugify(e.target.value);
    setSubdominio(clean);
    checkSubdomainAvailability(clean);
  };

  // Court management
  const addCancha = () => {
    setCanchas([...canchas, `Cancha ${canchas.length + 1}`]);
  };

  const removeCancha = (idx: number) => {
    setCanchas(canchas.filter((_, i) => i !== idx));
  };

  const updateCancha = (idx: number, val: string) => {
    const updated = [...canchas];
    updated[idx] = val;
    setCanchas(updated);
  };

  // Handle Quick Login
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await login(loginEmail, loginPassword);
    if (!res.success) {
      setLoginError(res.error || "Credenciales incorrectas");
    } else {
      setShowQuickLogin(false);
    }
  };

  // Submit Club Onboarding
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subdomainStatus === "unavailable") {
      setError("Por favor elige un subdominio que esté disponible.");
      return;
    }

    if (!user && (!nombreAdmin || !emailAdmin || !passwordAdmin)) {
      setError("Por favor completa los datos de tu cuenta de administrador.");
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      nombre_club: nombreClub,
      subdominio: subdominio,
      plan_slug: selectedPlan,
      deporte_principal: deporte,
      ciudad: ciudad,
      direccion: direccion,
      telefono: telefono,
      canchas: canchas.map((name) => ({
        nombre: name,
        deporte: deporte,
        tipo_superficie: "cristal",
        precio: 8000,
      })),
    };

    if (!user) {
      payload.nombre_admin = nombreAdmin;
      payload.email_admin = emailAdmin;
      payload.password_admin = passwordAdmin;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/clubs/registro`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Ocurrió un error al registrar el club.");
        setIsSubmitting(false);
        return;
      }

      // Save auth session
      if (data.token && data.user) {
        setAuthSession(data.user, data.token);
      }

      setSuccessData({
        complejo: data.complejo,
        subdomain_url: data.subdomain_url,
      });
    } catch (err: any) {
      setError(err.message || "Error de conexión al procesar el registro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // SUCCESS SCREEN
  // =========================================================================
  if (successData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl bg-white p-10 shadow-2xl border border-slate-100">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl mb-6 shadow-inner animate-bounce">
            🎉
          </div>
          <span className="inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 mb-3">
            ¡Club Creado con Éxito!
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Bienvenido a {successData.complejo.nombre}
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Tu complejo deportivo ha sido configurado y tu prueba gratuita de 14 días ya está activa.
          </p>

          <div className="my-8 rounded-2xl bg-slate-50 p-6 border border-slate-200 text-left space-y-2">
            <div className="text-xs font-bold uppercase text-slate-500">Tu dirección web personalizada:</div>
            <div className="text-lg font-black text-emerald-600 break-all">
              {successData.subdomain_url}
            </div>
            <div className="text-xs text-slate-500 pt-2">
              ✓ Plan: <strong className="text-slate-800">{successData.complejo.plan?.nombre}</strong>
              {" • "}
              ✓ Canchas activas: <strong className="text-slate-800">{successData.complejo.canchas?.length || 1}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={successData.subdomain_url}
              className="rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition"
            >
              Ir al Sitio de mi Club 🚀
            </a>
            <Link
              href="/"
              className="rounded-xl bg-slate-100 px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Volver al Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ONBOARDING WIZARD FORM
  // =========================================================================
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800 mb-3">
          Onboarding SaaS para Clubes
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Registra tu Club Deportivo
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Gestiona reservas en tiempo real, punto de venta buffet, domótica de luces y cobro de turnos con tu propio subdominio.
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl bg-rose-50 border border-rose-200 p-5 text-sm font-medium text-rose-800 shadow-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* =================================================================== */}
        {/* SECCIÓN 1: DATOS DEL CLUB */}
        {/* =================================================================== */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
              1
            </span>
            <h2 className="text-xl font-bold text-slate-900">Información del Complejo</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Nombre del Club o Complejo *
              </label>
              <input
                type="text"
                required
                value={nombreClub}
                onChange={handleNombreClubChange}
                placeholder="Ej. Pádel Master Center"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Subdominio Web Personalizado *
              </label>
              <div className="flex rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 overflow-hidden">
                <input
                  type="text"
                  required
                  value={subdominio}
                  onChange={handleSubdomainChange}
                  placeholder="padel-master"
                  className="w-full px-4 py-3 text-slate-900 text-sm focus:outline-none"
                />
                <span className="bg-slate-100 px-3 py-3 text-xs font-bold text-slate-500 flex items-center border-l border-slate-200">
                  .localhost:8080
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                {subdomainStatus === "checking" && <span className="text-slate-400">Verificando...</span>}
                {subdomainStatus === "available" && <span className="text-emerald-600 font-semibold">✓ {subdomainMsg}</span>}
                {subdomainStatus === "unavailable" && <span className="text-rose-600 font-semibold">✕ {subdomainMsg}</span>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Deporte Principal
              </label>
              <select
                value={deporte}
                onChange={(e) => setDeporte(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition bg-white"
              >
                <option value="padel">Pádel</option>
                <option value="tenis">Tenis</option>
                <option value="futbol">Fútbol 5 / 7</option>
                <option value="squash">Squash</option>
                <option value="pickleball">Pickleball</option>
                <option value="multideporte">Multideporte</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Ciudad / Localidad
              </label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej. Buenos Aires, Rosario, Córdoba"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Santa Fe 3200"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Teléfono / WhatsApp de Contacto
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+54 9 11 1234-5678"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECCIÓN 2: SELECCIÓN DE PLAN */}
        {/* =================================================================== */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
              2
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Selecciona tu Plan</h2>
              <p className="text-xs text-slate-500">Todos los planes incluyen 14 días de prueba gratis sin compromiso</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p) => {
              const isSelected = selectedPlan === p.slug;
              return (
                <div
                  key={p.slug}
                  onClick={() => setSelectedPlan(p.slug)}
                  className={`cursor-pointer rounded-2xl p-6 transition-all border-2 flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-extrabold text-lg text-slate-900 capitalize">{p.nombre}</h3>
                      {isSelected && (
                        <span className="rounded-full bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-black text-slate-900">${p.precio_mensual}</span>
                      <span className="text-xs text-slate-500"> / mes</span>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                      {p.modulos?.map((m) => (
                        <li key={m.slug} className="flex items-center gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{m.nombre}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      className={`w-full rounded-xl py-2 text-xs font-bold transition ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? "Plan Elegido" : "Elegir " + p.nombre}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* SECCIÓN 3: CUENTA DE ADMINISTRADOR */}
        {/* =================================================================== */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
              3
            </span>
            <h2 className="text-xl font-bold text-slate-900">Cuenta del Administrador del Club</h2>
          </div>

          {user ? (
            <div className="rounded-2xl bg-emerald-50 p-6 border border-emerald-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase text-emerald-800">Sesión Iniciada</div>
                <div className="text-base font-bold text-slate-900 mt-1">{user.name}</div>
                <div className="text-xs text-slate-600">{user.email}</div>
              </div>
              <span className="rounded-full bg-emerald-600 text-white text-xs font-bold px-3 py-1">
                ✓ Cuenta vinculada
              </span>
            </div>
          ) : (
            <div>
              {/* Quick Login Toggle */}
              <div className="mb-6 flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">
                  ¿Ya tienes una cuenta registrada en la plataforma?
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickLogin(!showQuickLogin)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-600 border border-slate-200 hover:bg-slate-50 transition shadow-sm"
                >
                  {showQuickLogin ? "Crear cuenta nueva" : "Iniciar Sesión para vincular"}
                </button>
              </div>

              {showQuickLogin ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 space-y-4 mb-4">
                  <h3 className="font-bold text-sm text-slate-900">Iniciar Sesión con tu Cuenta</h3>
                  {loginError && <div className="text-xs text-rose-600 font-semibold">{loginError}</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      type="email"
                      placeholder="Correo electrónico"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white"
                    />
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickLogin}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                  >
                    Verificar y Vincular
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Tu Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      required={!user}
                      value={nombreAdmin}
                      onChange={(e) => setNombreAdmin(e.target.value)}
                      placeholder="Ej. Martín Palermo"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Email de Acceso *
                    </label>
                    <input
                      type="email"
                      required={!user}
                      value={emailAdmin}
                      onChange={(e) => setEmailAdmin(e.target.value)}
                      placeholder="martin@miclub.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      required={!user}
                      value={passwordAdmin}
                      onChange={(e) => setPasswordAdmin(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* SECCIÓN 4: CANCHAS INICIALES (OPCIONAL) */}
        {/* =================================================================== */}
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
                4
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Canchas Iniciales</h2>
                <p className="text-xs text-slate-500">Podrás añadir más canchas en cualquier momento desde tu panel</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addCancha}
              className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              + Agregar Cancha
            </button>
          </div>

          <div className="space-y-3">
            {canchas.map((name, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateCancha(idx, e.target.value)}
                  placeholder={`Cancha ${idx + 1}`}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-slate-900 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                />
                {canchas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCancha(idx)}
                    className="rounded-xl p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Eliminar cancha"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* =================================================================== */}
        {/* BOTÓN FINAL DE REGISTRO */}
        {/* =================================================================== */}
        <div className="text-center pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-w-[320px] rounded-2xl bg-emerald-600 px-10 py-4 text-base font-extrabold text-white shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? "Creando tu Complejo Deportivo..." : "🚀 Crear mi Club y Comenzar Prueba Gratis"}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Al registrarte aceptas los términos del servicio. 14 días gratis sin compromiso.
          </p>
        </div>
      </form>
    </div>
  );
}
