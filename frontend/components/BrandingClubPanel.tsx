"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Palette,
  Layout,
  Globe,
  UploadCloud,
  Check,
  ExternalLink,
  Save,
  Undo2,
  Eye,
  Sparkles,
  Smartphone,
  Instagram,
  Facebook,
  Video,
  Youtube,
  Share2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  HelpCircle,
  Building,
} from "lucide-react";

export interface TemplateInfo {
  slug: string;
  nombre: string;
  descripcion: string;
  badge: string;
  preview_imagen?: string;
  plan_minimo?: string;
  caracteristicas?: string[];
}

export interface BrandingData {
  plantilla_slug: string;
  logo_url: string | null;
  portada_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  color_fondo: string;
  eslogan: string | null;
  descripcion_corta: string | null;
  redes_sociales: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
    sitio_web?: string | null;
  };
}

export interface BrandingClubPanelProps {
  subdomain: string;
  token?: string | null;
  clubNombre?: string;
  apiUrl?: string;
  onSaved?: (newBranding: BrandingData) => void;
}

export const COLOR_PRESETS = [
  {
    name: "Esmeralda Padel",
    icon: "🎾",
    primario: "#10b981",
    secundario: "#047857",
    acento: "#06b6d4",
    fondo: "#020617",
  },
  {
    name: "Azul Tenis Pro",
    icon: "🌊",
    primario: "#2563eb",
    secundario: "#1d4ed8",
    acento: "#38bdf8",
    fondo: "#0f172a",
  },
  {
    name: "Arena Sunset",
    icon: "🏆",
    primario: "#f59e0b",
    secundario: "#b45309",
    acento: "#fbbf24",
    fondo: "#18181b",
  },
  {
    name: "Dark Graphite",
    icon: "🖤",
    primario: "#64748b",
    secundario: "#334155",
    acento: "#e2e8f0",
    fondo: "#09090b",
  },
  {
    name: "Violeta Boutique",
    icon: "✨",
    primario: "#8b5cf6",
    secundario: "#6d28d9",
    acento: "#c084fc",
    fondo: "#0f0728",
  },
  {
    name: "Rojo Competitivo",
    icon: "⚡",
    primario: "#ef4444",
    secundario: "#b91c1c",
    acento: "#f87171",
    fondo: "#180c0e",
  },
];

const DEFAULT_TEMPLATES: TemplateInfo[] = [
  {
    slug: "booking_direct",
    nombre: "Booking Direct / Operativa",
    descripcion: "Enfoque 100% en la reserva rápida. Grilla horaria en primer plano superior, ideal para complejos de pádel o fútbol orientados a conversión inmediata.",
    badge: "⚡ Más Rápida",
    caracteristicas: [
      "Cabecera compacta con logo y contacto directo",
      "Grilla de turnos y canchas en primer plano",
      "Sin distracciones ni bloques informativos pesados",
      "Acceso veloz a WhatsApp y cómo llegar",
    ],
  },
  {
    slug: "institucional",
    nombre: "Club Tradicional / Institucional",
    descripcion: "Presencia institucional y vida de club. Hero banner con portada, mensaje de bienvenida, menú superior hacia páginas institucionales y grilla de reservas integrada.",
    badge: "🏛️ Club Social",
    caracteristicas: [
      "Gran banner de portada (Hero) con eslogan y reseña",
      "Menú de navegación a páginas (/quienes-somos, /reglamento)",
      "Bloques destacados de instalaciones y servicios",
      "Grilla horaria integrada armónicamente",
    ],
  },
  {
    slug: "modern_showcase",
    nombre: "Modern Showcase / Premium",
    descripcion: "Estética contemporánea de alto impacto visual. Tarjetas fotográficas amplias por cancha con insignias de equipamiento (LED, climatizada, césped pro) y reserva fluida.",
    badge: "✨ Boutique / Premium",
    caracteristicas: [
      "Tarjetas fotográficas destacadas por cada cancha",
      "Insignias técnicas (césped sintético pro, LED, cámaras)",
      "Contraste moderno de alto impacto en modo oscuro",
      "Barra de contacto y reserva flotante interactiva",
    ],
  },
];

const API_BASE = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api");

export default function BrandingClubPanel({
  subdomain,
  token,
  clubNombre = "Mi Club",
  apiUrl,
  onSaved,
}: BrandingClubPanelProps) {
  const effectiveApiUrl =
    apiUrl ||
    (typeof window !== "undefined"
      ? "/api"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateInfo[]>(DEFAULT_TEMPLATES);

  // Form states
  const [plantillaSlug, setPlantillaSlug] = useState<string>("booking_direct");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [portadaUrl, setPortadaUrl] = useState<string | null>(null);
  const [colorPrimario, setColorPrimario] = useState<string>("#10b981");
  const [colorSecundario, setColorSecundario] = useState<string>("#047857");
  const [colorAcento, setColorAcento] = useState<string>("#06b6d4");
  const [colorFondo, setColorFondo] = useState<string>("#020617");
  const [eslogan, setEslogan] = useState<string>("");
  const [descripcionCorta, setDescripcionCorta] = useState<string>("");
  const [instagram, setInstagram] = useState<string>("");
  const [facebook, setFacebook] = useState<string>("");
  const [tiktok, setTiktok] = useState<string>("");
  const [youtube, setYoutube] = useState<string>("");
  const [sitioWeb, setSitioWeb] = useState<string>("");

  // Initial reference to detect dirty state
  const [initialData, setInitialData] = useState<BrandingData | null>(null);

  // Image upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPortada, setUploadingPortada] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);

  const resolveToken = () => {
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
        null
      );
    }
    return null;
  };

  // 1. Fetch Branding & Templates
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch templates catalog
      try {
        const resTpl = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/branding/templates`);
        if (resTpl.ok) {
          const jsonTpl = await resTpl.json();
          if (jsonTpl.data?.plantillas && Array.isArray(jsonTpl.data.plantillas)) {
            setTemplates(jsonTpl.data.plantillas);
          }
        }
      } catch {
        // Fallback to DEFAULT_TEMPLATES
      }

      // Fetch club branding
      const res = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/branding`);
      const json = await res.json();

      if (res.ok && json.data) {
        const b = json.data.branding || {};
        setPlantillaSlug(b.plantilla_slug || "booking_direct");
        setLogoUrl(b.logo_url || null);
        setPortadaUrl(b.portada_url || null);
        setColorPrimario(b.color_primario || "#10b981");
        setColorSecundario(b.color_secundario || "#047857");
        setColorAcento(b.color_acento || "#06b6d4");
        setColorFondo(b.color_fondo || "#020617");
        setEslogan(b.eslogan || "");
        setDescripcionCorta(b.descripcion_corta || "");

        const redes = b.redes_sociales || {};
        setInstagram(redes.instagram || "");
        setFacebook(redes.facebook || "");
        setTiktok(redes.tiktok || "");
        setYoutube(redes.youtube || "");
        setSitioWeb(redes.sitio_web || "");

        setInitialData({
          plantilla_slug: b.plantilla_slug || "booking_direct",
          logo_url: b.logo_url || null,
          portada_url: b.portada_url || null,
          color_primario: b.color_primario || "#10b981",
          color_secundario: b.color_secundario || "#047857",
          color_acento: b.color_acento || "#06b6d4",
          color_fondo: b.color_fondo || "#020617",
          eslogan: b.eslogan || "",
          descripcion_corta: b.descripcion_corta || "",
          redes_sociales: {
            instagram: redes.instagram || "",
            facebook: redes.facebook || "",
            tiktok: redes.tiktok || "",
            youtube: redes.youtube || "",
            sitio_web: redes.sitio_web || "",
          },
        });
      } else {
        setErrorMsg(json.message || "No se pudo cargar la información de branding.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subdomain]);

  // Dirty state calculation
  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      plantillaSlug !== initialData.plantilla_slug ||
      logoUrl !== initialData.logo_url ||
      portadaUrl !== initialData.portada_url ||
      colorPrimario !== initialData.color_primario ||
      colorSecundario !== initialData.color_secundario ||
      colorAcento !== initialData.color_acento ||
      colorFondo !== initialData.color_fondo ||
      eslogan !== (initialData.eslogan || "") ||
      descripcionCorta !== (initialData.descripcion_corta || "") ||
      instagram !== (initialData.redes_sociales.instagram || "") ||
      facebook !== (initialData.redes_sociales.facebook || "") ||
      tiktok !== (initialData.redes_sociales.tiktok || "") ||
      youtube !== (initialData.redes_sociales.youtube || "") ||
      sitioWeb !== (initialData.redes_sociales.sitio_web || "")
    );
  }, [
    initialData,
    plantillaSlug,
    logoUrl,
    portadaUrl,
    colorPrimario,
    colorSecundario,
    colorAcento,
    colorFondo,
    eslogan,
    descripcionCorta,
    instagram,
    facebook,
    tiktok,
    youtube,
    sitioWeb,
  ]);

  // Revert changes
  const handleDiscardChanges = () => {
    if (!initialData) return;
    setPlantillaSlug(initialData.plantilla_slug);
    setLogoUrl(initialData.logo_url);
    setPortadaUrl(initialData.portada_url);
    setColorPrimario(initialData.color_primario);
    setColorSecundario(initialData.color_secundario);
    setColorAcento(initialData.color_acento);
    setColorFondo(initialData.color_fondo);
    setEslogan(initialData.eslogan || "");
    setDescripcionCorta(initialData.descripcion_corta || "");
    setInstagram(initialData.redes_sociales.instagram || "");
    setFacebook(initialData.redes_sociales.facebook || "");
    setTiktok(initialData.redes_sociales.tiktok || "");
    setYoutube(initialData.redes_sociales.youtube || "");
    setSitioWeb(initialData.redes_sociales.sitio_web || "");
    setErrorMsg(null);
  };

  // Apply color preset
  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setColorPrimario(preset.primario);
    setColorSecundario(preset.secundario);
    setColorAcento(preset.acento);
    setColorFondo(preset.fondo);
  };

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const activeToken = resolveToken();
      const payload = {
        plantilla_slug: plantillaSlug,
        logo_url: logoUrl?.startsWith("blob:") ? (initialData?.logo_url || null) : logoUrl,
        portada_url: portadaUrl?.startsWith("blob:") ? (initialData?.portada_url || null) : portadaUrl,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
        color_acento: colorAcento,
        color_fondo: colorFondo,
        eslogan: eslogan.trim() || null,
        descripcion_corta: descripcionCorta.trim() || null,
        redes_sociales: {
          instagram: instagram.trim() || null,
          facebook: facebook.trim() || null,
          tiktok: tiktok.trim() || null,
          youtube: youtube.trim() || null,
          sitio_web: sitioWeb.trim() || null,
        },
      };

      const res = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al actualizar la configuración de branding.");
      }

      setSuccessMsg("¡Identidad de marca y plantilla guardadas exitosamente!");
      setInitialData(payload);

      if (onSaved) {
        onSaved(payload);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  // Upload Logo or Portada
  const handleFileUpload = async (file: File, tipo: "logo" | "portada") => {
    const previousUrl = tipo === "logo" ? logoUrl : portadaUrl;
    let localPreview: string | null = null;

    try {
      if (tipo === "logo") setUploadingLogo(true);
      if (tipo === "portada") setUploadingPortada(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // 1. Optimistic Instant Preview en 0ms
      if (typeof window !== "undefined" && window.URL?.createObjectURL) {
        try {
          localPreview = URL.createObjectURL(file);
          if (tipo === "logo") {
            setLogoUrl(localPreview);
          } else {
            setPortadaUrl(localPreview);
          }
        } catch {
          // Ignorar si el navegador no soporta createObjectURL
        }
      }

      const activeToken = resolveToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", tipo);
      formData.append("actualizar_directo", "1");

      const res = await fetch(`${effectiveApiUrl}/clubs/${subdomain}/branding/upload`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Error al subir ${tipo}.`);
      }

      const serverUrl = data.url;
      if (tipo === "logo") {
        setLogoUrl(serverUrl);
      } else {
        setPortadaUrl(serverUrl);
      }

      setSuccessMsg(`¡${tipo === "logo" ? "Logotipo" : "Banner de portada"} subido y actualizado exitosamente!`);

      // Safely revoke optimistic blob preview after server URL takes effect
      if (localPreview && typeof window !== "undefined" && window.URL?.revokeObjectURL) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(localPreview!);
          } catch {}
        }, 1000);
      }

      // Mantener initialData sincronizado con el asset guardado en backend
      setInitialData((prev) =>
        prev
          ? {
              ...prev,
              [tipo === "logo" ? "logo_url" : "portada_url"]: serverUrl,
            }
          : null
      );

      if (onSaved) {
        onSaved({
          plantilla_slug: plantillaSlug,
          logo_url: tipo === "logo" ? serverUrl : logoUrl,
          portada_url: tipo === "portada" ? serverUrl : portadaUrl,
          color_primario: colorPrimario,
          color_secundario: colorSecundario,
          color_acento: colorAcento,
          color_fondo: colorFondo,
          eslogan: eslogan.trim() || null,
          descripcion_corta: descripcionCorta.trim() || null,
          redes_sociales: {
            instagram: instagram.trim() || null,
            facebook: facebook.trim() || null,
            tiktok: tiktok.trim() || null,
            youtube: youtube.trim() || null,
            sitio_web: sitioWeb.trim() || null,
          },
        });
      }
    } catch (err: any) {
      // Revertir a la URL previa si falló la subida
      if (tipo === "logo") {
        setLogoUrl(previousUrl);
      } else {
        setPortadaUrl(previousUrl);
      }
      if (localPreview && typeof window !== "undefined" && window.URL?.revokeObjectURL) {
        try {
          URL.revokeObjectURL(localPreview);
        } catch {}
      }
      setErrorMsg(err.message || `Error al subir archivo de ${tipo}.`);
    } finally {
      if (tipo === "logo") setUploadingLogo(false);
      if (tipo === "portada") setUploadingPortada(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold text-slate-400">Cargando personalización del sitio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="branding-club-panel">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>🎨</span>
            <span>Sitio Web Oficial & Identidad de Marca</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personaliza el diseño, plantilla, colores y redes sociales de tu portal público:{" "}
            <strong className="text-emerald-400 font-mono">
              {subdomain}.turnos.com
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/tenants/${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="btn-ver-sitio-publico"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition shadow-sm cursor-pointer"
            title="Abrir el sitio web público del club en una nueva pestaña"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ver mi Sitio Web en Vivo</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {isDirty && (
            <button
              type="button"
              onClick={handleDiscardChanges}
              data-testid="btn-descartar-branding"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Descartar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            data-testid="btn-guardar-branding"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Dirty Bar */}
      {isDirty && (
        <div
          data-testid="dirty-alert-banner"
          className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
            <span>
              Tienes <strong>cambios sin guardar</strong> en la personalización de tu club. Recuerda hacer clic en <strong>Guardar Cambios</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDiscardChanges}
            className="text-xs text-amber-400 hover:text-white underline font-semibold cursor-pointer"
          >
            Revertir
          </button>
        </div>
      )}

      {/* Alerts */}
      {successMsg && (
        <div
          data-testid="branding-success-msg"
          className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-sm flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          data-testid="branding-error-msg"
          className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-sm flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* ========================================================================= */}
        {/* SECCIÓN 1: SELECTOR DE PLANTILLAS BASE */}
        {/* ========================================================================= */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Layout className="w-4 h-4" />
                <span>1. Cáscara de Diseño Web (Plantilla Activa)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Elige la estructura que mejor se adapte al perfil comercial de tu complejo
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
              {templates.length} plantillas disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="template-selector-grid">
            {templates.map((tpl) => {
              const isSelected = plantillaSlug === tpl.slug;

              return (
                <div
                  key={tpl.slug}
                  onClick={() => setPlantillaSlug(tpl.slug)}
                  data-testid={`template-card-${tpl.slug}`}
                  className={`group relative rounded-2xl p-5 border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-950/80 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl shadow-emerald-950/30"
                      : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/60"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Badge & Radio check */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tpl.badge || "Plantilla"}
                      </span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "border-slate-700 bg-slate-900 group-hover:border-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Template title & description */}
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition">
                        {tpl.nombre}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {tpl.descripcion}
                      </p>
                    </div>

                    {/* Features list */}
                    {tpl.caracteristicas && tpl.caracteristicas.length > 0 && (
                      <ul className="space-y-1.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                        {tpl.caracteristicas.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 text-xs">✓</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-emerald-500 text-slate-950 shadow-md font-black"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Plantilla Seleccionada</span>
                        </>
                      ) : (
                        <span>Elegir esta plantilla</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: PALETA DE COLORES & LIVE PREVIEW CARD */}
        {/* ========================================================================= */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span>2. Paleta de Colores Corporativos & Previsualización en Vivo</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Personaliza los tonos que vestirán los botones de reserva, insignias y encabezados de tu web
            </p>
          </div>

          {/* Paletas sugeridas de un clic */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Paletas Sugeridas (1 Clic)</span>
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition hover:border-slate-700 cursor-pointer shadow-sm"
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  <div className="flex items-center -space-x-1 ml-1">
                    <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.primario }} />
                    <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.secundario }} />
                    <span className="w-3 h-3 rounded-full border border-slate-900" style={{ backgroundColor: p.acento }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            {/* Controles de color (7 cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Color Primario */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Color Primario
                </label>
                <p className="text-[11px] text-slate-500">
                  Botones principales de reserva y destacados
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={colorPrimario}
                    onChange={(e) => setColorPrimario(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                    title="Elegir color primario"
                  />
                  <input
                    type="text"
                    value={colorPrimario}
                    onChange={(e) => setColorPrimario(e.target.value)}
                    placeholder="#10b981"
                    data-testid="input-color-primario"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color Secundario */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Color Secundario
                </label>
                <p className="text-[11px] text-slate-500">
                  Encabezados, bordes y hovers
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={colorSecundario}
                    onChange={(e) => setColorSecundario(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                    title="Elegir color secundario"
                  />
                  <input
                    type="text"
                    value={colorSecundario}
                    onChange={(e) => setColorSecundario(e.target.value)}
                    placeholder="#047857"
                    data-testid="input-color-secundario"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color de Acento */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Color de Acento
                </label>
                <p className="text-[11px] text-slate-500">
                  Insignias, etiquetas e iconos destacados
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={colorAcento}
                    onChange={(e) => setColorAcento(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                    title="Elegir color de acento"
                  />
                  <input
                    type="text"
                    value={colorAcento}
                    onChange={(e) => setColorAcento(e.target.value)}
                    placeholder="#06b6d4"
                    data-testid="input-color-acento"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Color de Fondo */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <label className="text-xs font-bold text-slate-200 block">
                  Color de Fondo
                </label>
                <p className="text-[11px] text-slate-500">
                  Tono oscuro base de la web pública
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={colorFondo}
                    onChange={(e) => setColorFondo(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer p-0"
                    title="Elegir color de fondo"
                  />
                  <input
                    type="text"
                    value={colorFondo}
                    onChange={(e) => setColorFondo(e.target.value)}
                    placeholder="#020617"
                    data-testid="input-color-fondo"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono font-bold text-white uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Mockup Card (5 cols) */}
            <div className="lg:col-span-5" data-testid="live-preview-mockup">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>👁️ Previsualización en Vivo</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Tiempo Real</span>
              </div>

              {/* Simulated Device Screen */}
              <div
                className="rounded-2xl p-5 border shadow-2xl transition-all duration-300 space-y-4 overflow-hidden"
                style={{
                  backgroundColor: colorFondo,
                  borderColor: colorSecundario,
                }}
              >
                {/* Header Mockup */}
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-2">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-7 h-7 rounded-lg object-contain bg-white/5 border border-white/10"
                        data-testid="mockup-logo-preview"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                        style={{ backgroundColor: colorPrimario }}
                      >
                        {clubNombre.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-extrabold text-white truncate max-w-[120px]">
                      {clubNombre}
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: `${colorAcento}25`,
                      color: colorAcento,
                      borderColor: `${colorAcento}50`,
                    }}
                  >
                    Oficial
                  </span>
                </div>

                {/* Portada Hero Banner Mockup */}
                {portadaUrl ? (
                  <div
                    className="w-full h-24 rounded-xl overflow-hidden bg-cover bg-center border relative shadow-md"
                    style={{
                      backgroundImage: `url(${portadaUrl})`,
                      borderColor: `${colorSecundario}80`,
                    }}
                    data-testid="mockup-portada-preview"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent flex items-end p-2.5">
                      <span className="text-[10px] font-bold text-white tracking-wide truncate">
                        {eslogan || clubNombre}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Slogan & Reseña Corta Mockup */}
                <div>
                  <h5 className="text-xs font-black text-white">
                    {eslogan || "Tu club deportivo oficial"}
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-3" data-testid="mockup-descripcion-corta">
                    {descripcionCorta || "Reserva tu turno online en menos de 1 minuto"}
                  </p>
                </div>

                {/* Simulated Court Card */}
                <div
                  className="rounded-xl p-3 border space-y-2 bg-slate-900/60"
                  style={{ borderColor: `${colorPrimario}60` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Cancha 1 (Central)</span>
                    <span
                      className="text-[10px] font-black"
                      style={{ color: colorPrimario }}
                    >
                      $12.000
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{
                        backgroundColor: `${colorAcento}20`,
                        color: colorAcento,
                      }}
                    >
                      💡 LED Pro
                    </span>
                    <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      🏠 Techada
                    </span>
                  </div>
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-xs font-black text-white shadow-lg transition"
                  style={{
                    backgroundColor: colorPrimario,
                  }}
                >
                  Reservar Turno Ahora →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 3: LOGOTIPO Y BANNER HERO (PORTADA) */}
        {/* ========================================================================= */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>3. Imágenes de Marca (Logotipo & Portada)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Sube los archivos que identificarán a tu club en la barra superior y cabecera
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Logotipo */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4" data-testid="logo-uploader-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Logotipo Oficial</h4>
                  <p className="text-[11px] text-slate-500">Recomendado formato cuadrado o circular (PNG/SVG transparente)</p>
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl(null);
                      setSuccessMsg("Logotipo removido. Haz clic en Guardar Cambios para aplicar.");
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    title="Remover logotipo"
                    data-testid="btn-quitar-logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo del club" className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl text-slate-600">🏟️</span>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "logo");
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    data-testid="btn-upload-logo"
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{logoUrl ? "Cambiar Logotipo" : "Subir Logotipo"}</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500">Máx. 4MB. Formatos: PNG, JPEG, WEBP, SVG</p>
                </div>
              </div>
            </div>

            {/* Card: Portada Hero */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4" data-testid="portada-uploader-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase">Banner de Portada (Hero)</h4>
                  <p className="text-[11px] text-slate-500">Foto panorámica de las canchas o predio (16:9)</p>
                </div>
                {portadaUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPortadaUrl(null);
                      setSuccessMsg("Banner de portada removido. Haz clic en Guardar Cambios para aplicar.");
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    title="Remover portada"
                    data-testid="btn-quitar-portada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="w-full h-24 rounded-2xl border border-slate-700 bg-slate-900 flex items-center justify-center overflow-hidden">
                  {portadaUrl ? (
                    <img src={portadaUrl} alt="Portada del club" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-500">Sin foto de portada asignada</span>
                  )}
                </div>

                <input
                  type="file"
                  ref={portadaInputRef}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "portada");
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => portadaInputRef.current?.click()}
                  disabled={uploadingPortada}
                  data-testid="btn-upload-portada"
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {uploadingPortada ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{portadaUrl ? "Cambiar Portada" : "Subir Portada"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 4: INFORMACIÓN INSTITUCIONAL & REDES SOCIALES */}
        {/* ========================================================================= */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span>4. Redes Sociales & Reseña Institucional</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Enlaces y presentación pública para conectar con tu comunidad de jugadores
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Eslogan */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-300">
                Eslogan o Lema del Club
              </label>
              <input
                type="text"
                value={eslogan}
                onChange={(e) => setEslogan(e.target.value)}
                placeholder="Ej: El mejor pádel y amigos de la zona norte"
                data-testid="input-eslogan"
                maxLength={255}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Reseña Corta */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase text-slate-300">
                Reseña Corta / Sobre Nosotros
              </label>
              <textarea
                rows={3}
                value={descripcionCorta}
                onChange={(e) => setDescripcionCorta(e.target.value)}
                placeholder="Ej: Fundado en 2018, contamos con 4 pistas de cristal templado panorámico, iluminación LED deportiva, confitería y vestuarios completos..."
                data-testid="textarea-descripcion-corta"
                maxLength={1000}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Instagram */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <span>Instagram (URL o usuario)</span>
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/tuclub"
                data-testid="input-instagram"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            {/* Facebook */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5 text-blue-400" />
                <span>Facebook (URL)</span>
              </label>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/tuclub"
                data-testid="input-facebook"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            {/* TikTok */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>🎵</span>
                <span>TikTok (URL)</span>
              </label>
              <input
                type="text"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="https://tiktok.com/@tuclub"
                data-testid="input-tiktok"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            {/* YouTube */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                <span>YouTube (URL)</span>
              </label>
              <input
                type="text"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@tuclub"
                data-testid="input-youtube"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>

            {/* Sitio Web Externo */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sitio Web Externo / Blog (Opcional)</span>
              </label>
              <input
                type="text"
                value={sitioWeb}
                onChange={(e) => setSitioWeb(e.target.value)}
                placeholder="https://www.micluboficial.com"
                data-testid="input-sitio-web"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Los cambios de colores, logo y plantilla impactan de inmediato en la web pública de tu club.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Descartar cambios
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Identidad de Marca</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
