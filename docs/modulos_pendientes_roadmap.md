# Módulos y Funcionalidades Pendientes de Desarrollo

> **Documento de Referencia y Roadmap Técnico**  
> **Fecha de creación:** 18 de Noviembre de 2026  
> **Proyecto:** SaaS Deportivo Multitenant & CMS (Turnos Flow)

---

## 📋 Resumen General

| Módulo / Funcionalidad | Plan Mínimo | Estado Actual | Alcance del Trabajo a Desarrollar |
| :--- | :--- | :--- | :--- |
| **🏆 Gestor de Torneos & Fixtures** | Oro | Backend 100% listo en Laravel | Pantalla interactiva en Panel (`GestionTorneos.tsx`), llaves de playoffs (bracket), inscripción de equipos y tabla pública |
| **💳 Turnos Abiertos & Split Payment** | Plata | ✅ Producción (100% Completo) | Pantalla en Panel (`GestionPartidosAbiertos.tsx`), checkout público (`/split-pagos/[token]`), sección web comunitaria y links WhatsApp |
| **💡 Automatización de Luces IoT & Domótica** | Oro | Backend 100% listo en Laravel | Pantalla en Panel (`GestionDomotica.tsx`), vinculación de relés a canchas, tiempos de gracia y botonera manual de encendido |
| **⏱️ Grilla Elástica & Turnos Espontáneos** | Todos | Especificado en `docs/` | Algoritmo anti-baches con granularidad a 30 min en `DisponibilidadService` y botón de "Turno Ahora / En el Acto" en mostrador |
| **💰 Pasarelas de Cobro Descentralizadas (B2C)** | Todos | En Roadmap | Pantalla de configuración para que cada club ingrese sus propias API keys de Mercado Pago, Stripe y CBU/Alias bancario directo |
| **📱 Instancia Propia de WhatsApp (Multi-sesión)** | Todos | En Roadmap | Generación dinámica de instancias en Evolution API y pantalla con Código QR para que el club vincule el celular de recepción |
| **🎓 Academia, Profesores & Clases Deportivas** | Plata / Oro | Propuesta Conceptual (A definir) | Padrón de profesores, clases individuales/grupales, gestión de alumnos, cobro de aranceles y liquidación/comisión de cancha |

---

## 🔍 Detalle Técnico por Módulo

### 1. 🏆 Gestor de Torneos, Fixtures & Tablas de Posiciones (`torneos`)
- **Estado:** Backend completo en Laravel (Modelos `Torneo`, `EquipoTorneo`, `PartidoTorneo`, servicio `TorneoFixtureService`, endpoints en `TorneoController` y tests unitarios y de integración).
- **Pendiente en Frontend Web (Next.js):**
  - Crear componente `frontend/components/GestionTorneos.tsx` e integrarlo en la solapa `"torneos"` de `app/tenants/[subdomain]/panel/page.tsx`.
  - Formulario de alta de torneo: nombre, deporte, categoría, formato (eliminación directa / todos contra todos), precio de inscripción y cupo máximo de parejas/equipos.
  - Listado de torneos activos, en progreso y finalizados.
  - Gestión de inscripciones: alta de parejas (Jugador 1, Jugador 2, Teléfono, Capitán) con validación de cupo.
  - Generador visual de cuadro de llaves (Bracket interactivo estilo playoffs) mostrando cruces de 8vos, 4tos, semifinales y final.
  - Carga rápida de resultados por partido (sets/games) con avance automático del equipo ganador a la siguiente fase del árbol.
  - Tabla de posiciones automática (partidos jugados, ganados, sets a favor/contra, puntos).
  - Activar el estado en `frontend/lib/modulesRegistry.ts` a `"produccion"`.

---

### 2. 💳 Partidos Abiertos & Split Payment (`split_payment`)
- **Estado:** ✅ Completado al 100% (Backend & Frontend en Producción).
- **Alcance Desarrollado:**
  - Componente de administración `GestionPartidosAbiertos.tsx` con KPIs en vivo, buscador y modal de creación/fraccionamiento.
  - Pestaña `"partidos-abiertos"` en el panel del club con candado de upgrade `🔒 Plata` en planes no contratados.
  - Checkout individual responsive en `/split-pagos/[token]` con opción de pago por Mercado Pago y registro de cobro en mostrador.
  - Sección comunitaria dinámica `PartidosAbiertosSection.tsx` en la web pública del club (`[subdominio].turnosflow.com`).
  - Botones de acción directa con links personalizados para enviar por WhatsApp.
  - Endpoints backend en `SplitPaymentController` (`POST /api/partidos-abiertos/{id}/cancelar`, `GET /api/turnos-para-split`).
  - Activado a `"produccion"` en `frontend/lib/modulesRegistry.ts` y suites de tests automatizados (PHPUnit y Vitest) en verde.

---

### 3. 💡 Automatización de Luces IoT & Domótica (`domotica`)
- **Estado:** Backend completo en Laravel (Modelo `DispositivoIoT`, servicio `IoTControlService`, comando scheduler `iot:sincronizar-luces` ejecutándose cada minuto y endpoints de control).
- **Pendiente en Frontend Web (Next.js):**
  - Crear componente `frontend/components/GestionDomotica.tsx` en el panel del club.
  - Listado de dispositivos vinculados con estado de conexión en vivo (Encendido / Apagado / Error / Offline).
  - Formulario para asociar un relé / switch IP o MQTT (Sonoff, Shelly, Tasmota, Tuya) a una cancha determinada.
  - Configuración de márgenes temporales por cancha: minutos de antelación para el encendido previo al turno (default 5 min) y minutos de gracia antes del apagado posterior (default 5 min).
  - Botonera manual interactiva de recepción: interruptor *"Forzar Encendido"* / *"Apagar Ahora"* para mantenimiento o eventos especiales.
  - Activar el estado en `frontend/lib/modulesRegistry.ts` a `"produccion"`.

---

### 4. ⏱️ Grilla Elástica & Turnos Espontáneos en Mostrador (Anti-Baches)
- **Referencia:** `docs/implementar_grilla_elastica.md`
- **Problema actual:** Bloques fijos de 90 minutos calculados desde la apertura (ej: 15:30, 17:00, 18:30, 20:00). Si a las 18:45 la cancha está vacía y llegan jugadores a jugar a las 19:00, el sistema oculta las 18:30 por ser pasado y obliga a esperar hasta las 20:00, perdiendo 1h 15m de facturación.
- **Pendiente de desarrollo:**
  - En `DisponibilidadService.php`: evaluar la generación de slots intermedios con granularidad de 30 minutos sin colisionar con reservas existentes.
  - Algoritmo *Anti-Baches* (Gap Prevention): prohibir slots intermedios que dejen huecos muertos menores a la duración mínima de un turno antes de otra reserva o del horario de cierre.
  - En el panel del club: botón de acción rápida *"Nuevo Turno Ahora / Espontáneo"* para iniciar una reserva inmediata en una cancha libre.

---

### 5. 💰 Pasarelas de Cobro B2C Propias por Club (Descentralizado)
- **Problema actual:** Las pasarelas de pago del checkout online y transferencias están configuradas de forma centralizada en la plataforma.
- **Pendiente de desarrollo:**
  - Nueva sub-pestaña en el panel: *"Métodos de Cobro del Club"*.
  - Configuración de credenciales de Mercado Pago (Access Token / Public Key o vinculación OAuth).
  - Configuración de credenciales de Stripe (Publishable Key / Secret Key).
  - CBU, CVU, Alias bancario y Banco propio del club para que las transferencias bancarias de las señas vayan directo a su cuenta.
  - El motor de reservas direccionará el checkout a las credenciales del club activo (`complejo_id`).

---

### 6. 📱 Instancia Propia de WhatsApp por Club (Multi-sesión con Código QR)
- **Problema actual:** Los recordatorios se envían a través de la instancia global `turnos` de la plataforma SaaS.
- **Pendiente de desarrollo:**
  - En `WhatsAppEvolutionService`: soporte para instanciar dinámicamente nombres de instancia por club (`club_{subdominio}`).
  - En el panel del club: pantalla *"Vincular WhatsApp de Recepción"* con generación y refresco en vivo de código QR.
  - Detección de estado de conexión (`open`, `close`, `connecting`).
  - Los recordatorios automáticos de turnos, confirmaciones y cancelaciones por lluvia se despachan desde el número y avatar oficial del propio club.

---

### 7. 🎓 Academia, Gestión de Profesores & Alumnos (Módulo de Clases)
- **Objetivo y Visión:**  
  Permitir que los clubes gestionen de forma ordenada una de sus mayores fuentes de ingresos y fidelización: **las clases de pádel, tenis, fútbol o entrenamiento funcional**.
- **Utilidad Concreta para las 3 Partes Interesadas:**
  1. **Para el Club / Administrador:**
     - **Control de Canchas Ocupadas por Clases:** Bloqueo diferenciado de turnos en la grilla horaria con etiqueta especial (ej: `Clase con Profe Martín`), evitando que se mezclen o confundan con alquileres de clientes comunes.
     - **Liquidación Automática de Cancha vs. Honorarios del Profe:** Definición del acuerdo económico entre el club y el profesor:
       - *Modelo A (Cancha Fija):* El profe le paga al club un valor fijo por hora de cancha (ej: $4.000/hora) y cobra libremente a sus alumnos.
       - *Modelo B (Comisión / Porcentaje):* El club cobra la clase completa (ej: $15.000) y le liquida un porcentaje al profesor (ej: 70% para el profe, 30% para el club).
       - *Modelo C (Sueldo / Abono):* El club es quien cobra los aranceles mensuales de la escuelita.
     - **Reporte de Liquidación:** Un click para saber cuánto se le debe pagar o cobrar a cada profesor a fin de mes o por semana.
  2. **Para el Profesor:**
     - **Rol de Usuario "Profesor":** Acceso restringido a su propia agenda en el panel o desde el móvil para ver únicamente sus turnos y sus alumnos asignados (sin acceso a la caja general del club ni a las demás canchas).
     - **Gestión de Alumnos y Asistencia:** Registro de presentes/ausentes y notas técnicas de evolución de cada alumno.
     - **Clases Grupales e Individuales:** Configuración de cupos (ej: clase individual 1 alumno vs. escuelita grupal hasta 4 alumnos).
  3. **Para los Alumnos / Jugadores:**
     - **Reserva e Inscripción a Clases Online:** Posibilidad de ver la oferta de clases, niveles (Principiante, Intermedio, Avanzado) y perfiles de los profesores desde la web pública del club.
     - **Packs de Clases / Abonos Mensuales:** Venta de paquetes de clases (ej: *"Pack 4 clases al mes"*) descontables automáticamente de la billetera o cuenta del alumno.
- **Puntos de Implementación a Pensar y Definir:**
  - Modelo de datos: `profesores`, `clases`, `clase_alumnos`, `liquidaciones_profesores`.
  - Integración con la grilla horaria: color o badge distintivo para no colisionar con reservas de partidos.
  - Notificaciones WhatsApp automáticas: recordatorio de clase al alumno y aviso al profesor ante cancelaciones.

