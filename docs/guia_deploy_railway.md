# Guía Completa de Despliegue en Producción - Railway & Namecheap
**Proyecto:** TurnosFlow (`turnosflow.com`)  
**Fecha:** Noviembre 2026

Esta guía contiene la hoja de ruta paso a paso para desplegar y configurar todo el ecosistema de TurnosFlow en Railway, conectar Namecheap con subdominios wildcard, y asegurar la persistencia de WhatsApp vía Evolution API.

---

## 1. Arquitectura en Railway (5 Servicios)

En un único proyecto de Railway (`turnosflow-prod`) convivirán:
1. **PostgreSQL** (Plugin oficial 1-click)
2. **Redis** (Plugin oficial 1-click)
3. **Backend API** (Laravel 11 + PHP 8.3 + Caddy embebido)
4. **Evolution API** (Docker Image oficial para WhatsApp)
5. **Frontend** (Next.js 14 App Router)
6. *(Opcional / Recomendado)* **Queue Worker** (Procesamiento asíncrono de recordatorios y turnos)

---

## 2. Paso a Paso en Railway

### Paso 2.1: Crear el Proyecto
1. Ingresa a [railway.app](https://railway.app) y haz clic en **"New Project"**.
2. Selecciona **"Deploy from GitHub repo"** y elige `nicolasdovico/turnos`.
3. Renombra este primer servicio a `backend`.

---

### Paso 2.2: Agregar Bases de Datos (Plugins 1-click)
Dentro del mismo proyecto en Railway:
1. Clic en **"+ New"** -> **"Database"** -> **"Add PostgreSQL"**.
2. Clic en **"+ New"** -> **"Database"** -> **"Add Redis"**.

---

### Paso 2.3: Configurar el Servicio `backend`
1. Clic en la tarjeta de `backend`:
   - Ve a **Settings**:
     - **Root Directory:** `/backend`
     - **Build:** `Dockerfile.prod` (Railway detectará automáticamente `backend/Dockerfile.prod` o configúralo como `Dockerfile.prod`).
   - Ve a **Variables**:
     ```env
     APP_NAME=TurnosFlow
     APP_ENV=production
     APP_DEBUG=false
     APP_URL=https://api.turnosflow.com
     APP_TIMEZONE=America/Argentina/Buenos_Aires
     APP_KEY=base64:COPIA_EL_APP_KEY_DE_TU_ENV_LOCAL

     DB_CONNECTION=pgsql
     DB_HOST=${{Postgres.PGHOST}}
     DB_PORT=${{Postgres.PGPORT}}
     DB_DATABASE=${{Postgres.PGDATABASE}}
     DB_USERNAME=${{Postgres.PGUSER}}
     DB_PASSWORD=${{Postgres.PGPASSWORD}}

     REDIS_HOST=${{Redis.REDISHOST}}
     REDIS_PORT=${{Redis.REDISPORT}}
     REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
     QUEUE_CONNECTION=redis
     SESSION_DRIVER=redis
     CACHE_STORE=redis
     SESSION_DOMAIN=.turnosflow.com
     SESSION_SECURE_COOKIE=true

     FRONTEND_URL=https://turnosflow.com

     EVOLUTION_API_URL=https://evolution-prod.up.railway.app
     EVOLUTION_API_KEY=tu_token_super_secreto_whatsapp
     EVOLUTION_API_INSTANCE=turnos
     ```
   - Ve a **Settings** -> **Public Networking**:
     - Genera un dominio temporal (`...up.railway.app`) o agrega tu Custom Domain `api.turnosflow.com`.

---

### Paso 2.4: Agregar Evolution API (WhatsApp)
1. Clic en **"+ New"** -> **"Docker Image"**.
2. En la barra de búsqueda escribe:
   ```text
   evoapicloud/evolution-api:v2.1.2
   ```
   *(o `evoapicloud/evolution-api:latest`)*.
3. Renombra el servicio a `evolution-api`.
4. Ve a **Settings** -> **Public Networking**:
   - Genera un dominio público (ej: `evolution-xxxx.up.railway.app`).
5. Ve a **Variables** y agrega:
   ```env
   SERVER_URL=https://TU_DOMINIO_EVOLUTION.up.railway.app
   AUTHENTICATION_API_KEY=tu_token_super_secreto_whatsapp
   CONFIG_SESSION_PHONE_CLIENT=Ubuntu
   CONFIG_SESSION_PHONE_NAME=Chrome
   DATABASE_PROVIDER=postgresql
   DATABASE_CONNECTION_URI=${{Postgres.DATABASE_URL}}?schema=evolution_api
   DATABASE_CONNECTION_CLIENT_NAME=evolution_api
   DATABASE_SAVE_DATA_INSTANCE=true
   DATABASE_SAVE_DATA_NEW_MESSAGE=true
   DATABASE_SAVE_DATA_CHATS=false
   DATABASE_SAVE_DATA_CONTACTS=false
   DATABASE_SAVE_DATA_HISTORIC=false
   DATABASE_SAVE_DATA_LABELS=false
   CACHE_REDIS_ENABLED=false
   CACHE_LOCAL_ENABLED=true
   DEL_INSTANCE=false
   ```
   > **Nota sobre la sesión de WhatsApp:** Al usar la base PostgreSQL (`?schema=evolution_api`), el QR y la sesión quedan grabados en la base de datos de Railway. Si el contenedor se reinicia o actualiza, la conexión de WhatsApp **no se desvincula**.

---

### Paso 2.5: Configurar el Servicio `frontend` (Next.js)
1. Clic en **"+ New"** -> **"GitHub Repo"** -> `nicolasdovico/turnos`.
2. Renombra el servicio a `frontend`.
3. Ve a **Settings**:
   - **Root Directory:** `/frontend`
   - **DockerfilePath:** `Dockerfile.prod`
4. Ve a **Variables**:
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://api.turnosflow.com/api
   PORT=3000
   HOSTNAME=0.0.0.0
   ```
   *(Si aún no apuntaste `api.turnosflow.com`, usa la URL de Railway del backend: `https://backend-xxxx.up.railway.app/api`)*.
5. Ve a **Settings** -> **Public Networking**:
   - Haz clic en **"Custom Domain"** y agrega:
     - `turnosflow.com`
     - `www.turnosflow.com`
     - `*.turnosflow.com`

---

### Paso 2.6: *(Opcional)* Queue Worker & Tareas Programadas
Para que los mensajes automáticos de WhatsApp y el control de facturas corran en segundo plano:
1. Clic en **"+ New"** -> **"GitHub Repo"** -> `nicolasdovico/turnos`.
2. Renombra el servicio a `queue-worker`.
3. En **Settings**:
   - **Root Directory:** `/backend`
   - **DockerfilePath:** `Dockerfile.prod`
   - **Deploy Command / Start Command:** `php artisan queue:work --tries=3 --timeout=90`
4. Comparte las mismas variables que el `backend`.

---

## 3. Configuración de Dominio y DNS (Namecheap & Cloudflare)

Para que los subdominios dinámicos (`padelnico.turnosflow.com`, `greenpadel.turnosflow.com`, etc.) tengan certificado SSL automático sin errores:

### Opción A (Recomendada con Cloudflare Free - SSL Wildcard Instantáneo):
1. Crea una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/) y agrega el sitio `turnosflow.com`.
2. En Namecheap, cambia los **Nameservers** por los que te indique Cloudflare.
3. En el panel DNS de Cloudflare agrega estos registros apuntando al CNAME que te dio Railway en el Frontend:
   - **CNAME** `@` -> `frontend-production-xxxx.up.railway.app` (Proxy: Nube Naranja ON)
   - **CNAME** `www` -> `frontend-production-xxxx.up.railway.app` (Proxy: Nube Naranja ON)
   - **CNAME** `*` -> `frontend-production-xxxx.up.railway.app` (Proxy: Nube Naranja ON)
   - **CNAME** `api` -> `backend-production-xxxx.up.railway.app` (Proxy: Nube Naranja ON)

### Opción B (Directo en Namecheap Advanced DNS):
Si prefieres no usar Cloudflare:
1. En Namecheap ve a **Domain List** -> Clic en **Manage** junto a `turnosflow.com`.
2. Ve a la pestaña **Advanced DNS** -> **Host Records**:
   - **Type:** `CNAME Record` | **Host:** `@` | **Value:** `frontend-production-xxxx.up.railway.app`
   - **Type:** `CNAME Record` | **Host:** `www` | **Value:** `frontend-production-xxxx.up.railway.app`
   - **Type:** `CNAME Record` | **Host:** `*` | **Value:** `frontend-production-xxxx.up.railway.app`
   - **Type:** `CNAME Record` | **Host:** `api` | **Value:** `backend-production-xxxx.up.railway.app`

---

## 4. Inicialización de la Base de Datos (Primer Deploy)

Cuando Railway levante el backend por primera vez, el script `backend/docker/entrypoint.prod.sh` ejecutará automáticamente:
```bash
php artisan migrate --force
```

Si deseas cargar datos iniciales (superadmin, planes y tipos de negocio):
1. En Railway, abre la tarjeta de `backend`.
2. Ve a la pestaña **Deployments** -> abre el despliegue activo -> clic en **View Logs** o pestaña **Console**.
3. En la consola web de Railway ejecuta:
   ```bash
   php artisan db:seed --force
   ```

---

## 5. Resumen de Archivos Creados en el Repositorio
- `backend/Dockerfile.prod`: Imagen optimizada con PHP 8.3, OPcache, Caddy y Composer para producción.
- `backend/docker/Caddyfile.prod`: Servidor web ligero embebido que atiende en `$PORT`.
- `backend/docker/entrypoint.prod.sh`: Script de arranque automático con migraciones y cache.
- `backend/railway.json`: Reglas de build y healthchecks para Railway.
- `frontend/Dockerfile.prod`: Build multi-etapa Next.js (`standalone`).
- `frontend/railway.json`: Reglas de build para Next.js.
