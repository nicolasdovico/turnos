import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://turnosflow.com"),
  title: "TurnosFlow | Software de Gestión Deportiva, Reservas de Canchas y Turnos Online",
  description: "Plataforma integral para clubes y complejos de pádel, fútbol y tenis. Agenda online de turnos, cobranzas automáticas con Mercado Pago, control de caja, cantina POS y sitio web propio. Probá 30 días gratis.",
  keywords: [
    "software para canchas",
    "gestion de complejos deportivos",
    "reservas de padel online",
    "sistema de turnos de futbol",
    "control de caja para clubes",
    "pagina web para complejos deportivos",
    "software para clubes de tenis",
    "alquiler de canchas",
    "turnos flow"
  ],
  authors: [{ name: "TurnosFlow", url: "https://turnosflow.com" }],
  creator: "TurnosFlow",
  publisher: "TurnosFlow",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TurnosFlow | Software de Gestión Deportiva y Reservas de Turnos",
    description: "Digitalizá tu complejo deportivo. Agenda online 24/7, cobro automático de señas, control de caja diaria y web con dominio propio. Probá 30 días gratis.",
    url: "https://turnosflow.com",
    siteName: "TurnosFlow",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "TurnosFlow - Software de Gestión para Clubes y Complejos Deportivos",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TurnosFlow | Software de Gestión Deportiva y Reservas de Canchas",
    description: "Agenda de turnos online, cobranzas automáticas, control de caja y web propia para complejos deportivos. Probá gratis.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
