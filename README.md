# 🏆 SaaS Integral de Gestión Deportiva, CMS Multitenant & Marketplace

Plataforma integral multitenant para la administración de complejos deportivos (pádel, fútbol, tenis), reservas en tiempo real con prevención de doble reserva, punto de venta (POS) y buffet, control de caja diaria, constructor de páginas web (CMS) con revalidación estática y marketplace centralizado.

---

## 🚀 Stack Tecnológico

- **Backend:** [Laravel 11](https://laravel.com) sobre **PHP 8.3 FPM** en modo API REST desacoplada (Headless) con autenticación Bearer mediante **Laravel Sanctum**.
- **Base de Datos:** **PostgreSQL 16** con transacciones ACID y aislamiento multi-tenant estricto.
- **Caché y Concurrencia:** **Redis 7** para candados distribuidos atómicos (anti doble reserva) y caché.
- **Frontend Web:** [Next.js 14+](https://nextjs.org) (App Router, Node 22, TypeScript, Tailwind CSS) con middleware Edge para reescritura de subdominios y renderizado híbrido SSR/ISR.
- **Web Server & Proxy Inverso:** **Caddy 2** con ruteo directo FastCGI a PHP-FPM y proxy reverso al servidor Node.js.
- **Testing:** PHPUnit para Backend y Vitest + React Testing Library para Frontend.

---

## 🏛️ Principios de Arquitectura

1. **Aislamiento Multi-Tenancy:**
   - Base de datos compartida discriminada por `complejo_id`.
   - Global Scope de Eloquent (`TenantScope`) y Trait `BelongsToTenant` inyectan automáticamente `WHERE complejo_id = ?` en todas las consultas del inquilino.
   - Resolución automática de inquilino mediante cabecera `X-Tenant-ID` o subdominio en la cabecera `Host` (`TenantContextMiddleware`).

2. **Feature Flags & Control Modular:**
   - Los complejos tienen planes base (Bronce, Plata, Oro) y add-ons granulares (`complejo_modulo`).
   - Acceso restringido por middleware `tenant.has_module:slug` que responde `403 Forbidden` si el módulo no está contratado o está expirado.

3. **Concurrencia y Consistencia de Reservas:**
   - **Retención en checkout:** Candados atómicos en Redis (`SET turno:{cancha_id}:{fecha}:{hora} {token} EX 600 NX`) con TTL de 10 minutos para evitar colisiones.
   - **Confirmación final:** Transacciones ACID con bloqueo pesimista `SELECT FOR UPDATE` y liberación segura del candado mediante script Lua.

---

## 📦 Puesta en Marcha Rápida (Docker Compose)

### 1. Prerrequisitos
- Docker y Docker Compose instalados.

### 2. Levantar el entorno multi-contenedor
```bash
# Iniciar todos los servicios en segundo plano
docker compose up -d --build
```

### 3. Inicializar Base de Datos y Seeders
```bash
# Ejecutar migraciones y datos iniciales (Planes, Módulos y Tenant Demo)
docker compose exec backend php artisan migrate:fresh --seed
```

### 4. Verificar estado del entorno
```bash
# Ejecutar script automatizado de salud
./test-env.sh
```

---

## 🌐 Interfaces de Usuario y Navegación Web

El sistema utiliza detección y reescritura de subdominios en el Edge mediante Next.js Middleware:

| Entorno / Vista | URL Local | Descripción |
| :--- | :--- | :--- |
| **Panel Super Admin (Filament v3)** | `http://localhost/admin` | Panel de control administrativo global para gestionar Complejos, Planes, Módulos y Usuarios. |
| **Marketplace Global** | `http://localhost:3000/` o `http://localhost/` | Landing page principal para explorar complejos deportivos y registrar clubes. |
| **Club Demo (Home & Reservas)** | `http://padelpro.localhost:3000/` | Web oficial del club `padelpro` con la grilla horaria interactiva en vivo. |
| **Páginas CMS del Club** | `http://padelpro.localhost:3000/paginas/tarifas` | Páginas informativas personalizadas con renderizado ISR y sanitización XSS. |

---

## 🔌 Catálogo de Endpoints (API REST Backend)

### 🔗 URLs Base de Acceso al Backend
- **Acceso Directo / Global:** `http://localhost/api` *(servido por Caddy en el puerto 80 vía FastCGI a PHP-FPM)*
- **Acceso por Subdominio de Club (Tenant):** `http://padelpro.localhost/api` *(o cualquier `http://[subdomain].localhost/api`)*

> 💡 **Consumo Multi-Tenant:** Puedes especificar el club activo de dos formas equivalentes:
> 1. **Por subdominio en la URL:** `GET http://padelpro.localhost/api/canchas/1/disponibilidad?fecha=2026-08-30`
> 2. **Por cabecera HTTP:** `GET http://localhost/api/canchas/1/disponibilidad?fecha=2026-08-30` enviando el header `X-Tenant-ID: padelpro`

---

### 🏥 Diagnóstico & Salud
- `GET /api/health` — Verificación de conectividad a PostgreSQL y Redis.
  ```json
  // Respuesta (200 OK):
  {
    "status": "ok",
    "services": {
      "database": "connected",
      "redis": "connected"
    },
    "timestamp": "2026-08-28T13:40:48+00:00"
  }
  ```

### ⚽ Motor de Reservas (`modulo: reservas`)
- `GET /api/canchas/{id}/disponibilidad?fecha=YYYY-MM-DD` — Cálculo de slots libres (horarios, BD y Redis locks).
- `POST /api/turnos/bloquear-temporal` — Bloqueo atómico temporal en Redis (TTL 10 min).
  ```json
  {
    "cancha_id": 1,
    "fecha": "2026-08-30",
    "hora_inicio": "18:00",
    "hora_fin": "19:00"
  }
  ```
- `POST /api/turnos/confirmar` — Confirmación transaccional con `SELECT FOR UPDATE`.
- `POST /api/turnos/fijos` — Generación periódica en lote de turnos recurrentes (`modulo: turnos_fijos`).

### 👥 Pago Dividido & Partidos Abiertos (`modulo: split_payment`)
- `POST /api/turnos/{id}/split` — Fracciona el total de un turno en cuotas individuales con tokens y enlaces de checkout:
  ```json
  {
    "cuotas": 4,
    "es_partido_abierto": true,
    "nivel_min": "4ta",
    "nivel_max": "5ta",
    "organizador_nombre": "Carlos Perez"
  }
  ```
- `POST /api/split-pagos/{token}/pagar` — Paga una cuota individual y confirma automáticamente el turno al completarse el 100% de los pagos.
- `GET /api/split-pagos/{token}` — Consulta el detalle de una cuota de split payment.
- `GET /api/partidos-abiertos` — Listado de convocatorias abiertas para matchmaking.
- `POST /api/partidos-abiertos/{id}/unirse` — Permite a un jugador sumarse a un partido abierto tomando una cuota pendiente.

### 🏆 Torneos & Fixtures (`modulo: torneos`)
- `GET /api/torneos` — Listado de torneos del complejo.
- `POST /api/torneos` — Creación de nuevo torneo (eliminación directa, round-robin, categorías).
- `GET /api/torneos/{id}` — Detalle del torneo con equipos inscriptos.
- `POST /api/torneos/{id}/equipos` — Inscripción de equipos/parejas en el torneo.
- `POST /api/torneos/{id}/generar-fixture` — Generación de llaves y cuadro de eliminación directa.
- `GET /api/torneos/{id}/bracket` — Estructura visual del cuadro de llaves por rondas.
- `GET /api/torneos/{id}/tabla-posiciones` — Tabla de posiciones clasificada.
- `POST /api/torneos/partidos/{partidoId}/resultado` — Carga de scores con avance automático del ganador a la siguiente ronda.

### 🍔 POS Buffet & Inventario (`modulo: pos_buffet`)
- `GET /api/pos/productos` — Catálogo de productos con stock en tiempo real.
- `POST /api/pos/productos` — Alta de producto en inventario.
- `POST /api/pos/ventas` — Venta directa en mostrador con descuento automático de stock.
- `POST /api/turnos/{id}/consumos` — Carga de consumos/comandas a un turno abierto.

### 💵 Arqueo y Control de Caja Diaria
- `POST /api/caja/apertura` — Apertura de sesión de caja (valida sesión única por complejo).
- `POST /api/caja/cierre` — Cierre ciego de caja, cálculo de cobros POS/turnos y detección de diferencias (sobrantes/faltantes).
- `GET /api/caja/resumen-diario` — Resumen consolidado del día.

### 📝 CMS & Revalidación Web (`modulo: cms_web`)
- `GET /api/cms/paginas` y `GET /api/cms/paginas/{slug}` — Consulta de páginas institucionales.
- `POST /api/cms/paginas` / `PUT /api/cms/paginas/{id}` / `DELETE /api/cms/paginas/{id}` — CRUD de páginas con sanitización de contenido HTML.
- `POST /api/tenants/revalidate` — Webhook para purga perimetral de caché ISR en Next.js.

---

## 🧪 Ejecución de Tests Automatizados

El proyecto sigue una metodología estricta de **TDD (Test-Driven Development)**:

```bash
# 1. Tests del Backend (PHPUnit / Pest)
docker compose exec backend php artisan test

# 2. Tests del Frontend (Vitest & React Testing Library)
docker compose exec frontend npm test

# 3. Tests con cobertura en frontend
docker compose exec frontend npm run test:coverage
```

---

## 📁 Estructura del Proyecto

```text
├── backend/                # API REST Laravel 11 (PHP 8.3 FPM)
│   ├── app/
│   │   ├── Http/Controllers/Api/   # Controladores de la API
│   │   ├── Http/Middleware/        # Tenancy & Feature Flags Middleware
│   │   ├── Models/Scopes/          # TenantScope Global Scope
│   │   ├── Services/               # Lógica de Negocio (Disponibilidad, POS, Caja, CMS)
│   │   └── Traits/                 # BelongsToTenant Trait
│   └── tests/                      # Tests Unitarios y de Integración (PHPUnit)
├── frontend/               # Aplicación Next.js 14+ (Node 22)
│   ├── app/
│   │   ├── portal/                 # Portal Global / Marketplace
│   │   └── tenants/[subdomain]/    # Vistas dinámicas por Club / Inquilino
│   ├── components/                 # Componentes interactivos (GrillaHoraria, Toasts)
│   ├── middleware.ts               # Ruteo en el Edge por Subdominio / Dominio
│   └── tests/                      # Tests de componentes y middleware (Vitest / RTL)
├── caddy/                  # Configuración de Caddy Webserver & Reverse Proxy
├── docker-compose.yml      # Orquestación de contenedores
├── RULES.md                # Directivas inmutables de desarrollo
├── status.md               # Checklist y estado actual de tareas
└── progress.txt            # Bitácora cronológica técnica
```

---

## 📄 Licencia y Memoria del Proyecto

Para conocer el estado exacto de avance, consulta [`status.md`](status.md) y [`progress.txt`](progress.txt). Las directivas de desarrollo están documentadas en [`RULES.md`](RULES.md).
