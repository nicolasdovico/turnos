import type { Metadata } from "next";
import TenisLandingClient from "./TenisLandingClient";

export const metadata: Metadata = {
  title: "Software para Canchas de Tenis | Gestión de Clubes y Turnos Online - TurnosFlow",
  description:
    "El software definitivo para clubes y complejos de tenis. Turnos de 60, 90 y 120 minutos, canchas de polvo de ladrillo, cemento y césped, cobro automático de señas con Mercado Pago, gestión de profesores, luz nocturna y web oficial propia. Probá 30 días gratis.",
  keywords: [
    "software para canchas de tenis",
    "arriendo canchas de tenis",
    "alquiler pistas de tenis",
    "sistema de turnos de tenis",
    "gestion de clubes de tenis",
    "alquiler de canchas de tenis",
    "sistema para complejo de tenis",
    "app para canchas de tenis",
    "turnos de tenis online",
    "reserva de canchas polvo de ladrillo",
    "gestion profesores de tenis",
    "torneos de tenis software"
  ],
  alternates: {
    canonical: "/tenis",
  },
  openGraph: {
    title: "Software de Gestión y Turnos para Clubes de Tenis | TurnosFlow",
    description:
      "Automatizá tu complejo de tenis: grilla online flexible (60/90/120 min), señas por Mercado Pago, canchas de polvo de ladrillo y cemento, luz artificial y control de caja. Puesta en marcha 100% bonificada.",
    url: "https://turnosflow.com/tenis",
    siteName: "TurnosFlow",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TurnosFlow Tenis - Software para Clubes y Complejos de Tenis",
      },
    ],
    locale: "es_419",
    type: "website",
  },
};

export default function TenisPage() {
  return <TenisLandingClient />;
}
