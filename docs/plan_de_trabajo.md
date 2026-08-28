````
# Plan de Desarrollo de Software: SaaS Multitenant de Reservas Deportivas y CMS

Este documento establece la hoja de ruta técnica, la arquitectura y las fases de desarrollo para la construcción de una plataforma integral de gestión y reserva de turnos en complejos deportivos (fútbol, pádel, tenis, etc.). El sistema opera bajo un modelo SaaS híbrido, ofreciendo un directorio centralizado (Plan Básico) y un generador de sitios web independientes con subdominios personalizados (Plan Premium al estilo "Tiendanube").

---

## 1. Arquitectura del Sistema y Estrategia Multitenant

El sistema adoptará una arquitectura **desacoplada (Headless)** para garantizar escalabilidad, rendimiento óptimo y un posicionamiento orgánico (SEO) excepcional.

### Stack Tecnológico Core
*   **Backend (API Rest):** PHP 8.2+ / Laravel 11. Proporciona robustez en la lógica de negocio, migraciones seguras, manejo de colas de trabajo (*Queues*) y abstracción de base de datos.
*   **Frontend:** Next.js (React) con Tailwind CSS. Permite combinar Renderizado del Lado del Servidor (SSR) e Regeneración Estática Incremental (ISR) para las webs públicas, optimizando el SEO y la velocidad de carga.
*   **Base de Datos Principal:** PostgreSQL o MySQL. Garantiza transacciones estrictas ACID para evitar conflictos de concurrencia.
*   **Caché y Estado de Concurrencia:** Redis. Utilizado para sesiones rápidas y el mecanismo de bloqueos atómicos de turnos.

```
[ Cliente / Jugador ]  -------->  [ Frontend en Next.js ]
                                         | (Peticiones HTTP / API REST)
                                         v
                                  [ Backend en Laravel ]  ---->  [ Base de Datos ]
```

### Estrategia de Aislamiento y Ruteo (Multi-tenancy)
*   **Base de Datos Compartida (Shared Database):** Se utilizará una única base de datos donde las tablas críticas (`canchas`, `turnos`, `paginas`) contienen una columna `complejo_id`. Se implementarán *Global Scopes* en Laravel para asegurar que las consultas se filtren automáticamente por el inquilino (*tenant*) activo, evitando fugas de datos.
*   **Resolución de URLs en Frontend:** El `Middleware` nativo de Next.js interceptará las peticiones entrantes.
    *   Si la URL corresponde al dominio principal (`tupataforma.com`), se renderiza el portal de la empresa y el buscador global.
    *   Si la URL contiene un subdominio (`complejo.tupataforma.com`), el middleware extrae el subdominio, consulta de forma interna al backend su validez y plan (Premium), y renderiza dinámicamente la plantilla personalizada del complejo.

---

## 2. Modelo de Negocio y Roles de Usuario

El sistema restringe sus funcionalidades basándose en dos planes de suscripción para los complejos deportivos:

### Esquema de Planes
1.  **Plan Básico:** El complejo forma parte del directorio central de la plataforma. Los usuarios pueden buscarlo y reservar sus turnos únicamente a través de la aplicación o portal unificado (`tupataforma.com`). No dispone de sitio web propio ni subdominio.
2.  **Plan Premium:** El complejo obtiene acceso al creador de sitios web. Se habilita su subdominio exclusivo (`nombre.tupataforma.com`) donde se muestra únicamente su catálogo, su marca y sus páginas institucionales dinámicas.

### Roles de Usuario
*   **Super Administrador:** Panel global para supervisar complejos, gestionar facturación de planes (Básico/Premium), y visualizar métricas de negocio.
*   **Administrador de Complejo (Dueño/Empleado):** Gestión de la agenda interna, bloqueo manual de canchas, reportes de caja y (si posee Plan Premium) configuración y edición de su propio sitio web.
*   **Cliente (Jugador):** Perfil para buscar centros deportivos, agendar turnos, realizar pagos y revisar el historial de partidos.

---

## 3. Requerimientos Funcionales Core

### Módulo A: Motor de Reservas y Gestión de Concurrencia (Crítico)
*   **Grilla Horaria Dinámica:** Vista interactiva de la disponibilidad de canchas filtrada por fecha, tipo de superficie y deporte.
*   **Mecanismo de Bloqueo Atómico (Evitar Doble Reserva):** Cuando un usuario selecciona un turno y avanza al checkout, el backend genera un bloqueo temporal en **Redis** llave-valor (`turno:cancha_id:fecha:hora`) con un tiempo de expiración (TTL) de 10 minutos. 
    *   Si otro usuario intenta seleccionar el mismo bloque horaria, el sistema rechaza la solicitud de inmediato basándose en la caché de Redis, impidiendo la condición de carrera (*race condition*) antes de impactar la base de datos de manera definitiva.
*   **Transacciones de Base de Datos:** El proceso de confirmación final se ejecuta dentro de una transacción de base de datos con aislamiento estricto (`SELECT FOR UPDATE`), asegurando que el estado del turno pase a "reservado" de forma segura.

### Módulo B: Creador de Sitios (CMS Sencillo para Plan Premium)
*   **Personalización Estética:** Formulario en el panel del administrador para cargar logotipo, imágenes de portada (banners) y definir colores institucionales (paleta primaria y secundaria en formato HEX).
*   **Constructor de Páginas Dinámicas (N Páginas):** Integración de un editor de texto enriquecido visual (ej. *TipTap* o *Quill.js*) que permite al dueño crear apartados personalizados (ej. `/paginas/reglamento`, `/paginas/escuelita`).
*   **Estructura de Almacenamiento (Esquema simplificado):**
    *   `paginas`: `id`, `complejo_id` (FK), `titulo`, `slug` (indexado), `contenido_html`, `estado_publicacion` (booleano).

### Módulo C: Checkout, Pagos y Notificaciones
*   **Pasarela de Pagos:** Integración con servicios API (Stripe / Mercado Pago) configurables para cobrar el total del turno o un porcentaje en concepto de seña.
*   **Mensajería Automatizada:** Implementación de webhooks para enviar confirmaciones inmediatas y recordatorios programados (2 horas antes del evento) a través de la API de WhatsApp o servicios de Email transaccional (ej. Resend, Postmark).

---

## 4. Plan de Trabajo y Cronograma (Roadmap de 12 Semanas)

### Fase 1: Arquitectura de Base de Datos y Entorno (Semanas 1-2)
*   Diseño del modelo entidad-relación relacional con soporte explícito para multi-tenancy.
*   Configuración del entorno de desarrollo unificado mediante contenedores Docker (PHP-FPM, Nginx, PostgreSQL, Redis, Node.js).
*   Configuración inicial del repositorio de Git con estrategias de *Feature Branches*.

### Fase 2: Backend API Core & Motor de Reservas (Semanas 3-5)
*   Implementación de autenticación segura (Laravel Sanctum) y control de acceso basado en roles (RBAC).
*   Desarrollo de lógica para la definición de calendarios de complejos (días de atención, franjas horarias y precios dinámicos por hora pico).
*   Construcción del algoritmo de cálculo de disponibilidad de turnos en tiempo real.
*   Desarrollo del sistema de bloqueo temporal en Redis.

### Fase 3: Panel de Administración & CMS (Semanas 6-7)
*   Desarrollo del panel interno del complejo (SPA dentro de Next.js) para la gestión visual del calendario de canchas.
*   Construcción de la interfaz del CMS para clientes Premium: carga de recursos gráficos y edición de páginas dinámicas a través del editor WYSIWYG.
*   Creación de APIs en Laravel para almacenar y servir la configuración visual de cada inquilino.

### Fase 4: Frontend Público y Middleware Next.js (Semanas 8-9)
*   Desarrollo de la plantilla base pública que consumirá los datos de apariencia del complejo Premium (colores, fuentes, logos).
*   Implementación del `Middleware` de Next.js para el ruteo dinámico por subdominio y mapeo de subrutas dinámicas para las páginas institucionales creadas por el usuario.
*   Maquetado del portal principal (`tupataforma.com`) con el buscador global y listado de complejos del Plan Básico.

### Fase 5: Integración de Pagos y Notificaciones (Semanas 10-11)
*   Conexión con pasarelas de pago y gestión de estados de reserva (Pendiente, Pagado, Cancelado).
*   Implementación de tareas programadas (*Cron Jobs* / *Task Scheduling* en Laravel) y procesamiento en segundo plano (*Queue Workers*) para el envío asincrónico de alertas por WhatsApp y Email.
*   Ejecución de pruebas de estrés concurrentes simulando múltiples transacciones simultáneas sobre el mismo inventario de turnos.

### Fase 6: Despliegue e Infraestructura (Semana 12)
*   Configuración de servidores en la nube (AWS / DigitalOcean).
*   Configuración del servidor web (Nginx o Caddy) con soporte para certificados SSL comodín (*Wildcard SSL*) automatizados (Let's Encrypt) para asegurar la validez HTTPS inmediata de cualquier subdominio nuevo.
*   Implementación de pipelines de Integración y Despliegue Continuo (CI/CD).

---

## 5. Estrategia de Mitigación de Riesgos Técnicos

*   **Riesgo de Fuga de Datos (Data Leak):** Un error de código podría exponer reservas de un complejo a otro.
    *   *Mitigación:* Pruebas unitarias automatizadas rigurosas en Laravel que verifiquen explícitamente que las peticiones sin un token o subdominio coincidente sean interceptadas con un error `403 Forbidden`.
*   **Problemas de Escalabilidad por Consultas de Disponibilidad:** Calcular la disponibilidad cruzando horarios teóricos contra reservas reales bajo demanda puede saturar la base de datos en horas pico de tráfico.
    *   *Mitigación:* Cachear las estructuras de slots del día en Redis y revalidar o mutar esa caché únicamente cuando ocurra una nueva reserva o cancelación exitosa.
````