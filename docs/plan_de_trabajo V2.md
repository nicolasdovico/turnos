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
*   **Infraestructura:** Docker / Docker Compose / Servidor Web Caddy con soporte nativo de certificados Wildcard SSL automatizados.

```
[ Jugador (Mobile App / Web) ]  ──┐
                                  ├──> [ Frontend Next.js / Mobile ] ──(API REST / WebSockets)──> [ Laravel API ] ──> [ Base de Datos / Redis ]
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

## 4. Plan de Trabajo y Cronograma (Roadmap de 16 Semanas)

```
Semanas 01-02: [Infraestructura Docker, Base de Datos Multitenant y Repositorio GitHub]
Semanas 03-05: [Backend API Core: Motor de Reservas, Concurrencia Redis y Turnos Fijos]
Semanas 06-07: [Módulo POS / Buffet, Control de Caja y Liquidaciones]
Semanas 08-09: [CMS Multitenant, Editor de Páginas y Ruteo por Subdominios en Next.js]
Semanas 10-11: [Comunidad: Partidos Abiertos, Split Payment y Módulo de Torneos]
Semanas 12-13: [App Mobile React Native (Reserva rápida, Geolocalización y Push)]
Semanas 14-15: [Pasarelas de Pagos (Stripe/Mercado Pago), WhatsApp API y Domótica/IoT]
Semana 16:     [Pruebas de Estrés, Hardening de Seguridad, CI/CD y Despliegue Producción]
```

### Detalle de Fases
*   **Fase 1 (Semanas 1-2): Base & DevOps:** Docker Compose multisuite, configuración de repositorios GitHub, esquema de tablas multi-tenant en PostgreSQL/MySQL.
*   **Fase 2 (Semanas 3-5): Core Reservas:** Lógica de asignación de turnos, recurrencia, locks atómicos en Redis y transacciones ACID.
*   **Fase 3 (Semanas 6-7): Gestión de Club (ERP):** Inventario de mostrador, tickets de comanda en turnos, reportes diarios de arqueo de caja.
*   **Fase 4 (Semanas 8-9): CMS y Frontend Web:** Middleware de subdominios en Next.js, editor de páginas dinámicas y panel de administración SPA.
*   **Fase 5 (Semanas 10-11): Funcionalidades Competitivas:** Partidos abiertos con filtros de nivel, links de pago fraccionado y generador de fixtures.
*   **Fase 6 (Semanas 12-13): Frontend Mobile:** App React Native con geolocalización de canchas libres y notificaciones push.
*   **Fase 7 (Semanas 14-15): Pagos, Mensajería e IoT:** Webhooks de pasarelas, automatización por WhatsApp y endpoints para domótica de luces.
*   **Fase 8 (Semana 16): QA y Lanzamiento:** Pruebas de concurrencia masiva (JMeter/k6), auditoría de seguridad y despliegue en servidor de producción con Caddy Wildcard SSL.

---

## 5. Estrategia de Mitigación de Riesgos Técnicos

*   **Aislamiento Estricto de Inquilinos:** Uso riguroso de *Global Scopes* en Laravel y tests automáticos de integración que verifiquen respuestas `403 Forbidden` ante intentos de acceso cruzado entre complejos.
*   **Saturación en Horas Pico:** Uso de Redis para cachear la grilla de disponibilidad del día, invalidando la caché únicamente ante eventos de escritura (creación o anulación de reservas).
*   **Disponibilidad de Conexión en Mostrador:** El panel de administración local mantendrá un estado resiliente en frontend para evitar pérdida de datos si la conexión a internet del complejo sufre microcortes durante una venta de mostrador.
