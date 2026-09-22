# Plan de Desarrollo Detallado: Etapa 2 - Panel de Administración: Selector de Plantillas & Identidad Visual (Frontend Admin)

> **Documento:** `/docs/plan_etapa_2_panel_branding_y_plantillas.md`  
> **Fecha:** Septiembre de 2026  
> **Módulo:** Módulo F (CMS Multitenant & Sitio Web Whitelabel)  
> **Etapa:** 2 de 5  
> **Estado:** Pendiente de Aprobación para Ejecución  
> **Referencia Macro:** [`docs/macro_plan_modulo_f_cms.md`](file:///home/usuario/aplicaciones/turnos/docs/macro_plan_modulo_f_cms.md) y [`docs/plan_etapa_1_branding_y_modelo_cms.md`](file:///home/usuario/aplicaciones/turnos/docs/plan_etapa_1_branding_y_modelo_cms.md)

---

## 1. Objetivo de la Etapa 2

Construir la experiencia de usuario dentro del panel de administración del club (`/panel`) para que los administradores puedan configurar la presencia digital de su club de manera 100% visual y autónoma:

1. **Seleccionar su plantilla base de diseño** entre las 3 opciones registradas (*Booking Direct*, *Institucional*, *Modern Showcase*), con tarjetas interactivas que destacan las fortalezas de cada diseño.
2. **Personalizar la paleta de colores corporativos** (primario, secundario, acento, fondo) con selectores nativos, inputs HEX, paletas sugeridas con 1 clic y una tarjeta de **previsualización en vivo (Live Preview Mockup)** antes de guardar.
3. **Cargar y previsualizar su logotipo y banner de portada (Hero)** mediante subida directa de imágenes hacia el endpoint `POST /api/clubs/{subdomain}/branding/upload`.
4. **Configurar el eslogan institucional, reseña corta ("Sobre nosotros") y enlaces a redes sociales** (Instagram, Facebook, TikTok, YouTube, canal de WhatsApp y web oficial).
5. **Comprobar los cambios en tiempo real** mediante alertas de cambios pendientes y un botón directo *"👁️ Ver mi Sitio Web en Vivo →"*.

---

## 2. Arquitectura de Componentes en Frontend

Para mantener el código ordenado, mantenible y desacoplado, la funcionalidad se encapsulará en un nuevo componente dedicado:

```
frontend/
├── components/
│   └── BrandingClubPanel.tsx       <-- Componente principal modular de la Etapa 2
├── app/
│   └── tenants/
│       └── [subdomain]/
│           └── panel/
│               └── page.tsx        <-- Integración de la nueva pestaña "🎨 Sitio Web & Marca"
└── tests/
    └── BrandingClubPanel.test.tsx  <-- Suite de pruebas con Vitest y Testing Library
```

---

## 3. Desglose en Tareas Atómicas de Desarrollo

Siguiendo la *Regla de Oro* del proyecto, la ejecución se dividirá en **5 tareas atómicas consecutivas**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tarea 2.1: Creación del componente base BrandingClubPanel.tsx         │
│  - Estructura, estados, consumo de APIs GET /branding y /templates     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 2.2: Selector Visual de Plantillas (Cards con Preview & Badges) │
│  - Tarjetas de Booking Direct, Institucional y Modern Showcase         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 2.3: Selector de Colores, Presets y Mockup de Live Preview      │
│  - Color picker, presets de 1 clic y mockup dinámico en tiempo real    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 2.4: Uploaders de Logotipo y Portada + Redes Sociales y Eslogan │
│  - Subida directa con preview, eslogan, bio corta y links sociales     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 2.5: Integración en Panel (page.tsx) y Suite de Tests Vitest    │
│  - Pestaña "🎨 Sitio Web & Marca" + tests automatizados 100% pasando   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tarea 2.1: Creación del componente base `BrandingClubPanel.tsx`

* **Ubicación:** [`frontend/components/BrandingClubPanel.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/components/BrandingClubPanel.tsx)
* **Responsabilidad:**
  * Recibir `subdomain`, `token` y datos iniciales del complejo.
  * Cargar la lista de plantillas disponibles desde `GET /api/clubs/{subdomain}/branding/templates`.
  * Cargar la configuración actual desde `GET /api/clubs/{subdomain}/branding`.
  * Manejo de estados de carga (`loading`), guardado (`saving`), mensajes de feedback y detección de cambios pendientes (`isDirty`).

---

### Tarea 2.2: Selector Visual de las 3 Plantillas Base

* **Diseño visual:** Tarjetas comparativas en una cuadrícula responsiva (1 a 3 columnas).
  * **Tarjeta 1 - Booking Direct:** Badge *"⚡ Más Rápida"*, descripción enfocada en conversión de turnos y lista de ventajas.
  * **Tarjeta 2 - Club Institucional:** Badge *"🏛️ Club Social"*, descripción enfocada en páginas, historia y vida social.
  * **Tarjeta 3 - Modern Showcase:** Badge *"✨ Boutique / Premium"*, descripción enfocada en estética oscura, fotos grandes y exclusividad.
* **Interacción:**
  * Selección con 1 clic mediante borde destacado (`border-emerald-500 ring-2 ring-emerald-500/30`) y botón *"✓ Plantilla Activa"* vs *"Elegir esta plantilla"*.
  * Marca el formulario como modificado (`isDirty = true`).

---

### Tarea 2.3: Selector de Colores, Paletas Sugeridas y Mockup de Live Preview

* **Controles de color:**
  * **Color Primario:** Botones de reserva, badges principales, acciones destacadas.
  * **Color Secundario:** Encabezados, acentos secundarios y hovers.
  * **Color de Acento:** Estados activos, elementos interactivos y avisos.
  * **Color de Fondo:** Tono base del contenedor y contrastes.
  * Selector nativo (`<input type="color">`) acompañado del input de texto HEX con validación en tiempo real (`#RRGGBB`).
* **Paletas Sugeridas (Presets de 1 clic):**
  * 🎾 *Esmeralda Padel:* `#10b981` (primario), `#047857` (secundario), `#06b6d4` (acento), `#020617` (fondo).
  * 🌊 *Azul Tenis Pro:* `#2563eb`, `#1d4ed8`, `#38bdf8`, `#0f172a`.
  * 🏆 *Arena Sunset:* `#f59e0b`, `#b45309`, `#fbbf24`, `#18181b`.
  * 🖤 *Dark Graphite:* `#64748b`, `#334155`, `#e2e8f0`, `#09090b`.
* **Mockup de Previsualización en Tiempo Real (Live Preview Card):**
  * Mini-tarjeta visual que simula cómo se verá la cabecera, un botón de reserva *"Reservar Cancha"* y un badge con los colores que el usuario tiene seleccionados en ese preciso instante.

---

### Tarea 2.4: Uploaders de Logotipo y Portada + Redes Sociales y Eslogan

1. **Gestor de Logotipo y Banner Hero:**
   * Contenedores con previsualización de la imagen actual (o placeholder si no tiene).
   * Botón para subir archivo desde el disco (JPEG, PNG, WEBP, SVG máx. 4MB).
   * Llamada a `POST /api/clubs/{subdomain}/branding/upload` con indicador de subida en curso.
   * Botón para quitar/reemplazar la imagen cargada.
2. **Eslogan y Presentación Institucional:**
   * Campo de texto para el Eslogan (ej. *"El mejor pádel de la zona norte"* - máx. 255 caracteres).
   * Área de texto para la Reseña corta / Presentación del club (máx. 1000 caracteres).
3. **Enlaces a Redes Sociales:**
   * Grid de campos con iconos temáticos:
     * 📸 *Instagram:* `https://instagram.com/tuclub`
     * 👥 *Facebook:* `https://facebook.com/tuclub`
     * 🎵 *TikTok:* `https://tiktok.com/@tuclub`
     * 📺 *YouTube:* `https://youtube.com/@tuclub`
     * 🌐 *Sitio Web Externo:* `https://micluboficial.com`

---

### Tarea 2.5: Integración en Panel (`page.tsx`) y Pruebas en Vitest

1. **Integración en [`frontend/app/tenants/[subdomain]/panel/page.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/app/tenants/[subdomain]/panel/page.tsx):**
   * Ampliación del tipo `activeTab` para admitir `"sitio-web"`.
   * Nuevo botón en el menú horizontal de pestañas: `🎨 Sitio Web & Marca`.
   * Renderizado condicional del componente `<BrandingClubPanel />`.
2. **Acciones de Cabecera:**
   * Botón de guardado *"💾 Guardar Cambios de Marca"* conectado a `PUT /api/clubs/{subdomain}/branding`.
   * Botón directo *"👁️ Ver mi Sitio Web en Vivo ↗"* que abre la URL pública del club en una pestaña nueva.
   * Alerta flotante con contador de cambios cuando `isDirty = true` con opción de *"Descartar cambios"*.
3. **Suite de Pruebas Automatizadas:**
   * Archivo: [`frontend/tests/BrandingClubPanel.test.tsx`](file:///home/usuario/aplicaciones/turnos/frontend/tests/BrandingClubPanel.test.tsx).
   * Casos de prueba a verificar:
     * Carga inicial y renderizado de las 3 plantillas disponibles.
     * Selección de una plantilla diferente y actualización de estado.
     * Aplicación de un preset de colores y cambio en los inputs.
     * Edición de eslogan y enlaces a redes sociales.
     * Envío del formulario a `PUT /api/clubs/{subdomain}/branding` y notificación de éxito.
     * Manejo de subida de logotipo y visualización de la nueva imagen.

---

## 4. Criterios de Aceptación de la Etapa 2

* [ ] El administrador del club puede acceder a la pestaña *"🎨 Sitio Web & Marca"* desde el panel principal.
* [ ] Las 3 plantillas se muestran con claridad y cambiar de plantilla activa requiere un solo clic.
* [ ] Al modificar los colores, la tarjeta de previsualización en vivo refleja los cambios inmediatamente.
* [ ] Los presets de colores cambian la paleta con 1 clic.
* [ ] La subida de logo y portada muestra el preview de la imagen y actualiza la URL en la base de datos.
* [ ] El botón de *"Guardar Cambios"* persiste los datos en el backend e invalida la caché de Redis.
* [ ] El chequeo de tipos TypeScript (`npx tsc --noEmit`) pasa con 0 errores.
* [ ] Todos los tests de Vitest (`npm test`) pasan al 100% en verde.
