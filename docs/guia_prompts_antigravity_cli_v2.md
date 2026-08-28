# Guía de Ejecución Atómica para Antigravity CLI: SaaS Deportivo Multitenant

Este documento contiene el desglose técnico del plan maestro en **prompts atómicos, secuenciales e independientes**, optimizados para ser ejecutados de forma iterativa mediante **Antigravity CLI** con persistencia continua de estado y contexto en `status.md` y `progress.txt`.

---

## 📌 Protocolo de Trabajo y Gestión de Memoria

Para evitar inconsistencias, alucinaciones o degradación de contexto entre sesiones:
1. **Archivo de Directivas Inmutables (`RULES.md`):** Establece las reglas técnicas que el CLI nunca debe violar (Laravel 11, Next.js 22, Multi-tenancy estricto, TDD).
2. **Registro de Estado Vivo (`status.md`):** Mantiene la lista de tareas con checkboxes (`[ ]` / `[x]`) y la tarea activa.
3. **Bitácora Cronológica (`progress.txt`):** Registra archivos creados, migraciones, decisiones técnicas y tests ejecutados.
4. **Ciclo de Ejecución:**
   - **Lectura Inicial:** Antes de ejecutar, el CLI lee `RULES.md`, `status.md` y `progress.txt`.
   - **Ejecución y Test:** El CLI crea el código y ejecuta los tests automatizados hasta dejarlos en verde.
   - **Actualización de Memoria y Git:** El CLI actualiza automáticamente `status.md`, añade la entrada en `progress.txt` y realiza el `git commit`.

---

# ARCHIVOS DE INICIALIZACIÓN DE CONTEXTO (Setup Previo)

### Tarea 0.1: Inicialización de Archivos de Contexto y Memoria
* **Contexto:** Creación de los archivos de seguimiento en la raíz del repositorio.
* **Prompt para Antigravity CLI:**
```text
Crea los archivos base de contexto y persistencia de memoria en la raíz del repositorio:
1. Crea `RULES.md` con las siguientes directivas inmutables:
   - Backend: Laravel 11 (PHP 8.3) en modo API Rest desacoplada.
   - Frontend: Next.js 14+ (Node 22) con Tailwind CSS, SSR/ISR y Middleware de subdominios.
   - Mobile: React Native (Expo) con TypeScript y Tailwind (NativeWind).
   - Multi-tenancy: Todo modelo tenant-aware debe implementar `TenantScope` inyectando `WHERE complejo_id = ?`.
   - Permisos: Control modular mediante middleware `tenant.has_module:slug` y roles RBAC.
   - Concurrencia: Locks atómicos en Redis (TTL 10 min) y transacciones ACID con `SELECT FOR UPDATE`.
   - TDD Obligatorio: Ninguna tarea se considera terminada sin su test automatizado en verde.
2. Crea `status.md` con el checklist completo de todas las tareas (Bloques 1 al 8) en estado pendiente `[ ]` y marcando la Tarea 1.1 como la siguiente a ejecutar.
3. Crea `progress.txt` con el encabezado inicial del proyecto y fecha de inicio.
4. Realiza el commit inicial con: `git commit -m "chore(setup): initialize RULES.md, status.md and progress.txt for cli memory"`
```
* **Criterio de Aceptación / Test:** Archivos presentes en la raíz del proyecto y commit generado.

---

# BLOQUE 1: INFRAESTRUCTURA, BASE & MULTI-TENANCY (Semanas 1-2)

### Tarea 1.1: Docker Compose Multi-contenedor
* **Contexto:** Inicialización del entorno de software de base para el SaaS.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt` para entender las directivas del proyecto.
A continuación, ejecuta la Tarea 1.1:
1. Crea un archivo `docker-compose.yml` en la raíz que defina los siguientes 5 servicios conectados en la red interna `saas_network`:
   - `backend`: Basado en `php:8.3-fpm-alpine`, con extensiones `pdo_pgsql`, `redis`, `gd`, `bcmath`, `opcache`. Monta `./backend` en `/var/www/html`.
   - `frontend`: Basado en `node:22-alpine`, monta `./frontend` en `/app`, exponiendo el puerto 3000 con Hot Reload.
   - `webserver`: Imagen oficial de `caddy:2-alpine`, exponiendo puertos 80 y 443, montando `./caddy/Caddyfile`.
   - `database`: Imagen `postgres:16-alpine` con volumen persistente `pgdata` y variables de entorno (`DB_DATABASE=saas_db`, `DB_USER=saas_user`, `DB_PASSWORD=saas_pass`).
   - `cache`: Imagen `redis:7-alpine` con volumen `redisdata`.
2. Crea los Dockerfiles en `./backend/Dockerfile` y `./frontend/Dockerfile`, y `./caddy/Caddyfile` básico con proxy inverso.
3. Genera un script `test-env.sh` que verifique que los contenedores levanten y respondan en sus puertos.
4. Al finalizar y verificar los contenedores:
   - Marca `[x] Tarea 1.1` en `status.md`.
   - Añade una entrada en `progress.txt` resumiendo la configuración de Docker.
   - Ejecuta `git add .` y `git commit -m "feat(infra): setup docker-compose with php 8.3, nextjs 22, postgres, redis and caddy"`
```
* **Criterio de Aceptación / Test:** `docker compose up -d` exitoso y `status.md` / `progress.txt` actualizados.

---

### Tarea 1.2: Inicialización y Setup de Laravel 11 Backend
* **Contexto:** Backend API Rest desacoplado.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 1.2:
1. Dentro de `/backend`, inicializa un proyecto limpio de Laravel 11 en modo API.
2. Configura `.env.example` y `.env` para conectarse a `database` (PostgreSQL) y `cache` (Redis) del Docker Compose.
3. Instala y configura `laravel/sanctum` para autenticación por tokens Bearer.
4. Escribe un test en Pest/PHPUnit (`tests/Feature/HealthCheckTest.php`) que verifique el endpoint `GET /api/health` validando conexión exitosa a PostgreSQL y Redis.
5. Ejecuta los tests con `php artisan test --filter=HealthCheckTest`.
6. Al pasar los tests:
   - Marca `[x] Tarea 1.2` en `status.md`.
   - Añade una entrada en `progress.txt` resumiendo la inicialización de Laravel y configuración de base de datos.
   - Ejecuta `git add .` y `git commit -m "feat(backend): initialize laravel 11 api with sanctum, postgres and redis healthcheck"`
```
* **Criterio de Aceptación / Test:** Test en verde y bitácoras actualizadas.

---

### Tarea 1.3: Esquema de Base de Datos para Multi-tenancy & Feature Flags
* **Contexto:** Modelo de negocio híbrido con planes (Bronce, Plata, Oro) y módulos activables.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 1.3:
1. En Laravel backend, crea las migraciones para:
   - `complejos`: id, uuid, nombre, subdominio (unique, index), dominio_personalizado (nullable, unique), plan_id, estado, created_at, updated_at.
   - `modulos`: id, nombre, slug (unique, index: 'reservas', 'pos_buffet', 'torneos', 'cms_web', 'domotica', 'split_payment', 'turnos_fijos'), descripcion.
   - `planes`: id, nombre ('Bronce', 'Plata', 'Oro'), slug (unique), precio_mensual, estado.
   - `plan_modulo` (pivote): id, plan_id, modulo_id.
   - `complejo_modulo` (pivote granular): id, complejo_id, modulo_id, esta_activo (boolean default true), valido_hasta (timestamp nullable).
2. Crea los Seeders correspondientes con los planes base y la asignación de módulos según las especificaciones.
3. Escribe un test (`tests/Unit/TenancyModuleTest.php`) que verifique la asignación de módulos por plan y add-ons individuales.
4. Ejecuta `php artisan migrate:fresh --seed` y corre el test.
5. Al pasar los tests:
   - Marca `[x] Tarea 1.3` en `status.md`.
   - Registra en `progress.txt` los modelos y relaciones creadas.
   - Ejecuta `git add .` y `git commit -m "feat(tenancy): create migrations, seeders and relations for multi-tenancy and feature flags"`
```
* **Criterio de Aceptación / Test:** Migraciones y tests pasando en verde; archivos de estado actualizados.

---

### Tarea 1.4: TenantScope Global y Middleware de Feature Flags
* **Contexto:** Aislamiento estricto de base de datos y control de accesos modulares.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 1.4:
1. Crea el trait `BelongsToTenant` y el Global Scope `TenantScope` que inyecte automáticamente `WHERE complejo_id = ?` en todos los modelos que lo utilicen.
2. Crea el Middleware `TenantContextMiddleware` que identifique el complejo mediante el subdominio del header `Host` o `X-Tenant-ID` y registre el inquilino activo en `app('currentTenant')`.
3. Crea el Middleware `CheckTenantModule` (`tenant.has_module:slug`) que valide si el inquilino activo tiene el módulo habilitado en `complejo_modulo` o por su plan, retornando 403 con payload `{ "error": "MODULE_NOT_ENABLED", "module": "slug" }` si no lo tiene.
4. Escribe un test (`tests/Feature/TenantModuleSecurityTest.php`) que pruebe acceso permitido con módulo activo y 403 con módulo inactivo.
5. Al pasar los tests:
   - Marca `[x] Tarea 1.4` en `status.md`.
   - Registra en `progress.txt` la implementación de scopes y middlewares de seguridad.
   - Ejecuta `git add .` y `git commit -m "feat(security): implement TenantScope and CheckTenantModule middleware with tests"`
```
* **Criterio de Aceptación / Test:** Tests de seguridad en verde y bitácora actualizada.

---

# BLOQUE 2: MOTOR DE RESERVAS, CONCURRENCIA & AGENDA (Semanas 3-5)

### Tarea 2.1: Modelos de Canchas, Horarios y Turnos
* **Contexto:** Estructura de canchas y franjas horarias por complejo.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 2.1:
1. En Laravel backend, crea las migraciones para:
   - `canchas`: id, complejo_id (FK), nombre, deporte (futbol, padel, tenis), superficie, techada (boolean), precio_base, estado. Usa `BelongsToTenant`.
   - `horarios_atencion`: id, complejo_id (FK), dia_semana (0-6), hora_apertura, hora_cierre, duracion_turno_minutos (default 60).
   - `turnos`: id, complejo_id (FK), cancha_id (FK), cliente_id (FK nullable), fecha, hora_inicio, hora_fin, precio, estado (disponible, bloqueado, reservado, cancelado), es_fijo (boolean default false).
2. Define los modelos Eloquent con sus relaciones e integra `TenantScope`.
3. Escribe un test (`tests/Feature/CanchaTenantIsolationTest.php`) que verifique el aislamiento de canchas entre diferentes complejos.
4. Al pasar los tests:
   - Marca `[x] Tarea 2.1` en `status.md`.
   - Registra en `progress.txt` los modelos creados y relaciones.
   - Ejecuta `git add .` y `git commit -m "feat(reservas): create canchas, horarios and turnos models with tenant isolation"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácoras actualizadas.

---

### Tarea 2.2: Algoritmo de Cálculo de Disponibilidad
* **Contexto:** Motor que calcula franjas horarias libres cruzando horarios y turnos existentes.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 2.2:
1. Crea el servicio `App\Services\DisponibilidadService`.
2. Implementa `obtenerSlotsDisponibles(int $canchaId, string $fecha): array`, cruzando los horarios del complejo con las reservas activas y candados en Redis.
3. Expón el endpoint `GET /api/canchas/{id}/disponibilidad?fecha=YYYY-MM-DD`.
4. Escribe un test (`tests/Unit/DisponibilidadServiceTest.php`) simulando reservas y validando los slots libres devueltos.
5. Al pasar los tests:
   - Marca `[x] Tarea 2.2` en `status.md`.
   - Registra en `progress.txt` la lógica del algoritmo de disponibilidad.
   - Ejecuta `git add .` y `git commit -m "feat(reservas): implement DisponibilidadService and availability endpoint"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácoras actualizadas.

---

### Tarea 2.3: Bloqueo Temporal Atómico con Redis (Anti Doble Reserva)
* **Contexto:** Evitar condiciones de carrera (*race conditions*) durante el checkout.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 2.3:
1. En `App\Services\ReservaLockService`, implementa `adquirirBloqueo(...)` usando el comando atómico `SET turno:{cancha_id}:{fecha}:{hora} {userId} NX EX 600` (10 min TTL) y `liberarBloqueo(...)`.
2. Crea el endpoint `POST /api/turnos/bloquear-temporal` que devuelva 200 con `token_reserva` o `409 Conflict` si el turno ya fue tomado.
3. Escribe un test (`tests/Feature/AtomicLockTest.php`) que simule concurrencia simultánea validando que solo una petición tenga éxito.
4. Al pasar los tests:
   - Marca `[x] Tarea 2.3` en `status.md`.
   - Registra en `progress.txt` el mecanismo de bloqueo en Redis.
   - Ejecuta `git add .` y `git commit -m "feat(reservas): atomic redis locks for slot reservation with race condition prevention"`
```
* **Criterio de Aceptación / Test:** Test de concurrencia en verde y bitácora actualizada.

---

### Tarea 2.4: Confirmación Transaccional y Turnos Recurrentes (Fijos)
* **Contexto:** Persistencia segura en base de datos y reservas periódicas.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 2.4:
1. Crea el endpoint `POST /api/turnos/confirmar` con transacción `DB::transaction()` y `SELECT FOR UPDATE` para cambiar el estado a 'reservado' y liberar el lock en Redis.
2. Implementa la lógica para Turnos Fijos (requiere módulo `turnos_fijos`): endpoint `POST /api/turnos/fijos` para generar turnos recurrentes para las próximas $N$ semanas.
3. Escribe un test (`tests/Feature/ConfirmarReservaTest.php`) que valide la confirmación segura y la creación periódica.
4. Al pasar los tests:
   - Marca `[x] Tarea 2.4` en `status.md`.
   - Registra en `progress.txt` los endpoints de confirmación y turnos fijos.
   - Ejecuta `git add .` y `git commit -m "feat(reservas): transactional booking confirmation and recurring slots engine"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácoras actualizadas.

---

# BLOQUE 3: ERP DE CLUB, POS / BUFFET & CAJA (Semanas 6-7)

### Tarea 3.1: Punto de Venta (POS) & Inventario de Buffet
* **Contexto:** Módulo de buffet, alquiler de equipo y comanda asociada a la cancha.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 3.1:
1. En Laravel backend (protegido con `tenant.has_module:pos_buffet`), crea migraciones para `productos`, `ventas` y `venta_items` (vinculando `turno_id` opcional para comandas).
2. Crea `POSService` para ventas directas y consumos asociados a turnos con descuento de stock automático.
3. Escribe un test (`tests/Feature/POSTest.php`) que pruebe una venta directa y una comanda asociada al turno verificando reducción de inventario.
4. Al pasar los tests:
   - Marca `[x] Tarea 3.1` en `status.md`.
   - Registra en `progress.txt` el módulo POS e inventario.
   - Ejecuta `git add .` y `git commit -m "feat(pos): buffet inventory, sales orders and court tab linking"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 3.2: Arqueo y Control de Caja Diaria
* **Contexto:** Módulo de control de caja por operador.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 3.2:
1. Crea la migración `cajas_sesiones` con montos de apertura, cierre, totales calculados y diferencias.
2. Implementa endpoints `POST /api/caja/apertura`, `POST /api/caja/cierre` (arqueo ciego) y `GET /api/caja/resumen-diario`.
3. Escribe un test (`tests/Feature/CajaSessionTest.php`) que valide el ciclo completo de apertura, cobros varios y arqueo de caja.
4. Al pasar los tests:
   - Marca `[x] Tarea 3.2` en `status.md`.
   - Registra en `progress.txt` los controladores y servicios de caja.
   - Ejecuta `git add .` y `git commit -m "feat(caja): daily cash register sessions, blind count and daily reports"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

# BLOQUE 4: FRONTEND WEB NEXT.JS & CMS MULTITENANT (Semanas 8-9)

### Tarea 4.1: Setup de Next.js y Middleware de Subdominios
* **Contexto:** Frontend unificado en `/frontend` con ruteo multi-inquilino.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 4.1:
1. En `/frontend`, inicializa Next.js 14+ con TypeScript y Tailwind CSS.
2. Implementa `middleware.ts` para capturar el header `Host`, redirigiendo el dominio principal a `/portal` y los subdominios/dominios propios a `/tenants/[subdomain]`.
3. Escribe un test con Vitest/Jest que valide el correcto reescrito de URLs por subdominio.
4. Al pasar los tests:
   - Marca `[x] Tarea 4.1` en `status.md`.
   - Registra en `progress.txt` la configuración de Next.js y su middleware.
   - Ejecuta `git add .` y `git commit -m "feat(frontend): next.js multi-tenant subdomain routing middleware"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 4.2: CMS Multitenant con ISR y Sanitización XSS
* **Contexto:** Generador de páginas independientes para clubes con Plan Oro / Add-on CMS.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 4.2:
1. En Laravel backend:
   - Migración `paginas` (`titulo`, `slug`, `contenido_html`, `esta_publicada`).
   - Sanitización obligatoria del HTML en el guardado.
   - Webhook `POST /api/tenants/revalidate` que notifica a Next.js ante modificaciones.
2. En Next.js frontend:
   - Ruta `/tenants/[subdomain]/paginas/[slug]` con `getStaticProps` e ISR (`revalidate: 3600`).
   - Endpoint `/api/revalidate` con token de seguridad.
3. Escribe un test que valide la sanitización de tags peligrosos y la regeneración estática.
4. Al pasar los tests:
   - Marca `[x] Tarea 4.2` en `status.md`.
   - Registra en `progress.txt` el creador de páginas y purga de caché.
   - Ejecuta `git add .` y `git commit -m "feat(cms): pages builder with html sanitization and on-demand isr revalidation"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 4.3: Grilla de Turnos Interactiva en Next.js (Admin & Público)
* **Contexto:** Calendario reactivo para reserva y administración.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 4.3:
1. En Next.js, crea el componente reactivo `GrillaHoraria` con Tailwind CSS que consuma disponibilidad, dispare bloqueos temporales en Redis e inicie un contador visual de 10 minutos.
2. Muestra alertas Toast en caso de error `409 Conflict`.
3. Escribe un test con React Testing Library que simule la selección y bloqueo del turno.
4. Al pasar los tests:
   - Marca `[x] Tarea 4.3` en `status.md`.
   - Registra en `progress.txt` el componente de grilla horaria.
   - Ejecuta `git add .` y `git commit -m "feat(frontend): reactive court schedule grid with optimistic locks and countdown"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

# BLOQUE 5: COMUNIDAD, SPLIT PAYMENT & TORNEOS (Semanas 10-11)

### Tarea 5.1: Partidos Abiertos (Matchmaking) y Pago Dividido (Split Payment)
* **Contexto:** Lógica social y división de costos entre jugadores.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 5.1:
1. En Laravel backend (módulo `split_payment`), crea migraciones para `partidos_abiertos` y `turno_pagos_divididos`.
2. Implementa endpoint `POST /api/turnos/{id}/split` para fraccionar el total en cuotas individuales con links de checkout.
3. Escribe un test unitario (`tests/Feature/SplitPaymentTest.php`) que genere cuotas y valide la confirmación al completarse los pagos.
4. Al pasar los tests:
   - Marca `[x] Tarea 5.1` en `status.md`.
   - Registra en `progress.txt` la lógica de matchmaking y pago dividido.
   - Ejecuta `git add .` y `git commit -m "feat(community): open matches matchmaking and split payment quotas"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 5.2: Gestor de Torneos, Fixtures y Tablas de Posiciones
* **Contexto:** Módulo de torneos para clubes (requiere módulo `torneos`).
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 5.2:
1. En Laravel backend, crea migraciones para `torneos`, `equipos_torneo` y `partidos_torneo`.
2. Crea `TorneoFixtureService` para generar cuadros de eliminación directa y tablas de clasificación.
3. Escribe un test (`tests/Unit/FixtureGeneratorTest.php`) que valide el cálculo de llaves de eliminación.
4. Al pasar los tests:
   - Marca `[x] Tarea 5.2` en `status.md`.
   - Registra en `progress.txt` el motor de torneos y fixtures.
   - Ejecuta `git add .` y `git commit -m "feat(torneos): tournament brackets generator and fixture scoring engine"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

# BLOQUE 6: FRONTEND MOBILE CON REACT NATIVE (Semanas 12-13)

### Tarea 6.1: Setup de React Native Expo & Autenticación Segura
* **Contexto:** App móvil para jugadores en `/mobile`.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 6.1:
1. En `/mobile`, inicializa Expo (React Native) + TypeScript + NativeWind.
2. Implementa autenticación persistente y segura con `expo-secure-store`.
3. Crea las pantallas de Login, Registro y Home.
4. Escribe un test con Jest verificando el almacenamiento seguro de tokens.
5. Al pasar los tests:
   - Marca `[x] Tarea 6.1` en `status.md`.
   - Registra en `progress.txt` la configuración móvil y autenticación.
   - Ejecuta `git add .` y `git commit -m "feat(mobile): expo setup with secure-store auth and nativewind styles"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 6.2: Buscador por Geolocalización y Notificaciones Push
* **Contexto:** Búsqueda rápida por GPS y recordatorios de partidos.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 6.2:
1. En React Native, integra `expo-location` y `expo-notifications`.
2. En Laravel backend, crea el endpoint `GET /api/complejos/cercanos` con cálculo de distancia espacial y el Job `EnviarRecordatorioTurnoJob` vía Firebase Cloud Messaging.
3. Escribe un test validando la búsqueda por cercanía y el despacho de notificaciones.
4. Al pasar los tests:
   - Marca `[x] Tarea 6.2` en `status.md`.
   - Registra en `progress.txt` los servicios de geolocalización y notificaciones push.
   - Ejecuta `git add .` y `git commit -m "feat(mobile): geolocation nearby search and automated fcm push notifications"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

# BLOQUE 7: PAGOS, ASSETS S3, IOT & HARDENING (Semanas 14-15)

### Tarea 7.1: Pasarelas de Pago (Mercado Pago / Stripe Webhooks)
* **Contexto:** Cobro de señas y confirmación automatizada.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 7.1:
1. En Laravel backend, implementa webhooks para Mercado Pago y Stripe con validación criptográfica de firmas.
2. Actualiza de forma transaccional el estado del turno a 'reservado' al recibir evento de pago aprobado.
3. Escribe un test (`tests/Feature/PaymentWebhookTest.php`) simulando un webhook de pago.
4. Al pasar los tests:
   - Marca `[x] Tarea 7.1` en `status.md`.
   - Registra en `progress.txt` los servicios de pasarelas de pago y webhooks.
   - Ejecuta `git add .` y `git commit -m "feat(payments): webhooks integration for automated booking confirmation"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 7.2: Subida de Imágenes a S3 con Presigned URLs
* **Contexto:** Almacenamiento desacoplado sin tocar el disco del servidor.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 7.2:
1. Configura el driver de almacenamiento S3/Cloudflare R2 en Laravel.
2. Endpoint `POST /api/assets/presigned-url` que valide tipos permitidos y retorne URLs prefirmadas de subida directa.
3. Escribe un test (`tests/Feature/PresignedUrlTest.php`) validando la generación de URLs prefirmadas.
4. Al pasar los tests:
   - Marca `[x] Tarea 7.2` en `status.md`.
   - Registra en `progress.txt` la configuración de almacenamiento desacoplado.
   - Ejecuta `git add .` y `git commit -m "feat(storage): s3/r2 presigned urls for zero-server image uploads"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

### Tarea 7.3: Módulo de Domótica IoT (Control Automático de Luces)
* **Contexto:** Encendido y apagado de reflectores mediante hardware relay (requiere módulo `domotica`).
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 7.3:
1. Migración `dispositivos_iot` y comando Scheduler `php artisan iot:sincronizar-luces` para emitir órdenes de encendido y apagado según horarios de turnos confirmados.
2. Escribe un test (`tests/Unit/IoTSchedulerTest.php`) que verifique la emisión de órdenes de control.
3. Al pasar los tests:
   - Marca `[x] Tarea 7.3` en `status.md`.
   - Registra en `progress.txt` el módulo de domótica y scheduler IoT.
   - Ejecuta `git add .` y `git commit -m "feat(iot): automated court lighting scheduler and relay triggers"`
```
* **Criterio de Aceptación / Test:** Tests en verde y bitácora actualizada.

---

# BLOQUE 8: QA FINAL, CI/CD & DESPLIEGUE (Semana 16)

### Tarea 8.1: GitHub Actions CI/CD Pipeline
* **Contexto:** Automatización de testing y despliegue continuo a producción.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 8.1:
1. Crea `.github/workflows/ci.yml` para testing automático (backend + frontend) en PRs.
2. Crea `.github/workflows/deploy.yml` para despliegue automatizado vía SSH y ejecución de migraciones en `main`.
3. Al finalizar:
   - Marca `[x] Tarea 8.1` en `status.md`.
   - Registra en `progress.txt` la configuración de CI/CD.
   - Ejecuta `git add .` y `git commit -m "ci(devops): github actions workflows for testing and zero-downtime deployment"`
```
* **Criterio de Aceptación / Test:** Workflows YAML válidos y bitácoras actualizadas.

---

### Tarea 8.2: Tests de Carga y Estrés de Concurrencia (k6)
* **Contexto:** Validación de carga masiva antes del lanzamiento.
* **Prompt para Antigravity CLI:**
```text
Lee `RULES.md`, `status.md` y `progress.txt`.
A continuación, ejecuta la Tarea 8.2:
1. En `/tests/k6`, crea el script `stress-reservas.js` con k6 simulando 100 usuarios virtuales concurrentes compitiendo por los mismos turnos.
2. Verifica cero reservas duplicadas y tiempos p95 < 200 ms.
3. Al pasar la prueba de estrés:
   - Marca `[x] Tarea 8.2` en `status.md`.
   - Registra en `progress.txt` los resultados de la prueba de carga y el estado final del proyecto listo para producción.
   - Ejecuta `git add .` y `git commit -m "test(qa): k6 concurrency stress tests for atomic locks under high traffic"`
```
* **Criterio de Aceptación / Test:** 0% fallos de concurrencia y checklist completo en `status.md`.
