"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ComplejoData {
  id: number;
  uuid: string;
  nombre: string;
  subdominio: string;
  tipo_negocio?: { id: number; nombre: string; slug: string } | null;
  deporte_principal: string;
  telefono: string | null;
  ciudad: string | null;
  direccion: string | null;
  estado: string;
  owner: { id: number; name: string; email: string } | null;
}

interface PlanData {
  id: number;
  nombre: string;
  slug: string;
  precio_mensual: string | number;
  modulos: { id: number; nombre: string; slug: string; descripcion: string }[];
}

interface CanchaItem {
  id: number;
  nombre: string;
  deporte: string;
  superficie: string;
  precio_base: string | number;
  techada: boolean;
  estado: string;
}

interface HorarioItem {
  id: number;
  dia_semana: number;
  hora_apertura: string;
  hora_cierre: string;
  duracion_turno_minutos: number;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ClubAdminPanel() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "demo";
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<"canchas" | "modulos" | "horarios" | "config">("canchas");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [complejo, setComplejo] = useState<ComplejoData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [canchas, setCanchas] = useState<CanchaItem[]>([]);
  const [horarios, setHorarios] = useState<HorarioItem[]>([]);
  const [stats, setStats] = useState({ total_canchas: 0, total_turnos: 0, modulos_count: 0 });

  // Modal nueva cancha
  const [showAddCancha, setShowAddCancha] = useState(false);
  const [newCanchaNombre, setNewCanchaNombre] = useState("");
  const [newCanchaSuperficie, setNewCanchaSuperficie] = useState("cristal");
  const [newCanchaPrecio, setNewCanchaPrecio] = useState("8000");
  const [newCanchaTechada, setNewCanchaTechada] = useState(false);
  const [isSavingCancha, setIsSavingCancha] = useState(false);
  const [canchaSuccessMsg, setCanchaSuccessMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get active token from token prop, URL params (SSO transfer) or localStorage
      let activeToken = token;
      if (!activeToken && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        activeToken = params.get("auth_token") || params.get("token") || localStorage.getItem("saas_token");
      }

      // Check admin status for current user
      const adminRes = await fetch(`/api/clubs/${subdomain}/is-admin`, {
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      });
      const adminData = await adminRes.json();

      if (!adminData.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      const res = await fetch(`${API_BASE}/clubs/${subdomain}/dashboard`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "No se pudo cargar la información del club.");
        return;
      }

      setComplejo(data.data.complejo);
      setPlan(data.data.plan);
      setCanchas(data.data.canchas || []);
      setHorarios(data.data.horarios_atencion || []);
      setStats(data.data.stats || { total_canchas: 0, total_turnos: 0, modulos_count: 0 });
    } catch (e: any) {
      setError(e.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [subdomain, token]);

  const handleCreateCancha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanchaNombre.trim()) return;

    setIsSavingCancha(true);
    setCanchaSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/canchas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nombre: newCanchaNombre,
          superficie: newCanchaSuperficie,
          precio_base: parseFloat(newCanchaPrecio) || 8000,
          techada: newCanchaTechada,
          deporte: complejo?.deporte_principal || "padel",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error al crear la cancha.");
        return;
      }

      setCanchaSuccessMsg("¡Cancha agregada con éxito!");
      setNewCanchaNombre("");
      setShowAddCancha(false);
      fetchDashboardData();
    } catch (e: any) {
      alert(e.message || "Error de conexión.");
    } finally {
      setIsSavingCancha(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Verificando credenciales de {subdomain}...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="mx-auto max-w-md text-center rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 text-3xl border border-rose-500/20">
            🔒
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Acceso Restringido</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Este panel de administración es exclusivo para el dueño o administrador del complejo <strong>{subdomain}</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition"
            >
              ← Ir a Reservar Turnos
            </Link>
            <a
              href="http://localhost:8080/login"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition"
            >
              Iniciar Sesión
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header Banner */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 font-black text-white shadow-lg shadow-emerald-600/30">
                  ⚡
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white capitalize">
                      {complejo?.nombre || subdomain}
                    </h1>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold">
                      {complejo?.tipo_negocio?.nombre || "Club"}
                    </span>
                    <span className="rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 text-xs font-mono hidden sm:inline">
                      {subdomain}.localhost:8080
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Panel de Administración Oficial del {complejo?.tipo_negocio?.nombre || "Club"} • Dueño: <strong className="text-slate-200">{complejo?.owner?.name || user?.name || "Administrador"}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <span>🎾 Ver Sitio Público de Reservas</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Canchas Activas</span>
              <div className="mt-1 text-2xl font-black text-white">{stats.total_canchas}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Plan Contratado</span>
              <div className="mt-1 text-2xl font-black text-emerald-400 capitalize">{plan?.nombre || "Oro"}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Módulos Activos</span>
              <div className="mt-1 text-2xl font-black text-white">{plan?.modulos?.length || 7}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Prueba Gratuita</span>
              <div className="mt-1 text-sm font-bold text-emerald-300">✓ 14 Días Activos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex border-b border-slate-800 space-x-8 text-sm font-bold">
          <button
            onClick={() => setActiveTab("canchas")}
            className={`pb-4 transition border-b-2 ${
              activeTab === "canchas"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🎾 Canchas ({canchas.length})
          </button>
          <button
            onClick={() => setActiveTab("modulos")}
            className={`pb-4 transition border-b-2 ${
              activeTab === "modulos"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ Módulos & Herramientas
          </button>
          <button
            onClick={() => setActiveTab("horarios")}
            className={`pb-4 transition border-b-2 ${
              activeTab === "horarios"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🕒 Horarios de Atención
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`pb-4 transition border-b-2 ${
              activeTab === "config"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            📋 Datos del Club
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: CANCHAS */}
        {/* ========================================================================= */}
        {activeTab === "canchas" && (
          <div className="mt-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Canchas Disponibles</h2>
                <p className="text-xs text-slate-400">Configura tus canchas, superficies y precios por turno</p>
              </div>
              <button
                onClick={() => setShowAddCancha(!showAddCancha)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                {showAddCancha ? "✕ Cancelar" : "+ Agregar Cancha"}
              </button>
            </div>

            {canchaSuccessMsg && (
              <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-300">
                {canchaSuccessMsg}
              </div>
            )}

            {/* Modal / Form Nueva Cancha */}
            {showAddCancha && (
              <form onSubmit={handleCreateCancha} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Nueva Cancha de {complejo?.deporte_principal || "Pádel"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nombre de Cancha *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Cancha 3 (Central)"
                      value={newCanchaNombre}
                      onChange={(e) => setNewCanchaNombre(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Superficie</label>
                    <select
                      value={newCanchaSuperficie}
                      onChange={(e) => setNewCanchaSuperficie(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="cristal">Cristal / Panorámica</option>
                      <option value="sintetico">Césped Sintético</option>
                      <option value="cemento">Cemento / Rápida</option>
                      <option value="polvo">Polvo de Ladrillo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Precio por Turno ($)</label>
                    <input
                      type="number"
                      required
                      value={newCanchaPrecio}
                      onChange={(e) => setNewCanchaPrecio(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCancha(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCancha}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    {isSavingCancha ? "Guardando..." : "Guardar Cancha"}
                  </button>
                </div>
              </form>
            )}

            {/* Listado de Canchas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {canchas.map((c) => (
                <div key={c.id} className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-extrabold text-lg text-white">{c.nombre}</h3>
                      <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 uppercase">
                        {c.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Deporte: <strong className="text-slate-200 capitalize">{c.deporte}</strong> • Superficie: <strong className="text-slate-200 capitalize">{c.superficie}</strong>
                    </p>
                    <div className="mt-4 text-2xl font-black text-emerald-400">
                      ${c.precio_base} <span className="text-xs font-normal text-slate-400">/ hora</span>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{c.techada ? "🏠 Techada" : "☀️ Descubierta"}</span>
                    <Link href="/" className="text-emerald-400 font-bold hover:underline">
                      Ver Grilla →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MÓDULOS & HERRAMIENTAS */}
        {/* ========================================================================= */}
        {activeTab === "modulos" && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Módulos Activos de tu Plan {plan?.nombre}</h2>
              <p className="text-xs text-slate-400">Accede directamente a todas las herramientas incluidas en tu suscripción</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-3">📅</div>
                  <h3 className="font-bold text-lg text-white">Reservas & Agenda</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Grilla interactiva con bloqueos atómicos en Redis para evitar doble reserva.
                  </p>
                </div>
                <Link
                  href="/"
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Abrir Grilla en Vivo →
                </Link>
              </div>

              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-3">🍔</div>
                  <h3 className="font-bold text-lg text-white">Punto de Venta (POS) & Buffet</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Control de stock, comandas asignadas a turnos y arqueo de caja diaria.
                  </p>
                </div>
                <a
                  href="http://localhost:8080/admin"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Gestionar Productos en POS ↗
                </a>
              </div>

              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-3">🏆</div>
                  <h3 className="font-bold text-lg text-white">Torneos & Fixtures</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Generador automático de llaves eliminatorias, carga de scores y tablas de posiciones.
                  </p>
                </div>
                <a
                  href="http://localhost:8080/admin"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Ver Torneos & Brackets ↗
                </a>
              </div>

              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-3">💡</div>
                  <h3 className="font-bold text-lg text-white">Domótica IoT</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Encendido y apagado sincronizado de iluminación según horarios de reservas activas.
                  </p>
                </div>
                <div className="mt-6 rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-2.5 text-center text-xs font-bold text-emerald-300">
                  ✓ Sincronización Automática Activa
                </div>
              </div>

              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-3">💳</div>
                  <h3 className="font-bold text-lg text-white">Split Payment & Partidos</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Cobro fraccionado por jugador y convocatorias automáticas de partidos abiertos.
                  </p>
                </div>
                <a
                  href="http://localhost:8080/admin"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Ver Pagos Divididos ↗
                </a>
              </div>

              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <div className="text-3xl mb-3">🌐</div>
                  <h3 className="font-bold text-lg text-white">CMS Web & Landing Page</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Páginas institucionales con renderizado estático y sanitización de contenido.
                  </p>
                </div>
                <Link
                  href="/paginas/tarifas"
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Ver Página CMS Demo →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HORARIOS */}
        {/* ========================================================================= */}
        {activeTab === "horarios" && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Horarios de Apertura y Cierre</h2>
              <p className="text-xs text-slate-400">Días configurados para la generación automática de turnos</p>
            </div>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs uppercase">
                    <th className="p-4 font-bold">Día de la Semana</th>
                    <th className="p-4 font-bold">Hora de Apertura</th>
                    <th className="p-4 font-bold">Hora de Cierre</th>
                    <th className="p-4 font-bold">Duración por Turno</th>
                    <th className="p-4 font-bold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {horarios.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">{DIAS[h.dia_semana] || "Día"}</td>
                      <td className="p-4">{h.hora_apertura} hs</td>
                      <td className="p-4">{h.hora_cierre} hs</td>
                      <td className="p-4">{h.duracion_turno_minutos} minutos</td>
                      <td className="p-4 text-center">
                        <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5">
                          Abierto
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DATOS DEL CLUB */}
        {/* ========================================================================= */}
        {activeTab === "config" && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Información Institucional del Club</h2>
              <p className="text-xs text-slate-400">Datos públicos y dirección del complejo</p>
            </div>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Nombre del Complejo</span>
                  <div className="text-lg font-black text-white mt-1">{complejo?.nombre}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Subdominio Dedicado</span>
                  <div className="text-lg font-black text-emerald-400 mt-1">{complejo?.subdominio}.localhost:8080</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Deporte Principal</span>
                  <div className="text-base font-bold text-white mt-1 capitalize">{complejo?.deporte_principal || "Pádel"}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Teléfono de Contacto</span>
                  <div className="text-base font-bold text-white mt-1">{complejo?.telefono || "No especificado"}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Tipo de Establecimiento</span>
                  <div className="text-base font-bold text-emerald-400 mt-1">{complejo?.tipo_negocio?.nombre || "Club"}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Ciudad</span>
                  <div className="text-base font-bold text-white mt-1">{complejo?.ciudad || "No especificada"}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Dirección</span>
                  <div className="text-base font-bold text-white mt-1">{complejo?.direccion || "No especificada"}</div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  ✓ Configuración y estado operativo activo en la plataforma.
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ID: {complejo?.uuid?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
