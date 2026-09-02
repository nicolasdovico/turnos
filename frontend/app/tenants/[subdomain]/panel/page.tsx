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
  duracion_minutos?: number;
  permite_duracion_flexible?: boolean;
  anti_baches_activo?: boolean;
  duraciones_permitidas?: number[];
  precio_90_min?: string | number | null;
  precio_120_min?: string | number | null;
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

interface HorarioDiaForm {
  dia_semana: number;
  nombre: string;
  abierto: boolean;
  hora_apertura: string;
  hora_cierre: string;
  duracion_turno_minutos: number;
}

interface TurnoFijoFecha {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  estado_pago: string;
  precio: number;
  monto_pagado: number;
  metodo_pago?: string;
}

interface TurnoFijoSerie {
  id: number;
  cancha_id: number;
  cancha_nombre: string;
  deporte: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  cliente_id: number | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  metodo_pago: string;
  total_turnos: number;
  proximas_fechas_count: number;
  proxima_fecha: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  requiere_renovacion: boolean;
  dias_restantes_aprox: number;
  proximas_fechas: TurnoFijoFecha[];
}

const DIAS_CONFIG = [
  { dia_semana: 1, nombre: "Lunes" },
  { dia_semana: 2, nombre: "Martes" },
  { dia_semana: 3, nombre: "Miércoles" },
  { dia_semana: 4, nombre: "Jueves" },
  { dia_semana: 5, nombre: "Viernes" },
  { dia_semana: 6, nombre: "Sábado" },
  { dia_semana: 0, nombre: "Domingo" },
];

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

  const [activeTab, setActiveTab] = useState<"canchas" | "modulos" | "horarios" | "turnos-fijos" | "politicas" | "config">("canchas");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [complejo, setComplejo] = useState<ComplejoData | null>(null);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [canchas, setCanchas] = useState<CanchaItem[]>([]);
  const [horarios, setHorarios] = useState<HorarioItem[]>([]);
  const [horariosForm, setHorariosForm] = useState<HorarioDiaForm[]>(() =>
    DIAS_CONFIG.map((d) => ({
      dia_semana: d.dia_semana,
      nombre: d.nombre,
      abierto: true,
      hora_apertura: "08:00",
      hora_cierre: "23:00",
      duracion_turno_minutos: 60,
    }))
  );
  const [isSavingHorarios, setIsSavingHorarios] = useState(false);
  const [horariosSuccessMsg, setHorariosSuccessMsg] = useState<string | null>(null);
  const [horariosErrorMsg, setHorariosErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({ total_canchas: 0, total_turnos: 0, modulos_count: 0 });

  // Estados para Turnos Fijos
  const [turnosFijos, setTurnosFijos] = useState<TurnoFijoSerie[]>([]);
  const [loadingTurnosFijos, setLoadingTurnosFijos] = useState(false);
  const [filtroDiaFijo, setFiltroDiaFijo] = useState<number | "todos">("todos");
  const [filtroCanchaFijo, setFiltroCanchaFijo] = useState<number | "todos">("todos");
  const [showNewTurnoFijoModal, setShowNewTurnoFijoModal] = useState(false);
  const [isSavingTurnoFijo, setIsSavingTurnoFijo] = useState(false);
  const [isRenewingSerieKey, setIsRenewingSerieKey] = useState<string | null>(null);
  const [turnosFijosSuccessMsg, setTurnosFijosSuccessMsg] = useState<string | null>(null);
  const [turnosFijosErrorMsg, setTurnosFijosErrorMsg] = useState<string | null>(null);
  const [expandedSerieKey, setExpandedSerieKey] = useState<string | null>(null);

  // Formulario de Alta Turno Fijo
  const [tfCanchaId, setTfCanchaId] = useState<number | "">("");
  const [tfDiaSemana, setTfDiaSemana] = useState<number>(1); // Lunes
  const [tfHoraInicio, setTfHoraInicio] = useState<string>("19:00");
  const [tfHoraFin, setTfHoraFin] = useState<string>("");
  const [tfTipoCliente, setTfTipoCliente] = useState<"manual" | "registrado">("manual");
  const [tfClienteNombre, setTfClienteNombre] = useState<string>("");
  const [tfClienteTelefono, setTfClienteTelefono] = useState<string>("");
  const [tfClienteId, setTfClienteId] = useState<number | "">("");
  const [tfPrecio, setTfPrecio] = useState<string>("");
  const [tfSemanas, setTfSemanas] = useState<number>(26); // 6 meses estándar
  const [tfMetodoPago, setTfMetodoPago] = useState<string>("mostrador");

  // Búsqueda de Usuarios Registrados (Select Editable / Combobox)
  const [searchUserQuery, setSearchUserQuery] = useState<string>("");
  const [searchedUsers, setSearchedUsers] = useState<Array<{ id: number; name: string; email: string; telefono?: string | null }>>([]);
  const [loadingSearchUsers, setLoadingSearchUsers] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [selectedUserObj, setSelectedUserObj] = useState<{ id: number; name: string; email: string; telefono?: string | null } | null>(null);

  // Modales de Liberación / Baja
  const [serieToCancel, setSerieToCancel] = useState<TurnoFijoSerie | null>(null);
  const [fechaPuntualToRelease, setFechaPuntualToRelease] = useState<{ id: number; fecha: string; hora_inicio: string } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Estados para Políticas de Cobro, Seña y Cancelación
  const [tipoCobroReserva, setTipoCobroReserva] = useState<string>("sena");
  const [porcentajeSena, setPorcentajeSena] = useState<number>(50);
  const [horasLimiteCancelacion, setHorasLimiteCancelacion] = useState<number>(4);
  const [permiteMostradorPublico, setPermiteMostradorPublico] = useState<boolean>(true);
  const [isSavingPoliticas, setIsSavingPoliticas] = useState(false);
  const [politicasSuccessMsg, setPoliticasSuccessMsg] = useState<string | null>(null);
  const [politicasErrorMsg, setPoliticasErrorMsg] = useState<string | null>(null);

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
  const [canchaDuracionMinutos, setCanchaDuracionMinutos] = useState(60);
  const [canchaPermiteDuracionFlexible, setCanchaPermiteDuracionFlexible] = useState(false);
  const [canchaAntiBachesActivo, setCanchaAntiBachesActivo] = useState(true);
  const [canchaPrecio90Min, setCanchaPrecio90Min] = useState("");
  const [canchaPrecio120Min, setCanchaPrecio120Min] = useState("");
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
    setCanchaDuracionMinutos(dep === "padel" ? 90 : 60);
    setCanchaPermiteDuracionFlexible(false);
    setCanchaAntiBachesActivo(true);
    setCanchaPrecio90Min("");
    setCanchaPrecio120Min("");
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
    setCanchaDuracionMinutos(c.duracion_minutos || (dep === "padel" ? 90 : 60));
    setCanchaPermiteDuracionFlexible(Boolean(c.permite_duracion_flexible));
    setCanchaAntiBachesActivo(c.anti_baches_activo !== undefined ? Boolean(c.anti_baches_activo) : true);
    setCanchaPrecio90Min(c.precio_90_min ? String(c.precio_90_min) : "");
    setCanchaPrecio120Min(c.precio_120_min ? String(c.precio_120_min) : "");
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
    if (newDeporte === "padel") {
      setCanchaDuracionMinutos(90);
    }
    if (depConfig.tieneParedes && depConfig.paredes) {
      setCanchaTipoPared(depConfig.paredes[0]?.id || "cristal_estandar");
    } else {
      setCanchaTipoPared("");
    }
  };

  const fetchDashboardData = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

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
        if (!silent) setLoading(false);
        return;
      }
      setIsAdmin(true);

      const res = await fetch(`${API_BASE}/clubs/${subdomain}/dashboard`);
      const data = await res.json();

      if (!res.ok) {
        if (!silent) {
          setError(data.message || "No se pudo cargar la información del club.");
        }
        return;
      }

      const canchasList = (data.data.canchas || []).sort((a: CanchaItem, b: CanchaItem) =>
        (a.nombre || "").localeCompare(b.nombre || "", undefined, { numeric: true, sensitivity: "base" })
      );

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
      setCanchas(canchasList);
      const rawHorarios: HorarioItem[] = data.data.horarios_atencion || [];
      setHorarios(rawHorarios);
      setHorariosForm(
        DIAS_CONFIG.map((d) => {
          const found = rawHorarios.find((h) => Number(h.dia_semana) === Number(d.dia_semana));
          if (found) {
            return {
              dia_semana: d.dia_semana,
              nombre: d.nombre,
              abierto: true,
              hora_apertura: (found.hora_apertura || "08:00").substring(0, 5),
              hora_cierre: (found.hora_cierre || "23:00").substring(0, 5),
              duracion_turno_minutos: Number(found.duracion_turno_minutos) || 60,
            };
          }
          return {
            dia_semana: d.dia_semana,
            nombre: d.nombre,
            abierto: false,
            hora_apertura: "08:00",
            hora_cierre: "23:00",
            duracion_turno_minutos: 60,
          };
        })
      );
      setStats(data.data.stats || { total_canchas: 0, total_turnos: 0, modulos_count: 0 });
    } catch (e: any) {
      if (!silent) {
        setError(e.message || "Error al conectar con el servidor.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTurnosFijos = async (silent: boolean = false) => {
    try {
      if (!silent) setLoadingTurnosFijos(true);
      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/turnos-fijos`, {
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTurnosFijos(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      if (!silent) setLoadingTurnosFijos(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchTurnosFijos();
  }, [subdomain, token]);

  // Smart background polling and window focus revalidation (SWR pattern)
  useEffect(() => {
    const POLL_INTERVAL = 30000; // 30 seconds
    const intervalId = setInterval(() => {
      fetchDashboardData(true);
      fetchTurnosFijos(true);
    }, POLL_INTERVAL);

    const onWindowFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchDashboardData(true);
        fetchTurnosFijos(true);
      }
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onWindowFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onWindowFocus);
    };
  }, [subdomain, token]);

  const fetchRegisteredUsers = async (query: string = "") => {
    try {
      setLoadingSearchUsers(true);
      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const url = `${API_BASE}/clubs/${subdomain}/usuarios/buscar${query ? `?q=${encodeURIComponent(query)}` : ""}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchedUsers(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSearchUsers(false);
    }
  };

  useEffect(() => {
    if (tfTipoCliente === "registrado" && showNewTurnoFijoModal) {
      const timeout = setTimeout(() => {
        fetchRegisteredUsers(searchUserQuery);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [searchUserQuery, tfTipoCliente, showNewTurnoFijoModal]);

  const handleSelectRegisteredUser = (u: { id: number; name: string; email: string; telefono?: string | null }) => {
    setSelectedUserObj(u);
    setTfClienteId(u.id);
    setTfClienteNombre(u.name);
    setTfClienteTelefono(u.telefono || "");
    setSearchUserQuery(u.name);
    setShowUserDropdown(false);
  };

  const handleClearSelectedUser = () => {
    setSelectedUserObj(null);
    setTfClienteId("");
    setTfClienteNombre("");
    setTfClienteTelefono("");
    setSearchUserQuery("");
    fetchRegisteredUsers("");
  };

  const handleOpenNewTurnoFijoModal = () => {
    setTfCanchaId(canchas.length > 0 ? canchas[0].id : "");
    setTfDiaSemana(1); // Lunes
    setTfHoraInicio("19:00");
    setTfHoraFin("");
    setTfTipoCliente("manual");
    setTfClienteNombre("");
    setTfClienteTelefono("");
    setTfClienteId("");
    setSearchUserQuery("");
    setSelectedUserObj(null);
    setShowUserDropdown(false);
    setTfPrecio(canchas.length > 0 ? String(canchas[0].precio_base || 8000) : "8000");
    setTfSemanas(26); // 6 meses estándar
    setTfMetodoPago("mostrador");
    setTurnosFijosSuccessMsg(null);
    setTurnosFijosErrorMsg(null);
    setShowNewTurnoFijoModal(true);
    fetchRegisteredUsers("");
  };

  const handleCreateTurnoFijo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTurnoFijo(true);
    setTurnosFijosSuccessMsg(null);
    setTurnosFijosErrorMsg(null);

    try {
      if (!tfCanchaId) {
        throw new Error("Selecciona una cancha para el turno fijo.");
      }
      if (tfTipoCliente === "manual" && !tfClienteNombre.trim()) {
        throw new Error("Ingresa el nombre del cliente titular.");
      }
      if (tfTipoCliente === "registrado" && !tfClienteId) {
        throw new Error("Selecciona un usuario registrado de la lista.");
      }

      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/turnos-fijos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          cancha_id: tfCanchaId,
          dia_semana: tfDiaSemana,
          hora_inicio: tfHoraInicio,
          hora_fin: tfHoraFin || undefined,
          semanas: tfSemanas || 26,
          precio: tfPrecio ? parseFloat(tfPrecio) : undefined,
          cliente_id: tfTipoCliente === "registrado" && tfClienteId ? Number(tfClienteId) : null,
          cliente_nombre: tfTipoCliente === "manual" ? tfClienteNombre.trim() : (selectedUserObj?.name || tfClienteNombre.trim() || undefined),
          cliente_telefono: tfTipoCliente === "manual" ? tfClienteTelefono.trim() : (selectedUserObj?.telefono || tfClienteTelefono.trim() || undefined),
          metodo_pago: tfMetodoPago,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al generar los turnos fijos.");
      }

      setTurnosFijosSuccessMsg(`¡Turno fijo de ${tfSemanas} semanas (6 meses) fijado exitosamente (${data.cantidad} turnos agendados)!`);
      setShowNewTurnoFijoModal(false);
      fetchTurnosFijos();
    } catch (err: any) {
      setTurnosFijosErrorMsg(err.message || "Error al crear turno fijo.");
    } finally {
      setIsSavingTurnoFijo(false);
    }
  };

  const handleRenewTurnoFijo = async (serie: TurnoFijoSerie) => {
    const serieKey = `${serie.cancha_id}_${serie.dia_semana}_${serie.hora_inicio}`;
    try {
      setIsRenewingSerieKey(serieKey);
      setTurnosFijosSuccessMsg(null);
      setTurnosFijosErrorMsg(null);

      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/turnos-fijos/renovar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          cancha_id: serie.cancha_id,
          dia_semana: serie.dia_semana,
          hora_inicio: serie.hora_inicio,
          hora_fin: serie.hora_fin,
          cliente_id: serie.cliente_id,
          cliente_nombre: serie.cliente_nombre,
          semanas: 26, // 6 meses adicionales
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al renovar el turno fijo.");
      }

      setTurnosFijosSuccessMsg(`¡Turno fijo de los ${DIAS[serie.dia_semana]} ${serie.hora_inicio} hs renovado por 6 meses adicionales (${data.cantidad_nuevos || 26} semanas)!`);
      fetchTurnosFijos();
    } catch (err: any) {
      setTurnosFijosErrorMsg(err.message || "Error al renovar el turno fijo.");
    } finally {
      setIsRenewingSerieKey(null);
    }
  };

  const handleLiberarFechaPuntualSerie = async () => {
    if (!fechaPuntualToRelease) return;
    try {
      setIsProcessingAction(true);
      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/turnos/${fechaPuntualToRelease.id}/liberar-fecha`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al liberar la fecha.");
      }

      setTurnosFijosSuccessMsg(`Fecha puntual del ${fechaPuntualToRelease.fecha} liberada correctamente. El turno vuelve a estar disponible.`);
      setFechaPuntualToRelease(null);
      fetchTurnosFijos();
    } catch (err: any) {
      setTurnosFijosErrorMsg(err.message || "Error al liberar la fecha.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDestroySerieFija = async () => {
    if (!serieToCancel) return;
    try {
      setIsProcessingAction(true);
      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/turnos-fijos/serie`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          cancha_id: serieToCancel.cancha_id,
          dia_semana: serieToCancel.dia_semana,
          hora_inicio: serieToCancel.hora_inicio,
          cliente_id: serieToCancel.cliente_id,
          cliente_nombre: serieToCancel.cliente_nombre,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al dar de baja el turno fijo.");
      }

      setTurnosFijosSuccessMsg(`Serie de turnos fijos cancelada exitosamente (${data.turnos_cancelados || "todas las"} semanas futuras dadas de baja).`);
      setSerieToCancel(null);
      fetchTurnosFijos();
    } catch (err: any) {
      setTurnosFijosErrorMsg(err.message || "Error al dar de baja el turno fijo.");
    } finally {
      setIsProcessingAction(false);
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

  const updateDiaHorario = (dia_semana: number, fields: Partial<HorarioDiaForm>) => {
    setHorariosForm((prev) =>
      prev.map((item) => (item.dia_semana === dia_semana ? { ...item, ...fields } : item))
    );
  };

  const aplicarLunesAViernes = () => {
    const lunes = horariosForm.find((h) => h.dia_semana === 1);
    if (!lunes) return;
    setHorariosForm((prev) =>
      prev.map((item) => {
        if ([2, 3, 4, 5].includes(item.dia_semana)) {
          return {
            ...item,
            abierto: lunes.abierto,
            hora_apertura: lunes.hora_apertura,
            hora_cierre: lunes.hora_cierre,
            duracion_turno_minutos: lunes.duracion_turno_minutos,
          };
        }
        return item;
      })
    );
    setHorariosSuccessMsg("Horario del Lunes copiado a Martes, Miércoles, Jueves y Viernes.");
  };

  const aplicarTodaLaSemana = () => {
    const lunes = horariosForm.find((h) => h.dia_semana === 1);
    if (!lunes) return;
    setHorariosForm((prev) =>
      prev.map((item) => ({
        ...item,
        abierto: lunes.abierto,
        hora_apertura: lunes.hora_apertura,
        hora_cierre: lunes.hora_cierre,
        duracion_turno_minutos: lunes.duracion_turno_minutos,
      }))
    );
    setHorariosSuccessMsg("Horario del Lunes aplicado a los 7 días de la semana.");
  };

  const restablecerHorarios = () => {
    setHorariosForm(
      DIAS_CONFIG.map((d) => ({
        dia_semana: d.dia_semana,
        nombre: d.nombre,
        abierto: true,
        hora_apertura: "08:00",
        hora_cierre: "23:00",
        duracion_turno_minutos: 60,
      }))
    );
    setHorariosSuccessMsg("Horarios restablecidos a valores estándar (08:00 a 23:00, 60 min).");
  };

  const handleSaveHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingHorarios(true);
    setHorariosSuccessMsg(null);
    setHorariosErrorMsg(null);

    try {
      // Validar cada día abierto
      for (const item of horariosForm) {
        if (item.abierto) {
          if (item.hora_apertura >= item.hora_cierre) {
            throw new Error(`En el día ${item.nombre}, la hora de apertura (${item.hora_apertura}) debe ser anterior a la hora de cierre (${item.hora_cierre}).`);
          }
        }
      }

      const activeToken = token || localStorage.getItem("saas_token") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/clubs/${subdomain}/horarios`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          horarios: horariosForm.map((h) => ({
            dia_semana: h.dia_semana,
            abierto: h.abierto,
            hora_apertura: h.hora_apertura,
            hora_cierre: h.hora_cierre,
            duracion_turno_minutos: h.duracion_turno_minutos,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Error al actualizar los horarios de atención.");
      }

      setHorarios(data.horarios || []);
      setHorariosSuccessMsg("¡Horarios de atención actualizados exitosamente!");
    } catch (err: any) {
      setHorariosErrorMsg(err.message || "Ocurrió un error al guardar los horarios.");
    } finally {
      setIsSavingHorarios(false);
    }
  };

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
      duracion_minutos: Number(canchaDuracionMinutos) || 60,
      permite_duracion_flexible: canchaPermiteDuracionFlexible,
      anti_baches_activo: canchaAntiBachesActivo,
      duraciones_permitidas: [60, 90, 120],
      precio_90_min: canchaPrecio90Min ? parseFloat(canchaPrecio90Min) : null,
      precio_120_min: canchaPrecio120Min ? parseFloat(canchaPrecio120Min) : null,
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
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <span>🎾 Ver Sitio Público ↗</span>
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
            onClick={() => setActiveTab("turnos-fijos")}
            className={`pb-4 transition border-b-2 ${
              activeTab === "turnos-fijos"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            🔁 Turnos Fijos ({turnosFijos.length})
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

                    {/* SECCIÓN 3: MODALIDAD DE DURACIÓN & TARIFAS EXTENDIDAS */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          3. Duración de Turno & Modalidad
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {canchaPermiteDuracionFlexible ? "Modalidad Flexible" : "Duración Fija"}
                        </span>
                      </div>

                      {/* Modalidad Selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setCanchaPermiteDuracionFlexible(false)}
                          className={`p-3 rounded-2xl border text-left transition ${
                            !canchaPermiteDuracionFlexible
                              ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="font-bold text-xs text-white flex items-center justify-between">
                            <span>⏱️ Duración Fija de Turno</span>
                            {!canchaPermiteDuracionFlexible && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Todos los turnos de esta cancha tienen la misma duración fija predeterminada.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCanchaPermiteDuracionFlexible(true)}
                          className={`p-3 rounded-2xl border text-left transition ${
                            canchaPermiteDuracionFlexible
                              ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="font-bold text-xs text-white flex items-center justify-between">
                            <span>🎛️ Duración Flexible</span>
                            {canchaPermiteDuracionFlexible && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            El cliente puede elegir si alquilar 60 min, 90 min o 120 min al reservar.
                          </p>
                        </button>
                      </div>

                      {/* Duración Base Buttons */}
                      {!canchaPermiteDuracionFlexible ? (
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
                            Duración Predeterminada del Turno *
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { mins: 60, label: "60 min (1 hr)" },
                              { mins: 90, label: "90 min (1h 30m)" },
                              { mins: 120, label: "120 min (2 hrs)" },
                            ].map((d) => (
                              <button
                                key={d.mins}
                                type="button"
                                onClick={() => setCanchaDuracionMinutos(d.mins)}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition text-center ${
                                  canchaDuracionMinutos === d.mins
                                    ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
                                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Tarifa 90 minutos (1h 30m) ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              placeholder={`Sugerido $${Math.round((parseFloat(canchaPrecioBase) || 8000) * 1.5)}`}
                              value={canchaPrecio90Min}
                              onChange={(e) => setCanchaPrecio90Min(e.target.value)}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Si se deja vacío, calcula 1.5x automáticamente.
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Tarifa 120 minutos (2 hrs) ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              placeholder={`Sugerido $${Math.round((parseFloat(canchaPrecioBase) || 8000) * 2)}`}
                              value={canchaPrecio120Min}
                              onChange={(e) => setCanchaPrecio120Min(e.target.value)}
                              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              Si se deja vacío, calcula 2.0x automáticamente.
                            </span>
                          </div>

                          {/* Anti-Baches Switch */}
                          <div className="sm:col-span-2 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                            <div className="text-xs">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>🛡️</span> Algoritmo Anti-Baches (Yield Management)
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                Evita automáticamente turnos públicos que dejen huecos huérfanos de 30 min entre reservas.
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={canchaAntiBachesActivo}
                              onChange={(e) => setCanchaAntiBachesActivo(e.target.checked)}
                              className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN 4: EQUIPAMIENTO & SERVICIOS */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        4. Equipamiento
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
                        <span className="rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-bold">
                          {c.permite_duracion_flexible
                            ? "⏱️ Flexible (60/90/120m)"
                            : `⏱️ Turnos de ${c.duracion_minutos || 60}m ${(c.duracion_minutos || 60) === 90 ? "(1h 30m)" : (c.duracion_minutos || 60) === 120 ? "(2h)" : "(1h)"}`}
                        </span>

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
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Tarifa {c.permite_duracion_flexible ? "Base (60 min)" : `(${c.duracion_minutos || 60} min)`}:
                          </span>
                          <div className="text-xl font-black text-emerald-400">
                            ${c.precio_base}{" "}
                            <span className="text-xs font-normal text-slate-400">
                              / {c.duracion_minutos === 90 ? "1h 30m" : c.duracion_minutos === 120 ? "2 hrs" : "turno"}
                            </span>
                          </div>
                        </div>

                        {c.precio_90_min && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500">90 min:</span>
                            <div className="text-sm font-bold text-slate-200">
                              ${c.precio_90_min}
                            </div>
                          </div>
                        )}

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

                      <Link
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 font-bold hover:underline text-xs"
                      >
                        Ver Grilla ↗
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Horarios de Atención del Club</h2>
                <p className="text-xs text-slate-400">
                  Configura los días y franjas horarias de apertura y cierre para la generación automática de turnos
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={aplicarLunesAViernes}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
                  title="Copia la configuración del Lunes a Martes, Miércoles, Jueves y Viernes"
                >
                  <span>⚡ Copiar Lun a Vie</span>
                </button>
                <button
                  type="button"
                  onClick={aplicarTodaLaSemana}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
                  title="Aplica la configuración del Lunes a los 7 días de la semana"
                >
                  <span>⚡ Toda la Semana</span>
                </button>
                <button
                  type="button"
                  onClick={restablecerHorarios}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                  title="Restablece 08:00 a 23:00 para todos los días"
                >
                  <span>🔄 Predeterminados</span>
                </button>
              </div>
            </div>

            {horariosSuccessMsg && (
              <div role="alert" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>{horariosSuccessMsg}</span>
                </div>
                <button type="button" onClick={() => setHorariosSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
              </div>
            )}

            {horariosErrorMsg && (
              <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{horariosErrorMsg}</span>
                </div>
                <button type="button" onClick={() => setHorariosErrorMsg(null)} className="text-rose-400 hover:text-white">✕</button>
              </div>
            )}

            <form onSubmit={handleSaveHorarios} className="space-y-4">
              <div className="space-y-3">
                {horariosForm.map((item) => (
                  <div
                    key={item.dia_semana}
                    className={`rounded-2xl border p-4 sm:p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      item.abierto
                        ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                        : "bg-slate-950/40 border-slate-900/80 opacity-75"
                    }`}
                  >
                    {/* Columna Izquierda: Nombre del Día & Switch */}
                    <div className="flex items-center justify-between md:justify-start gap-4 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {item.dia_semana === 0 || item.dia_semana === 6 ? "🏖️" : "📅"}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white">{item.nombre}</h3>
                          <p className="text-[11px] text-slate-400">
                            {item.abierto ? "Turnos habilitados" : "Cerrado al público"}
                          </p>
                        </div>
                      </div>

                      {/* Switch Abierto/Cerrado */}
                      <label className="relative inline-flex items-center cursor-pointer ml-auto md:ml-2">
                        <input
                          type="checkbox"
                          checked={item.abierto}
                          onChange={(e) => updateDiaHorario(item.dia_semana, { abierto: e.target.checked })}
                          className="sr-only peer"
                          aria-label={`Estado de atención ${item.nombre}`}
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-semibold text-slate-300 hidden sm:inline">
                          {item.abierto ? "Abierto" : "Cerrado"}
                        </span>
                      </label>
                    </div>

                    {/* Columna Derecha: Horas & Duración */}
                    {item.abierto ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-xl">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Hora Apertura
                          </label>
                          <input
                            type="time"
                            value={item.hora_apertura}
                            onChange={(e) => updateDiaHorario(item.dia_semana, { hora_apertura: e.target.value })}
                            required={item.abierto}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Hora Cierre
                          </label>
                          <input
                            type="time"
                            value={item.hora_cierre}
                            onChange={(e) => updateDiaHorario(item.dia_semana, { hora_cierre: e.target.value })}
                            required={item.abierto}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Duración Base
                          </label>
                          <select
                            value={item.duracion_turno_minutos}
                            onChange={(e) => updateDiaHorario(item.dia_semana, { duracion_turno_minutos: Number(e.target.value) })}
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                          >
                            <option value={30}>30 min</option>
                            <option value={60}>60 min (1 hora)</option>
                            <option value={90}>90 min (1h 30m)</option>
                            <option value={120}>120 min (2 horas)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-2 text-xs text-slate-500 italic">
                        <span>🚫 No se generarán turnos públicos ni reservas para este día.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botón Guardar */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingHorarios}
                  className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
                >
                  {isSavingHorarios ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Guardando Horarios...</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Guardar Horarios de Atención</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TURNOS FIJOS */}
        {/* ========================================================================= */}
        {activeTab === "turnos-fijos" && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">🔁 Gestión de Turnos Fijos & Abonados</h2>
                <p className="text-xs text-slate-400">
                  Administra los turnos semanales fijos asignados por 6 meses. Configura días, horarios, titulares, tarifas y controla las alertas de renovación.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewTurnoFijoModal}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 self-start sm:self-auto shrink-0"
              >
                <span>➕</span> Asignar Nuevo Turno Fijo
              </button>
            </div>

            {turnosFijosSuccessMsg && (
              <div role="alert" className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>{turnosFijosSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTurnosFijosSuccessMsg(null)}
                  className="text-emerald-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {turnosFijosErrorMsg && (
              <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{turnosFijosErrorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTurnosFijosErrorMsg(null)}
                  className="text-rose-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Series Fijas Activas</span>
                  <div className="mt-1 text-2xl font-black text-white">{turnosFijos.length}</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                  🔁
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Próximos a Vencer</span>
                  <div className="mt-1 text-2xl font-black text-amber-400">
                    {turnosFijos.filter((t) => t.requiere_renovacion).length}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                  ⚠️
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fechas Agendadas Futuras</span>
                  <div className="mt-1 text-2xl font-black text-white">
                    {turnosFijos.reduce((sum, s) => sum + s.proximas_fechas_count, 0)}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
                  📅
                </div>
              </div>
            </div>

            {/* Expiration warning banner */}
            {turnosFijos.some((t) => t.requiere_renovacion) && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <strong className="font-bold text-amber-200">
                      Hay {turnosFijos.filter((t) => t.requiere_renovacion).length} turnos fijos próximos a vencer (quedan 2 semanas o menos de recurrencia).
                    </strong>
                    <p className="text-[11px] text-amber-300/80">
                      Renueva sus 6 meses de forma anticipada o coordina con el titular para liberar el espacio.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setFiltroDiaFijo("todos")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filtroDiaFijo === "todos"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                  }`}
                >
                  Todos los Días
                </button>
                {DIAS_CONFIG.map((d) => (
                  <button
                    key={d.dia_semana}
                    type="button"
                    onClick={() => setFiltroDiaFijo(d.dia_semana)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      filtroDiaFijo === d.dia_semana
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroCanchaFijo}
                  onChange={(e) => setFiltroCanchaFijo(e.target.value === "todos" ? "todos" : Number(e.target.value))}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="todos">Todas las Canchas</option>
                  {canchas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of Turnos Fijos */}
            {(() => {
              const filteredSeries = turnosFijos.filter((s) => {
                if (filtroDiaFijo !== "todos" && s.dia_semana !== filtroDiaFijo) return false;
                if (filtroCanchaFijo !== "todos" && s.cancha_id !== filtroCanchaFijo) return false;
                return true;
              });

              if (loadingTurnosFijos) {
                return (
                  <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-bold">Cargando turnos fijos...</p>
                  </div>
                );
              }

              if (filteredSeries.length === 0) {
                return (
                  <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="text-4xl">🔁</div>
                    <div>
                      <h3 className="text-base font-bold text-white">No hay turnos fijos registrados</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Fija horarios semanales para tus clientes y abonados habituales por 6 meses con renovación automática.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenNewTurnoFijoModal}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition inline-flex items-center gap-1.5"
                    >
                      <span>➕</span> Asignar Primer Turno Fijo
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredSeries.map((serie) => {
                    const serieKey = `${serie.cancha_id}_${serie.dia_semana}_${serie.hora_inicio}`;
                    const isExpanded = expandedSerieKey === serieKey;
                    const isRenewing = isRenewingSerieKey === serieKey;

                    return (
                      <div
                        key={serieKey}
                        data-testid="turno-fijo-card"
                        className={`rounded-3xl p-5 border transition flex flex-col justify-between gap-4 shadow-sm ${
                          serie.requiere_renovacion
                            ? "bg-amber-950/15 border-amber-500/40 ring-1 ring-amber-500/20"
                            : "bg-slate-900 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold uppercase tracking-wide">
                                  {DIAS[serie.dia_semana]}
                                </span>
                                <span className="font-mono text-sm font-extrabold text-white">
                                  {serie.hora_inicio} a {serie.hora_fin} hs
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <span className="font-bold text-white">{serie.cancha_nombre}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400 capitalize">{serie.deporte}</span>
                              </div>
                            </div>

                            <div>
                              {serie.requiere_renovacion ? (
                                <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 shadow-sm">
                                  <span>⚠️</span> Por Vencer ({serie.proximas_fechas_count} sem)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                                  <span>✓</span> Activo ({serie.proximas_fechas_count} sem)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Titular Details */}
                          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold">👤</span>
                                <span className="font-extrabold text-white text-[13px]">{serie.cliente_nombre}</span>
                              </div>
                              {serie.cliente_id ? (
                                <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                                  Usuario App
                                </span>
                              ) : (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                                  Mostrador / WhatsApp
                                </span>
                              )}
                            </div>

                            {serie.cliente_telefono && (
                              <div className="flex items-center justify-between text-[11px] bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800">
                                <span className="font-mono text-slate-300">📱 {serie.cliente_telefono}</span>
                                <a
                                  href={`https://wa.me/${serie.cliente_telefono.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline font-bold text-[11px]"
                                >
                                  WhatsApp ↗
                                </a>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                              <span>Tarifa por Turno:</span>
                              <span className="font-bold text-emerald-400 font-mono text-xs">
                                ${serie.precio?.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Horizonte 6 Meses:</span>
                              <span className="text-slate-300 font-mono">
                                {serie.fecha_inicio} al {serie.fecha_fin}
                              </span>
                            </div>
                          </div>

                          {/* Expansion: Upcoming scheduled dates */}
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedSerieKey(isExpanded ? null : serieKey)}
                              className="w-full text-left text-xs font-bold text-slate-400 hover:text-white flex items-center justify-between py-1 transition"
                            >
                              <span>📅 Próximas Fechas Generadas ({serie.proximas_fechas?.length || 0})</span>
                              <span>{isExpanded ? "▲ Ocultar" : "▼ Ver Fechas"}</span>
                            </button>

                            {isExpanded && serie.proximas_fechas && (
                              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {serie.proximas_fechas.map((f) => (
                                  <div
                                    key={f.id}
                                    className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2 font-mono">
                                      <span className="text-slate-300">{f.fecha}</span>
                                      <span className="text-slate-500">|</span>
                                      <span className="text-slate-400">{f.hora_inicio} hs</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                          f.estado_pago === "pagado"
                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                        }`}
                                      >
                                        {f.estado_pago === "pagado" ? "✓ Pagado" : "⏳ Pendiente"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setFechaPuntualToRelease({ id: f.id, fecha: f.fecha, hora_inicio: f.hora_inicio })}
                                        className="text-[11px] px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 font-bold transition"
                                      >
                                        Liberar
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            disabled={isRenewing}
                            onClick={() => handleRenewTurnoFijo(serie)}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3.5 py-2 font-bold text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                          >
                            {isRenewing ? (
                              <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                <span>Renovando...</span>
                              </>
                            ) : (
                              <>
                                <span>⚡</span> Renovar 6 Meses Más
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSerieToCancel(serie)}
                            className="rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 px-3 py-2 font-bold transition flex items-center gap-1"
                          >
                            <span>🚫</span> Dar de Baja Serie
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Modal: Asignar Nuevo Turno Fijo */}
        {showNewTurnoFijoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-left max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 text-xl border border-emerald-500/20">
                    🔁
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Asignar Nuevo Turno Fijo</h3>
                    <p className="text-xs text-slate-400">Horizonte estándar de 6 meses (26 semanas)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewTurnoFijoModal(false)}
                  className="text-slate-400 hover:text-white transition rounded-lg p-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTurnoFijo} className="space-y-4 text-xs">
                {/* Field 1: Cancha */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Cancha:
                  </label>
                  <select
                    value={tfCanchaId}
                    onChange={(e) => {
                      const cid = Number(e.target.value);
                      setTfCanchaId(cid);
                      const sel = canchas.find((c) => c.id === cid);
                      if (sel && !tfPrecio) {
                        setTfPrecio(String(sel.precio_base || 8000));
                      }
                    }}
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecciona una Cancha</option>
                    {canchas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} • {c.deporte?.toUpperCase()} (${c.precio_base?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 2 & 3: Día de la semana y Horario */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Día de la Semana:
                    </label>
                    <select
                      value={tfDiaSemana}
                      onChange={(e) => setTfDiaSemana(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
                    >
                      {DIAS_CONFIG.map((d) => (
                        <option key={d.dia_semana} value={d.dia_semana}>
                          {d.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Hora de Inicio:
                    </label>
                    <input
                      type="time"
                      value={tfHoraInicio}
                      onChange={(e) => setTfHoraInicio(e.target.value)}
                      required
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Field 4: Tipo de Titular */}
                <div className="space-y-2 pt-1">
                  <label className="block text-slate-300 font-bold">
                    Tipo de Titular:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTfTipoCliente("manual")}
                      className={`p-2.5 rounded-xl border text-center font-bold transition text-xs ${
                        tfTipoCliente === "manual"
                          ? "bg-emerald-500/20 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      📝 Cliente Mostrador / WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setTfTipoCliente("registrado")}
                      className={`p-2.5 rounded-xl border text-center font-bold transition text-xs ${
                        tfTipoCliente === "registrado"
                          ? "bg-emerald-500/20 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      👤 Usuario Registrado
                    </button>
                  </div>

                  {tfTipoCliente === "manual" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">
                          Nombre y Apellido:
                        </label>
                        <input
                          type="text"
                          value={tfClienteNombre}
                          onChange={(e) => setTfClienteNombre(e.target.value)}
                          required
                          placeholder="Ej: Marcelo Gómez"
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-medium mb-1">
                          Teléfono / WhatsApp:
                        </label>
                        <input
                          type="tel"
                          value={tfClienteTelefono}
                          onChange={(e) => setTfClienteTelefono(e.target.value)}
                          placeholder="Ej: 11 4455-6677"
                          className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-400 font-medium">
                          Buscar y Seleccionar Usuario en BD:
                        </label>
                        {selectedUserObj && (
                          <button
                            type="button"
                            onClick={handleClearSelectedUser}
                            className="text-[11px] text-rose-400 hover:underline font-bold"
                          >
                            ✕ Cambiar Usuario
                          </button>
                        )}
                      </div>

                      {/* Searchable input / Editable Select */}
                      <div className="relative">
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={searchUserQuery}
                            onFocus={() => {
                              setShowUserDropdown(true);
                              if (searchedUsers.length === 0) fetchRegisteredUsers("");
                            }}
                            onChange={(e) => {
                              setSearchUserQuery(e.target.value);
                              setShowUserDropdown(true);
                              if (selectedUserObj && e.target.value !== selectedUserObj.name) {
                                setSelectedUserObj(null);
                                setTfClienteId("");
                              }
                            }}
                            placeholder="Escribe nombre, email o teléfono para buscar..."
                            className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-9 py-2 text-white focus:border-emerald-500 focus:outline-none placeholder:text-slate-600"
                          />
                          <span className="absolute left-3 text-slate-500 text-sm pointer-events-none">🔍</span>
                          {loadingSearchUsers && (
                            <div className="absolute right-3 h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                          )}
                          {!loadingSearchUsers && searchUserQuery && (
                            <button
                              type="button"
                              onClick={handleClearSelectedUser}
                              className="absolute right-3 text-slate-400 hover:text-white text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Dropdown list of users */}
                        {showUserDropdown && (
                          <div className="absolute z-20 top-full mt-1.5 left-0 right-0 max-h-56 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl divide-y divide-slate-800/60 animate-in fade-in zoom-in-95 duration-100">
                            {loadingSearchUsers ? (
                              <div className="p-3 text-center text-xs text-slate-400">
                                Buscando en la base de datos...
                              </div>
                            ) : searchedUsers.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-500">
                                No se encontraron usuarios con ese criterio.
                              </div>
                            ) : (
                              searchedUsers.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => handleSelectRegisteredUser(u)}
                                  className={`w-full text-left p-2.5 hover:bg-emerald-500/10 transition flex items-center justify-between gap-2 text-xs ${
                                    tfClienteId === u.id ? "bg-emerald-500/15 text-emerald-300 font-bold" : "text-slate-300"
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1.5">
                                      <span>👤 {u.name}</span>
                                      <span className="text-[10px] text-slate-500 font-mono">#{u.id}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>✉️ {u.email}</span>
                                      {u.telefono && <span>📱 {u.telefono}</span>}
                                    </div>
                                  </div>
                                  {tfClienteId === u.id && (
                                    <span className="text-emerald-400 font-bold text-sm">✓</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected user summary badge */}
                      {selectedUserObj ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <div>
                              <strong className="font-bold text-white">{selectedUserObj.name}</strong>
                              <span className="text-[11px] text-emerald-300/80 ml-2">
                                (ID: #{selectedUserObj.id} • {selectedUserObj.email})
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                            Vinculado
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          💡 Busca y selecciona un usuario registrado de la lista para vincular su cuenta y billetera virtual.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Field 5: Tarifa y Semanas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Precio Acordado ($):
                    </label>
                    <input
                      type="number"
                      value={tfPrecio}
                      onChange={(e) => setTfPrecio(e.target.value)}
                      placeholder="8000"
                      min="0"
                      step="100"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      Horizonte de Reserva:
                    </label>
                    <select
                      value={tfSemanas}
                      onChange={(e) => setTfSemanas(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="12">12 Semanas (3 Meses)</option>
                      <option value="26">26 Semanas (6 Meses - Recomendado)</option>
                      <option value="52">52 Semanas (1 Año)</option>
                    </select>
                  </div>
                </div>

                {/* Field 6: Método de Pago */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Método de Pago Habitual:
                  </label>
                  <select
                    value={tfMetodoPago}
                    onChange={(e) => setTfMetodoPago(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-white font-medium focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="mostrador">💵 Efectivo en Mostrador (por partido)</option>
                    <option value="transferencia">📲 Transferencia Bancaria</option>
                    <option value="billetera">👛 Débito de Billetera Virtual</option>
                    <option value="online">💳 Mercado Pago / Online</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewTurnoFijoModal(false)}
                    className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTurnoFijo}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingTurnoFijo ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Generando Turnos...</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span> Asignar Turno Fijo ({tfSemanas} Semanas)
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Liberar Fecha Puntual */}
        {fechaPuntualToRelease && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 text-2xl border border-amber-500/30">
                  🗓️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Liberar Fecha Puntual?</h3>
                  <p className="text-xs text-slate-400">{fechaPuntualToRelease.fecha} • {fechaPuntualToRelease.hora_inicio} hs</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Esta acción cancela <strong>únicamente la fecha seleccionada</strong>, permitiendo que otro jugador reserve el turno o se venda en mostrador. La serie de turno fijo para las semanas posteriores <strong>se mantendrá intacta</strong>.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFechaPuntualToRelease(null)}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleLiberarFechaPuntualSerie}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessingAction ? "Liberando..." : "Sí, Liberar Esta Fecha"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Dar de Baja Serie Recurrente */}
        {serieToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 text-2xl border border-rose-500/20">
                  🚫
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Dar de Baja Turno Fijo?</h3>
                  <p className="text-xs text-slate-400">
                    {DIAS[serieToCancel.dia_semana]} • {serieToCancel.hora_inicio} hs • {serieToCancel.cancha_nombre}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Titular:</span>
                  <span className="font-bold text-white">{serieToCancel.cliente_nombre}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Fechas Futuras a Cancelar:</span>
                  <span className="font-bold text-rose-400">{serieToCancel.proximas_fechas_count} fechas</span>
                </div>
              </div>

              <p className="text-xs text-rose-300/90 leading-relaxed">
                ⚠️ Al confirmar, se eliminarán todas las reservas futuras de este titular en este horario. El espacio quedará disponible para que otros jugadores lo reserven.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSerieToCancel(null)}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={handleDestroySerieFija}
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessingAction ? "Cancelando..." : "Sí, Dar de Baja Definitivamente"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: POLÍTICAS DE SEÑA & CANCELACIÓN */}
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
