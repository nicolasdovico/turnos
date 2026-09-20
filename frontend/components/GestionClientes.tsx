"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Wallet,
  CloudRain,
  Ticket,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  FileText,
  MessageCircle,
  Activity,
  ArrowRight,
  TrendingUp,
  Ban,
  UserCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { formatFechaDDMMAAAA, formatWhatsAppNumber, getAuthToken } from "@/components/GrillaHoraria";

export interface ClienteItem {
  id: number;
  user_id: number | null;
  nombre: string;
  telefono: string | null;
  email: string | null;
  dni: string | null;
  notas: string | null;
  estado: "activo" | "bloqueado";
  motivo_bloqueo: string | null;
  saldo_billetera: number;
  vales_activos_count: number;
  total_turnos: number;
  turnos_jugados: number;
  turnos_futuros?: number;
  turnos_cancelados: number;
  ultimo_turno?: {
    fecha: string | null;
    hora_inicio: string;
    cancha_nombre: string;
    estado: string;
  } | null;
  proximo_turno?: {
    fecha: string | null;
    hora_inicio: string;
    cancha_nombre: string;
    estado: string;
  } | null;
  created_at: string | null;
}

export interface ClientesMetricas {
  total_clientes: number;
  clientes_activos_mes: number;
  total_saldo_billeteras: number;
  vales_activos_count: number;
  clientes_bloqueados: number;
}

interface GestionClientesProps {
  subdomain: string;
  apiUrl: string;
  token: string | null;
  addToast?: (tipo: "success" | "error" | "info", mensaje: string) => void;
}

export default function GestionClientes({
  subdomain,
  apiUrl,
  token,
  addToast,
}: GestionClientesProps) {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [metricas, setMetricas] = useState<ClientesMetricas>({
    total_clientes: 0,
    clientes_activos_mes: 0,
    total_saldo_billeteras: 0,
    vales_activos_count: 0,
    clientes_bloqueados: 0,
  });

  // Filtros y paginación
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activo" | "bloqueado">("todos");
  const [filtroEspecial, setFiltroEspecial] = useState<"todos" | "con_saldo" | "con_vales">("todos");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Crear / Editar
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteItem | null>(null);
  const [formNombre, setFormNombre] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDni, setFormDni] = useState("");
  const [formNotas, setFormNotas] = useState("");
  const [formEstado, setFormEstado] = useState<"activo" | "bloqueado">("activo");
  const [formMotivoBloqueo, setFormMotivoBloqueo] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast notifications internas (independientes de si el padre pasa addToast)
  const [internalToasts, setInternalToasts] = useState<
    Array<{ id: number; tipo: "success" | "error" | "info" | "warning"; mensaje: string }>
  >([]);

  const notify = useCallback(
    (tipo: "success" | "error" | "info" | "warning", mensaje: string) => {
      addToast?.(tipo === "warning" ? "info" : tipo, mensaje);
      const id = Date.now() + Math.random();
      setInternalToasts((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => {
        setInternalToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    [addToast]
  );

  // Obtener token activo con soporte para props, localStorage y cookies cross-subdomain
  const getEffectiveToken = useCallback(() => {
    return getAuthToken(token);
  }, [token]);

  // Modal Ficha 360°
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileTab, setProfileTab] = useState<"resumen" | "turnos" | "billetera">("resumen");
  const [modalTurnosFiltro, setModalTurnosFiltro] = useState<"todos" | "agenda" | "jugados" | "cancelados">("todos");
  const [editingNotasInline, setEditingNotasInline] = useState(false);
  const [notasTemp, setNotasTemp] = useState("");
  const [savingNotas, setSavingNotas] = useState(false);

  // Modal Confirmar Eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCliente, setDeletingCliente] = useState<ClienteItem | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Carga de listado de clientes
  const fetchClientes = useCallback(async () => {
    const activeToken = getEffectiveToken();
    if (!activeToken) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        estado: estadoFiltro,
        filtro: filtroEspecial,
      });
      if (debouncedSearch.trim()) {
        q.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`${apiUrl}/clubs/${subdomain}/clientes?${q.toString()}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${activeToken}`,
          "X-Tenant-ID": subdomain,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMetricas(json.metricas);
          setClientes(json.clientes || []);
          setTotalPages(json.paginacion?.last_page || 1);
          setTotalCount(json.paginacion?.total || 0);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        notify("error", err.message || "Error al cargar el padrón de clientes.");
      }
    } catch {
      notify("error", "Error de red al consultar los clientes del club.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, subdomain, getEffectiveToken, page, estadoFiltro, filtroEspecial, debouncedSearch, notify]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setEditingCliente(null);
    setFormNombre("");
    setFormTelefono("");
    setFormEmail("");
    setFormDni("");
    setFormNotas("");
    setFormEstado("activo");
    setFormMotivoBloqueo("");
    setFormError(null);
    setEditModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (cliente: ClienteItem) => {
    setEditingCliente(cliente);
    setFormNombre(cliente.nombre || "");
    setFormTelefono(cliente.telefono ? cliente.telefono.replace(/(?!^\+)[^\d]/g, "") : "");
    setFormEmail(cliente.email || "");
    setFormDni(cliente.dni ? cliente.dni.replace(/\D/g, "") : "");
    setFormNotas(cliente.notas || "");
    setFormEstado(cliente.estado || "activo");
    setFormMotivoBloqueo(cliente.motivo_bloqueo || "");
    setFormError(null);
    setEditModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formNombre.trim()) {
      const msg = "El nombre completo del cliente es obligatorio.";
      setFormError(msg);
      notify("error", msg);
      return;
    }

    if (formTelefono.trim()) {
      const cleanPhone = formTelefono.trim();
      const phoneDigits = cleanPhone.replace(/\D/g, "");
      if (!/^\+?[0-9]{8,15}$/.test(cleanPhone) || phoneDigits.length < 8 || phoneDigits.length > 15) {
        const msg = "El teléfono / WhatsApp debe ser numérico y contener entre 8 y 15 dígitos (ej. 1144556677 o +5491144556677).";
        setFormError(msg);
        notify("error", msg);
        return;
      }
    }

    if (formDni.trim()) {
      const cleanDni = formDni.trim();
      if (!/^[0-9]{6,12}$/.test(cleanDni)) {
        const msg = "El DNI debe ser numérico y contener entre 6 y 12 dígitos.";
        setFormError(msg);
        notify("error", msg);
        return;
      }
    }

    const activeToken = getEffectiveToken();
    if (!activeToken) {
      const msg = "Sesión no detectada. Por favor, verifica que hayas iniciado sesión correctamente.";
      setFormError(msg);
      notify("error", msg);
      return;
    }

    setSubmittingForm(true);
    try {
      const isEdit = !!editingCliente;
      const url = isEdit
        ? `${apiUrl}/clubs/${subdomain}/clientes/${editingCliente.id}`
        : `${apiUrl}/clubs/${subdomain}/clientes`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        nombre: formNombre.trim(),
        telefono: formTelefono.trim() || null,
        email: formEmail.trim() || null,
        dni: formDni.trim() || null,
        notas: formNotas.trim() || null,
        estado: formEstado,
        motivo_bloqueo: formEstado === "bloqueado" ? formMotivoBloqueo.trim() || "Bloqueado por administración" : null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${activeToken}`,
          "X-Tenant-ID": subdomain,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        notify("success", json.message || (isEdit ? "Datos actualizados correctamente." : "Cliente creado exitosamente."));

        // Actualización inmediata en el estado local de clientes
        if (isEdit && json.cliente) {
          setClientes((prev) =>
            prev.map((item) =>
              item.id === json.cliente.id
                ? {
                    ...item,
                    ...json.cliente,
                    saldo_billetera: item.saldo_billetera,
                    vales_activos_count: item.vales_activos_count,
                    total_turnos: item.total_turnos,
                    turnos_jugados: item.turnos_jugados,
                    turnos_futuros: item.turnos_futuros,
                    turnos_cancelados: item.turnos_cancelados,
                    ultimo_turno: item.ultimo_turno,
                    proximo_turno: item.proximo_turno,
                  }
                : item
            )
          );

          // Si la ficha 360° está abierta con este mismo cliente, actualizarla
          if (profileData?.cliente?.id === json.cliente.id) {
            setProfileData((prev: any) => ({
              ...prev,
              cliente: {
                ...prev.cliente,
                ...json.cliente,
              },
            }));
          }
        }

        setEditModalOpen(false);
        setEditingCliente(null);
        setFormError(null);
        fetchClientes();
      } else {
        let msg = json.message || "No se pudo guardar los datos del cliente.";
        if (json.errors && typeof json.errors === "object") {
          const firstKey = Object.keys(json.errors)[0];
          if (firstKey && Array.isArray(json.errors[firstKey]) && json.errors[firstKey][0]) {
            msg = json.errors[firstKey][0];
          }
        }
        setFormError(msg);
        notify("error", msg);
      }
    } catch {
      const msg = "Error de comunicación o red con el servidor.";
      setFormError(msg);
      notify("error", msg);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Abrir Ficha 360°
  const handleOpenProfile = async (cliente: ClienteItem) => {
    const activeToken = getEffectiveToken();
    setProfileModalOpen(true);
    setProfileLoading(true);
    setProfileTab("resumen");
    setModalTurnosFiltro("todos");
    setEditingNotasInline(false);
    try {
      const res = await fetch(`${apiUrl}/clubs/${subdomain}/clientes/${cliente.id}`, {
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          "X-Tenant-ID": subdomain,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setProfileData(json);
          setNotasTemp(json.cliente?.notas || "");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        notify("error", err.message || "Error al cargar la ficha del cliente.");
        setProfileModalOpen(false);
      }
    } catch {
      notify("error", "Error al conectar para obtener la ficha del cliente.");
      setProfileModalOpen(false);
    } finally {
      setProfileLoading(false);
    }
  };

  // Guardar Notas Directamente desde la Ficha 360°
  const handleSaveNotasInline = async () => {
    if (!profileData?.cliente?.id) return;
    const activeToken = getEffectiveToken();
    setSavingNotas(true);
    try {
      const res = await fetch(`${apiUrl}/clubs/${subdomain}/clientes/${profileData.cliente.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          "X-Tenant-ID": subdomain,
        },
        body: JSON.stringify({
          notas: notasTemp.trim() || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        notify("success", "Notas actualizadas correctamente.");
        setProfileData((prev: any) => ({
          ...prev,
          cliente: {
            ...prev.cliente,
            notas: notasTemp.trim() || null,
          },
        }));
        setEditingNotasInline(false);
        fetchClientes();
      } else {
        notify("error", json.message || "No se pudieron actualizar las notas.");
      }
    } catch {
      notify("error", "Error de conexión al guardar las notas.");
    } finally {
      setSavingNotas(false);
    }
  };

  // Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!deletingCliente) return;
    const activeToken = getEffectiveToken();
    setDeletingLoading(true);
    try {
      const res = await fetch(`${apiUrl}/clubs/${subdomain}/clientes/${deletingCliente.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          "X-Tenant-ID": subdomain,
        },
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        notify("success", json.message || "Cliente eliminado del padrón.");
        setDeleteModalOpen(false);
        fetchClientes();
      } else {
        notify("error", json.message || "No se pudo eliminar al cliente.");
      }
    } catch {
      notify("error", "Error al procesar la eliminación del cliente.");
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & KPIS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            Padrón & Directorio de Clientes
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión centralizada de jugadores, contactos de WhatsApp, historial de turnos y notas internas privadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClientes}
            disabled={loading}
            title="Actualizar listado"
            className="p-2.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Clientes</p>
            <p className="text-2xl font-extrabold text-white mt-1">{metricas.total_clientes}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Activos este Mes</p>
            <p className="text-2xl font-extrabold text-white mt-1">{metricas.clientes_activos_mes}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Saldo en Billeteras</p>
            <p className="text-2xl font-extrabold text-white mt-1">
              ${Number(metricas.total_saldo_billeteras || 0).toLocaleString("es-AR")}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Bloqueados</p>
            <p className="text-2xl font-extrabold text-white mt-1">{metricas.clientes_bloqueados}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, WhatsApp, email o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Filtro Estado */}
          <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700 text-xs">
            <button
              onClick={() => setEstadoFiltro("todos")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                estadoFiltro === "todos"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setEstadoFiltro("activo")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                estadoFiltro === "activo"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setEstadoFiltro("bloqueado")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                estadoFiltro === "bloqueado"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Bloqueados
            </button>
          </div>

          {/* Filtros Especiales */}
          <select
            value={filtroEspecial}
            onChange={(e) => setFiltroEspecial(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="todos">Todos los clientes</option>
            <option value="con_saldo">👛 Con saldo a favor</option>
            <option value="con_vales">🎟️ Con vales de lluvia</option>
          </select>
        </div>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Cliente</th>
                <th className="py-3.5 px-4 font-semibold">Contacto</th>
                <th className="py-3.5 px-4 font-semibold text-center">Turnos</th>
                <th className="py-3.5 px-4 font-semibold">Próximo / Último Turno</th>
                <th className="py-3.5 px-4 font-semibold text-right">Billetera / Vales</th>
                <th className="py-3.5 px-4 font-semibold text-center">Estado</th>
                <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Cargando directorio de clientes...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-300">No se encontraron clientes</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {debouncedSearch
                        ? "Probá ajustando los términos de búsqueda o filtros."
                        : "Comenzá registrando clientes manualmente o al confirmar reservas."}
                    </p>
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const initials = c.nombre
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const cleanPhone = c.telefono ? formatWhatsAppNumber(c.telefono) : null;
                  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* CLIENTE */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs shadow-inner">
                            {initials || "J"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                                {c.nombre}
                              </span>
                              {c.user_id && (
                                <span
                                  title="Usuario registrado con cuenta online"
                                  className="inline-flex items-center text-[10px] font-medium bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20"
                                >
                                  Online
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              {c.dni && <span>DNI: {c.dni}</span>}
                              {c.notas && (
                                <span
                                  title={c.notas}
                                  className="truncate max-w-[180px] text-amber-300/80 italic text-[11px]"
                                >
                                  📝 {c.notas}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CONTACTO */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {c.telefono ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-200">{c.telefono}</span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abrir chat en WhatsApp"
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors p-1 rounded hover:bg-emerald-500/10"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Sin teléfono</span>
                          )}
                          {c.email && (
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* TURNOS */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-white text-sm">{c.total_turnos}</span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <span className="text-emerald-400 font-medium" title="Turnos jugados / completados">
                              ✓{c.turnos_jugados}
                            </span>
                            {c.turnos_futuros !== undefined && c.turnos_futuros > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-400 font-medium" title="Turnos agendados en el futuro">
                                  ⏱{c.turnos_futuros}
                                </span>
                              </>
                            )}
                            {c.turnos_cancelados > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-rose-400 font-medium" title="Turnos cancelados">
                                  ✗{c.turnos_cancelados}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PRÓXIMO / ÚLTIMO TURNO */}
                      <td className="py-3.5 px-4">
                        {c.proximo_turno || c.ultimo_turno ? (
                          <div className="text-xs space-y-1">
                            {c.proximo_turno && (
                              <div className="flex items-center gap-1.5 text-cyan-300">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 uppercase tracking-wider">
                                  Próx
                                </span>
                                <span className="font-medium text-slate-200">
                                  {formatFechaDDMMAAAA(c.proximo_turno.fecha)}
                                </span>
                                <span className="text-cyan-400/90 text-[11px]">
                                  {c.proximo_turno.hora_inicio} hs ({c.proximo_turno.cancha_nombre})
                                </span>
                              </div>
                            )}
                            {c.ultimo_turno && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 border border-slate-700 text-slate-300 uppercase tracking-wider">
                                  Jugado
                                </span>
                                <span className="text-slate-300">
                                  {formatFechaDDMMAAAA(c.ultimo_turno.fecha)}
                                </span>
                                <span className="text-slate-500 text-[11px]">
                                  {c.ultimo_turno.hora_inicio} hs ({c.ultimo_turno.cancha_nombre})
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sin historial</span>
                        )}
                      </td>

                      {/* BILLETERA / VALES */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="space-y-1">
                          <div
                            className={`font-semibold text-xs ${
                              c.saldo_billetera > 0
                                ? "text-emerald-400 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            ${Number(c.saldo_billetera || 0).toLocaleString("es-AR")}
                          </div>
                          {c.vales_activos_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-teal-500/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/20">
                              <Ticket className="w-3 h-3" />
                              {c.vales_activos_count} {c.vales_activos_count === 1 ? "vale" : "vales"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ESTADO */}
                      <td className="py-3.5 px-4 text-center">
                        {c.estado === "activo" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <UserCheck className="w-3 h-3" />
                            Activo
                          </span>
                        ) : (
                          <span
                            title={c.motivo_bloqueo || "Bloqueado"}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20"
                          >
                            <Ban className="w-3 h-3" />
                            Bloqueado
                          </span>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenProfile(c)}
                            title="Ver Ficha 360°"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Editar Datos"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingCliente(c);
                              setDeleteModalOpen(true);
                            }}
                            title="Eliminar Cliente"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINADOR */}
        {totalPages > 1 && (
          <div className="py-3.5 px-4 bg-slate-800/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Mostrando página <strong className="text-white">{page}</strong> de{" "}
              <strong className="text-white">{totalPages}</strong> ({totalCount} clientes)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {editingCliente ? "Editar Datos del Cliente" : "Nuevo Cliente en Directorio"}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{formError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Martin Gomez"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="Ej. 1144556677"
                    value={formTelefono}
                    onChange={(e) => {
                      const val = e.target.value;
                      let cleaned = val.replace(/(?!^\+)[^\d]/g, "");
                      if (cleaned.startsWith("+")) {
                        cleaned = "+" + cleaned.slice(1).replace(/\D/g, "");
                      } else {
                        cleaned = cleaned.replace(/\D/g, "");
                      }
                      setFormTelefono(cleaned.slice(0, 16));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Solo números (8-15 dígitos). Válido para WhatsApp.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="jugador@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    DNI / Documento
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej. 38123456"
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Solo números (6-12 dígitos).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estado en el Club
                  </label>
                  <select
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="activo">✓ Habilitado / Activo</option>
                    <option value="bloqueado">🚫 Bloqueado / Sancionado</option>
                  </select>
                </div>
              </div>

              {formEstado === "bloqueado" && (
                <div>
                  <label className="block text-xs font-semibold text-rose-300 mb-1">
                    Motivo de Bloqueo / Sanción
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Moroso en seña o inasistencias sin aviso"
                    value={formMotivoBloqueo}
                    onChange={(e) => setFormMotivoBloqueo(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-rose-500/50 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas Internas Privadas (Solo visibles para el club)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. Prefiere jugar por la derecha, suele pedir paletas prestadas, etc."
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 font-medium text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  {submittingForm && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingCliente ? "Guardar Cambios" : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHA 360° DEL CLIENTE */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* CABECERA MODAL */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-sm">
                  {profileData?.cliente?.nombre
                    ? profileData.cliente.nombre
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">
                      {profileData?.cliente?.nombre || "Cargando..."}
                    </h3>
                    {profileData?.cliente?.estado === "activo" ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    {profileData?.cliente?.telefono && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {profileData.cliente.telefono}
                      </span>
                    )}
                    {profileData?.cliente?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {profileData.cliente.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {profileData?.cliente && (
                  <button
                    onClick={() => handleOpenEdit(profileData.cliente)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium text-xs transition-all"
                    title="Editar Datos del Cliente"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    Editar Datos
                  </button>
                )}
                {profileData?.cliente?.telefono && (
                  <a
                    href={`https://wa.me/${formatWhatsAppNumber(profileData.cliente.telefono)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 font-medium text-xs transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* NAVEGACIÓN PESTAÑAS */}
            <div className="flex border-b border-slate-800 bg-slate-800/40 px-6">
              <button
                onClick={() => setProfileTab("resumen")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  profileTab === "resumen"
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Resumen & Notas
              </button>
              <button
                onClick={() => setProfileTab("turnos")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  profileTab === "turnos"
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Historial de Turnos ({profileData?.turnos?.length || 0})
              </button>
              <button
                onClick={() => setProfileTab("billetera")}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                  profileTab === "billetera"
                    ? "border-indigo-500 text-indigo-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                Billetera & Vales
              </button>
            </div>

            {/* CONTENIDO SCROLLABLE */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {profileLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400 mb-3" />
                  Cargando ficha 360°...
                </div>
              ) : profileData ? (
                <>
                  {/* TAB 1: RESUMEN Y NOTAS */}
                  {profileTab === "resumen" && (
                    <div className="space-y-6">
                      {/* STATS RÁPIDAS */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-center">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                            Total Turnos
                          </span>
                          <p className="text-xl font-bold text-white mt-1">
                            {profileData.estadisticas?.total_turnos || 0}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="text-emerald-400 font-medium">
                              ✓ {profileData.estadisticas?.turnos_jugados || 0} jugados
                            </span>
                            {Number(profileData.estadisticas?.turnos_futuros || 0) > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-400 font-medium">
                                  ⏱ {profileData.estadisticas?.turnos_futuros} agenda
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-center">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">
                            Asistencia
                          </span>
                          <p className="text-xl font-bold text-white mt-1">
                            {profileData.estadisticas?.tasa_cumplimiento || 100}%
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1">
                            <span className="text-rose-400 font-medium">
                              ✗ {profileData.estadisticas?.turnos_cancelados || 0} cancelados
                            </span>
                          </div>
                        </div>
                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-center">
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400">
                            Saldo en Billetera
                          </span>
                          <p className="text-xl font-bold text-white mt-1">
                            ${Number(profileData.cliente?.saldo_billetera || 0).toLocaleString("es-AR")}
                          </p>
                          <div className="text-[10px] text-teal-400 mt-1">
                            {profileData.vales?.length > 0
                              ? `${profileData.vales.length} vales emitidos`
                              : "Sin vales de crédito"}
                          </div>
                        </div>
                      </div>

                      {/* NOTAS PRIVADAS DEL CLUB */}
                      <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            Notas Operativas del Club (Privadas)
                          </h4>
                          {!editingNotasInline ? (
                            <button
                              onClick={() => setEditingNotasInline(true)}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                            >
                              Editar Nota
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingNotasInline(false)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveNotasInline}
                                disabled={savingNotas}
                                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                              >
                                {savingNotas && <RefreshCw className="w-3 h-3 animate-spin" />}
                                Guardar
                              </button>
                            </div>
                          )}
                        </div>

                        {editingNotasInline ? (
                          <textarea
                            rows={3}
                            value={notasTemp}
                            onChange={(e) => setNotasTemp(e.target.value)}
                            placeholder="Escribí aquí observaciones sobre el jugador (ej. nivel de juego, amigos frecuentes, requerimientos)..."
                            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          />
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-300 whitespace-pre-wrap min-h-[60px]">
                            {profileData.cliente?.notas || (
                              <span className="text-slate-500 italic text-xs">
                                Sin notas registradas. Hacé clic en "Editar Nota" para agregar observaciones.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: HISTORIAL DE TURNOS */}
                  {profileTab === "turnos" && (
                    <div className="space-y-3">
                      {profileData.turnos?.length === 0 ? (
                        <p className="py-8 text-center text-slate-500 text-xs italic">
                          No hay turnos registrados para este cliente en el club.
                        </p>
                      ) : (
                        <>
                          {/* SUB-FILTROS DE TURNOS EN EL MODAL */}
                          <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl text-xs overflow-x-auto">
                            <button
                              type="button"
                              onClick={() => setModalTurnosFiltro("todos")}
                              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                                modalTurnosFiltro === "todos"
                                  ? "bg-slate-700 text-white shadow-sm"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Todos ({profileData.turnos.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalTurnosFiltro("agenda")}
                              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                                modalTurnosFiltro === "agenda"
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "text-slate-400 hover:text-cyan-300"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              En Agenda ({profileData.turnos.filter((t: any) => t.es_futuro && t.estado !== "cancelado").length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalTurnosFiltro("jugados")}
                              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                                modalTurnosFiltro === "jugados"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "text-slate-400 hover:text-emerald-300"
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Jugados ({profileData.turnos.filter((t: any) => !t.es_futuro && t.estado !== "cancelado").length})
                            </button>
                            {profileData.turnos.filter((t: any) => t.estado === "cancelado").length > 0 && (
                              <button
                                type="button"
                                onClick={() => setModalTurnosFiltro("cancelados")}
                                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                                  modalTurnosFiltro === "cancelados"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "text-slate-400 hover:text-rose-300"
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Cancelados ({profileData.turnos.filter((t: any) => t.estado === "cancelado").length})
                              </button>
                            )}
                          </div>

                          <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                  <th className="py-2.5 px-3">Fecha & Cancha</th>
                                  <th className="py-2.5 px-3">Horario</th>
                                  <th className="py-2.5 px-3 text-right">Monto</th>
                                  <th className="py-2.5 px-3 text-center">Estado & Pago</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                {profileData.turnos
                                  .filter((t: any) => {
                                    if (modalTurnosFiltro === "agenda") return t.es_futuro && t.estado !== "cancelado";
                                    if (modalTurnosFiltro === "jugados") return !t.es_futuro && t.estado !== "cancelado";
                                    if (modalTurnosFiltro === "cancelados") return t.estado === "cancelado";
                                    return true;
                                  })
                                  .map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-800/40">
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-white">
                                            {formatFechaDDMMAAAA(t.fecha)}
                                          </span>
                                          {t.es_futuro && t.estado !== "cancelado" && (
                                            <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded font-medium">
                                              En Agenda
                                            </span>
                                          )}
                                          {!t.es_futuro && t.estado !== "cancelado" && (
                                            <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
                                              Jugado
                                            </span>
                                          )}
                                          {t.es_fijo && (
                                            <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.5 rounded font-medium">
                                              Turno Fijo
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-slate-400 text-[11px] mt-0.5">{t.cancha_nombre}</div>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono">
                                        {t.hora_inicio} a {t.hora_fin} hs
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-medium">
                                        <div className="text-white">
                                          ${Number(t.precio || 0).toLocaleString("es-AR")}
                                        </div>
                                        {t.saldo_pendiente > 0 && t.estado !== "cancelado" && (
                                          <div className="text-[10px] text-amber-400">
                                            Resta: ${Number(t.saldo_pendiente).toLocaleString("es-AR")}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {t.estado === "cancelado" ? (
                                          <span
                                            title={t.motivo_cancelacion || "Cancelado"}
                                            className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-medium"
                                          >
                                            Cancelado
                                          </span>
                                        ) : t.estado_pago === "pagado_total" ? (
                                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                                            Pagado Total
                                          </span>
                                        ) : t.estado_pago === "senado" ? (
                                          <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 font-medium">
                                            Señado
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                                            Pago Pendiente
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB 3: BILLETERA & VALES */}
                  {profileTab === "billetera" && (
                    <div className="space-y-4">
                      <div className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Saldo Disponible en Club</p>
                          <p className="text-2xl font-black text-emerald-400 mt-1">
                            ${Number(profileData.cliente?.saldo_billetera || 0).toLocaleString("es-AR")}
                          </p>
                        </div>
                        <Wallet className="w-8 h-8 text-emerald-400 opacity-80" />
                      </div>

                      {/* VALES ACTIVOS O HISTÓRICOS */}
                      {profileData.vales?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                            Vales de Crédito ({profileData.vales.length})
                          </h4>
                          <div className="space-y-1.5">
                            {profileData.vales.map((v: any) => (
                              <div
                                key={v.id}
                                className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Ticket className="w-4 h-4 text-teal-400" />
                                  <span className="font-mono font-bold text-white">{v.codigo}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-white">
                                    ${Number(v.monto || 0).toLocaleString("es-AR")}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                      v.estado === "activo"
                                        ? "bg-teal-500/10 text-teal-300 border border-teal-500/20"
                                        : "bg-slate-700 text-slate-400"
                                    }`}
                                  >
                                    {v.estado}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {deleteModalOpen && deletingCliente && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-white text-base">Eliminar Cliente del Padrón</h3>
            </div>
            <p className="text-sm text-slate-300">
              ¿Estás seguro de que deseás eliminar a{" "}
              <strong className="text-white">{deletingCliente.nombre}</strong>?
            </p>
            <p className="text-xs text-slate-500">
              Esta acción eliminará la ficha de contacto y notas del club. El cliente no puede poseer reservas activas ni saldo a favor en billetera.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-md shadow-rose-600/30 transition-all flex items-center gap-2"
              >
                {deletingLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Eliminar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICACIONES TOAST FLOTANTES */}
      {internalToasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm">
          {internalToasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-200 ${
                t.tipo === "success"
                  ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-200"
                  : t.tipo === "error"
                  ? "bg-rose-950/95 border-rose-500/40 text-rose-200"
                  : "bg-slate-900/95 border-indigo-500/40 text-indigo-200"
              }`}
            >
              {t.tipo === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : t.tipo === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              ) : (
                <Activity className="w-5 h-5 text-indigo-400 shrink-0" />
              )}
              <span className="font-medium text-xs leading-snug">{t.mensaje}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
