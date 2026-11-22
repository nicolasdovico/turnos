import type { Metadata } from "next";
import HockeyLandingClient from "./HockeyLandingClient";

export const metadata: Metadata = {
  title: "Software para Canchas de Hockey sobre Césped | Gestión de Clubes y Turnos - TurnosFlow",
  description:
    "El software especializado para canchas de hockey sobre césped (agua y arena). Gestión de entrenamientos, escuelas formativas, alquiler por franjas horarias y media cancha, señas automáticas por Mercado Pago, luz artificial y sitio web oficial con dominio propio. Probá 30 días gratis.",
  keywords: [
    "software para canchas de hockey",
    "sistema de turnos de hockey sobre cesped",
    "alquiler canchas de hockey",
    "gestion de clubes de hockey",
    "canchas de hockey sinteticas turnos",
    "reserva cancha hockey agua arena",
    "entrenamientos de hockey software",
    "sistema para predios de hockey",
    "app para canchas de hockey",
    "torneos de hockey software"
  ],
  alternates: {
    canonical: "/hockey",
  },
  openGraph: {
    title: "Software de Gestión y Turnos para Clubes y Canchas de Hockey | TurnosFlow",
    description:
      "Automatizá tu predio de hockey: canchas de agua y arena, división en media cancha, entrenamientos fijos, señas por Mercado Pago, iluminación nocturna y control de caja. Puesta en marcha 100% bonificada.",
    url: "https://turnosflow.com/hockey",
    siteName: "TurnosFlow",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TurnosFlow Hockey - Software para Complejos y Canchas de Hockey",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
};

export default function HockeyPage() {
  return <HockeyLandingClient />;
}
