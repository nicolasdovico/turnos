import React from "react";
import Link from "next/link";

export default function MainFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Columna 1: Marca y descripción */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-tight">
                Turnos<span className="text-emerald-400">Flow</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El sistema de gestión y reservas online diseñado específicamente para complejos deportivos y clubes. Automatizá turnos, señas y caja.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operativo 24/7 en la nube
              </span>
            </div>
          </div>

          {/* Columna 2: Deportes y nichos (SEO Internal Linking) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Especialidades
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/padel"
                  className="hover:text-emerald-400 transition inline-flex items-center gap-1.5"
                >
                  <span>🎾</span>
                  <span>Software para Pádel</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                    Popular
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/futbol"
                  className="hover:text-emerald-400 transition inline-flex items-center gap-1.5"
                >
                  <span>⚽</span>
                  <span>Software para Fútbol</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                    Nuevo
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/tenis"
                  className="hover:text-emerald-400 transition inline-flex items-center gap-1.5"
                >
                  <span>🎾</span>
                  <span>Software para Tenis</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/hockey"
                  className="hover:text-emerald-400 transition inline-flex items-center gap-1.5"
                >
                  <span>🏑</span>
                  <span>Software para Hockey</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                    Nuevo
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Plataforma y Acceso */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Plataforma
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/planes" className="hover:text-emerald-400 transition">
                  Planes y Precios
                </Link>
              </li>
              <li>
                <Link href="/registro-club" className="hover:text-emerald-400 transition">
                  Registrar mi Complejo (30 Días Gratis)
                </Link>
              </li>
              <li>
                <Link href="/jugar" className="hover:text-emerald-400 transition">
                  Buscar Canchas para Jugar
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition">
                  Acceso Administradores
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto y Soporte */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Contacto Comercial
            </h3>
            <p className="text-xs text-slate-400">
              ¿Tenés dudas sobre cómo implementarlo en tu predio? Hablá directamente con nuestro equipo técnico y comercial:
            </p>
            <div className="pt-1 space-y-2">
              <a
                href="https://wa.me/5491149790220?text=%C2%A1Hola!%20Quisiera%20asesoramiento%20para%20implementar%20TurnosFlow%20en%20mi%20complejo."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition"
              >
                <span>💬 WhatsApp: +54 9 11 4979-0220</span>
              </a>

              <div>
                <a
                  href="https://instagram.com/turnosflow.oficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 text-slate-300 hover:text-pink-400 font-semibold text-xs transition"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span>Instagram: @turnosflow.oficial</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Fila inferior */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} TurnosFlow. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/portal#faq" className="hover:text-slate-300 transition">
              Preguntas Frecuentes
            </Link>
            <Link href="/portal#contacto" className="hover:text-slate-300 transition">
              Soporte
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
