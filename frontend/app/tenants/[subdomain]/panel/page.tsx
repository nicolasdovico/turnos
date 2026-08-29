"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  precio_con_luz?: string | number | null;
  techada: boolean;
  iluminacion?: boolean;
  tipo_iluminacion?: string | null;
  camara_grabacion?: boolean;
  marcador_digital?: boolean;
  climatizada?: boolean;
  tipo_cubierta?: string | null;
  tipo_pared?: string | null;
  formato?: string | null;
  estado: string;
}

interface SportConfig {
  nombre: string;
  superficies: { id: string; label: string }[];
  formatos: { id: string; label: string }[];
  tieneParedes: boolean;
  paredes?: { id: string; label: string }[];
}

const DEPORTES_CONFIG: Record<string, SportConfig> = {
  padel: {
    nombre: "Pádel",
    superficies: [
      { id: "sintetico_wpt", label: "Césped Sintético Texturado (WPT)" },
      { id: "sintetico_monofilamento", label: "Césped Sintético Monofilamento" },
      { id: "sintetico_fibrilado", label: "Césped Sintético Fibrilado" },
      { id: "cemento", label: "Cemento / Hormigón" },
    ],
    formatos: [
      { id: "dobles", label: "Dobles (2 vs 2 estándar)" },
      { id: "single", label: "Individual / Single (1 vs 1)" },
    ],
    tieneParedes: true,
    paredes: [
      { id: "cristal_panoramico", label: "Cristal Panorámico (Sin pilares)" },
      { id: "cristal_estandar", label: "Cristal Estándar 10/12mm" },
      { id: "muro_cemento", label: "Muro / Pared de Cemento" },
      { id: "reja", label: "Reja Perimetral" },
    ],
  },
  tenis: {
    nombre: "Tenis",
    superficies: [
      { id: "polvo_ladrillo", label: "Polvo de Ladrillo (Clay)" },
      { id: "cemento_rapida", label: "Cemento / Cancha Rápida (Hard Court)" },
      { id: "cesped_natural", label: "Césped Natural (Grass)" },
      { id: "sintetico", label: "Césped Sintético" },
    ],
    formatos: [
      { id: "single_dobles", label: "Single & Dobles (Estándar)" },
      { id: "single", label: "Exclusivo Single" },
    ],
    tieneParedes: false,
  },
  futbol: {
    nombre: "Fútbol",
    superficies: [
      { id: "sintetico_caucho", label: "Césped Sintético con Caucho" },
      { id: "sintetico_sin_caucho", label: "Césped Sintético Fibrilado" },
      { id: "cesped_natural", label: "Césped Natural" },
      { id: "parquet", label: "Parquet / Piso Flotante (Futsal)" },
      { id: "cemento", label: "Cemento / Baldosa" },
    ],
    formatos: [
      { id: "f5", label: "Fútbol 5 (Futsal)" },
      { id: "f7", label: "Fútbol 7" },
      { id: "f8", label: "Fútbol 8" },
      { id: "f11", label: "Fútbol 11 (Cancha Reglamentaria)" },
    ],
    tieneParedes: false,
  },
  basquet: {
    nombre: "Básquet",
    superficies: [
      { id: "parquet_madera", label: "Parquet / Madera Flotante" },
      { id: "cemento_pulido", label: "Cemento Pulido / Pintura Epoxi" },
      { id: "goma_poliuretano", label: "Goma / Poliuretano" },
    ],
    formatos: [
      { id: "5v5", label: "5 vs 5 (Cancha Completa)" },
      { id: "3v3", label: "3 vs 3 (Media Cancha)" },
    ],
    tieneParedes: false,
  },
  squash: {
    nombre: "Squash",
    superficies: [
      { id: "parquet", label: "Parquet / Madera Natural" },
    ],
    formatos: [
      { id: "individual", label: "Individual (Estándar)" },
    ],
    tieneParedes: true,
    paredes: [
      { id: "cristal_trasero", label: "Frontis Tradicional + Cristal Trasero" },
      { id: "cuatro_cristales", label: "Cancha Totalmente de Cristal" },
    ],
  },
};

interface HorarioItem {
  id: number;
  dia_semana: number;
  hora_apertura: string;
  hora_cierre: string;
  duracion_turno_minutos: number;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const ALL_MODULOS = [
  {
    slug: "reservas",
    nombre: "Reservas & Agenda",
    icon: "📅",
    descripcion: "Grilla interactiva con bloqueos atómicos en Redis para evitar doble reserva.",
    actionLabel: "Abrir Grilla en Vivo →",
    actionHref: "/",
    isExternal: false,
    planMinimo: "Bronce",
  },
  {
    slug: "cms_web",
    nombre: "CMS Web & Landing Page",
    icon: "🌐",
    descripcion: "Páginas institucionales con renderizado dinámico y sanitización de contenido.",
    actionLabel: "Ver Página CMS Demo →",
    actionHref: "/paginas/tarifas",
    isExternal: false,
    planMinimo: "Bronce",
  },
  {
    slug: "pos_buffet",
    nombre: "Punto de Venta (POS) & Buffet",
    icon: "🍔",
    descripcion: "Control de stock, comandas asignadas a turnos y arqueo de caja diaria.",
    actionLabel: "Gestionar Productos en POS ↗",
    actionHref: "http://localhost:8080/admin",
    isExternal: true,
    planMinimo: "Plata",
  },
  {
    slug: "turnos_fijos",
    nombre: "Turnos Fijos Recurrentes",
    icon: "🔁",
    descripcion: "Generación automática periódica de turnos semanales y mensuales para socios y clientes fijos.",
    actionLabel: "Ver Turnos Fijos ↗",
    actionHref: "http://localhost:8080/admin",
    isExternal: true,
    planMinimo: "Plata",
  },
  {
    slug: "split_payment",
    nombre: "Split Payment & Partidos Abiertos",
    icon: "💳",
    descripcion: "Cobro fraccionado por jugador y convocatorias automáticas de partidos abiertos con matchmaking.",
    actionLabel: "Ver Pagos Divididos ↗",
    actionHref: "http://localhost:8080/admin",
    isExternal: true,
    planMinimo: "Plata",
  },
  {
    slug: "torneos",
    nombre: "Torneos & Fixtures",
    icon: "🏆",
    descripcion: "Generador automático de llaves eliminatorias, carga de scores y tablas de posiciones.",
    actionLabel: "Ver Torneos & Brackets ↗",
    actionHref: "http://localhost:8080/admin",
    isExternal: true,
    planMinimo: "Oro",
  },
  {
    slug: "domotica",
    nombre: "Domótica IoT & Luces",
    icon: "💡",
    descripcion: "Encendido y apagado sincronizado de iluminación de canchas según horarios de reservas activas.",
    actionLabel: "Ver Dispositivos IoT ↗",
    actionHref: "http://localhost:8080/admin",
    isExternal: true,
    planMinimo: "Oro",
  },
];

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

  // Modal Alta / Edición de Cancha
  const [showCanchaModal, setShowCanchaModal] = useState(false);
  const [editingCancha, setEditingCancha] = useState<CanchaItem | null>(null);

  const [canchaNombre, setCanchaNombre] = useState("");
  const [canchaDeporte, setCanchaDeporte] = useState("padel");
  const [canchaSuperficie, setCanchaSuperficie] = useState("sintetico_wpt");
  const [canchaFormato, setCanchaFormato] = useState("dobles");
  const [canchaTipoPared, setCanchaTipoPared] = useState("cristal_panoramico");
  const [canchaPrecioBase, setCanchaPrecioBase] = useState("8000");
  const [canchaPrecioConLuz, setCanchaPrecioConLuz] = useState("");
  const [canchaTechada, setCanchaTechada] = useState(false);
  const [canchaTipoCubierta, setCanchaTipoCubierta] = useState("outdoor");
  const [canchaIluminacion, setCanchaIluminacion] = useState(true);
  const [canchaTipoIluminacion, setCanchaTipoIluminacion] = useState("led");
  const [canchaCamaraGrabacion, setCanchaCamaraGrabacion] = useState(false);
  const [canchaMarcadorDigital, setCanchaMarcadorDigital] = useState(false);
  const [canchaClimatizada, setCanchaClimatizada] = useState(false);
  const [canchaEstado, setCanchaEstado] = useState("activo");

  const [isSavingCancha, setIsSavingCancha] = useState(false);
  const [canchaSuccessMsg, setCanchaSuccessMsg] = useState<string | null>(null);
  const [canchaErrorMsg, setCanchaErrorMsg] = useState<string | null>(null);

  // Modal Confirmación de Eliminación
  const [canchaToDelete, setCanchaToDelete] = useState<CanchaItem | null>(null);
  const [isDeletingCancha, setIsDeletingCancha] = useState(false);

  // Modal Confirmación de Mantenimiento / Reactivación
  const [canchaToToggleStatus, setCanchaToToggleStatus] = useState<CanchaItem | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Ordenamiento alfabético natural por Nombre de Cancha
  const sortedCanchas = useMemo(() => {
    return [...canchas].sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || "", undefined, { numeric: true, sensitivity: "base" })
    );
  }, [canchas]);

  const openCreateModal = () => {
    setEditingCancha(null);
    const dep = complejo?.deporte_principal || "padel";
    const depConfig = DEPORTES_CONFIG[dep] || DEPORTES_CONFIG.padel;

    setCanchaNombre(`Cancha ${(canchas.length + 1)}`);
    setCanchaDeporte(dep);
    setCanchaSuperficie(depConfig.superficies[0]?.id || "sintetico");
    setCanchaFormato(depConfig.formatos[0]?.id || "dobles");
    setCanchaTipoPared(depConfig.paredes ? depConfig.paredes[0]?.id : "");
    setCanchaPrecioBase("8000");
    setCanchaPrecioConLuz("");
    setCanchaTechada(false);
    setCanchaTipoCubierta("outdoor");
    setCanchaIluminacion(true);
    setCanchaTipoIluminacion("led");
    setCanchaCamaraGrabacion(false);
    setCanchaMarcadorDigital(false);
    setCanchaClimatizada(false);
    setCanchaEstado("activo");

    setShowCanchaModal(true);
  };

  const openEditModal = (c: CanchaItem) => {
    setEditingCancha(c);
    const dep = c.deporte || complejo?.deporte_principal || "padel";
    const depConfig = DEPORTES_CONFIG[dep] || DEPORTES_CONFIG.padel;

    setCanchaNombre(c.nombre);
    setCanchaDeporte(dep);
    setCanchaSuperficie(c.superficie || depConfig.superficies[0]?.id);
    setCanchaFormato(c.formato || depConfig.formatos[0]?.id);
    setCanchaTipoPared(c.tipo_pared || (depConfig.paredes ? depConfig.paredes[0]?.id : ""));
    setCanchaPrecioBase(String(c.precio_base || "8000"));
    setCanchaPrecioConLuz(c.precio_con_luz ? String(c.precio_con_luz) : "");
    setCanchaTechada(Boolean(c.techada));
    setCanchaTipoCubierta(c.tipo_cubierta || (c.techada ? "indoor" : "outdoor"));
    setCanchaIluminacion(c.iluminacion !== undefined ? Boolean(c.iluminacion) : true);
    setCanchaTipoIluminacion(c.tipo_iluminacion || "led");
    setCanchaCamaraGrabacion(Boolean(c.camara_grabacion));
    setCanchaMarcadorDigital(Boolean(c.marcador_digital));
    setCanchaClimatizada(Boolean(c.climatizada));
    setCanchaEstado(c.estado || "activo");

    setShowCanchaModal(true);
  };

  const handleDeporteChange = (newDeporte: string) => {
    setCanchaDeporte(newDeporte);
    const depConfig = DEPORTES_CONFIG[newDeporte] || DEPORTES_CONFIG.padel;
    setCanchaSuperficie(depConfig.superficies[0]?.id || "sintetico");
    setCanchaFormato(depConfig.formatos[0]?.id || "");
    if (depConfig.tieneParedes && depConfig.paredes) {
      setCanchaTipoPared(depConfig.paredes[0]?.id || "cristal_estandar");
    } else {
      setCanchaTipoPared("");
    }
  };

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
      const adminRes = await fetch(`${API_BASE}/clubs/${subdomain}/is-admin`, {
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

      const canchasList = (data.data.canchas || []).sort((a: CanchaItem, b: CanchaItem) =>
        (a.nombre || "").localeCompare(b.nombre || "", undefined, { numeric: true, sensitivity: "base" })
      );

      setComplejo(data.data.complejo);
      setPlan(data.data.plan);
      setCanchas(canchasList);
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

  const handleSaveCancha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canchaNombre.trim()) return;

    setIsSavingCancha(true);
    setCanchaSuccessMsg(null);

    const depConfig = DEPORTES_CONFIG[canchaDeporte] || DEPORTES_CONFIG.padel;

    const payload = {
      nombre: canchaNombre,
      deporte: canchaDeporte,
      superficie: canchaSuperficie,
      formato: canchaFormato,
      tipo_pared: depConfig.tieneParedes ? canchaTipoPared : null,
      precio_base: parseFloat(canchaPrecioBase) || 8000,
      precio_con_luz: canchaPrecioConLuz ? parseFloat(canchaPrecioConLuz) : null,
      techada: canchaTechada,
      tipo_cubierta: canchaTechada ? "indoor" : canchaTipoCubierta,
      iluminacion: canchaIluminacion,
      tipo_iluminacion: canchaIluminacion ? canchaTipoIluminacion : null,
      camara_grabacion: canchaCamaraGrabacion,
      marcador_digital: canchaMarcadorDigital,
      climatizada: canchaClimatizada,
      estado: canchaEstado,
    };

    try {
      const url = editingCancha
        ? `${API_BASE}/clubs/${subdomain}/canchas/${editingCancha.id}`
        : `${API_BASE}/clubs/${subdomain}/canchas`;

      const method = editingCancha ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setCanchaErrorMsg(data.message || "Error al guardar la cancha.");
        return;
      }

      setCanchaSuccessMsg(
        editingCancha ? "¡Cancha actualizada con éxito!" : "¡Cancha agregada con éxito!"
      );
      setShowCanchaModal(false);
      setEditingCancha(null);
      fetchDashboardData();
    } catch (e: any) {
      setCanchaErrorMsg(e.message || "Error de conexión con el servidor.");
    } finally {
      setIsSavingCancha(false);
    }
  };

  const confirmToggleStatus = (c: CanchaItem) => {
    setCanchaErrorMsg(null);
    setCanchaToToggleStatus(c);
  };

  const executeToggleStatus = async () => {
    if (!canchaToToggleStatus) return;

    setIsTogglingStatus(true);
    setCanchaErrorMsg(null);

    const nuevoEstado = canchaToToggleStatus.estado === "activo" ? "mantenimiento" : "activo";
    try {
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/canchas/${canchaToToggleStatus.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nombre: canchaToToggleStatus.nombre,
          precio_base: canchaToToggleStatus.precio_base,
          estado: nuevoEstado,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCanchaSuccessMsg(
          nuevoEstado === "mantenimiento"
            ? `La cancha "${canchaToToggleStatus.nombre}" fue puesta en mantenimiento.`
            : `La cancha "${canchaToToggleStatus.nombre}" fue reactivada con éxito.`
        );
        setCanchaToToggleStatus(null);
        fetchDashboardData();
      } else {
        setCanchaErrorMsg(data.message || "Error al actualizar el estado de la cancha.");
      }
    } catch (e: any) {
      setCanchaErrorMsg(e.message || "Error de conexión con el servidor.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const confirmDeleteCancha = (c: CanchaItem) => {
    setCanchaErrorMsg(null);
    setCanchaToDelete(c);
  };

  const executeDeleteCancha = async () => {
    if (!canchaToDelete) return;

    setIsDeletingCancha(true);
    setCanchaErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/canchas/${canchaToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (res.ok) {
        setCanchaSuccessMsg(data.message || "Cancha procesada con éxito.");
        setCanchaToDelete(null);
        fetchDashboardData();
      } else {
        setCanchaErrorMsg(data.message || "Error al eliminar la cancha.");
      }
    } catch (e: any) {
      setCanchaErrorMsg(e.message || "Error de conexión con el servidor.");
    } finally {
      setIsDeletingCancha(false);
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
                <span>🎾 Ver Sitio Público</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Canchas Activas</span>
              <div className="mt-1 text-2xl font-black text-white">{canchas.length || stats.total_canchas}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Plan Contratado</span>
              <div className="mt-1 text-2xl font-black text-emerald-400 capitalize">
                {plan?.nombre || (loading ? "Cargando..." : "Bronce")}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Módulos Activos</span>
              <div className="mt-1 text-2xl font-black text-white">
                {plan?.modulos ? plan.modulos.length : (loading ? "..." : stats.modulos_count || 0)}
              </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Canchas Disponibles</h2>
                <p className="text-xs text-slate-400">
                  Configura tus canchas, tarifas, superficies y equipamiento
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>+ Nueva Cancha</span>
              </button>
            </div>

            {canchaSuccessMsg && (
              <div className="rounded-2xl bg-emerald-950/60 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-300 flex items-center justify-between">
                <span>{canchaSuccessMsg}</span>
                <button onClick={() => setCanchaSuccessMsg(null)} className="text-emerald-400 hover:text-white text-sm">✕</button>
              </div>
            )}

            {/* Modal Alta / Edición de Cancha con Inteligencia por Deporte */}
            {showCanchaModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {editingCancha ? `✏️ Editar: ${editingCancha.nombre}` : "➕ Nueva Cancha"}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Los atributos y superficies se adaptan inteligentemente según el deporte elegido
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCanchaModal(false)}
                      className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveCancha} className="space-y-6">
                    {/* SECCIÓN 1: DEPORTE Y CONFIGURACIÓN BÁSICA */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        1. Deporte y Formato
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Deporte *</label>
                          <select
                            value={canchaDeporte}
                            onChange={(e) => handleDeporteChange(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="padel">🎾 Pádel</option>
                            <option value="tenis">🎾 Tenis</option>
                            <option value="futbol">⚽ Fútbol</option>
                            <option value="basquet">🏀 Básquet</option>
                            <option value="squash">🏸 Squash</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nombre de Cancha *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Cancha 1 (Central Panorámica)"
                            value={canchaNombre}
                            onChange={(e) => setCanchaNombre(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Superficie</label>
                          <select
                            value={canchaSuperficie}
                            onChange={(e) => setCanchaSuperficie(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          >
                            {(DEPORTES_CONFIG[canchaDeporte]?.superficies || []).map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Formato / Modalidad</label>
                          <select
                            value={canchaFormato}
                            onChange={(e) => setCanchaFormato(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          >
                            {(DEPORTES_CONFIG[canchaDeporte]?.formatos || []).map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Selector de Paredes / Cerramiento: SÓLO para deportes con paredes (Pádel, Squash) */}
                      {DEPORTES_CONFIG[canchaDeporte]?.tieneParedes && (
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Tipo de Pared / Cerramiento (Exclusivo {DEPORTES_CONFIG[canchaDeporte].nombre})
                          </label>
                          <select
                            value={canchaTipoPared}
                            onChange={(e) => setCanchaTipoPared(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          >
                            {(DEPORTES_CONFIG[canchaDeporte]?.paredes || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 2: TARIFAS Y PRECIOS */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        2. Tarifas y Precios por Turno
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Precio Base Diurno ($) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="100"
                            placeholder="Ej. 8000"
                            value={canchaPrecioBase}
                            onChange={(e) => setCanchaPrecioBase(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Precio Nocturno / con Luz ($) <span className="text-slate-500 lowercase">(opcional)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="Ej. 10000"
                            value={canchaPrecioConLuz}
                            onChange={(e) => setCanchaPrecioConLuz(e.target.value)}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 3: EQUIPAMIENTO & SERVICIOS */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        3. Equipamiento
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Iluminación */}
                        <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={canchaIluminacion}
                            onChange={(e) => setCanchaIluminacion(e.target.checked)}
                            className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>💡</span> Iluminación Artificial
                            </div>
                            <div className="text-slate-400 text-[11px]">Habilitada para turnos de noche</div>
                          </div>
                        </label>

                        {/* Techada / Cubierta */}
                        <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={canchaTechada}
                            onChange={(e) => {
                              setCanchaTechada(e.target.checked);
                              setCanchaTipoCubierta(e.target.checked ? "indoor" : "outdoor");
                            }}
                            className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>🏠</span> Techada / Cubierta (Indoor)
                            </div>
                            <div className="text-slate-400 text-[11px]">Protegida contra lluvia y sol</div>
                          </div>
                        </label>

                        {/* Cámara de Grabación */}
                        <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={canchaCamaraGrabacion}
                            onChange={(e) => setCanchaCamaraGrabacion(e.target.checked)}
                            className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>📹</span> Cámara de Grabación
                            </div>
                            <div className="text-slate-400 text-[11px]">Grabación y replay de jugadas</div>
                          </div>
                        </label>

                        {/* Marcador Digital */}
                        <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={canchaMarcadorDigital}
                            onChange={(e) => setCanchaMarcadorDigital(e.target.checked)}
                            className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>🔢</span> Marcador Digital
                            </div>
                            <div className="text-slate-400 text-[11px]">Tanteador electrónico en vivo</div>
                          </div>
                        </label>

                        {/* Climatización */}
                        <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
                          <input
                            type="checkbox"
                            checked={canchaClimatizada}
                            onChange={(e) => setCanchaClimatizada(e.target.checked)}
                            className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                          />
                          <div className="text-xs">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>❄️</span> Climatización
                            </div>
                            <div className="text-slate-400 text-[11px]">Aire acondicionado / Calefacción</div>
                          </div>
                        </label>

                        {/* Estado */}
                        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                          <div className="text-xs">
                            <div className="font-bold text-white">⚙️ Estado Operativo</div>
                            <div className="text-slate-400 text-[11px]">Disponibilidad de reservas</div>
                          </div>
                          <select
                            value={canchaEstado}
                            onChange={(e) => setCanchaEstado(e.target.value)}
                            className="rounded-lg bg-slate-900 border border-slate-700 text-xs px-2.5 py-1 text-white"
                          >
                            <option value="activo">🟢 Activa</option>
                            <option value="mantenimiento">🟡 Mantenimiento</option>
                            <option value="inactivo">⚪ Inactiva</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowCanchaModal(false)}
                        className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingCancha}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                      >
                        {isSavingCancha ? "Guardando..." : editingCancha ? "Actualizar Cancha" : "Crear Cancha"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal de Confirmación de Eliminación / Inactivación de Cancha con Estilo del Sistema */}
            {canchaToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
                <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-150">
                  {/* Warning Icon Badge */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 text-3xl border border-rose-500/20 shadow-inner">
                    🗑️
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      ¿Eliminar {canchaToDelete.nombre}?
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      Esta acción retirará la cancha de las reservas públicas. Si la cancha posee reservas históricas, el sistema la marcará automáticamente como <strong>inactiva</strong> para preservar la integridad de tu agenda.
                    </p>
                  </div>

                  {/* Court summary pill */}
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-white flex items-center justify-center gap-2">
                      <span className="capitalize">{canchaToDelete.deporte}</span> • <span>{canchaToDelete.superficie}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tarifa: <strong className="text-emerald-400">${canchaToDelete.precio_base} / turno</strong>
                    </div>
                  </div>

                  {canchaErrorMsg && (
                    <div className="rounded-xl bg-rose-950/60 border border-rose-500/30 p-3 text-xs font-bold text-rose-300">
                      {canchaErrorMsg}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isDeletingCancha}
                      onClick={() => {
                        setCanchaToDelete(null);
                        setCanchaErrorMsg(null);
                      }}
                      className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingCancha}
                      onClick={executeDeleteCancha}
                      className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isDeletingCancha ? "Eliminando..." : "Sí, Eliminar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Confirmación de Mantenimiento / Reactivación con Estilo del Sistema */}
            {canchaToToggleStatus && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
                <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-150">
                  {/* Warning / Status Icon Badge */}
                  {canchaToToggleStatus.estado === "activo" ? (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-3xl border border-amber-500/20 shadow-inner">
                      ⏸️
                    </div>
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 text-3xl border border-emerald-500/20 shadow-inner">
                      ▶️
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {canchaToToggleStatus.estado === "activo"
                        ? `¿Poner ${canchaToToggleStatus.nombre} en Mantenimiento?`
                        : `¿Reactivar ${canchaToToggleStatus.nombre}?`}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {canchaToToggleStatus.estado === "activo"
                        ? "Al activar el modo mantenimiento, esta cancha quedará temporalmente pausada y no estará disponible para nuevas reservas públicas ni turnos online. Las reservas ya confirmadas permanecerán intactas."
                        : "La cancha saldrá del modo mantenimiento y volverá a estar habilitada inmediatamente para reservas públicas y agenda de turnos."}
                    </p>
                  </div>

                  {/* Court summary pill */}
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-white flex items-center justify-center gap-2">
                      <span className="capitalize">{canchaToToggleStatus.deporte}</span> • <span>{canchaToToggleStatus.superficie}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Estado actual: <strong className="uppercase text-amber-400">{canchaToToggleStatus.estado}</strong> • Tarifa: <strong className="text-emerald-400">${canchaToToggleStatus.precio_base} / turno</strong>
                    </div>
                  </div>

                  {canchaErrorMsg && (
                    <div className="rounded-xl bg-rose-950/60 border border-rose-500/30 p-3 text-xs font-bold text-rose-300">
                      {canchaErrorMsg}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isTogglingStatus}
                      onClick={() => {
                        setCanchaToToggleStatus(null);
                        setCanchaErrorMsg(null);
                      }}
                      className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isTogglingStatus}
                      onClick={executeToggleStatus}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                        canchaToToggleStatus.estado === "activo"
                          ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                          : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                      }`}
                    >
                      {isTogglingStatus
                        ? "Guardando..."
                        : canchaToToggleStatus.estado === "activo"
                        ? "Sí, Pausar Cancha"
                        : "Sí, Reactivar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Listado Enriquecido de Canchas (Orden Alfabético) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCanchas.map((c) => {
                const sportCfg = DEPORTES_CONFIG[c.deporte?.toLowerCase()] || DEPORTES_CONFIG.padel;
                const tieneParedes = sportCfg?.tieneParedes;

                return (
                  <div
                    key={c.id}
                    className={`rounded-3xl p-6 flex flex-col justify-between transition border ${
                      c.estado === "mantenimiento"
                        ? "bg-slate-900/60 border-amber-500/40"
                        : c.estado === "inactivo"
                        ? "bg-slate-950/60 border-slate-900 opacity-60"
                        : "bg-slate-900 border-slate-800 hover:border-emerald-500/40"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-extrabold text-lg text-white">{c.nombre}</h3>
                          <div className="text-xs text-slate-400 capitalize font-medium">
                            {c.deporte} • {c.formato || "Estándar"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full text-[10px] font-bold px-2.5 py-0.5 uppercase ${
                              c.estado === "activo"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : c.estado === "mantenimiento"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {c.estado}
                          </span>
                        </div>
                      </div>

                      {/* Attributes Badges / Chips */}
                      <div className="flex flex-wrap gap-1.5 my-3">
                        <span className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-medium">
                          👟 {c.superficie}
                        </span>

                        {tieneParedes && c.tipo_pared && (
                          <span className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-0.5 text-[11px] text-emerald-300 font-medium">
                            🪟 {c.tipo_pared}
                          </span>
                        )}

                        <span className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-medium">
                          {c.techada ? "🏠 Techada (Indoor)" : "☀️ Descubierta (Outdoor)"}
                        </span>

                        {c.iluminacion !== false && (
                          <span className="rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium">
                            💡 Luz {c.tipo_iluminacion || "LED"}
                          </span>
                        )}

                        {Boolean(c.camara_grabacion) && (
                          <span className="rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-medium">
                            📹 Cámara Grabación
                          </span>
                        )}

                        {Boolean(c.marcador_digital) && (
                          <span className="rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 text-[11px] font-medium">
                            🔢 Marcador Digital
                          </span>
                        )}

                        {Boolean(c.climatizada) && (
                          <span className="rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 text-[11px] font-medium">
                            ❄️ Climatizada
                          </span>
                        )}
                      </div>

                      {/* Pricing Details */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500">Tarifa Turno:</span>
                          <div className="text-xl font-black text-emerald-400">
                            ${c.precio_base} <span className="text-xs font-normal text-slate-400">/ hora</span>
                          </div>
                        </div>

                        {c.precio_con_luz && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-amber-400/80">🌙 Con Luz:</span>
                            <div className="text-base font-bold text-amber-300">
                              ${c.precio_con_luz}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition"
                          title="Editar configuración y atributos"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => confirmToggleStatus(c)}
                          className="rounded-xl bg-slate-950 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-amber-300 border border-slate-800 transition"
                          title={c.estado === "activo" ? "Poner en mantenimiento" : "Reactivar"}
                        >
                          {c.estado === "activo" ? "⏸️" : "▶️"}
                        </button>
                        <button
                          onClick={() => confirmDeleteCancha(c)}
                          className="rounded-xl bg-slate-950 hover:bg-rose-950/60 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800 transition"
                          title="Eliminar o inactivar"
                        >
                          🗑️
                        </button>
                      </div>

                      <Link href="/" className="text-emerald-400 font-bold hover:underline text-xs">
                        Ver Grilla →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MÓDULOS & HERRAMIENTAS */}
        {/* ========================================================================= */}
        {activeTab === "modulos" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Módulos de tu Plan {plan?.nombre || "Bronce"}
                </h2>
                <p className="text-xs text-slate-400">
                  {plan?.modulos?.length || 0} módulos activos incluidos en tu suscripción
                </p>
              </div>
              <a
                href="http://localhost:8080/planes"
                className="self-start sm:self-auto rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-emerald-400 border border-slate-700 transition"
              >
                ⚡ Ver Comparativa de Planes
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ALL_MODULOS.map((mod) => {
                const isActivo = plan?.modulos?.some((m) => m.slug === mod.slug) ?? false;

                return (
                  <div
                    key={mod.slug}
                    className={`rounded-3xl p-6 flex flex-col justify-between transition border ${
                      isActivo
                        ? "bg-slate-900 border-slate-800 hover:border-emerald-500/50"
                        : "bg-slate-950/40 border-slate-900/80 opacity-70"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-3xl">{mod.icon}</span>
                        {isActivo ? (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5">
                            ✓ Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800/80 text-slate-400 border border-slate-700 text-[10px] font-bold px-2.5 py-0.5">
                            🔒 Requiere Plan {mod.planMinimo}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-white">{mod.nombre}</h3>
                      <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                        {mod.descripcion}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60">
                      {isActivo ? (
                        mod.isExternal ? (
                          <a
                            href={mod.actionHref}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                          >
                            {mod.actionLabel}
                          </a>
                        ) : (
                          <Link
                            href={mod.actionHref}
                            className="block w-full text-center rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-emerald-400 border border-slate-700 transition"
                          >
                            {mod.actionLabel}
                          </Link>
                        )
                      ) : (
                        <a
                          href="http://localhost:8080/planes"
                          className="block w-full text-center rounded-xl bg-slate-900/60 hover:bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-400 border border-slate-800 transition"
                        >
                          Actualizar a Plan {mod.planMinimo} ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
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
