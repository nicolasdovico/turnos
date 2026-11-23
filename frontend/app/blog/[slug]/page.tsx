import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blogPosts";
import { ArrowLeft, Calendar, Clock, CheckCircle2, ArrowRight, MessageCircle } from "lucide-react";

interface Props {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) return {};

  return {
    title: `${post.title} | TurnosFlow`,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | TurnosFlow`,
      description: post.excerpt,
      url: `https://turnosflow.com/blog/${post.slug}`,
      siteName: "TurnosFlow",
      locale: "es_AR",
      type: "article",
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  // Schema.org Article JSON-LD
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Organization",
      name: "TurnosFlow",
      url: "https://turnosflow.com",
    },
    publisher: {
      "@type": "Organization",
      name: "TurnosFlow",
      logo: {
        "@type": "ImageObject",
        url: "https://turnosflow.com/og-image.jpg",
      },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://turnosflow.com/blog/${post.slug}`,
    },
  };

  const whatsappMessage = encodeURIComponent(
    `Hola! Leí el artículo "${post.title}" en TurnosFlow y me gustaría conocer cómo implementarlo en mi complejo deportivo.`
  );
  const whatsappUrl = `https://wa.me/5491100000000?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        {/* Volver */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-400 transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Guías y Artículos</span>
        </Link>

        {/* Encabezado del Post */}
        <header className="space-y-4 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {post.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{post.readTime}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{post.date}</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-medium">
            {post.excerpt}
          </p>
        </header>

        {/* Contenido */}
        <div className="pt-8 space-y-6 text-slate-300 leading-relaxed text-sm sm:text-base">
          {post.content.map((paragraph, idx) => {
            if (paragraph.startsWith("### ")) {
              return (
                <h2 key={idx} className="text-xl sm:text-2xl font-bold text-white pt-6 pb-2">
                  {paragraph.replace("### ", "")}
                </h2>
              );
            }
            if (paragraph.startsWith("- ")) {
              return (
                <li key={idx} className="list-disc ml-5 text-slate-300">
                  {paragraph.replace("- ", "")}
                </li>
              );
            }
            return (
              <p key={idx} className="text-slate-300">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Bloque CTA Intermedio / Final */}
        <div className="mt-14 rounded-3xl bg-slate-900 border border-emerald-500/30 p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Solución recomendada
            </span>
            <h3 className="text-xl font-bold text-white">
              Automatizá las reservas y señas de tu club con TurnosFlow
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Creá tu grilla interactiva, eliminá el desorden de WhatsApp y asegurá el cobro de cada turno por Mercado Pago.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/registro-club"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <span>Probar 30 Días Gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Consultar por WhatsApp</span>
            </a>
          </div>
        </div>
      </article>
    </main>
  );
}
