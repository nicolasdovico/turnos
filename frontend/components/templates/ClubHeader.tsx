"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  MapPin,
  ExternalLink,
  MessageCircle,
  Smartphone,
  Shield,
  Calendar,
  Compass,
} from "lucide-react";

export interface NavigationLink {
  id: number;
  titulo: string;
  slug: string;
  orden?: number;
}

export interface ClubHeaderProps {
  subdomain: string;
  clubNombre: string;
  deportePrincipal?: string;
  tipoNegocioLabel?: string;
  logoUrl?: string | null;
  headerLinks?: NavigationLink[];
  telefono?: string | null;
  isAdmin?: boolean;
  distanciaUsuario?: string | null;
  onOpenQrModal?: () => void;
  activeSlug?: string;
}

export default function ClubHeader({
  subdomain,
  clubNombre,
  deportePrincipal = "pádel",
  tipoNegocioLabel = "Club",
  logoUrl,
  headerLinks = [],
  telefono,
  isAdmin = false,
  distanciaUsuario,
  onOpenQrModal,
  activeSlug,
}: ClubHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/90 border-b border-slate-800/80 transition shadow-sm">
      {/* Admin Top Quick Access Bar */}
      {isAdmin && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Estás visualizando la vista pública como dueño / administrador de{" "}
                <strong>{clubNombre}</strong>.
              </span>
            </div>
            <Link
              href="/panel"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow transition cursor-pointer"
            >
              ⚙️ Abrir Panel de Control →
            </Link>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link
          href={`/tenants/${subdomain}`}
          className="flex items-center gap-3 group focus:outline-none"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logotipo ${clubNombre}`}
              className="h-10 sm:h-12 w-auto max-w-[140px] sm:max-w-[180px] object-contain rounded-xl"
              data-testid="header-club-logo"
            />
          ) : (
            <div
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-md border border-white/10"
              style={{ backgroundColor: "var(--club-primary, #10b981)" }}
              data-testid="header-club-avatar"
            >
              {clubNombre.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition leading-tight line-clamp-1">
              {clubNombre}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium capitalize">
              <span>{tipoNegocioLabel}</span>
              <span>•</span>
              <span className="text-emerald-400">{deportePrincipal}</span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link
            href={`/tenants/${subdomain}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              !activeSlug
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reservas</span>
          </Link>

          {headerLinks.map((link) => {
            const isLinkActive = activeSlug === link.slug;
            return (
              <Link
                key={link.id}
                href={`/tenants/${subdomain}/paginas/${link.slug}`}
                data-testid={`nav-header-link-${link.slug}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isLinkActive
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {link.titulo}
              </Link>
            );
          })}
        </nav>

        {/* Action Items (Distance badge, WhatsApp Button, Mobile Menu) */}
        <div className="flex items-center gap-2.5">
          {distanciaUsuario && (
            <div
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-medium"
              data-testid="header-user-distance"
            >
              <Compass className="w-3 h-3" />
              <span>{distanciaUsuario}</span>
            </div>
          )}

          {telefono && onOpenQrModal && (
            <button
              type="button"
              onClick={onOpenQrModal}
              data-testid="header-qr-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
              title="Chatear por WhatsApp con el club"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          {(headerLinks.length > 0 || telefono) && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Abrir menú"
              data-testid="btn-toggle-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-5 space-y-2 backdrop-blur-xl animate-in slide-in-from-top duration-150">
          <Link
            href={`/tenants/${subdomain}`}
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
              !activeSlug
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            📅 Reservar Turnos
          </Link>

          {headerLinks.map((link) => (
            <Link
              key={link.id}
              href={`/tenants/${subdomain}/paginas/${link.slug}`}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeSlug === link.slug
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              📄 {link.titulo}
            </Link>
          ))}

          {distanciaUsuario && (
            <div className="px-3.5 py-2 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
              <Compass className="w-3.5 h-3.5" />
              <span>{distanciaUsuario}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
