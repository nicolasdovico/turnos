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
                <span className="text-slate-600 inline-flex items-center gap-1.5">
                  <span>⚽</span>
                  <span>Fútbol 5 / 7 / 11 (Próximamente)</span>
                </span>
              </li>
              <li>
                <Link
                  href="/tenis"
                  className="hover:text-emerald-400 transition inline-flex items-center gap-1.5"
                >
                  <span>🎾</span>
                  <span>Software para Tenis</span>
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
            <div className="pt-1">
              <a
                href="https://wa.me/5491149790220?text=%C2%A1Hola!%20Quisiera%20asesoramiento%20para%20implementar%20TurnosFlow%20en%20mi%20complejo."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition"
              >
                <span>💬 WhatsApp: +54 9 11 4979-0220</span>
              </a>
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
