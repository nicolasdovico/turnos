# Guía de Ejecución Atómica para Antigravity CLI: SaaS Deportivo Multitenant

Este documento contiene el desglose técnico del plan maestro en **prompts atómicos, secuenciales e independientes**, optimizados para ser ejecutados de forma iterativa mediante **Antigravity CLI**.

---

## 📌 Protocolo de Trabajo con Antigravity CLI

Para evitar inconsistencias, alucinaciones o código no probado, seguí este flujo para cada tarea:
1. **Copiar y pegar el prompt exacto** de la tarea correspondiente.
2. **Esperar a que el CLI ejecute la tarea y corra el test de validación**.
3. **No avanzar a la siguiente tarea si el test no pasa en verde.**
4. **Hacer Git Commit** con el mensaje sugerido antes de enviar la siguiente instrucción.

---

# BLOQUE 1: INFRAESTRUCTURA, BASE & MULTI-TENANCY (Semanas 1-2)

### Tarea 1.1: Docker Compose Multi-contenedor
* **Contexto:** Inicialización del entorno de software de base para el SaaS.
* **Prompt para Antigravity CLI:**
```text
Crea la configuración base de contenedores para desarrollo local en la raíz del proyecto.
1. Crea un archivo `docker-compose.yml` que defina los siguientes 5 servicios conectados en una red interna `saas_network`:
   - `backend`: Basado en `php:8.3-fpm-alpine`, con extensiones `pdo_pgsql`, `redis`, `gd`, `bcmath`, `opcache`. Monta el directorio `./backend` en `/var/www/html`.
   - `frontend`: Basado en `node:22-alpine`, monta `./frontend` en `/app`, exponiendo el puerto 3000 con soporte de Hot Reload.
   - `webserver`: Imagen oficial de `caddy:2-alpine`, exponiendo puertos 80 y 443, montando `./caddy/Caddyfile`.
   - `database`: Imagen `postgres:16-alpine` con volumen persistente `pgdata` y variables de entorno (`DB_DATABASE=saas_db`, `DB_USER=saas_user`, `DB_PASSWORD=saas_pass`).
   - `cache`: Imagen `redis:7-alpine` con volumen `redisdata`.
2. Crea los Dockerfiles correspondientes en `./backend/Dockerfile` y `./frontend/Dockerfile`, y el archivo `./caddy/Caddyfile` básico con proxy inverso.
3. Genera un script `test-env.sh` que verifique que los contenedores levanten y respondan en sus puertos correspondientes.
```
* **Criterio de Aceptación / Test:** `docker compose up -d` exitoso y respuesta `HTTP 200` en los servicios.
* **Git Commit:** `feat(infra): setup docker-compose with php 8.3, nextjs 22, postgres, redis and caddy`

---

### Tarea 1.2: Inicialización y Setup de Laravel 11 Backend
* **Contexto:** Backend API Rest desacoplado.
* **Prompt para Antigravity CLI:**
```text
Dentro de la carpeta `/backend`:
1. Inicializa un proyecto limpio de Laravel 11 en modo API.
2. Configura el archivo `.env.example` y `.env` para conectarse a los servicios `database` (PostgreSQL) y `cache` (Redis) del Docker Compose.
3. Instala y configura `laravel/sanctum` para autenticación con tokens Bearer por API.
4. Escribe un test funcional en Pest/PHPUnit (`tests/Feature/HealthCheckTest.php`) que verifique el endpoint `GET /api/health` validando conexión exitosa a PostgreSQL y a Redis. Ejecuta el test y asegúrate de que pase en verde.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=HealthCheckTest` retorna OK.
* **Git Commit:** `feat(backend): initialize laravel 11 api with sanctum, postgres and redis healthcheck`

---

### Tarea 1.3: Esquema de Base de Datos para Multi-tenancy & Feature Flags
* **Contexto:** Modelo de negocio híbrido con planes (Bronce, Plata, Oro) y módulos activables.
* **Prompt para Antigravity CLI:**
```text
En el backend de Laravel, diseña las migraciones y seeders para multi-tenancy y feature flags:
1. Crea las migraciones para:
   - `complejos`: id, uuid, nombre, subdominio (unique, index), dominio_personalizado (nullable, unique), plan_id, estado, created_at, updated_at.
   - `modulos`: id, nombre, slug (unique, index: 'reservas', 'pos_buffet', 'torneos', 'cms_web', 'domotica', 'split_payment', 'turnos_fijos'), descripcion.
   - `planes`: id, nombre ('Bronce', 'Plata', 'Oro'), slug (unique), precio_mensual, estado.
   - `plan_modulo` (pivote): id, plan_id, modulo_id.
   - `complejo_modulo` (pivote granular): id, complejo_id, modulo_id, esta_activo (boolean default true), valido_hasta (timestamp nullable).
2. Crea los Seeders correspondientes con los planes base y la asignación de módulos según el plan maestro.
3. Escribe un test unitario (`tests/Unit/TenancyModuleTest.php`) que verifique que un complejo asignado al plan Oro herede los módulos por defecto y que se le pueda habilitar un módulo extra de forma individual.
```
* **Criterio de Aceptación / Test:** `php artisan migrate:fresh --seed` y `php artisan test --filter=TenancyModuleTest` pasando en verde.
* **Git Commit:** `feat(tenancy): create migrations, seeders and relations for multi-tenancy and feature flags`

---

### Tarea 1.4: TenantScope Global y Middleware de Feature Flags
* **Contexto:** Aislamiento estricto de base de datos y control de accesos modulares.
* **Prompt para Antigravity CLI:**
```text
Implementa los mecanismos de aislamiento y permisos modulares en Laravel:
1. Crea el trait `BelongsToTenant` y el Global Scope `TenantScope` que inyecte automáticamente `WHERE complejo_id = ?` en todos los modelos que lo usen.
2. Crea el Middleware `TenantContextMiddleware` que identifique el complejo mediante el subdominio del header `Host` o un header `X-Tenant-ID` y registre el inquilino activo en el Service Container (`app('currentTenant')`).
3. Crea el Middleware `CheckTenantModule` (`tenant.has_module:slug`) que valide si el inquilino activo tiene el módulo habilitado en `complejo_modulo` o a través de su plan. Si no lo tiene, debe retornar 403 con payload `{ "error": "MODULE_NOT_ENABLED", "module": "torneos" }`.
4. Escribe un test (`tests/Feature/TenantModuleSecurityTest.php`) que pruebe que una ruta protegida con `tenant.has_module:torneos` retorne 200 cuando el módulo está activo y 403 cuando no.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=TenantModuleSecurityTest` retorna OK.
* **Git Commit:** `feat(security): implement TenantScope and CheckTenantModule middleware with tests`

---

# BLOQUE 2: MOTOR DE RESERVAS, CONCURRENCIA & AGENDA (Semanas 3-5)

### Tarea 2.1: Modelos de Canchas, Horarios y Turnos
* **Contexto:** Estructura de canchas y franjas horarias por complejo.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Crea las migraciones para:
   - `canchas`: id, complejo_id (FK), nombre, deporte (futbol, padel, tenis), superficie, techada (boolean), precio_base, estado. Usa `BelongsToTenant`.
   - `horarios_atencion`: id, complejo_id (FK), dia_semana (0-6), hora_apertura, hora_cierre, duracion_turno_minutos (default 60).
   - `turnos`: id, complejo_id (FK), cancha_id (FK), cliente_id (FK nullable), fecha, hora_inicio, hora_fin, precio, estado (disponible, bloqueado, reservado, cancelado), es_fijo (boolean default false).
2. Define los modelos Eloquent con sus relaciones, validando que todos usen el `TenantScope`.
3. Escribe un test (`tests/Feature/CanchaTenantIsolationTest.php`) que inserte canchas para dos complejos diferentes y verifique que las consultas solo retornen las canchas del inquilino autenticado.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=CanchaTenantIsolationTest` pasando en verde.
* **Git Commit:** `feat(reservas): create canchas, horarios and turnos models with tenant isolation`

---

### Tarea 2.2: Algoritmo de Cálculo de Disponibilidad
* **Contexto:** Motor que calcula franjas horarias libres cruzando horarios y turnos existentes.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Crea el servicio `App\Services\DisponibilidadService`.
2. Implementa el método `obtenerSlotsDisponibles(int $canchaId, string $fecha): array`. La lógica debe:
   - Obtener el rango de atención del complejo para ese día de la semana.
   - Generar los slots teóricos según `duracion_turno_minutos`.
   - Excluir los turnos que ya tengan estado 'reservado' o 'bloqueado' en la base de datos o tengan un candado activo en Redis.
   - Retornar el array de slots con `hora_inicio`, `hora_fin`, `precio` y estado `disponible`.
3. Expón el endpoint `GET /api/canchas/{id}/disponibilidad?fecha=YYYY-MM-DD`.
4. Escribe un test (`tests/Unit/DisponibilidadServiceTest.php`) simulando reservas y validando que solo retorne las horas libres.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=DisponibilidadServiceTest` pasa en verde.
* **Git Commit:** `feat(reservas): implement DisponibilidadService and availability endpoint`

---

### Tarea 2.3: Bloqueo Temporal Atómico con Redis (Anti Doble Reserva)
* **Contexto:** Evitar condiciones de carrera (*race conditions*) durante el checkout.
* **Prompt para Antigravity CLI:**
```text
Implementa el sistema de bloqueos temporales en Redis para las reservas:
1. En `App\Services\ReservaLockService`, implementa:
   - `adquirirBloqueo(int $canchaId, string $fecha, string $horaInicio, int $userId): bool`: Usa el comando atómico `SET turno:{cancha_id}:{fecha}:{hora} {userId} NX EX 600` (10 minutos TTL en Redis).
   - `liberarBloqueo(...)`: Elimina la llave en Redis.
2. Crea el endpoint `POST /api/turnos/bloquear-temporal` que reciba `cancha_id`, `fecha` y `hora_inicio`. Si adquiere el lock en Redis, retorna 200 con un `token_reserva`; si la llave ya existe, retorna `409 Conflict` con el mensaje "El turno está siendo reservado por otro usuario".
3. Escribe un test (`tests/Feature/AtomicLockTest.php`) que simule dos peticiones concurrentes para el mismo turno exacto y valide que una recibe 200 y la otra 409.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=AtomicLockTest` retorna OK.
* **Git Commit:** `feat(reservas): atomic redis locks for slot reservation with race condition prevention`

---

### Tarea 2.4: Confirmación Transaccional y Turnos Recurrentes (Fijos)
* **Contexto:** Persistencia segura en base de datos y reservas periódicas.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Crea el endpoint `POST /api/turnos/confirmar` protegido con autenticación.
   - Valida el token del lock en Redis.
   - Ejecuta una transacción de base de datos con `DB::transaction()` y `SELECT FOR UPDATE` para insertar el registro en `turnos` con estado 'reservado' y liberar el lock de Redis.
2. Implementa la lógica para Turnos Fijos (requiere módulo `turnos_fijos`): endpoint `POST /api/turnos/fijos` que cree reservas recurrentes para las próximas $N$ semanas (ej. 4 semanas).
3. Escribe un test (`tests/Feature/ConfirmarReservaTest.php`) que valide la confirmación segura y la creación recurrente de turnos fijos.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=ConfirmarReservaTest` pasa en verde.
* **Git Commit:** `feat(reservas): transactional booking confirmation and recurring slots engine`

---

# BLOQUE 3: ERP DE CLUB, POS / BUFFET & CAJA (Semanas 6-7)

### Tarea 3.1: Punto de Venta (POS) & Inventario de Buffet
* **Contexto:** Módulo de buffet, alquiler de equipo y comanda asociada a la cancha.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend (protegido con `tenant.has_module:pos_buffet`):
1. Crea las migraciones para:
   - `productos`: id, complejo_id (FK), nombre, categoria (bebida, comida, indumentaria, alquiler), precio_venta, costo, stock_actual, stock_minimo.
   - `ventas`: id, complejo_id (FK), turno_id (FK nullable, para comanda), operador_id (FK), total, metodo_pago (efectivo, transferencia, qr), estado (pendiente, pagado).
   - `venta_items`: id, venta_id (FK), producto_id (FK), cantidad, precio_unitario, subtotal.
2. Crea el servicio `POSService` con métodos para registrar ventas directas de mostrador y anexar productos a la cuenta de un turno en curso, descontando automáticamente el inventario.
3. Escribe un test (`tests/Feature/POSTest.php`) que realice una venta, verifique la reducción de stock y confirme que la comanda quede vinculada al turno.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=POSTest` pasa en verde.
* **Git Commit:** `feat(pos): buffet inventory, sales orders and court tab linking`

---

### Tarea 3.2: Arqueo y Control de Caja Diaria
* **Contexto:** Módulo de control de caja por operador.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Crea la migración `cajas_sesiones`: id, complejo_id (FK), operador_id (FK), monto_apertura, monto_cierre, total_efectivo_calculado, total_digital_calculado, diferencia, fecha_apertura, fecha_cierre, estado (abierta, cerrada).
2. Implementa los endpoints:
   - `POST /api/caja/apertura`: Abre el turno de caja.
   - `POST /api/caja/cierre`: Realiza el arqueo ciego comparando lo ingresado físicamente con las ventas y reservas cobradas.
   - `GET /api/caja/resumen-diario`: Retorna métricas de facturación discriminadas por método de pago.
3. Escribe un test (`tests/Feature/CajaSessionTest.php`) que valide el ciclo completo de apertura, cobro de turno, cobro de buffet y cierre de caja calculando diferencias.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=CajaSessionTest` pasa en verde.
* **Git Commit:** `feat(caja): daily cash register sessions, blind count and daily reports`

---

# BLOQUE 4: FRONTEND WEB NEXT.JS & CMS MULTITENANT (Semanas 8-9)

### Tarea 4.1: Setup de Next.js y Middleware de Subdominios
* **Contexto:** Frontend unificado en `/frontend` con ruteo multi-inquilino.
* **Prompt para Antigravity CLI:**
```text
En la carpeta `/frontend`:
1. Inicializa una aplicación Next.js 14+ (App Router o Pages Router) con TypeScript y Tailwind CSS.
2. Implementa `middleware.ts` en la raíz de Next.js:
   - Extrae el host de la petición.
   - Si el host es `tupataforma.com` o `localhost:3000`, enruta a las páginas públicas del directorio global (`/portal`).
   - Si el host tiene subdominio (ej: `elmaracana.tupataforma.com`) o un dominio propio, extrae el identificador y reescribe internamente la ruta hacia `/tenants/[subdomain]`.
3. Escribe un test con Vitest/Jest o Playwright que valide que las cabeceras `Host` reescriban a las rutas correctas.
```
* **Criterio de Aceptación / Test:** Pruebas de middleware pasando en verde.
* **Git Commit:** `feat(frontend): next.js multi-tenant subdomain routing middleware`

---

### Tarea 4.2: CMS Multitenant con ISR y Sanitización XSS
* **Contexto:** Generador de páginas independientes para clubes con Plan Oro / Add-on CMS.
* **Prompt para Antigravity CLI:**
```text
1. En Laravel backend:
   - Migración `paginas`: id, complejo_id (FK), titulo, slug, contenido_html, esta_publicada (boolean).
   - Sanitiza el campo `contenido_html` con `stevebauman/purify` o `HTMLPurifier` en el guardado.
   - Endpoint `GET /api/tenants/{subdomain}/paginas/{slug}` con caché en Redis.
   - Webhook `POST /api/tenants/revalidate` que llama a Next.js cuando se edita una página.
2. En Next.js frontend:
   - Crea la página dinámica `/tenants/[subdomain]/paginas/[slug]` utilizando `getStaticProps` e `ISR` (`revalidate: 3600`).
   - Endpoint `/api/revalidate` en Next.js para purga de caché bajo demanda protegida con secret token.
3. Escribe un test validando que no se puedan guardar tags `<script>` en las páginas y que el endpoint de revalidación funcione.
```
* **Criterio de Aceptación / Test:** Test de sanitización y respuesta HTTP 200 en regeneración estática.
* **Git Commit:** `feat(cms): pages builder with html sanitization and on-demand isr revalidation`

---

### Tarea 4.3: Grilla de Turnos Interactiva en Next.js (Admin & Público)
* **Contexto:** Calendario reactivo para reserva y administración.
* **Prompt para Antigravity CLI:**
```text
En Next.js frontend:
1. Crea el componente interactivo `GrillaHoraria` con Tailwind CSS:
   - Selector de fecha, deporte y filtro de canchas.
   - Carga reactiva de slots libres consumiendo `/api/canchas/{id}/disponibilidad`.
   - Al hacer clic en un slot libre, dispara la llamada a `/api/turnos/bloquear-temporal`.
   - Inicia un contador visual de 10 minutos (tiempo de retención del lock en Redis).
2. Si el lock falla por 409 Conflict, muestra una notificación Toast: "El turno acaba de ser tomado por otro jugador".
3. Escribe un test con React Testing Library que simule el clic en un turno libre y verifique el cambio de estado a bloqueado.
```
* **Criterio de Aceptación / Test:** Tests de renderizado y lógica de selección de turnos en verde.
* **Git Commit:** `feat(frontend): reactive court schedule grid with optimistic locks and countdown`

---

# BLOQUE 5: COMUNIDAD, SPLIT PAYMENT & TORNEOS (Semanas 10-11)

### Tarea 5.1: Partidos Abiertos (Matchmaking) y Pago Dividido (Split Payment)
* **Contexto:** Lógica social y división de costos entre jugadores.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend (módulo `split_payment`):
1. Migraciones:
   - `partidos_abiertos`: id, turno_id (FK), complejo_id (FK), categoria_nivel (1 a 8), genero, jugadores_totales, jugadores_confirmados.
   - `turno_pagos_divididos`: id, turno_id (FK), user_id (FK nullable), email_invitado, monto_cuota, token_pago (unique), estado (pendiente, pagado).
2. Endpoint `POST /api/turnos/{id}/split`: Divide el monto total del turno en $N$ cuotas y genera links únicos de checkout.
3. Listener que verifique si todas las cuotas fueron abonadas antes de las 2 horas previas al partido; si no, cancela el turno o notifica al creador.
4. Escribe un test unitario (`tests/Feature/SplitPaymentTest.php`) que genere 4 links de pago para pádel y valide el cambio de estado del turno al completarse los pagos.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=SplitPaymentTest` pasa en verde.
* **Git Commit:** `feat(community): open matches matchmaking and split payment quotas`

---

### Tarea 5.2: Gestor de Torneos, Fixtures y Tablas de Posiciones
* **Contexto:** Módulo de torneos para clubes (requiere módulo `torneos`).
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Migraciones:
   - `torneos`: id, complejo_id (FK), nombre, deporte, formato (eliminacion_directa, fase_grupos), fecha_inicio, estado.
   - `equipos_torneo`: id, torneo_id (FK), nombre_equipo, capitan_user_id.
   - `partidos_torneo`: id, torneo_id (FK), turno_id (FK nullable), equipo_local_id, equipo_visitante_id, set_1, set_2, set_3, ganador_id, fase.
2. Crea `TorneoFixtureService` con el algoritmo para generar automáticamente el cuadro de llaves (eliminación directa) según el número de inscriptos (ej: 8, 16 o 32 equipos).
3. Escribe un test (`tests/Unit/FixtureGeneratorTest.php`) que valide la generación matemática perfecta de llaves de cuartos, semis y final.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=FixtureGeneratorTest` pasa en verde.
* **Git Commit:** `feat(torneos): tournament brackets generator and fixture scoring engine`

---

# BLOQUE 6: FRONTEND MOBILE CON REACT NATIVE (Semanas 12-13)

### Tarea 6.1: Setup de React Native Expo & Autenticación Segura
* **Contexto:** App móvil para jugadores en `/mobile`.
* **Prompt para Antigravity CLI:**
```text
1. En el directorio `/mobile`, inicializa un proyecto con Expo (React Native) + TypeScript + NativeWind (Tailwind).
2. Implementa `AuthService` utilizando `expo-secure-store` para guardar el token de Laravel Sanctum de forma encriptada en el llavero nativo del teléfono.
3. Crea las pantallas de Login, Registro y Home con un buscador de canchas por deporte.
4. Escribe un test de componentes con Jest que valide que al ingresar credenciales correctas, el token se almacene de forma segura.
```
* **Criterio de Aceptación / Test:** Tests de autenticación móvil pasando en verde.
* **Git Commit:** `feat(mobile): expo setup with secure-store auth and nativewind styles`

---

### Tarea 6.2: Buscador por Geolocalización y Notificaciones Push
* **Contexto:** Búsqueda rápida por GPS y recordatorios de partidos.
* **Prompt para Antigravity CLI:**
```text
1. En React Native `/mobile`:
   - Integra `expo-location` para solicitar permisos de GPS y enviar coordenadas `lat` y `lng` a `/api/complejos/cercanos`.
   - Integra `expo-notifications` para registrar el `expo_push_token` en la base de datos del backend.
2. En Laravel backend:
   - Implementa la consulta espacial en PostgreSQL (`ST_DWithin` o fórmula de Haversine) en el endpoint `GET /api/complejos/cercanos`.
   - Crea el Job `EnviarRecordatorioTurnoJob` que despache una alerta push 2 horas antes de cada partido mediante Firebase Cloud Messaging (FCM).
3. Escribe un test validando la respuesta ordenada por distancia métrica.
```
* **Criterio de Aceptación / Test:** Test de geolocalización y despacho de push notification en verde.
* **Git Commit:** `feat(mobile): geolocation nearby search and automated fcm push notifications`

---

# BLOQUE 7: PAGOS, ASSETS S3, IOT & HARDENING (Semanas 14-15)

### Tarea 7.1: Pasarelas de Pago (Mercado Pago / Stripe Webhooks)
* **Contexto:** Cobro de señas y confirmación automatizada.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Crea el servicio `PaymentGatewayService` con soporte para Checkout Pro / Webhooks de Mercado Pago y Stripe.
2. Endpoint `POST /api/webhooks/mercadopago` y `POST /api/webhooks/stripe`:
   - Valida la firma criptográfica del webhook.
   - Si el pago es `approved`, busca el turno vinculado, cambia su estado a 'reservado' de forma transaccional y envía mensaje de WhatsApp vía Twilio/Meta API.
3. Escribe un test de integración (`tests/Feature/PaymentWebhookTest.php`) simulando el payload de un webhook aprobado y validando que el turno se confirme automáticamente.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=PaymentWebhookTest` retorna OK.
* **Git Commit:** `feat(payments): webhooks integration for automated booking confirmation`

---

### Tarea 7.2: Subida de Imágenes a S3 con Presigned URLs
* **Contexto:** Almacenamiento desacoplado sin tocar el disco del servidor.
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Configura el driver de almacenamiento en `filesystems.php` usando `league/flysystem-aws-s3-v3` para AWS S3 o Cloudflare R2.
2. Crea el endpoint `POST /api/assets/presigned-url` protegido con auth:
   - Recibe `file_name`, `file_type` y `folder` (ej: 'logos', 'canchas').
   - Valida formatos permitidos (JPEG, PNG, WebP) y peso máximo.
   - Genera una URL prefirmada de subida directa (`S3Client::createPresignedRequest`) con TTL de 5 minutos.
3. Escribe un test (`tests/Feature/PresignedUrlTest.php`) que valide la generación de la URL segura sin procesar archivos en el servidor local.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=PresignedUrlTest` pasa en verde.
* **Git Commit:** `feat(storage): s3/r2 presigned urls for zero-server image uploads`

---

### Tarea 7.3: Módulo de Domótica IoT (Control Automático de Luces)
* **Contexto:** Encendido y apagado de reflectores mediante hardware relay (requiere módulo `domotica`).
* **Prompt para Antigravity CLI:**
```text
En Laravel backend:
1. Migración `dispositivos_iot`: id, complejo_id (FK), cancha_id (FK), identificador_hardware (topic MQTT o IP relay), tipo (shelly, sonoff, esp32), estado (online, offline).
2. Crea un comando Artisan programado en el Scheduler (`php artisan iot:sincronizar-luces` cada minuto):
   - Busca turnos confirmados que comiencen en los próximos 5 minutos y envía orden de encendido (`ON`) vía Webhook/MQTT.
   - Busca turnos finalizados hace más de 2 minutos sin turno subsiguiente y envía orden de apagado (`OFF`).
3. Escribe un test (`tests/Unit/IoTSchedulerTest.php`) que simule los horarios de los turnos y verifique los comandos emitidos.
```
* **Criterio de Aceptación / Test:** `php artisan test --filter=IoTSchedulerTest` pasa en verde.
* **Git Commit:** `feat(iot): automated court lighting scheduler and relay triggers`

---

# BLOQUE 8: QA FINAL, CI/CD & DESPLIEGUE (Semana 16)

### Tarea 8.1: GitHub Actions CI/CD Pipeline
* **Contexto:** Automatización de testing y despliegue continuo a producción.
* **Prompt para Antigravity CLI:**
```text
En la raíz del proyecto:
1. Crea `.github/workflows/ci.yml`:
   - En cada Pull Request a `develop` o `main`: levanta servicios de PostgreSQL y Redis, ejecuta `composer install`, linter `phpstan`, tests de backend (`php artisan test`), instala dependencias de frontend y corre `npm run build` y `npm run test`.
2. Crea `.github/workflows/deploy.yml`:
   - Tras mergear en `main`, conecta vía SSH con el servidor de producción, ejecuta `git pull`, reconstruye contenedores con `docker compose -f docker-compose.prod.yml up -d --build` y corre `php artisan migrate --force`.
```
* **Criterio de Aceptación / Test:** Workflow YAML válido y testeado con GitHub CLI (`gh act` o push de prueba).
* **Git Commit:** `ci(devops): github actions workflows for testing and zero-downtime deployment`

---

### Tarea 8.2: Tests de Carga y Estrés de Concurrencia (k6)
* **Contexto:** Validación de carga masiva antes del lanzamiento.
* **Prompt para Antigravity CLI:**
```text
En la carpeta `/tests/k6`:
1. Crea un script de prueba de carga `stress-reservas.js` usando la herramienta k6:
   - Simula 100 usuarios virtuales (VUs) intentando adquirir el lock temporal sobre el mismo turno y canchas simultáneas.
   - Verifica que el tiempo de respuesta p95 sea inferior a 200 ms y que exactamente 1 usuario reserve el turno con éxito sin duplicados en base de datos.
2. Genera un script `run-stress.sh` para ejecutar la prueba en el entorno Docker local.
```
* **Criterio de Aceptación / Test:** Ejecución de k6 reportando `0% failed assertions` en duplicidad de turnos.
* **Git Commit:** `test(qa): k6 concurrency stress tests for atomic locks under high traffic`
