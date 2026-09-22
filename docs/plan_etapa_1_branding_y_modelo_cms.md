# Plan de Desarrollo Detallado: Etapa 1 - Modelo de Datos, Branding & Almacenamiento (Backend Core)

> **Documento:** `/docs/plan_etapa_1_branding_y_modelo_cms.md`  
> **Fecha:** Septiembre de 2026  
> **Módulo:** Módulo F (CMS Multitenant & Sitio Web Whitelabel)  
> **Etapa:** 1 de 5  
> **Estado:** Pendiente de Aprobación para Ejecución  
> **Referencia Macro:** [`docs/macro_plan_modulo_f_cms.md`](file:///home/usuario/aplicaciones/turnos/docs/macro_plan_modulo_f_cms.md)

---

## 1. Objetivo de la Etapa 1

Establecer la infraestructura de datos, reglas de validación, lógica de almacenamiento y endpoints en Laravel 11 para gestionar:
1. Las **3 plantillas base de diseño** (`booking_direct`, `institucional`, `modern_showcase`).
2. La **identidad corporativa** de cada club (paleta de colores HEX, logo, portada, eslogan y redes sociales).
3. Los **metadatos de navegación y SEO** en las páginas institucionales (`orden`, visibilidad en header/footer, `meta_descripcion`).
4. La **estrategia de caché en Redis** y revalidación on-demand hacia Next.js.
5. El **almacenamiento de imágenes de marca** (soporte local para desarrollo Docker y S3/R2 para producción).

---

## 2. Desglose en Tareas Atómicas de Desarrollo

Siguiendo la *Regla de Oro* del proyecto, la ejecución se dividirá en 5 tareas atómicas consecutivas:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tarea 1.1: Migraciones de Base de Datos (complejos + paginas)         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 1.2: Modelos Eloquent y Casts (Complejo + Pagina)               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 1.3: Servicio y Endpoints de Branding en Laravel                │
│  - GET /api/clubs/{subdomain}/branding (público con caché Redis)       │
│  - PUT /api/clubs/{subdomain}/branding (protegido con validaciones)    │
│  - POST /api/clubs/{subdomain}/branding/upload (subida de imágenes)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 1.4: Actualización de PaginaController y Revalidación           │
│  - Soporte de orden, ubicación en menú y meta descripción SEO          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tarea 1.5: Suite Completa de Tests Automatizados (TDD en Backend)     │
│  - tests/Feature/ClubBrandingTest.php (100% verde)                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tarea 1.1: Migraciones de Base de Datos

1. **Migración en `complejos` (`add_branding_and_template_to_complejos_table`):**
   * `plantilla_slug`: string, default `'booking_direct'`. Valores permitidos: `booking_direct`, `institucional`, `modern_showcase`.
   * `logo_url`: string nullable (URL absoluta o relativa al asset).
   * `portada_url`: string nullable (Hero banner).
   * `color_primario`: string nullable default `'#10b981'` (Esmeralda por defecto).
   * `color_secundario`: string nullable default `'#047857'`.
   * `color_acento`: string nullable default `'#06b6d4'` (Cian / acento).
   * `color_fondo`: string nullable default `'#020617'` (Modo oscuro base).
   * `eslogan`: string nullable (max 255 chars, ej: *"Tu club de pádel en zona norte"*).
   * `descripcion_corta`: text nullable (reseña institucional visible en la plantilla clásica).
   * `redes_sociales`: json nullable (estructura: `{ "instagram": "...", "facebook": "...", "tiktok": "...", "youtube": "...", "sitio_web": "..." }`).

2. **Migración en `paginas` (`add_navigation_and_seo_to_paginas_table`):**
   * `orden`: integer default `0`.
   * `mostrar_en_header`: boolean default `false`.
   * `mostrar_en_footer`: boolean default `false`.
   * `meta_descripcion`: string nullable max 160 chars.

---

### Tarea 1.2: Modelos Eloquent y Casts

1. **Modelo [`Complejo`](file:///home/usuario/aplicaciones/turnos/backend/app/Models/Complejo.php):**
   * Agregar nuevos atributos a `$fillable`.
   * Agregar casts:
     * `'redes_sociales' => 'array'`
     * `'color_primario' => 'string'`
     * etc.
   * Constante con plantillas válidas:
     ```php
     public const PLANTILLAS_VALIDAS = [
         'booking_direct',
         'institucional',
         'modern_showcase',
     ];
     ```
   * Helper `getBrandingData()` que devuelva el payload formateado con valores por defecto seguros si el club no los configuró todavía.

2. **Modelo [`Pagina`](file:///home/usuario/aplicaciones/turnos/backend/app/Models/Pagina.php):**
   * Agregar a `$fillable`: `orden`, `mostrar_en_header`, `mostrar_en_footer`, `meta_descripcion`.
   * Agregar a `$casts`:
     * `'mostrar_en_header' => 'boolean'`
     * `'mostrar_en_footer' => 'boolean'`
     * `'orden' => 'integer'`

---

### Tarea 1.3: Servicio y Endpoints de Branding en Laravel

Creación del controlador dedicado [`ClubBrandingController`](file:///home/usuario/aplicaciones/turnos/backend/app/Http/Controllers/Api/ClubBrandingController.php):

1. **`GET /api/clubs/{subdomain}/branding` (Público):**
   * Consulta los datos de branding y plantilla del club.
   * Incluye la lista de páginas publicadas que tienen `mostrar_en_header = true` o `mostrar_en_footer = true` (solo id, titulo, slug, orden).
   * Cacheo en Redis bajo la clave `tenant:branding:{subdominio}` por 1 hora (TTL 3600s).
   * Respuesta ultrarrápida para SSR de Next.js.

2. **`PUT /api/clubs/{subdomain}/branding` (Protegido `auth:sanctum`):**
   * Valida autorización: el usuario debe ser dueño del complejo (`user_id === auth()->id()`) o `admin` global.
   * Reglas de validación estrictas:
     * `plantilla_slug`: `'sometimes|required|string|in:booking_direct,institucional,modern_showcase'`
     * `color_primario`, `color_secundario`, `color_acento`, `color_fondo`: `'nullable|string|regex:/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/'` (HEX estricto).
     * `logo_url`, `portada_url`: `'nullable|string|max:500'`
     * `eslogan`: `'nullable|string|max:255'`
     * `descripcion_corta`: `'nullable|string|max:1000'`
     * `redes_sociales`: `'nullable|array'`
     * `redes_sociales.instagram`, etc.: `'nullable|string|max:255'`
   * Al guardar:
     1. Actualiza el complejo.
     2. Invalida la clave de caché en Redis (`Redis::del("tenant:branding:{$subdomain}")`).
     3. Dispara revalidación ISR a Next.js vía `RevalidationService::revalidateTenantPath($subdomain, '/')`.

3. **`POST /api/clubs/{subdomain}/branding/upload` (Protegido `auth:sanctum`):**
   * Permite subir directamente un archivo multipart (`logo` o `portada`).
   * Validaciones: imagen válida (`jpeg,png,webp,svg`), tamaño máximo 4MB.
   * Guarda en `storage/app/public/tenants/{subdomain}/branding/` y genera la URL accesible (`/storage/...`) o usa `StoragePresignedUrlService` si está en entorno S3.

---

### Tarea 1.4: Actualización de `PaginaController` y Sincronización

1. Modificar [`PaginaController.php`](file:///home/usuario/aplicaciones/turnos/backend/app/Http/Controllers/Api/PaginaController.php):
   * En `store` y `update`: aceptar y validar `orden` (integer), `mostrar_en_header` (boolean), `mostrar_en_footer` (boolean), `meta_descripcion` (string max 160).
   * Al crear, actualizar o eliminar una página:
     * Purgar la caché de branding en Redis (`tenant:branding:{subdominio}`) para que el menú de navegación refleje la lista actualizada de links de inmediato.
     * Disparar revalidación ISR tanto para la página en sí (`/paginas/{slug}`) como para la home (`/`).

---

### Tarea 1.5: Suite de Tests Automatizados (TDD)

Creación de [`tests/Feature/ClubBrandingTest.php`](file:///home/usuario/aplicaciones/turnos/backend/tests/Feature/ClubBrandingTest.php):

* `test_obtener_branding_publico_del_club()`
* `test_branding_incluye_paginas_con_visibilidad_en_header_y_footer()`
* `test_branding_utiliza_cache_de_redis()`
* `test_usuario_no_autenticado_no_puede_actualizar_branding()`
* `test_usuario_de_otro_club_no_puede_modificar_branding_ajeno_403()`
* `test_rechaza_actualizacion_con_plantilla_slug_invalida_422()`
* `test_rechaza_actualizacion_con_colores_hex_invalidos_422()`
* `test_actualizar_branding_con_exito_invalida_cache_y_dispara_revalidacion()`
* `test_subida_de_logo_multipart_guarda_archivo_y_devuelve_url_valida()`
* `test_actualizar_pagina_con_ubicacion_en_menu_invalida_cache_de_branding()`

---

## 3. Criterio de Éxito de la Etapa 1

La Etapa 1 se considerará exitosa cuando:
1. Ambas migraciones se hayan ejecutado limpiamente en PostgreSQL (`php artisan migrate`).
2. Los endpoints de branding respondan con códigos `200`, `201`, `403` y `422` según corresponda.
3. El test suite completo de Laravel (`php artisan test`) ejecute y pase al 100% en verde con 0 fallos.
