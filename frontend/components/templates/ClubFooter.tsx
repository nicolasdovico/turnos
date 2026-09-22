"use client";

import React from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  ExternalLink,
  Instagram,
  Facebook,
  Video,
  Globe,
  Share2,
  Navigation,
} from "lucide-react";
import { NavigationLink } from "./ClubHeader";

export interface ClubFooterProps {
  subdomain: string;
  clubNombre: string;
  deportePrincipal?: string;
  footerLinks?: NavigationLink[];
  redesSociales?: {
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
    sitio_web?: string | null;
  };
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export default function ClubFooter({
  subdomain,
  clubNombre,
  deportePrincipal = "pádel",
  footerLinks = [],
  redesSociales,
  telefono,
  direccion,
  ciudad,
  latitud,
  longitud,
}: ClubFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/80 text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Club Info & Brand */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-black text-white">Complejo {clubNombre}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tu complejo deportivo de confianza para turnos de {deportePrincipal}, torneos y vida social.
            </p>

            {/* Social Icons */}
            {redesSociales && (
              <div className="flex items-center gap-2 pt-2">
                {redesSociales.instagram && (
                  <a
                    href={redesSociales.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-pink-400 border border-slate-800 transition"
                    title="Instagram"
                    data-testid="footer-social-instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {redesSociales.facebook && (
                  <a
                    href={redesSociales.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-800 transition"
                    title="Facebook"
                    data-testid="footer-social-facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {redesSociales.tiktok && (
                  <a
                    href={redesSociales.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition"
                    title="TikTok"
                    data-testid="footer-social-tiktok"
                  >
                    <Video className="w-4 h-4" />
                  </a>
                )}
                {redesSociales.sitio_web && (
                  <a
                    href={redesSociales.sitio_web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition"
                    title="Sitio Web Externo"
                    data-testid="footer-social-web"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Col 2: Institutional Pages (CMS) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Institucional
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href={`/tenants/${subdomain}`}
                  className="hover:text-white transition flex items-center gap-1.5"
                >
                  <span>Reservar Canchas</span>
                </Link>
              </li>
              {footerLinks.map((link) => (
                <li key={link.id}>
                  <Link
                    href={`/tenants/${subdomain}/paginas/${link.slug}`}
                    data-testid={`nav-footer-link-${link.slug}`}
                    className="hover:text-white transition flex items-center gap-1.5"
                  >
                    <span>{link.titulo}</span>
                  </Link>
                </li>
              ))}
              {footerLinks.length === 0 && (
                <li className="text-slate-500 italic text-[11px]">
                  Sin páginas institucionales adicionales.
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Contact & Location */}
          <div className="space-y-4 md:col-span-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Ubicación & Contacto
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              {(direccion || ciudad) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {direccion && <div>{direccion}</div>}
                    {ciudad && <div className="text-slate-400">{ciudad}</div>}
                  </div>
                </div>
              )}

              {telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono">{telefono}</span>
                </div>
              )}

              {latitud && longitud && (
                <div className="pt-1">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="footer-como-llegar"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-semibold border border-slate-800 transition"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Cómo llegar en Google Maps</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Platform mention */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} {clubNombre}. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1 text-[11px]">
            <span>Potenciado por</span>
            <a
              href="http://localhost:8080/portal"
              className="text-emerald-400 hover:text-emerald-300 font-bold transition"
            >
              TuTurno SaaS
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
