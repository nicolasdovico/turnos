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
  deporte_principal: string;
  telefono: string | null;
  ciudad: string | null;
  direccion: string | null;
  estado: string;
  tipo_cobro_reserva?: string;
  porcentaje_sena?: number;
  horas_limite_cancelacion?: number;
  permite_mostrador_publico?: boolean;
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

export default function ClubAdminDashboard() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) || "demo";
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<"canchas" | "modulos" | "horarios" | "politicas" | "config">("canchas");
  const [loading, setLoading] = useState(true);
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

  // Estados para Políticas de Cobro, Seña y Cancelación
  const [tipoCobroReserva, setTipoCobroReserva] = useState<string>("sena");
  const [porcentajeSena, setPorcentajeSena] = useState<number>(50);
  const [horasLimiteCancelacion, setHorasLimiteCancelacion] = useState<number>(4);
  const [permiteMostradorPublico, setPermiteMostradorPublico] = useState<boolean>(true);
  const [isSavingPoliticas, setIsSavingPoliticas] = useState(false);
  const [politicasSuccessMsg, setPoliticasSuccessMsg] = useState<string | null>(null);
  const [politicasErrorMsg, setPoliticasErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/dashboard`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "No se pudo cargar la información del club.");
        return;
      }

      if (data.data?.complejo) {
        setComplejo(data.data.complejo);
        if (data.data.complejo.tipo_cobro_reserva) {
          setTipoCobroReserva(data.data.complejo.tipo_cobro_reserva);
        }
        if (typeof data.data.complejo.porcentaje_sena === "number") {
          setPorcentajeSena(data.data.complejo.porcentaje_sena);
        }
        if (typeof data.data.complejo.horas_limite_cancelacion === "number") {
          setHorasLimiteCancelacion(data.data.complejo.horas_limite_cancelacion);
        }
        if (data.data.complejo.permite_mostrador_publico !== undefined) {
          setPermiteMostradorPublico(Boolean(data.data.complejo.permite_mostrador_publico));
        }
      }

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
  }, [subdomain]);

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

  const handleSavePoliticas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPoliticas(true);
    setPoliticasSuccessMsg(null);
    setPoliticasErrorMsg(null);

    try {
      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/configuracion`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          tipo_cobro_reserva: tipoCobroReserva,
          porcentaje_sena: porcentajeSena,
          horas_limite_cancelacion: horasLimiteCancelacion,
          permite_mostrador_publico: permiteMostradorPublico,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar las políticas del club.");
      }

      setPoliticasSuccessMsg("¡Políticas de cobro de seña y cancelación guardadas exitosamente!");
      if (data.complejo) {
        setComplejo((prev) => (prev ? { ...prev, ...data.complejo } : prev));
      }
    } catch (err: any) {
      setPoliticasErrorMsg(err.message || "Error al guardar.");
    } finally {
      setIsSavingPoliticas(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Cargando Panel de Control de {subdomain}...</p>
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
                      {subdomain}.localhost:8080
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Panel de Administración Oficial del Club • Dueño: <strong className="text-slate-200">{complejo?.owner?.name || user?.name || "Administrador"}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 border border-slate-700 transition"
              >
                🎾 Ver Sitio Público / Reservas ↗
              </Link>
              <a
                href="http://localhost:8080/admin"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition flex items-center gap-1.5"
              >
                <span>⚙️ Filament Super Admin</span>
                <span>↗</span>
              </a>
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
            onClick={() => setActiveTab("politicas")}
            className={`pb-4 transition border-b-2 ${
              activeTab === "politicas"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            💳 Políticas de Seña & Cancelación
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
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Gestionar Productos en POS →
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
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Ver Torneos & Brackets →
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
                  className="mt-6 block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                >
                  Ver Pagos Divididos →
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
        {/* TAB 4: POLÍTICAS DE SEÑA & CANCELACIÓN */}
        {/* ========================================================================= */}
        {activeTab === "politicas" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Políticas de Cobro, Seña y Cancelación</h2>
                <p className="text-xs text-slate-400">
                  Define cómo los jugadores deben señar sus turnos y las reglas de reembolso a billetera virtual
                </p>
              </div>
            </div>

            {politicasSuccessMsg && (
              <div role="alert" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <span>✓</span>
                <span>{politicasSuccessMsg}</span>
              </div>
            )}

            {politicasErrorMsg && (
              <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{politicasErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePoliticas} className="space-y-6">
              {/* Card 1: Modalidad de Cobro */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 text-xl">
                    💳
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">1. Modalidad de Cobro para Reservas Online</h3>
                    <p className="text-xs text-slate-400">Elige qué monto debe abonar el jugador para asegurar su cancha</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      tipoCobroReserva === "sena"
                        ? "bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Seña Obligatoria</span>
                      <input
                        type="radio"
                        name="tipo_cobro"
                        value="sena"
                        checked={tipoCobroReserva === "sena"}
                        onChange={() => setTipoCobroReserva("sena")}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      El jugador paga un porcentaje (ej. 50%) online y el saldo restante en el club.
                    </p>
                    <span className="mt-3 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 w-fit">
                      ⭐ Recomendado
                    </span>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      tipoCobroReserva === "total"
                        ? "bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Pago Total (100%)</span>
                      <input
                        type="radio"
                        name="tipo_cobro"
                        value="total"
                        checked={tipoCobroReserva === "total"}
                        onChange={() => {
                          setTipoCobroReserva("total");
                          setPorcentajeSena(100);
                        }}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Exige abonar el 100% del valor de la cancha al momento de reservar.
                    </p>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      tipoCobroReserva === "ninguno"
                        ? "bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/50"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Sin Seña Previa</span>
                      <input
                        type="radio"
                        name="tipo_cobro"
                        value="ninguno"
                        checked={tipoCobroReserva === "ninguno"}
                        onChange={() => setTipoCobroReserva("ninguno")}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Permite reservar gratis online y cobrar el total en el mostrador del club.
                    </p>
                  </label>
                </div>
              </div>

              {/* Card 2: Porcentaje de Seña */}
              {tipoCobroReserva === "sena" && (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">2. Porcentaje de Seña Requerida</h3>
                      <p className="text-xs text-slate-400">Configura entre el 10% y el 100% del valor total del turno</p>
                    </div>
                    <span className="text-2xl font-black text-emerald-400 font-mono bg-emerald-950 px-4 py-1.5 rounded-2xl border border-emerald-500/30">
                      {porcentajeSena}%
                    </span>
                  </div>

                  {/* Slider & Presets */}
                  <div className="space-y-4 pt-2">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      aria-label="Porcentaje de Seña"
                      value={porcentajeSena}
                      onChange={(e) => setPorcentajeSena(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Valores rápidos:</span>
                      {[20, 30, 50, 70, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPorcentajeSena(val)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                            porcentajeSena === val
                              ? "bg-emerald-500 text-slate-950 shadow"
                              : "bg-slate-800 text-slate-300 hover:text-white"
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>

                    {/* Live Simulation Box */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Ejemplo para un turno de <strong>$10.000</strong>:
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold">
                          Seña Online: ${(10000 * porcentajeSena / 100).toLocaleString()}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300 font-bold">
                          En el Club: ${(10000 - (10000 * porcentajeSena / 100)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Política de Cancelación y Billetera Virtual */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">3. Política de Cancelación & Reembolso</h3>
                    <p className="text-xs text-slate-400">
                      Anticipación mínima requerida para devolver la seña en créditos de Billetera Virtual
                    </p>
                  </div>
                  <span className="text-xl font-black text-emerald-400 font-mono bg-emerald-950 px-3.5 py-1 rounded-2xl border border-emerald-500/30">
                    {horasLimiteCancelacion} hs
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
                  {[1, 2, 4, 6, 12, 24, 48].map((hs) => (
                    <button
                      key={hs}
                      type="button"
                      onClick={() => setHorasLimiteCancelacion(hs)}
                      className={`p-3 rounded-2xl border text-center transition ${
                        horasLimiteCancelacion === hs
                          ? "bg-emerald-950/80 border-emerald-500 text-white ring-2 ring-emerald-500/50 shadow"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="text-sm font-black">{hs} hs</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {hs === 4 ? "Por Defecto" : hs === 24 ? "1 Día" : "Previas"}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-blue-300">
                    <span>💡</span> ¿Cómo funciona para el jugador y el club?
                  </div>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-blue-200/90">
                    <li>
                      <strong>Cancelación con {horasLimiteCancelacion}hs o más de aviso:</strong> El 100% de la seña abonada se acredita automáticamente en la <strong>Billetera Virtual</strong> del jugador para usar en su próximo turno en {complejo?.nombre}.
                    </li>
                    <li>
                      <strong>Cancelación con menos de {horasLimiteCancelacion}hs:</strong> El club <strong>retiene la seña</strong> en concepto de penalidad por vacancia de la cancha.
                    </li>
                    <li>
                      <strong>Lista de Espera:</strong> En ambos casos, el turno liberado se notifica por push inmediatamente a los jugadores suscritos en espera.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 4: Mostrador Presencial */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <div className="font-bold text-sm text-white">Permitir Pago en Mostrador para Clientes Públicos</div>
                  <p className="text-xs text-slate-400">
                    Si está activo, los jugadores pueden optar por reservar online y abonar presencialmente sin tarjeta previa.
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="Permitir Pago en Mostrador"
                  checked={permiteMostradorPublico}
                  onChange={(e) => setPermiteMostradorPublico(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPoliticas}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <span>{isSavingPoliticas ? "Guardando..." : "💾 Guardar Políticas de Reserva"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: DATOS DEL CLUB */}
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
                  <span className="text-xs font-bold uppercase text-slate-400">Ciudad</span>
                  <div className="text-base font-bold text-white mt-1">{complejo?.ciudad || "No especificada"}</div>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400">Dirección</span>
                  <div className="text-base font-bold text-white mt-1">{complejo?.direccion || "No especificada"}</div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6">
                <a
                  href="http://localhost:8080/admin"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-xs font-bold text-white transition"
                >
                  <span>Editar datos avanzados en Filament Admin</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
