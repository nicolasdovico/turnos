# Directivas Inmutables del Proyecto (RULES.md)

Este documento contiene las reglas arquitectónicas y técnicas inmutables para el desarrollo del **SaaS Deportivo Multitenant & CMS**. Antigravity CLI y cualquier desarrollador deben cumplir estrictamente estas directivas en cada tarea.

---

## 1. Stack Tecnológico Core

- **Backend:**
  - Laravel 11 sobre PHP 8.3 en modo API REST desacoplada (Headless).
  - Panel Administrativo Super Admin con Filament v3 (Livewire 3 / Blade) en `/admin`.
  - Autenticación mediante tokens Bearer con Laravel Sanctum.
  - Base de datos relacional (PostgreSQL 16) y transacciones ACID.
  - Caché, locks distribuidos y mensajería en Redis 7.
- **Frontend Web:**
  - Next.js 14+ (Node 22) con Tailwind CSS, TypeScript, SSR/ISR y Middleware de subdominios.
  - Arquitectura híbrida: SSR / ISR para páginas públicas y SEO; SPA interactiva para panel de administración.
  - Middleware de resolución y reescritura de subdominios y dominios personalizados.
- **Mobile:**
  - React Native (Expo) con TypeScript y Tailwind (NativeWind).
  - Almacenamiento seguro con `expo-secure-store`.
  - Notificaciones push nativas y geolocalización.

---

## 2. Multi-tenancy & Aislamiento de Datos

- **Estrategia:** Base de datos compartida con discriminador de inquilino `complejo_id`.
- **TenantScope Global:** Todo modelo tenant-aware debe implementar `TenantScope` inyectando `WHERE complejo_id = ?`.
- **Contexto del Tenant:** Middleware `TenantContextMiddleware` que resuelve el inquilino activo a partir del subdominio (`Host`) o cabecera `X-Tenant-ID`.

---

## 3. Permisos y Feature Flags (Entitlements)

- **Control Modular:** Control modular mediante middleware `tenant.has_module:slug` y roles RBAC.
  - Si el inquilino no tiene el módulo contratado o activo, la API debe responder `403 Forbidden` con `{ "error": "MODULE_NOT_ENABLED", "module": "slug" }`.
- **Roles y Permisos:** Super Administrador, Administrador / Dueño de Complejo, Operador de Mostrador, Profesor / Organizador, Cliente / Jugador.

---

## 4. Concurrencia y Consistencia Transaccional

- **Locks Atómicos en Redis:** Locks atómicos en Redis (TTL 10 min) para retención de turnos durante el checkout evitando doble reserva.
- **Transacciones ACID:** Transacciones ACID con `SELECT FOR UPDATE` para confirmación segura de reservas y operaciones críticas de caja/stock.

---

## 5. Metodología y Calidad de Código

- **TDD Obligatorio:** Ninguna tarea se considera terminada sin su test automatizado en verde.
- **Atomicidad:** Una tarea técnica a la vez siguiendo el ciclo: Estructura $\rightarrow$ Lógica de Negocio $\rightarrow$ Tests $\rightarrow$ Actualización de Memoria (`status.md`, `progress.txt`) $\rightarrow$ Commit.
