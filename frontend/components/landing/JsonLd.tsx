import React from "react";
import { LANDING_CONFIG } from "@/lib/landingConfig";

export default function JsonLd() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TurnosFlow",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, iOS, Android",
    "description": "Software integral de gestión de complejos deportivos, reservas y arriendo de canchas / pistas y turnos online para clubes de Latinoamérica.",
    "areaServed": [
      { "@type": "Country", "name": "Argentina" },
      { "@type": "Country", "name": "Chile" },
      { "@type": "Country", "name": "Uruguay" },
      { "@type": "Country", "name": "Paraguay" },
      { "@type": "Country", "name": "Colombia" },
      { "@type": "Country", "name": "Perú" },
      { "@type": "Country", "name": "México" }
    ],
    "offers": {
      "@type": "Offer",
      "price": "29.00",
      "priceCurrency": "USD",
      "priceValidUntil": "2027-12-31",
      "availability": "https://schema.org/InStock",
      "url": "https://turnosflow.com/planes"
    },
    "featureList": [
      "Agenda y grilla de turnos online en tiempo real",
      "Cobro automático de señas con Mercado Pago y Stripe",
      "Control de caja diaria y arqueo ciego",
      "Punto de venta (POS) y buffet con control de stock",
      "Sitio web propio con subdominio para cada club",
      "Recordatorios automáticos por WhatsApp",
      "Directorio y CRM de clientes con Ficha 360°",
      "Gestor de torneos, fixtures y llaves eliminatorias",
      "Automatización de luces de canchas por domótica IoT"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "128"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TurnosFlow",
    "url": "https://turnosflow.com",
    "logo": "https://turnosflow.com/logo-full.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+54-9-11-4979-0220",
      "contactType": "customer service",
      "availableLanguage": ["Spanish"]
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": LANDING_CONFIG.faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.pregunta,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.respuesta
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
