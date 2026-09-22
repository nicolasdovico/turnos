# Plan de Desarrollo Detallado: Etapa 4 - Portal Público Whitelabel y Renderizador de las 3 Plantillas

> **Documento:** `/docs/plan_etapa_4_portal_publico_y_plantillas.md`  
> **Fecha:** Septiembre de 2026  
> **Módulo:** Módulo F (CMS Multitenant & Sitio Web Whitelabel)  
> **Etapa:** 4 de 5  
> **Estado:** Propuesta para Aprobación  
> **Referencia Macro:** [`docs/macro_plan_modulo_f_cms.md`](file:///home/usuario/aplicaciones/turnos/docs/macro_plan_modulo_f_cms.md), [`docs/plan_etapa_2_panel_branding_y_plantillas.md`](file:///home/usuario/aplicaciones/turnos/docs/plan_etapa_2_panel_branding_y_plantillas.md) y [`docs/plan_etapa_3_gestor_paginas_cms.md`](file:///home/usuario/aplicaciones/turnos/docs/plan_etapa_3_gestor_paginas_cms.md)

---

## 1. Objetivo de la Etapa 4

Llevar a producción el portal web público del club (`/tenants/[subdomain]`), haciendo que la cáscara del sitio refleje de forma 100% fiel la **plantilla elegida**, la **identidad visual** (logotipo, portada, colores corporativos, eslogan) y la **navegación dinámica** (páginas institucionales y redes sociales) configuradas por el administrador en las Etapas 1, 2 y 3:

1. **Arquitectura de Layouts Modulares e Intercambiables:** Renderizado condicional según `complejo.plantilla_slug`:
   - **Plantilla A (`booking_direct`):** Cabecera minimalista y limpia, selector de canchas inmediato y grilla de horarios en primer plano para concretar reservas en 2 clics.
   - **Plantilla B (`institucional`):** Gran banner Hero con portada fotográfica, eslogan de marca, bloque de pilares/servicios del club y grilla de reservas integrada.
   - **Plantilla C (`modern_showcase`):** Estética contemporánea de alto impacto visual, tarjetas de canchas enriquecidas con atributos técnicos e insignias, llamada a la acción directa y layout contrastado.
2. **Inyección Dinámica de Paleta y Tokens de Color:** Aplicación de variables CSS (`--club-primary`, `--club-secondary`, `--club-accent`, `--club-bg`) para teñir botones, insignias, bordes activos y elementos destacados sin romper la armonía visual ni el contraste WCAG.
3. **Cabecera y Pie de Página Adaptables:**
   - **`ClubHeader.tsx`:** Muestra logo o nombre, teléfono con trigger del modal QR de WhatsApp, enlaces de navegación superior generados dinámicamente (`navegacion.header`) y barra flotante de acceso rápido para administradores del club.
   - **`ClubFooter.tsx`:** Enlaces a páginas del CMS (`navegacion.footer`), enlaces a redes sociales activas (Instagram, Facebook, TikTok, YouTube, Web externa), datos de contacto y mención sutil del software ("Potenciado por TuTurno").
4. **Página de Detalle Institucional (`/paginas/[slug]`):** Vista de lectura tipográfica (`prose`) con la cabecera y pie de página del club, botón de retorno a reservas y metadatos SEO.

---

## 2. Arquitectura de Componentes en Frontend (Next.js)

```
frontend/
├── components/
│   └── templates/
│       ├── ClubHeader.tsx               # Cabecera adaptable con menú y branding
│       ├── ClubFooter.tsx               # Pie institucional con enlaces y redes
│       ├── BookingDirectTemplate.tsx    # Layout A: Operativo y ultra-rápido
│       ├── InstitucionalTemplate.tsx    # Layout B: Tradicional con Hero y pilares
│       └── ModernShowcaseTemplate.tsx   # Layout C: Premium con tarjetas técnicas
├── app/
│   └── tenants/
│       └── [subdomain]/
│           ├── page.tsx                 # Portal público principal (orquestador)
│           └── paginas/
│               └── [slug]/
│                   └── page.tsx         # Renderizador de páginas institucionales
└── tests/
    └── PublicClubTemplates.test.tsx     # Suite de pruebas Vitest para las 3 plantillas
```

---

## 3. Desglose en Tareas Atómicas de Desarrollo

Siguiendo la metodología del proyecto, la ejecución se dividirá en **5 tareas atómicas consecutivas**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tarea 4.1: Componentes Compartidos ClubHeader y ClubFooter            │
│  - Logo, branding, navegación CMS dinámica, redes y modal WhatsApp     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 4.2: Plantilla 1 - Booking Direct (Operativa & Veloz)           │
│  - Cabecera compacta, foco 100% en canchas y grilla de horarios        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 4.3: Plantilla 2 - Club Institucional (Tradicional & Social)     │
│  - Hero banner fotográfico, eslogan, pilares del club y reservas       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 4.4: Plantilla 3 - Modern Showcase (Premium & Boutique)         │
│  - Tarjetas de cancha expandidas, insignias técnicas y diseño oscuro   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 4.5: Orquestador en page.tsx, /paginas/[slug] y Tests Vitest    │
│  - Inyección de CSS tokens, vista de página CMS y suite automatizada   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tarea 4.1: Componentes Compartidos `ClubHeader.tsx` y `ClubFooter.tsx`

* **Objetivo:** Construir la cáscara exterior estándar que enmarca a las 3 plantillas y a las páginas institucionales.
* **Componente `ClubHeader.tsx`:**
  - Renderiza el logotipo (`logo_url`) o el nombre del club en tipografía destacada.
  - Menú de navegación dinámico proveniente de `navegacion.header` (`GET /api/clubs/{subdomain}/branding`).
  - Botón interactivo para chatear por WhatsApp / escanear código QR desde el móvil.
  - Indicador de distancia si el usuario otorgó permiso de geolocalización.
  - Barra superior de administración si el usuario autenticado es dueño del club (`isAdmin`).
* **Componente `ClubFooter.tsx`:**
  - Lista de enlaces institucionales en `navegacion.footer` (ej: `/paginas/reglamento-interno`).
  - Iconos de redes sociales configuradas (Instagram, Facebook, TikTok, YouTube).
  - Información de contacto: dirección física, ciudad, teléfono y botón de Google Maps ("Cómo llegar").
  - Copyright y enlace a portal global de reservas.

---

### Tarea 4.2: Plantilla 1 - `BookingDirectTemplate.tsx` (Operativa & Veloz)

* **Enfoque:** Diseñada para clubes de alto tráfico donde el 95% de los usuarios entra exclusivamente a reservar una cancha lo más rápido posible.
* **Características visuales y estructurales:**
  - Sin banner de portada gigante que empuje el contenido hacia abajo.
  - Selector de canchas compacto y horizontal en la parte superior.
  - Grilla de horarios (`GrillaHoraria.tsx`) en el viewport inicial.
  - Resumen de comodidades en badges minimalistas (iluminación, techada, superficie).

---

### Tarea 4.3: Plantilla 2 - `InstitucionalTemplate.tsx` (Tradicional & Vida de Club)

* **Enfoque:** Diseñada para clubes sociales, countries o complejos con historia, escuelitas y torneos que desean transmitir pertenencia y trayectoria.
* **Características visuales y estructurales:**
  - **Hero Banner Panorámico:** Imagen de portada (`portada_url`), gradiente de superposición elegante con el color corporativo, título imponente y eslogan de marca (`complejo.eslogan`).
  - **Bloque de Pilares y Servicios:** 3 o 4 tarjetas visuales destacando ventajas del complejo (*Instalaciones Premium*, *Estacionamiento Privado*, *Buffet & Resto Bar*, *Vestuarios Climatizados*).
  - **Sección de Reservas:** Título de sección destacado con selector de canchas y grilla horaria integrada de manera fluida.

---

### Tarea 4.4: Plantilla 3 - `ModernShowcaseTemplate.tsx` (Premium & Boutique)

* **Enfoque:** Diseñada para complejos modernos, centros de alto rendimiento y pistas panorámicas que buscan deslumbrar estéticamente.
* **Características visuales y estructurales:**
  - Tarjetas de cancha expandidas tipo *showcase*: cada cancha exhibe su formato, tipo de cristal, superficie profesional, iluminación LED e insignias técnicas individuales.
  - Diseño con contrastes acentuados, acentos neón derivados de `color_acento` y tipografía técnica.
  - Grilla horaria interactiva con feedback visual de selección y acceso directo al checkout.

---

### Tarea 4.5: Orquestador en `page.tsx`, Página de CMS y Tests Vitest

* **Objetivo:** Conectar los datos de la API con los layouts, actualizar la vista de páginas y validar la suite de pruebas.
* **Acciones:**
  1. **Actualización de [`frontend/app/tenants/[subdomain]/page.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/app/tenants/%5Bsubdomain%5D/page.tsx):**
     - Consulta unificada hacia `GET /api/clubs/{subdomain}/branding` y `GET /api/clubs/{subdomain}/dashboard`.
     - Inyección de variables CSS inline (`style={{ '--club-primary': branding.color_primario, ... }}`).
     - Switch dinámico según `branding.plantilla_slug` (`booking_direct` | `institucional` | `modern_showcase`).
  2. **Actualización de [`frontend/app/tenants/[subdomain]/paginas/[slug]/page.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/app/tenants/%5Bsubdomain%5D/paginas/%5Bslug%5D/page.tsx):**
     - Inclusión de `ClubHeader` y `ClubFooter`.
     - Breadcrumb `Inicio › Páginas › [Título]`.
     - Botón destacado de retorno a reservas.
  3. **Suite de Tests [`frontend/tests/PublicClubTemplates.test.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/tests/PublicClubTemplates.test.tsx):**
     - Renderizado de cada una de las 3 plantillas con sus elementos característicos.
     - Verificación de enlaces de navegación en cabecera y pie.
     - Comprobación de aplicación de colores institucionales en variables CSS.
     - Navegación hacia páginas institucionales.

---

## 4. Criterios de Aceptación de la Etapa 4

* [ ] Al visitar `/tenants/{subdomain}`, el portal renderiza la plantilla configurada en el club (`booking_direct`, `institucional` o `modern_showcase`).
* [ ] Si el administrador cambia la plantilla desde su panel y guarda, la web pública adopta el nuevo layout al recargar o tras la revalidación.
* [ ] Los colores institucionales (`color_primario`, `color_secundario`, etc.) definen la estética de botones, insignias y destaques.
* [ ] Las páginas creadas en la Etapa 3 aparecen en el menú superior o en el pie según se hayan configurado (`mostrar_en_header`, `mostrar_en_footer`).
* [ ] Al acceder a `/tenants/{subdomain}/paginas/{slug}`, la página se visualiza con diseño institucional y permite regresar al portal de reservas.
* [ ] Todas las pruebas de Vitest (`npm test`) y TypeScript (`npx tsc --noEmit`) se completan en verde con 0 errores.

---

## 5. Próximo Paso Inmediato

Aguardar la confirmación y el **OK del usuario** para comenzar el desarrollo atómico de la **Etapa 4**.
