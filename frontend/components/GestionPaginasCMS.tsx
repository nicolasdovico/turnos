"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  Check,
  AlertTriangle,
  Loader2,
  Sparkles,
  Search,
  Globe,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  CheckCircle2,
  X,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";

export interface PaginaCMS {
  id: number;
  complejo_id: number;
  titulo: string;
  slug: string;
  contenido_html: string;
  esta_publicada: boolean;
  orden: number;
  mostrar_en_header: boolean;
  mostrar_en_footer: boolean;
  meta_descripcion: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GestionPaginasCMSProps {
  subdomain: string;
  token?: string | null;
  clubNombre?: string;
  apiUrl?: string;
  onPageChanged?: () => void;
}

export const STARTER_TEMPLATES = [
  {
    titulo: "Reglamento Interno y Normas de Convivencia",
    slug: "reglamento-interno",
    contenido_html: `<h2>Reglamento Oficial del Complejo</h2>
<p>Bienvenidos a nuestras instalaciones. Con el fin de garantizar una experiencia deportiva óptima y un ambiente de camaradería, todos los jugadores y socios deben respetar las siguientes pautas:</p>
<h3>1. Horarios y Duración de Turnos</h3>
<p>Los turnos contratados deben respetarse estrictamente. Se ruega puntualidad tanto para el ingreso como para la salida de la cancha.</p>
<h3>2. Indumentaria y Calzado Deportivo</h3>
<p>Es obligatorio ingresar a cancha con calzado deportivo específico para la superficie (suela espiga o goma lisa) para no dañar el césped sintético ni el cristal.</p>
<h3>3. Convivencia y Cuidado de Instalaciones</h3>
<p>Queda prohibido fumar en el sector de juego o golpear intencionalmente las palas contra los vidrios o mallas perimetrales.</p>
<blockquote>El deporte se disfruta con pasión y respeto mutuo. Cuidemos las instalaciones del club entre todos.</blockquote>`,
    mostrar_en_header: true,
    mostrar_en_footer: true,
    orden: 1,
    meta_descripcion: "Normas de conducta, horarios, calzado permitido y reglamento general para socios y jugadores.",
  },
  {
    titulo: "Quiénes Somos e Instalaciones",
    slug: "quienes-somos",
    contenido_html: `<h2>Nuestra Pasión por el Deporte</h2>
<p>Nacimos con la misión de ser el club de referencia para los amantes del deporte en nuestra ciudad, combinando pistas de nivel profesional con un espacio social de excelencia.</p>
<h3>Nuestras Instalaciones</h3>
<ul>
  <li>Canchas panorámicas con césped texturado de última generación.</li>
  <li>Iluminación LED profesional sin deslumbramiento.</li>
  <li>Vestuarios climatizados con duchas individuales.</li>
  <li>Resto Bar & Terraza panorámica con vista a las pistas.</li>
</ul>
<p>Te invitamos a sumarte a nuestra comunidad y compartir los mejores partidos con amigos.</p>`,
    mostrar_en_header: false,
    mostrar_en_footer: true,
    orden: 2,
    meta_descripcion: "Conoce nuestra historia, cuerpo técnico e instalaciones deportivas de primer nivel internacional.",
  },
  {
    titulo: "Tarifas, Abonos y Membresías",
    slug: "tarifas-y-abonos",
    contenido_html: `<h2>Esquema de Precios y Beneficios</h2>
<p>Ofrecemos tarifas competitivas para turnos casuales así como convenios semestrales para equipos y turnos fijos.</p>
<h3>Alquiler de Canchas</h3>
<ul>
  <li><strong>Horario Diurno (Lunes a Viernes hasta 17:00 hs):</strong> Tarifas promocionales y turnos de 90 minutos.</li>
  <li><strong>Horario Central & Fines de Semana:</strong> Tarifa estándar con luz incluida.</li>
</ul>
<h3>Beneficios de Turnos Fijos</h3>
<p>Asegura tu horario semanal durante 6 meses continuos con precio congelado y 10% de descuento en el buffet.</p>`,
    mostrar_en_header: true,
    mostrar_en_footer: true,
    orden: 3,
    meta_descripcion: "Consulta las tarifas vigentes por turno, abonos semestrales para turnos fijos y promociones especiales.",
  },
];

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function GestionPaginasCMS({
  subdomain,
  token,
  clubNombre = "Club Deportivo",
  apiUrl,
  onPageChanged,
}: GestionPaginasCMSProps) {
  const effectiveApiUrl = useMemo(() => {
    const raw =
      apiUrl ||
      (typeof window !== "undefined"
        ? "/api"
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api");
    return raw.replace(/\/api\/?$/, "");
  }, [apiUrl]);

  const [paginas, setPaginas] = useState<PaginaCMS[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Form Fields
  const [formTitulo, setFormTitulo] = useState<string>("");
  const [formSlug, setFormSlug] = useState<string>("");
  const [autoSlug, setAutoSlug] = useState<boolean>(true);
  const [formContenido, setFormContenido] = useState<string>("");
  const [formEstaPublicada, setFormEstaPublicada] = useState<boolean>(true);
  const [formMostrarHeader, setFormMostrarHeader] = useState<boolean>(false);
  const [formMostrarFooter, setFormMostrarFooter] = useState<boolean>(false);
  const [formOrden, setFormOrden] = useState<number>(1);
  const [formMetaDescripcion, setFormMetaDescripcion] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingPage, setDeletingPage] = useState<PaginaCMS | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Token resolution
  const getAuthToken = (): string | null => {
    if (token) return token;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get("auth_token") || searchParams.get("token");
      if (urlToken) return urlToken;

      const cookieMatch = document.cookie.match(/(?:^|;\s*)saas_token=([^;]*)/);
      if (cookieMatch) {
        try {
          return decodeURIComponent(cookieMatch[1]);
        } catch {}
      }

      return (
        localStorage.getItem("saas_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem(`club_admin_token_${subdomain}`) ||
        null
      );
    }
    return null;
  };

  // Cargar páginas del club
  const fetchPaginas = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const activeToken = getAuthToken();

      const res = await fetch(`${effectiveApiUrl}/api/clubs/${subdomain}/paginas`, {
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar las páginas institucionales del club.");
      }

      const json = await res.json();
      setPaginas(json.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subdomain) {
      fetchPaginas();
    }
  }, [subdomain]);

  // Manejar cambio de título con auto-slug
  const handleTituloChange = (val: string) => {
    setFormTitulo(val);
    if (autoSlug) {
      setFormSlug(slugify(val));
    }
  };

  // Insertar formato en textarea WYSIWYG
  const insertFormatting = (
    prefix: string,
    suffix: string = "",
    defaultText: string = ""
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formContenido.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContenido =
      formContenido.substring(0, start) +
      replacement +
      formContenido.substring(end);

    setFormContenido(newContenido);

    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  // Abrir modal para nueva página en blanco
  const handleOpenCreateModal = () => {
    setEditingPageId(null);
    setFormTitulo("");
    setFormSlug("");
    setAutoSlug(true);
    setFormContenido("");
    setFormEstaPublicada(true);
    setFormMostrarHeader(false);
    setFormMostrarFooter(false);
    setFormOrden(paginas.length + 1);
    setFormMetaDescripcion("");
    setFormError(null);
    setActiveTab("editor");
    setIsModalOpen(true);
  };

  // Abrir modal con plantilla predefinida
  const handleApplyStarterTemplate = (tmpl: typeof STARTER_TEMPLATES[0]) => {
    const existing = paginas.find((p) => p.slug.toLowerCase() === tmpl.slug.toLowerCase());
    setEditingPageId(existing ? existing.id : null);
    setFormTitulo(tmpl.titulo);
    setFormSlug(tmpl.slug);
    setAutoSlug(false);
    setFormContenido(tmpl.contenido_html);
    setFormEstaPublicada(true);
    setFormMostrarHeader(tmpl.mostrar_en_header);
    setFormMostrarFooter(tmpl.mostrar_en_footer);
    setFormOrden(existing ? existing.orden : paginas.length + 1);
    setFormMetaDescripcion(tmpl.meta_descripcion);
    setFormError(null);
    setActiveTab("editor");
    setIsModalOpen(true);
  };

  // Abrir modal para editar página existente
  const handleOpenEditModal = (pagina: PaginaCMS) => {
    setEditingPageId(pagina.id);
    setFormTitulo(pagina.titulo);
    setFormSlug(pagina.slug);
    setAutoSlug(false);
    setFormContenido(pagina.contenido_html);
    setFormEstaPublicada(Boolean(pagina.esta_publicada));
    setFormMostrarHeader(Boolean(pagina.mostrar_en_header));
    setFormMostrarFooter(Boolean(pagina.mostrar_en_footer));
    setFormOrden(pagina.orden || 1);
    setFormMetaDescripcion(pagina.meta_descripcion || "");
    setFormError(null);
    setActiveTab("editor");
    setIsModalOpen(true);
  };

  // Guardar (crear o actualizar) página
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setFormError("El título de la página es obligatorio.");
      return;
    }
    if (!formSlug.trim()) {
      setFormError("El slug de la URL es obligatorio.");
      return;
    }
    if (!formContenido.trim()) {
      setFormError("El contenido de la página no puede estar vacío.");
      return;
    }

    const trimmedSlug = formSlug.trim().toLowerCase();
    const duplicatePage = paginas.find(
      (p) => p.slug.toLowerCase() === trimmedSlug && p.id !== editingPageId
    );
    if (duplicatePage) {
      setFormError(
        `Ya existe una página con el enlace (slug) "${formSlug.trim()}". Por favor elige un slug diferente o edita la página "${duplicatePage.titulo}".`
      );
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      const activeToken = getAuthToken();

      const payload = {
        titulo: formTitulo.trim(),
        slug: formSlug.trim(),
        contenido_html: formContenido,
        esta_publicada: formEstaPublicada,
        mostrar_en_header: formMostrarHeader,
        mostrar_en_footer: formMostrarFooter,
        orden: formOrden,
        meta_descripcion: formMetaDescripcion.trim() || null,
      };

      const url = editingPageId
        ? `${effectiveApiUrl}/api/clubs/${subdomain}/paginas/${editingPageId}`
        : `${effectiveApiUrl}/api/clubs/${subdomain}/paginas`;

      const method = editingPageId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        let msg = data.message || "Error al procesar la página.";
        if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          if (firstKey && data.errors[firstKey]?.[0]) {
            msg = data.errors[firstKey][0];
          }
        }
        if (msg.toLowerCase().includes("slug has already been taken") || msg.toLowerCase().includes("slug ya existe")) {
          msg = `El enlace (slug) "${formSlug.trim()}" ya está en uso en este club. Elige un slug diferente.`;
        }
        throw new Error(msg);
      }

      setSuccessMsg(
        editingPageId
          ? "¡Página institucional actualizada con éxito!"
          : "¡Nueva página creada y publicada exitosamente!"
      );
      setTimeout(() => setSuccessMsg(null), 4000);

      setIsModalOpen(false);
      await fetchPaginas();
      if (onPageChanged) onPageChanged();
    } catch (err: any) {
      setFormError(err.message || "Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar página
  const handleConfirmDelete = async () => {
    if (!deletingPage) return;
    try {
      setIsDeleting(true);
      const activeToken = getAuthToken();

      const res = await fetch(
        `${effectiveApiUrl}/api/clubs/${subdomain}/paginas/${deletingPage.id}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al eliminar la página.");
      }

      setSuccessMsg(`Página "${deletingPage.titulo}" eliminada.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setDeletingPage(null);
      await fetchPaginas();
      if (onPageChanged) onPageChanged();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar la página.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Métricas
  const totalPublicadas = paginas.filter((p) => p.esta_publicada).length;
  const enHeaderCount = paginas.filter((p) => p.mostrar_en_header && p.esta_publicada).length;
  const enFooterCount = paginas.filter((p) => p.mostrar_en_footer && p.esta_publicada).length;

  return (
    <div className="space-y-8" data-testid="gestion-paginas-cms">
      {/* Top Header & New Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>📄</span>
            <span>Gestor de Páginas Institucionales & CMS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Crea y administra páginas con reglamento, políticas, tarifas o historia de tu club y asígnalas a los menús.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          data-testid="btn-nueva-pagina"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Página</span>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Páginas</div>
            <div className="text-lg font-black text-white">{paginas.length}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Publicadas</div>
            <div className="text-lg font-black text-emerald-400">{totalPublicadas}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Globe className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">En Menú Header</div>
            <div className="text-lg font-black text-cyan-400">{enHeaderCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">En Menú Footer</div>
            <div className="text-lg font-black text-amber-400">{enFooterCount}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold text-slate-400">Cargando páginas institucionales...</p>
        </div>
      ) : paginas.length === 0 ? (
        /* Empty State with Quick Starter Templates */
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
            <FileText className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-white">Tu club aún no tiene páginas institucionales</h3>
            <p className="text-xs text-slate-400">
              Crea una página desde cero o comienza al instante con alguna de nuestras plantillas redactadas para complejos deportivos:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2 text-left">
            {STARTER_TEMPLATES.map((tmpl, idx) => (
              <div
                key={tmpl.slug}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Plantilla Rápida</span>
                  </div>
                  <h4 className="text-sm font-black text-white">{tmpl.titulo}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{tmpl.meta_descripcion}</p>
                </div>
                <button
                  onClick={() => handleApplyStarterTemplate(tmpl)}
                  data-testid={`btn-starter-template-${idx}`}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Usar Plantilla</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Pages Table / List */
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden" data-testid="tabla-paginas">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Página & Enlace</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Ubicación en Menú</th>
                  <th className="py-3.5 px-4 text-center">Orden</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginas.map((pagina) => (
                  <tr
                    key={pagina.id}
                    data-testid={`pagina-fila-${pagina.id}`}
                    className="hover:bg-slate-800/30 transition group"
                  >
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">{pagina.titulo}</div>
                      <div className="flex items-center gap-2 mt-1 text-slate-400 font-mono text-[11px]">
                        <span>/tenants/{subdomain}/paginas/{pagina.slug}</span>
                        {pagina.esta_publicada && (
                          <a
                            href={`/tenants/${subdomain}/paginas/${pagina.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                            title="Ver en vivo"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      {pagina.esta_publicada ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          <span>Publicada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          <span>Borrador</span>
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {pagina.mostrar_en_header && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            <span>📌 Header</span>
                          </span>
                        )}
                        {pagina.mostrar_en_footer && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            <span>🦶 Footer</span>
                          </span>
                        )}
                        {!pagina.mostrar_en_header && !pagina.mostrar_en_footer && (
                          <span className="text-slate-500 text-[11px] italic">Solo enlace directo</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                      {pagina.orden || 0}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(pagina)}
                          data-testid={`btn-editar-pagina-${pagina.id}`}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                          title="Editar página"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingPage(pagina)}
                          data-testid={`btn-eliminar-pagina-${pagina.id}`}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Eliminar página"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDITOR DE PÁGINA */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          data-testid="modal-editor-pagina"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <span>{editingPageId ? "Editar Página Institucional" : "Crear Nueva Página"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Diseña el contenido institucional visible para los visitantes de tu club.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePage} className="p-6 space-y-6 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Plantillas rápidas selector */}
              <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cargar plantilla predefinida:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {STARTER_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={tmpl.slug}
                      type="button"
                      onClick={() => handleApplyStarterTemplate(tmpl)}
                      data-testid={`btn-modal-starter-${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-[11px] font-medium text-slate-300 hover:text-white transition cursor-pointer"
                      title={tmpl.meta_descripcion}
                    >
                      {tmpl.titulo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Slug Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Título de la Página *</span>
                    <span className="text-[10px] text-slate-500">Ej: Normas del Complejo</span>
                  </label>
                  <input
                    type="text"
                    value={formTitulo}
                    onChange={(e) => handleTituloChange(e.target.value)}
                    placeholder="Ej: Reglamento Interno 2026"
                    data-testid="input-titulo-pagina"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">Slug de la URL *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAutoSlug(!autoSlug);
                        if (!autoSlug) setFormSlug(slugify(formTitulo));
                      }}
                      className="text-[10px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                    >
                      {autoSlug ? "✓ Auto (del título)" : "Manual"}
                    </button>
                  </div>
                  <div className="flex items-center rounded-xl bg-slate-800/80 border border-slate-700 overflow-hidden px-3">
                    <span className="text-slate-500 font-mono text-[11px]">/paginas/</span>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => {
                        setAutoSlug(false);
                        setFormSlug(slugify(e.target.value));
                      }}
                      placeholder="reglamento-interno"
                      data-testid="input-slug-pagina"
                      className="w-full py-2.5 bg-transparent text-emerald-400 font-mono text-xs focus:outline-none ml-1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* WYSIWYG Content Editor & Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <label className="text-xs font-bold text-slate-300">Contenido de la Página *</label>
                  
                  {/* Tabs: Editor vs Live Preview */}
                  <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setActiveTab("editor")}
                      data-testid="tab-editor"
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeTab === "editor"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      ✍️ Redacción
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      data-testid="tab-preview"
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        activeTab === "preview"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Vista Previa</span>
                    </button>
                  </div>
                </div>

                {activeTab === "editor" ? (
                  <div className="space-y-2">
                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => insertFormatting("<h2>", "</h2>", "Subtítulo de Sección")}
                        className="px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-black transition cursor-pointer"
                        title="Encabezado H2"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("<h3>", "</h3>", "Subtítulo Menor")}
                        className="px-2 py-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-bold transition cursor-pointer"
                        title="Encabezado H3"
                      >
                        H3
                      </button>
                      <div className="w-px h-4 bg-slate-600 mx-1" />
                      <button
                        type="button"
                        onClick={() => insertFormatting("<strong>", "</strong>", "texto en negrita")}
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Negrita"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("<em>", "</em>", "texto en cursiva")}
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Cursiva"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-slate-600 mx-1" />
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n<ul>\n  <li>", "</li>\n  <li>Elemento 2</li>\n</ul>\n", "Elemento 1")
                        }
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Lista de viñetas"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n<ol>\n  <li>", "</li>\n  <li>Paso 2</li>\n</ol>\n", "Paso 1")
                        }
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Lista numerada"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n<blockquote>", "</blockquote>\n", "Aviso o cita destacada")
                        }
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Cita o Destacado"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting('<a href="https://ejemplo.com">', "</a>", "Texto del enlace")
                        }
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Insertar enlace"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("\n<hr />\n", "", "")}
                        className="p-1.5 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                        title="Línea divisoria"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={formContenido}
                      onChange={(e) => setFormContenido(e.target.value)}
                      placeholder="Escribe el texto de la página aquí. Puedes utilizar los botones de la barra de herramientas para aplicar formato..."
                      rows={10}
                      data-testid="textarea-contenido-pagina"
                      className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
                      required
                    />
                  </div>
                ) : (
                  /* Live HTML Preview */
                  <div
                    className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 min-h-[220px] max-h-[350px] overflow-y-auto space-y-4 text-slate-200 text-xs leading-relaxed"
                    data-testid="vista-previa-contenido"
                  >
                    {formContenido ? (
                      <div
                        className="space-y-3 prose-invert"
                        dangerouslySetInnerHTML={{ __html: formContenido }}
                      />
                    ) : (
                      <div className="text-slate-500 italic text-center py-12">
                        No hay contenido ingresado para previsualizar.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation & Visibility Settings */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🧭</span>
                  <span>Ubicación en Navegación y Menús</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={formEstaPublicada}
                      onChange={(e) => setFormEstaPublicada(e.target.checked)}
                      data-testid="switch-publicada"
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-700 border-slate-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Publicar Página</div>
                      <div className="text-[10px] text-slate-400">Visible para el público</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={formMostrarHeader}
                      onChange={(e) => setFormMostrarHeader(e.target.checked)}
                      data-testid="switch-header"
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-700 border-slate-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Menú Header</div>
                      <div className="text-[10px] text-slate-400">Barra superior del club</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer hover:bg-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={formMostrarFooter}
                      onChange={(e) => setFormMostrarFooter(e.target.checked)}
                      data-testid="switch-footer"
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-700 border-slate-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Menú Footer</div>
                      <div className="text-[10px] text-slate-400">Pie de página</div>
                    </div>
                  </label>
                </div>

                <div className="max-w-xs space-y-1">
                  <label className="text-xs font-bold text-slate-300">Orden de Aparición</label>
                  <input
                    type="number"
                    min="0"
                    value={formOrden}
                    onChange={(e) => setFormOrden(parseInt(e.target.value, 10) || 0)}
                    data-testid="input-orden"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">Los números más bajos aparecen primero (ej: 1, 2, 3...).</p>
                </div>
              </div>

              {/* SEO & Google Search Snippet Preview */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-400" />
                    <span>Optimización SEO & Búsqueda de Google</span>
                  </h4>
                  <span
                    className={`text-[10px] font-bold ${
                      formMetaDescripcion.length > 160 ? "text-rose-400" : "text-slate-400"
                    }`}
                  >
                    {formMetaDescripcion.length}/160 caracteres
                  </span>
                </div>

                <textarea
                  value={formMetaDescripcion}
                  onChange={(e) => setFormMetaDescripcion(e.target.value)}
                  maxLength={160}
                  placeholder="Escribe una breve descripción del contenido de la página para que Google y las redes sociales muestren un resumen claro..."
                  rows={2}
                  data-testid="textarea-meta-descripcion"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 resize-none"
                />

                {/* Simulated Google Search Result */}
                <div
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-sans shadow-sm"
                  data-testid="google-search-preview"
                >
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span className="text-emerald-400 font-mono">https://{subdomain}.turnos.com</span>
                    <span>›</span>
                    <span className="font-mono">paginas</span>
                    <span>›</span>
                    <span className="font-mono">{formSlug || "pagina"}</span>
                  </div>
                  <div className="text-sm font-bold text-blue-400 hover:underline cursor-pointer">
                    {formTitulo || "Título de la página"} | {clubNombre}
                  </div>
                  <div className="text-xs text-slate-300 line-clamp-2">
                    {formMetaDescripcion ||
                      "Explora esta página institucional para conocer los detalles, reglamentos y servicios de nuestro club."}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  data-testid="btn-guardar-pagina"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingPageId ? "Guardar Cambios" : "Crear Página"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE */}
      {deletingPage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-white">¿Eliminar página institucional?</h3>
              <p className="text-xs text-slate-400">
                Estás a punto de eliminar la página <strong className="text-white">"{deletingPage.titulo}"</strong>. Esta acción desvinculará el enlace de los menús y purgará la caché de inmediato.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingPage(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                data-testid="btn-confirmar-eliminar"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
