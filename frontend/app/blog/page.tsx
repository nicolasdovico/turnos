import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { Calendar, Clock, ArrowRight, BookOpen, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog y Recursos para Administradores de Complejos Deportivos | TurnosFlow",
  description:
    "Artículos, guías y consejos de rentabilidad para canchas de pádel, fútbol y tenis. Aprendé a cobrar señas automáticas, optimizar horarios y modernizar tu predio.",
  keywords: [
    "blog gestion canchas",
    "software para canchas",
    "rentabilidad complejo de padel",
    "cobrar senas online",
    "administracion de canchas de futbol"
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog & Consejos para Clubes Deportivos | TurnosFlow",
    description: "Guías prácticas y estrategias para maximizar la ocupación y facturación de tu complejo deportivo.",
    url: "https://turnosflow.com/blog",
    siteName: "TurnosFlow",
    locale: "es_AR",
    type: "website",
  },
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <section className="relative pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-1.5 text-xs font-bold text-emerald-400">
          <BookOpen className="w-4 h-4" />
          <span>Centro de Recursos y Estrategias</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Guías y Rentabilidad para{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Complejos Deportivos
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Estrategias comprobadas para llenar tus canchas en horarios valle, eliminar las ausencias no avisadas y modernizar la gestión diaria de tu club.
        </p>
      </section>

      {/* Grid de Artículos */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.slug}
              className="group rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 hover:border-emerald-500/40 transition-all duration-200 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-emerald-300 transition leading-snug">
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{post.date}</span>
                </div>

                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition group-hover:translate-x-1 duration-200"
                >
                  <span>Leer artículo</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Banner CTA Final */}
        <div className="mt-16 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-8 sm:p-12 text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white">
            ¿Querés aplicar estas mejoras en tu complejo hoy mismo?
          </h3>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Configurá tu grilla horaria, cobrá señas automáticas por Mercado Pago y poné en marcha tu web oficial con 30 días de prueba gratuita.
          </p>
          <div className="pt-2">
            <Link
              href="/registro-club"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
            >
              <span>Comenzar Prueba Gratis de 30 Días</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
