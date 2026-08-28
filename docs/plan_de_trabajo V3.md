# Plan de Desarrollo de Software: SaaS Integral de Gestión Deportiva, CMS Multitenant y Marketplace

Este documento establece la hoja de ruta técnica, la arquitectura y las fases de desarrollo para la construcción de una plataforma integral de gestión de complejos deportivos (fútbol, pádel, tenis, squash, etc.). El sistema unifica las capacidades operativas de un ERP deportivo líder en el mercado (estilo "Alquila Tu Cancha") con un generador de sitios web independientes con subdominios y marca propia (estilo "Tiendanube"), operando bajo un modelo SaaS multitenant.

---

## 1. Arquitectura del Sistema y Estrategia Multitenant

El sistema adopta una arquitectura **desacoplada (Headless)** que garantiza alto rendimiento, escalabilidad horizontal, seguridad en concurrencia y un posicionamiento orgánico (SEO) excepcional para cada club.

### Stack Tecnológico Core
*   **Backend (API Rest):** PHP 8.2+ / Laravel 11. Manejo de lógica de negocio, migraciones seguras, tareas programadas (*Cron Jobs*) y colas de trabajo (*Queues*) asincrónicas.
*   **Frontend Web (Admin + CMS + Portal):** Next.js (React) con Tailwind CSS. Permite combinar Renderizado del Lado del Servidor (SSR) y Regeneración Estática Incremental (ISR) para las webs públicas con soporte SEO, y Single Page Application (SPA) para el panel de administración.
*   **Frontend Mobile:** React Native (Expo) con Tailwind CSS (NativeWind) y notificaciones push nativas (FCM/APNS).
*   **Base de Datos Principal:** PostgreSQL o MySQL con transacciones estrictas ACID.
*   **Caché, Concurrencia y Sockets:** Redis (bloqueos atómicos, sesiones en memoria y pub/sub para actualizaciones de grilla en vivo).
*   **Almacenamiento de Medios (Assets):** Almacenamiento de objetos en la nube compatible con S3 (AWS S3 o Cloudflare R2) + CDN para distribución de imágenes y archivos pesados.
*   **Infraestructura:** Docker / Docker Compose / Servidor Web Caddy con soporte nativo de certificados TLS On-Demand y Wildcard SSL automatizados.

```
[ Jugador (Mobile App / Web) ]  ──┐
                                  ├──> [ Frontend Next.js / Mobile ] ──(API REST / WebSockets)──> [ Laravel API ] ──> [ Base de Datos / Redis / S3 ]
[ Dueño / Operador Club ]      ──┘
```

### Estrategia de Aislamiento y Ruteo (Multi-tenancy)
*   **Base de Datos Compartida con Discriminador:** Todas las tablas de datos (`canchas`, `turnos`, `ventas_pos`, `paginas`, `clientes`) contienen la columna `complejo_id`. Los *Global Scopes* y Middlewares de Laravel garantizan el aislamiento estricto por inquilino (*tenant*).
*   **Ruteo por Subdominio y Dominio Personalizado:** El `Middleware` de Next.js resuelve la identidad del inquilino mediante la cabecera `Host` (`complejo.tupataforma.com` o `www.miclub.com`) y renderiza la plantilla pública personalizada del club.

---

## 2. Modelo de Negocio y Roles de Usuario

### Esquema de Planes Comerciales
1.  **Plan Básico (Marketplace & Gestión Operativa):** Directorio central de búsqueda, agenda online, motor de reservas, punto de venta (POS/Buffet) y caja.
2.  **Plan Premium (Club Digital Completo):** Todas las características del Plan Básico más: subdominio/dominio personalizado, creador de sitios web dinámicos (CMS), torneos avanzados, personalización visual completa y enlaces directos de cobro de señas sin intermediarios.

### Roles y Permisos (RBAC)
*   **Super Administrador:** Panel global de la plataforma, cobro recurrente de suscripciones, métricas SaaS y soporte general.
*   **Administrador / Dueño de Complejo:** Acceso a reportes financieros, configuración de canchas, tarifas, empleados, torneos y CMS de su sitio web.
*   **Operador de Mostrador / Empleado:** Gestión del calendario diario, cobro de turnos en puerta, adición de consumos de buffet y apertura/cierre de caja.
*   **Profesor / Organizador de Torneo:** Creación de llaves, fixtures, carga de resultados y listado de alumnos de escuelitas.
*   **Cliente (Jugador):** Búsqueda de canchas, reserva individual, reserva de turnos fijos, pago dividido (*split payment*), inscripción a torneos y armado de partidos abiertos.

---

## 3. Requerimientos Funcionales Detallados

### Módulo A: Motor de Reservas y Gestión de Concurrencia
*   **Grilla Horaria Dinámica:** Visualización interactiva tipo calendario (diario, semanal, mensual y por cancha) con actualización en tiempo real mediante WebSockets.
*   **Mecanismo de Bloqueo Atómico (Redis):** Al seleccionar un turno disponible, se adquiere un candado distribuido en Redis con llave `turno:cancha_id:fecha:hora` y expiración (TTL) de 10 minutos.
*   **Transacciones Seguras:** Inserción y confirmación de turnos mediante transacciones con aislamiento `SELECT FOR UPDATE` para erradicar cualquier condición de carrera (*race condition*).
*   **Gestión de Turnos Fijos (Recurrentes):** Funcionalidad para asignar turnos automáticos semanales/mensuales a un cliente (ej. "Todos los martes a las 21:00 hs"), con renovación periódica y gestión de ausencias/liberaciones puntuales.
*   **Tarifación Flexible:** Precios dinámicos por franja horaria (hora pico / no pico), día de la semana, condiciones climáticas o tipo de deporte.

### Módulo B: Punto de Venta (POS) y Gestión de Buffet
*   **Catálogo de Productos y Stock:** Gestión de inventario de bebidas, alimentos, indumentaria, alquiler de paletas, pelotas y accesorios.
*   **Comanda Vinculada al Turno:** Capacidad de abrir una cuenta asociada al turno de una cancha (ej. "Cancha 3 - Turno 20:00") e imputar consumos del buffet para liquidar al final del partido.
*   **Ventas de Mostrador Independientes:** Venta rápida y directa a clientes de paso sin reserva asignada.

### Módulo C: Gestión de Caja y Reportes Financieros
*   **Control de Caja Diaria:** Módulos de apertura de caja, registro de egresos/ingresos varios, arqueo ciego y cierre de turno de caja por operador.
*   **Múltiples Métodos de Pago:** Registro discriminado por efectivo, transferencias bancarias, QR, tarjetas de débito/crédito y cobros online.
*   **Reportes y Métricas:** Informes de ocupación de canchas, horas con mayor rentabilidad, ventas de buffet, clientes frecuentes y balance mensual.

### Módulo D: Módulo Social, Comunidad y Partidos Abiertos
*   **Partidos Abiertos (Matchmaking):** Creación de partidos públicos a los que les faltan jugadores. Filtros por deporte, franja horaria, género y categoría/nivel (1ª a 8ª).
*   **Pago Dividido (Split Payment):** Generación de enlaces individuales para que los jugadores abonen su cuota parte de la reserva (ej. 1/4 en pádel, 1/10 en fútbol) antes del límite horario fijado.
*   **Sistema de Notificaciones Automatizadas:** Notificaciones Push nativas (vía Firebase Cloud Messaging) y mensajes transaccionales por WhatsApp / Email para avisos de confirmación, recordatorios 2 horas antes y cancelaciones por lluvia.

### Módulo E: Torneos, Ligas y Escuelitas Deportivas
*   **Organizador de Torneos:** Generación automática de cuadros de eliminación directa, zonas de grupos y llaves clasificatorias.
*   **Tabla de Posiciones y Fixture Público:** Actualización en vivo de resultados y tablas accesibles tanto en la web del complejo como en el portal central.
*   **Gestión de Escuelitas / Clases:** Padrón de alumnos, control de asistencias por profesor y facturación de cuotas mensuales de entrenamiento.

### Módulo F: Creador de Sitios Web Dinámicos (CMS Multitenant - Plan Premium)
*   **Editor Visual e Identidad de Marca:** Carga de logotipo, portada, paleta de colores corporativos (HEX), enlaces a redes sociales y datos de contacto directo.
*   **Constructor de Páginas Ilimitadas:** Editor de texto enriquecido (WYSIWYG con *TipTap* o *Quill.js*) para publicar secciones como `/reglamento`, `/cumpleanos-eventos`, `/tarifas` o `/quienes-somos`.
*   **SEO Local Optimizado:** Metadatos automáticos (Open Graph, schema JSON-LD para negocios locales) renderizados en el servidor mediante Next.js.

### Módulo G: Integración de Hardware y Automatización (IoT Ready)
*   **API para Control de Luces:** Endpoints de webhook para comunicarse con relays / controladores domóticos (ej. Sonoff / Shelly / ESP32) para encender las luces de la cancha 5 minutos antes del turno y apagarlas al finalizar.
*   **Control de Accesos:** Generación de códigos QR temporales para molinetes o cerraduras electrónicas integradas al estado de la reserva.

---

## 4. Pilares de Robustez Técnica, Seguridad y Escalabilidad del CMS

Para garantizar que la funcionalidad "Tiendanube" para complejos sea infalible, segura y de alto rendimiento bajo picos de tráfico, se implementan los siguientes lineamientos técnicos obligatorios:

### 4.1. Aislamiento Estricto de Inquilinos y Prevención de Fugas de Datos
*   **Global Scopes Obligatorios en Eloquent (Laravel):** Todo modelo tenant-aware (`Cancha`, `Turno`, `Pagina`, `Producto`, `Caja`) implementa un `TenantScope` que inyecta automáticamente `WHERE complejo_id = ?` en todas las consultas (lectura, inserción, actualización, eliminación).
*   **Contexto de Tenancy en Background Jobs:** Los trabajos encolados (*Queued Jobs*) deben recibir explícitamente el `complejo_id` para re-establecer el contexto de inquilino al procesarse de forma asincrónica.
*   **Pruebas de Aislamiento Automatizadas (Security Testing):** Suite de tests unitarios y de integración que intentan deliberadamente acceder y mutar recursos de otro complejo sin la autorización adecuada, esperando un código de respuesta `403 Forbidden`.

### 4.2. Sanitización y Seguridad contra Vulnerabilidades XSS
*   **Limpieza de HTML en Editor Enriquecido:** Dado que los administradores cargan contenido HTML dinámico, toda entrada proveniente de editores WYSIWYG se filtra tanto en backend como en frontend mediante herramientas de sanitización (ej. *DOMPurify* / *HTMLPurifier* en PHP) para eliminar scripts maliciosos (`<script>`, tags `onerror`, `onload`).
*   **Content Security Policy (CSP):** Encabezados HTTP estrictos para restringir la ejecución de scripts externos no autorizados en los subdominios de los clubes.

### 4.3. Estrategia de Caché Multinivel (Edge, Next.js e In-Memory)
*   **Renderizado Híbrido con ISR (Next.js):** Las páginas institucionales de los clubes se pre-renderizan en el servidor y se almacenan en caché estática con *Incremental Static Regeneration* (ISR con `revalidate`). La base de datos no se consulta en cada visita regular de un jugador.
*   **Revalidación bajo Demanda (On-Demand Revalidation):** Cuando un dueño de complejo actualiza una página o sus colores en el panel de control, Laravel dispara un webhook a la API de Next.js (`/api/revalidate?secret=...&path=/paginas/slug`) para purgar y regenerar la caché estática inmediatamente.
*   **Caché de Configuración en Redis:** La metadata visual y de marca del club (`logo_url`, `theme_colors`, `social_links`) se almacena en memoria en Redis (`tenant:metadata:{subdominio}`) con un TTL prolongado.

### 4.4. Automatización de Certificados SSL (TLS On-Demand con Caddy)
*   **Aprovisionamiento Desatendido:** El servidor Caddy utiliza la directiva `on_demand_tls` para emitir certificados HTTPS instantáneos de Let's Encrypt / ZeroSSL al recibir la primera petición a un subdominio nuevo (`club-norte.tupataforma.com`) o dominio propio (`www.clubnorte.com`).
*   **Endpoint de Validación de Dominios (`ask` endpoint):** Para prevenir ataques de denegación de servicio que agoten las tasas de emisión de certificados, Caddy consulta a un endpoint interno seguro de Laravel (`GET /api/internal/check-domain?domain=...`) antes de solicitar un certificado SSL. Si el dominio o subdominio no existe en la base de datos de complejos activos, Caddy rechaza la conexión.

### 4.5. Almacenamiento Desacoplado de Archivos Multimedia (S3 + CDN)
*   **Cero Almacenamiento Local:** Ninguna imagen (fotos de canchas, comprobantes de pago, banners de eventos, logos) se almacena en el disco del contenedor de la aplicación.
*   **Presigned URLs:** La subida de imágenes pesadas se realiza directamente desde el navegador/app hacia el bucket S3/Cloudflare R2 mediante URLs pre-firmadas generadas por Laravel, reduciendo el consumo de ancho de banda y memoria del servidor backend.
*   **Optimización de Imágenes:** Las imágenes se sirven a través de un CDN con optimización automática de formatos modernos (WebP/AVIF) y redimensionamiento dinámico.

---

## 5. Infraestructura, DevOps y Repositorio

### Arquitectura de Contenedores (Docker Compose)
1.  **`frontend` (Next.js):** Contenedor en `node:22-alpine` para SSR, Middleware de ruteo y panel SPA.
2.  **`backend` (Laravel API):** Contenedor `php:8.3-fpm` optimizado con extensiones (`pdo_pgsql`, `redis`, `gd`, `bcmath`, `opcache`).
3.  **`webserver` (Caddy):** Proxy inverso local y de producción con TLS On-Demand y proxy de WebSockets.
4.  **`database` (PostgreSQL / MySQL):** Persistencia relacional con volúmenes dedicados.
5.  **`cache` (Redis):** Bloqueos atómicos de concurrencia y caché de estados.
6.  **`queue-worker`:** Instancia en segundo plano de Laravel para procesamiento asíncrono de colas (`php artisan queue:work`).

### Pipeline CI/CD en GitHub Actions
*   **Pipeline de Integración:** Ejecución automática de linters, análisis estático de código (PHPStan/ESLint) y ejecución de pruebas unitarias/integración en cada *Pull Request*.
*   **Pipeline de Despliegue:** Despliegue continuo a servidor VPS en la nube tras fusionar en la rama `main`, ejecutando migraciones seguras (`php artisan migrate --force`) y reinicio progresivo de contenedores sin tiempo de inactividad (*Zero-Downtime Deployment*).

---

## 6. Plan de Trabajo y Cronograma (Roadmap de 16 Semanas)

```
Semanas 01-02: [Infraestructura Docker, Base de Datos Multitenant, Repositorio Git y Caddy TLS]
Semanas 03-05: [Backend API Core: Motor de Reservas, Concurrencia Redis, Locks Atómicos y Turnos Fijos]
Semanas 06-07: [Módulo POS / Buffet, Control de Caja, Reportes y Sanitización de Datos]
Semanas 08-09: [CMS Multitenant, Editor WYSIWYG, ISR en Next.js y Revalidación On-Demand]
Semanas 10-11: [Comunidad: Partidos Abiertos, Split Payment y Módulo de Torneos/Ligas]
Semanas 12-13: [App Mobile React Native (Reserva rápida, Geolocalización y Notificaciones Push)]
Semanas 14-15: [Pasarelas de Pagos (Stripe/Mercado Pago), WhatsApp API, S3 Assets y Domótica/IoT]
Semana 16:     [Pruebas de Estrés (k6/JMeter), Auditoría de Seguridad, Hardening y Lanzamiento]
```

### Detalle de Fases
*   **Fase 1 (Semanas 1-2): Infraestructura & Tenancy Base:** Entorno Docker Compose, repositorio GitHub con workflows CI/CD, configuración de Caddy con validación de dominios y esquema relacional multitenant.
*   **Fase 2 (Semanas 3-5): Core de Disponibilidad y Agenda:** Asignación de turnos, gestión de turnos recurrentes, locks atómicos distribuidos en Redis y transacciones ACID.
*   **Fase 3 (Semanas 6-7): Gestión de Club (ERP):** Inventario de mostrador, comandas asociadas a turnos, módulos de apertura/cierre de caja y filtros de sanitización XSS.
*   **Fase 4 (Semanas 8-9): CMS y Frontend Web:** Middleware de subdominios en Next.js, editor de páginas dinámicas, renderizado con ISR y webhooks de purga de caché.
*   **Fase 5 (Semanas 10-11): Funcionalidades de Comunidad:** Partidos abiertos con filtros de nivel, enlaces de pago dividido (*split payment*) y generador automático de fixtures de torneos.
*   **Fase 6 (Semanas 12-13): Frontend Mobile:** App React Native / Expo con geolocalización de canchas libres y notificaciones push nativas (FCM/APNS).
*   **Fase 7 (Semanas 14-15): Pagos, Mensajería, S3 e IoT:** Webhooks de pasarelas, almacenamiento en AWS S3/Cloudflare R2 con Presigned URLs, automatización por WhatsApp y endpoints para control de iluminación.
*   **Fase 8 (Semana 16): QA y Lanzamiento:** Pruebas de estrés y concurrencia masiva simulando reservas simultáneas, auditoría de permisos cruzados y puesta en producción.

---

## 7. Estrategia de Mitigación de Riesgos Técnicos

*   **Aislamiento Estricto de Inquilinos:** Uso riguroso de *Global Scopes* en Laravel y tests automáticos de integración que verifiquen respuestas `403 Forbidden` ante intentos de acceso cruzado entre complejos.
*   **Saturación en Horas Pico:** Uso de Redis para cachear la grilla de disponibilidad del día, invalidando la caché únicamente ante eventos de escritura (creación o anulación de reservas).
*   **Disponibilidad de Conexión en Mostrador:** El panel de administración local mantendrá un estado resiliente en frontend para evitar pérdida de datos si la conexión a internet del complejo sufre microcortes durante una venta de mostrador.
*   **Prevención de Abuso en TLS:** Uso mandatorio de la directiva `ask` en Caddy para impedir emisión indebida de certificados SSL ante dominios no registrados en la base de datos.
