import type { Metadata } from "next";
import FutbolLandingClient from "./FutbolLandingClient";

export const metadata: Metadata = {
  title: "Software para Canchas de Fútbol 5, 7 y 11 | Sistema de Turnos Online - TurnosFlow",
  description:
    "El software líder para complejos y predios de fútbol 5, fútbol 7 y fútbol 11. Cobro obligatorio de señas con Mercado Pago, partidos abiertos (matchmaking), torneos con llaves y fixtures, cantina POS y sitio web oficial con dominio propio. Probá 30 días gratis.",
  keywords: [
    "software para canchas de futbol",
    "software canchas sinteticas",
    "arriendo canchas de futbol",
    "sistema de turnos de futbol 5",
    "alquiler de canchas de futbol",
    "gestion de predios de futbol",
    "sistema para complejo de futbol 7",
    "turnos de futbol online",
    "app para canchas de futbol",
    "partidos abiertos futbol 5",
    "torneos de futbol software",
    "canchas de cesped sintetico turnos"
  ],
  alternates: {
    canonical: "/futbol",
  },
  openGraph: {
    title: "Software de Gestión y Turnos para Predios de Fútbol | TurnosFlow",
    description:
      "Automatizá tu complejo de fútbol: señas por Mercado Pago, grilla de turnos 24/7, torneos y tablas de posiciones, cantina POS y web propia. Puesta en marcha 100% bonificada.",
    url: "https://turnosflow.com/futbol",
    siteName: "TurnosFlow",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TurnosFlow Fútbol - Software para Canchas y Predios de Fútbol",
      },
    ],
    locale: "es_419",
    type: "website",
  },
};

export default function FutbolPage() {
  return <FutbolLandingClient />;
}
