# Plan de Desarrollo Detallado: Etapa 3 - Gestor y Editor de Páginas Institucionales (Panel CMS)

> **Documento:** `/docs/plan_etapa_3_gestor_paginas_cms.md`  
> **Fecha:** Septiembre de 2026  
> **Módulo:** Módulo F (CMS Multitenant & Sitio Web Whitelabel)  
> **Etapa:** 3 de 5  
> **Estado:** Pendiente de Aprobación para Ejecución  
> **Referencia Macro:** [`docs/macro_plan_modulo_f_cms.md`](file:///home/usuario/aplicaciones/turnos/docs/macro_plan_modulo_f_cms.md) y [`docs/plan_etapa_2_panel_branding_y_plantillas.md`](file:///home/usuario/aplicaciones/turnos/docs/plan_etapa_2_panel_branding_y_plantillas.md)

---

## 1. Objetivo de la Etapa 3

Desarrollar el gestor y editor de páginas institucionales para que el administrador del club pueda redactar, formatear, ordenar y publicar contenidos personalizados (como `/reglamento`, `/tarifas`, `/quienes-somos` o `/cumpleanos-eventos`) sin depender de desarrolladores ni conocimientos técnicos:

1. **Gestor y Listado de Páginas:** Panel centralizado con visualización de estado (*Publicada* / *Borrador*), slug amigable, visibilidad en menú (*Header* / *Footer*), orden y acciones rápidas (editar, previsualizar, eliminar).
2. **Editor Enriquecido WYSIWYG con Barra de Herramientas:** Editor amigable con soporte de encabezados (H2, H3), negrita, cursiva, listas ordenadas y con viñetas, citas en bloque y enlaces, con previsualizador de contenido en tiempo real.
3. **Control Granular de Navegación y Menús:** Asignación de ubicación en la cabecera superior y/o en el pie de página del club, con orden numérico para definir la secuencia de enlaces.
4. **Optimización SEO y Snippet de Google:** Configuración de `meta_descripcion` (máx. 160 caracteres) con contador dinámico y previsualizador de snippet de búsqueda en Google.
5. **Aislamiento Multi-tenant y Anti-XSS:** Sanitización estricta de HTML mediante `HtmlSanitizerService` en backend y sincronización automática de caché en Redis (`tenant:branding:{subdominio}`) para que los cambios se reflejen de inmediato en la web pública.

---

## 2. Arquitectura y Ubicación en el Sistema

### Backend (API Laravel):
* Rutas unificadas bajo el prefijo del club en `backend/routes/api.php`:
  * `GET /api/clubs/{subdomain}/paginas`: Listado de páginas del club ordenadas.
  * `POST /api/clubs/{subdomain}/paginas`: Creación de nueva página con validación y revalidación ISR.
  * `PUT /api/clubs/{subdomain}/paginas/{id}`: Edición de página, actualización de menús e invalidación de caché.
  * `DELETE /api/clubs/{subdomain}/paginas/{id}`: Eliminación segura y purga de caché.

### Frontend (Next.js):
* Componente modular: [`frontend/components/GestionPaginasCMS.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/components/GestionPaginasCMS.tsx).
* Unificación en el panel: Dentro de la pestaña **`🎨 Sitio Web & Marca`**, se añade un selector de sub-sección:
  * `[ 🎨 Identidad & Plantilla ]` $\rightarrow$ Renderiza `BrandingClubPanel.tsx` (Etapa 2).
  * `[ 📄 Páginas Institucionales ]` $\rightarrow$ Renderiza `GestionPaginasCMS.tsx` (Etapa 3).
* Suite de pruebas: [`frontend/tests/GestionPaginasCMS.test.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/tests/GestionPaginasCMS.test.tsx) con Vitest y React Testing Library.

---

## 3. Desglose en Tareas Atómicas de Desarrollo

Siguiendo la *Regla de Oro* del proyecto, la ejecución se dividirá en **5 tareas atómicas consecutivas**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tarea 3.1: Endpoints de Club en PaginaController & Rutas API          │
│  - GET/POST/PUT/DELETE /api/clubs/{subdomain}/paginas con auth         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 3.2: Componente GestionPaginasCMS.tsx (Listado & Estados)       │
│  - Tabla/Cards, badges de menú, toggle borrador/publicada y vacíos     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 3.3: Editor WYSIWYG, Barra de Formato y Vista Previa en Vivo    │
│  - Toolbar H2/H3/B/I/Listas/Links, auto-slug y tab de preview HTML     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 3.4: Controles de Navegación, Menús y Previsualizador SEO       │
│  - Switches Header/Footer, orden numérico y mockup de Google Snippet   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 3.5: Integración en Panel y Tests Automatizados (Backend + FE)  │
│  - Sub-pestañas en Sitio Web & Marca + tests Vitest y PHPUnit verdes   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tarea 3.1: Endpoints de Club en `PaginaController` y Rutas en `api.php`

* **Objetivo:** Permitir que el panel del club gestione sus páginas utilizando directamente la URL de club (`/api/clubs/{subdomain}/paginas`), con validación de autenticación y permisos de propietario/admin.
* **Componentes principales:**
  1. Nuevos métodos en [`PaginaController.php`](file:///home/usuario/aplicaciones/turnos/backend/app/Http/Controllers/Api/PaginaController.php):
     * `indexByClub(Request $request, string $subdomain)`: Devuelve todas las páginas del complejo (publicadas y borradores) ordenadas por `orden ASC, created_at DESC`.
     * `storeByClub(Request $request, string $subdomain)`: Valida permisos, guarda la página con `complejo_id`, genera o valida el `slug` único por club, purga la caché de Redis (`tenant:branding:{subdomain}`) y dispara la revalidación ISR.
     * `updateByClub(Request $request, string $subdomain, int $id)`: Actualiza título, slug, contenido, orden, visibilidad de menús y meta descripción.
     * `destroyByClub(Request $request, string $subdomain, int $id)`: Elimina la página, purga la caché de Redis y dispara revalidación.
  2. Registro de rutas en `backend/routes/api.php` dentro del grupo `prefix('clubs')`.

---

### Tarea 3.2: Componente `GestionPaginasCMS.tsx` (Listado & Gestión)

* **Objetivo:** Crear la vista principal de gestión de contenidos institucionales.
* **Componentes principales:**
  1. **Cabecera y Métricas:** Total de páginas publicadas, enlaces activos en la cabecera y en el pie de página.
  2. **Listado de Páginas:**
     * Tarjeta/Fila por página con:
       * Título y slug clickeable (`/paginas/{slug}`).
       * Badge de estado (*Publicada* en verde vs. *Borrador* en gris/ámbar).
       * Badges de menú: `📌 Cabecera (Orden X)` y `🦶 Pie de página (Orden Y)`.
       * Botones de acción: *Editar*, *Ver en Vivo ↗* y *Eliminar*.
  3. **Estado Vacío Amigable:**
     * Si el club no tiene páginas creadas, muestra un mensaje explicativo y 3 botones de creación rápida de plantillas frecuentes:
       * 📄 *"Crear Reglamento Interno"*
       * 📄 *"Crear Quiénes Somos & Historia"*
       * 📄 *"Crear Tarifas & Abonos"*

---

### Tarea 3.3: Editor Enriquecido WYSIWYG, Barra de Herramientas y Vista Previa

* **Objetivo:** Brindar una experiencia de redacción limpia sin obligar al usuario a escribir código HTML.
* **Componentes principales:**
  1. **Barra de Formato Rápido (Toolbar):**
     * `H2` y `H3`: Subtítulos jerárquicos.
     * `B` y `I`: Negrita y cursiva.
     * `• Lista`: Viñetas desordenadas (`<ul><li>`).
     * `1. Lista`: Listas numeradas (`<ol><li>`).
     * `❝ Cita`: Bloque de llamada de atención o reglamento (`<blockquote>`).
     * `🔗 Link`: Inserción de enlaces externos o internos.
     * `―`: Separador horizontal.
  2. **Generador Inteligente de Slug:**
     * Al escribir el título (ej. *"Reglamento de Torneos 2026"*), el campo de slug se auto-completa como `reglamento-de-torneos-2026`, con opción de edición manual si el usuario lo desea.
  3. **Pestañas [ Editor ] y [ Vista Previa ]:**
     * Permite alternar entre el modo de redacción y el modo de vista previa renderizado con tipografía idéntica a la página pública.

---

### Tarea 3.4: Controles de Menús, Navegación y Previsualizador SEO

* **Objetivo:** Otorgar control preciso sobre dónde aparece cada enlace y cómo indexa Google la página.
* **Componentes principales:**
  1. **Switches de Visibilidad:**
     * Toggle: *"Mostrar enlace en el menú superior (Header)"*.
     * Toggle: *"Mostrar enlace en el pie de página (Footer)"*.
     * Input numérico de orden: define la secuencia (ej: Orden 1 aparece antes que Orden 2).
  2. **Previsualizador de Snippet de Google (Google Search Preview):**
     * Campo `meta_descripcion` con contador dinámico (ej: `115/160 caracteres`).
     * Tarjeta interactiva simulando el resultado en Google:
       * Título azul: `[Título de la página] | [Nombre del Club]`
       * URL verde: `[subdominio].turnos.com > paginas > [slug]`
       * Descripción gris: Texto descriptivo ingresado para búsquedas.

---

### Tarea 3.5: Integración en Panel y Tests Automatizados

* **Objetivo:** Unificar la experiencia de usuario en `/panel` y garantizar el 100% de cobertura de pruebas.
* **Componentes principales:**
  1. **Navegación Unificada en `/panel`:**
     * En la pestaña *"🎨 Sitio Web & Marca"*, se incorporan sub-pestañas:
       * `🎨 Identidad & Plantilla` (Branding, Colores, Logo, Redes).
       * `📄 Páginas Institucionales` (CMS y Editor WYSIWYG).
  2. **Suite de Tests con Vitest:**
     * Archivo: [`frontend/tests/GestionPaginasCMS.test.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/tests/GestionPaginasCMS.test.tsx).
     * Casos de prueba:
       * Renderiza el listado de páginas existentes con sus badges y estados.
       * Apertura del modal de creación y autogeneración de slug a partir del título.
       * Uso de las herramientas de formato del editor.
       * Alternancia entre pestaña de edición y vista previa en vivo.
       * Guardado exitoso hacia `POST /api/clubs/{subdomain}/paginas` con datos de menú y SEO.
       * Edición de página existente y eliminación con confirmación.
  3. **Verificación Backend:**
     * Ejecución de tests en `ClubBrandingTest` y `CMSSanitizationAndRevalidationTest` para verificar el correcto funcionamiento de los nuevos endpoints.

---

## 4. Criterios de Aceptación de la Etapa 3

* [ ] El administrador puede crear páginas ilimitadas con título, slug, contenido y meta descripción.
* [ ] El editor permite dar formato al texto (títulos, negritas, listas) y ver el resultado en la pestaña de vista previa.
* [ ] Las páginas configuradas con *"Mostrar en Header"* o *"Mostrar en Footer"* aparecen en los arrays de navegación de `GET /api/clubs/{subdomain}/branding`.
* [ ] Guardar o eliminar una página purga la caché de Redis y revalida la home del club de inmediato.
* [ ] El previsualizador de snippet de Google muestra en tiempo real cómo lucirá la página en los buscadores.
* [ ] Los tests de frontend (`npm test`) y de backend (`php artisan test`) pasan al 100% en verde sin errores de TypeScript.
