"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatWhatsAppNumber } from "@/components/GrillaHoraria";
import ClubHeader, { NavigationLink } from "@/components/templates/ClubHeader";
import ClubFooter from "@/components/templates/ClubFooter";
import BookingDirectTemplate, { CanchaItem } from "@/components/templates/BookingDirectTemplate";
import InstitucionalTemplate from "@/components/templates/InstitucionalTemplate";
import ModernShowcaseTemplate from "@/components/templates/ModernShowcaseTemplate";

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
  latitud?: number | null;
  longitud?: number | null;
  estado: string;
  tipo_cobro_reserva?: string;
  porcentaje_sena?: number;
}

const API_BASE =
  typeof window !== "undefined"
    ? "/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function TenantPage({ params }: { params?: { subdomain: string } }) {
  const urlParams = useParams();
  const subdomain = (urlParams?.subdomain as string) || params?.subdomain || "demo";
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complejo, setComplejo] = useState<ComplejoData | null>(null);
  const [canchas, setCanchas] = useState<CanchaItem[]>([]);
  const [selectedCanchaId, setSelectedCanchaId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPublicQrModal, setShowPublicQrModal] = useState<boolean>(false);
  const [distanciaUsuario, setDistanciaUsuario] = useState<string | null>(null);

  // Dynamic Branding & CMS Navigation
  const [branding, setBranding] = useState<{
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
  }>({
    plantilla_slug: "booking_direct",
    logo_url: null,
    portada_url: null,
    color_primario: "#10b981",
    color_secundario: "#047857",
    color_acento: "#06b6d4",
    color_fondo: "#020617",
    eslogan: null,
    descripcion_corta: null,
    redes_sociales: {},
  });

  const [navegacion, setNavegacion] = useState<{
    header: NavigationLink[];
    footer: NavigationLink[];
  }>({
    header: [],
    footer: [],
  });

  const cleanWaNumber = useMemo(
    () => formatWhatsAppNumber(complejo?.telefono),
    [complejo?.telefono]
  );

  // Geolocation Distance Calculation
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      navigator.geolocation &&
      complejo?.latitud &&
      complejo?.longitud
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat1 = pos.coords.latitude;
          const lon1 = pos.coords.longitude;
          const lat2 = Number(complejo.latitud);
          const lon2 = Number(complejo.longitud);
          const R = 6371;
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = R * c;
          if (d < 1) {
            setDistanciaUsuario(`A ${(d * 1000).toFixed(0)} m de vos`);
          } else {
            setDistanciaUsuario(`A ${d.toFixed(1)} km de vos`);
          }
        },
        () => {},
        { timeout: 5000 }
      );
    }
  }, [complejo?.latitud, complejo?.longitud]);

  // Marketplace Referral Tracking
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("ref") === "marketplace") {
        try {
          sessionStorage.setItem("saas_reserva_origen", "marketplace");
        } catch {
          // ignore sessionStorage errors
        }
      }
    }
  }, []);

  // Fetch Public Data, Courts & Branding
  useEffect(() => {
    const fetchClubData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get active token from AuthContext, URL or localStorage
        let activeToken = token;
        if (!activeToken && typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search);
          activeToken =
            searchParams.get("auth_token") ||
            searchParams.get("token") ||
            localStorage.getItem("saas_token");
        }

        // 2. Check admin status for this club
        try {
          const adminRes = await fetch(`${API_BASE}/clubs/${subdomain}/is-admin`, {
            headers: {
              Accept: "application/json",
              ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
          });
          const adminData = await adminRes.json();
          if (adminData.is_admin) {
            setIsAdmin(true);
          }
        } catch {
          // Non-blocking
        }

        // 3. Fetch public club data, courts & branding concurrently
        const [res, brandRes] = await Promise.all([
          fetch(`${API_BASE}/clubs/${subdomain}/dashboard`),
          fetch(`${API_BASE}/clubs/${subdomain}/branding`).catch(() => null),
        ]);

        const data = await res.json();

        if (!res.ok || !data.data?.complejo) {
          setError(data.message || `No se encontró el club o complejo "${subdomain}".`);
          return;
        }

        const compData = data.data.complejo;
        setComplejo(compData);

        // Parse branding if available
        if (brandRes && brandRes.ok) {
          try {
            const brandJson = await brandRes.json();
            if (brandJson?.data?.branding) {
              setBranding((prev) => ({
                ...prev,
                ...brandJson.data.branding,
              }));
            }
            if (brandJson?.data?.navegacion) {
              setNavegacion({
                header: brandJson.data.navegacion.header || [],
                footer: brandJson.data.navegacion.footer || [],
              });
            }
          } catch {
            // Ignore branding parsing error
          }
        }

        // Filter only active courts and sort them naturally by name
        const rawCanchas: CanchaItem[] = data.data.canchas || [];
        const activeCanchas = rawCanchas
          .filter((c) => c.estado === "activo")
          .sort((a, b) =>
            (a.nombre || "").localeCompare(b.nombre || "", undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );

        setCanchas(activeCanchas);
        if (activeCanchas.length > 0) {
          setSelectedCanchaId(activeCanchas[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    };

    fetchClubData();
  }, [subdomain, token]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">
            Cargando portal de reservas de {subdomain}...
          </p>
        </div>
      </main>
    );
  }

  if (error || !complejo) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8 bg-slate-950 text-white">
        <div className="mx-auto max-w-md text-center rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 text-3xl border border-rose-500/20">
            🏟️
          </div>
          <h1 className="text-xl font-bold text-white">Establecimiento No Encontrado</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || `El establecimiento "${subdomain}" no existe o se encuentra inactivo temporalmente.`}
          </p>
          <div className="pt-2">
            <a
              href="http://localhost:8080/portal"
              className="inline-block rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              ← Ir al Portal de Complejos
            </a>
          </div>
        </div>
      </main>
    );
  }

  const selectedCancha = canchas.find((c) => c.id === selectedCanchaId) || canchas[0];
  const tipoNegocioLabel = complejo.tipo_negocio?.nombre || "Club";

  const templateProps = {
    subdomain,
    complejo,
    branding,
    canchas,
    selectedCanchaId,
    onSelectCanchaId: (id: number) => setSelectedCanchaId(id),
    selectedCancha,
    tipoNegocioLabel,
    distanciaUsuario,
    cleanWaNumber,
    isAdmin,
    user,
    token,
    onOpenQrModal: () => setShowPublicQrModal(true),
  };

  const primaryColor = branding.color_primario || "#10b981";
  const secondaryColor = branding.color_secundario || "#047857";
  const accentColor = branding.color_acento || "#06b6d4";
  const bgColor = branding.color_fondo || "#020617";

  const customStyle: React.CSSProperties = {
    // @ts-ignore
    "--club-primary": primaryColor,
    "--club-secondary": secondaryColor,
    "--club-accent": accentColor,
    "--club-bg": bgColor,
    backgroundColor: bgColor,
  };

  return (
    <main
      className="min-h-screen text-white flex flex-col justify-between transition-colors duration-200"
      style={customStyle}
      data-testid="tenant-public-portal"
    >
      <div>
        {/* Dynamic Header */}
        <ClubHeader
          subdomain={subdomain}
          clubNombre={complejo.nombre}
          deportePrincipal={complejo.deporte_principal}
          tipoNegocioLabel={tipoNegocioLabel}
          logoUrl={branding.logo_url}
          headerLinks={navegacion.header}
          telefono={complejo.telefono}
          isAdmin={isAdmin}
          distanciaUsuario={distanciaUsuario}
          onOpenQrModal={() => setShowPublicQrModal(true)}
        />

        {/* Dynamic Template Switcher */}
        {branding.plantilla_slug === "institucional" ? (
          <InstitucionalTemplate {...templateProps} />
        ) : branding.plantilla_slug === "modern_showcase" ? (
          <ModernShowcaseTemplate {...templateProps} />
        ) : (
          <BookingDirectTemplate {...templateProps} />
        )}
      </div>

      {/* Dynamic Footer */}
      <ClubFooter
        subdomain={subdomain}
        clubNombre={complejo.nombre}
        deportePrincipal={complejo.deporte_principal}
        footerLinks={navegacion.footer}
        redesSociales={branding.redes_sociales}
        descripcionCorta={branding.descripcion_corta}
        telefono={complejo.telefono}
        direccion={complejo.direccion}
        ciudad={complejo.ciudad}
        latitud={complejo.latitud}
        longitud={complejo.longitud}
      />

      {/* Floating WhatsApp Contact Button */}
      {complejo.telefono && (
        <aside
          aria-label="Contacto por WhatsApp"
          className="fixed bottom-6 right-6 z-50 flex items-center group"
          data-testid="floating-whatsapp-widget"
        >
          <div className="hidden sm:flex items-center bg-slate-900/95 text-white text-xs font-semibold px-3 py-2 rounded-2xl shadow-xl border border-slate-700/80 mr-3 backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span>¿Dudas o consultas? <strong className="text-emerald-400">¡Chateá con nosotros!</strong></span>
          </div>
          <a
            href={`https://wa.me/${cleanWaNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-2xl shadow-emerald-950/60 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            title="Abrir chat de WhatsApp"
            aria-label="Contactar por WhatsApp"
            data-testid="floating-whatsapp-button"
          >
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.9-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </a>
        </aside>
      )}

      {/* Modal Código QR Público para Celulares */}
      {showPublicQrModal && complejo.telefono && (
        <div
          data-testid="public-qr-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <button
              type="button"
              onClick={() => setShowPublicQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
                💬
              </div>
              <h3 className="text-xl font-black text-white">Chateá por WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Apuntá con la <strong className="text-emerald-400">cámara de tu celular</strong> a este código para abrir directamente el chat con <strong>{complejo.nombre}</strong>.
              </p>
            </div>

            {/* Código QR */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Fwa.me%2F${cleanWaNumber}`}
                alt={`Código QR WhatsApp ${complejo.nombre}`}
                width={240}
                height={240}
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="space-y-3">
              <div className="font-mono text-xs text-slate-300 bg-slate-950 border border-slate-800 py-2 px-3 rounded-xl flex items-center justify-center gap-2">
                <span className="text-emerald-400">wa.me/</span>
                <span className="font-bold text-white">{cleanWaNumber}</span>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={`https://wa.me/${cleanWaNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <span>💬</span> Abrir en WhatsApp Web ↗
                </a>
                <button
                  type="button"
                  onClick={() => setShowPublicQrModal(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
