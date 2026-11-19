import type { Metadata } from "next";
import PadelLandingClient from "./PadelLandingClient";

export const metadata: Metadata = {
  title: "Software para Canchas de Pádel | Sistema de Gestión y Turnos Online - TurnosFlow",
  description:
    "La plataforma definitiva para complejos de pádel. Grilla horaria inteligente, partidos abiertos (matchmaking), cobro automático de señas con Mercado Pago, control de canchas techadas/cristal y web propia. Probá 30 días gratis.",
  keywords: [
    "software para canchas de padel",
    "sistema de turnos de padel",
    "gestion de clubes de padel",
    "turnos de padel online",
    "sistema para complejo de padel",
    "app para canchas de padel",
    "partidos abiertos padel",
    "torneos de padel software"
  ],
  alternates: {
    canonical: "/padel",
  },
  openGraph: {
    title: "Software de Gestión y Turnos para Clubes de Pádel | TurnosFlow",
    description:
      "Automatizá tu complejo de pádel: grilla horaria 24/7, señas online, partidos abiertos por nivel y control de caja. Puesta en marcha 100% gratuita.",
    url: "https://turnosflow.com/padel",
    siteName: "TurnosFlow",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TurnosFlow Pádel - Software para Complejos de Pádel",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
};

export default function PadelPage() {
  return <PadelLandingClient />;
}
