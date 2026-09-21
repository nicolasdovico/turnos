# Estado del Proyecto y Checklist de Tareas (status.md)

> **Estado del Proyecto:** `🎉 ¡TODAS LAS TAREAS COMPLETADAS AL 100%! PROYECTO LISTO PARA PRODUCCIÓN`

---

## 📋 Resumen de Progreso
- **Tareas Completadas:** 22 / 22 (100% de los 8 Bloques Completados con Éxito) + Módulos de Expansión (Facturación B2B & Comisiones de Marketplace, Pasarelas de Pago Multimoneda Mercado Pago / Stripe / Transferencia Bancaria, Período de Gracia de 7 días, WhatsApp, Google Auth SSO, Geolocalización B2C, Pricing Híbrido, Tarifas Dinámicas Pico/Valle, Protocolo de Cancelación por Lluvia, Hardening Contable/Caja, CRM / Directorio de Clientes del Club y Visibilidad de Contraseña en Checkout Online)
- **Fase Actual:** Proyecto SaaS Finalizado & Certificado para Producción (Facturación B2B y comisiones de marketplace con pasarelas Mercado Pago en ARS, Stripe en USD y transferencia bancaria, período de gracia de 7 días con banner persistente, visibilidad de contraseña con toggle de ojo en checkout de reservas online, Padrón y Directorio de Clientes del Club con Ficha 360°, validación numérica y WhatsApp en contactos y DNI, protocolo meteorológico por lluvia con vales tokenizados, reembolsos en billetera, tarifas dinámicas pico/valle y control contable en arqueo diario)
- **Última Actualización:** 2026-09-21 (Corrección de error 'Failed to fetch' en pestaña 'Facturación & Abono' del panel de club: casteo estricto de días restantes en PHP 8.3 y resolución same-origin en Caddy. 430 tests automatizados en verde: 286 backend, 124 frontend, 20 mobile; 100% sin fallas ni regresiones).

---

## 🧱 Bloque 1: Infraestructura, Base & Multi-tenancy (Semanas 1-2)
- [x] **Tarea 1.1:** Docker Compose Multi-contenedor *(Completado)*
- [x] **Tarea 1.2:** Inicialización y Setup de Laravel 11 Backend *(Completado)*
- [x] **Tarea 1.3:** Esquema de Base de Datos para Multi-tenancy & Feature Flags *(Completado)*
- [x] **Tarea 1.4:** TenantScope Global y Middleware de Feature Flags *(Completado)*

---

## ⚽ Bloque 2: Motor de Reservas, Concurrencia & Agenda (Semanas 3-5)
- [x] **Tarea 2.1:** Modelos de Canchas, Horarios y Turnos *(Completado)*
- [x] **Tarea 2.2:** Algoritmo de Cálculo de Disponibilidad *(Completado)*
- [x] **Tarea 2.3:** Bloqueo Temporal Atómico con Redis (Anti Doble Reserva) *(Completado)*
- [x] **Tarea 2.4:** Confirmación Transaccional y Turnos Recurrentes (Fijos) *(Completado)*

---

## 🍔 Bloque 3: ERP de Club, POS / Buffet & Caja (Semanas 6-7)
- [x] **Tarea 3.1:** Punto de Venta (POS) & Inventario de Buffet *(Completado)*
- [x] **Tarea 3.2:** Arqueo y Control de Caja Diaria *(Completado)*

---

## 🌐 Bloque 4: Frontend Web Next.js & CMS Multitenant (Semanas 8-9)
- [x] **Tarea 4.1:** Setup de Next.js y Middleware de Subdominios *(Completado)*
- [x] **Tarea 4.2:** CMS Multitenant con ISR y Sanitización XSS *(Completado)*
- [x] **Tarea 4.3:** Grilla de Turnos Interactiva en Next.js (Admin & Público) *(Completado)*

---

## 🏆 Bloque 5: Comunidad, Split Payment & Torneos (Semanas 10-11)
- [x] **Tarea 5.1:** Partidos Abiertos (Matchmaking) y Pago Dividido (Split Payment) *(Completado)*
- [x] **Tarea 5.2:** Gestor de Torneos, Fixtures y Tablas de Posiciones *(Completado)*

---

## 📱 Bloque 6: Frontend Mobile con React Native (Semanas 12-13)
- [x] **Tarea 6.1:** Setup de React Native Expo & Autenticación Segura *(Completado)*
- [x] **Tarea 6.2:** Buscador por Geolocalización y Notificaciones Push *(Completado)*

---

## 💳 Bloque 7: Pagos, Assets S3, IoT & Hardening (Semanas 14-15)
- [x] **Tarea 7.1:** Pasarelas de Pago (Mercado Pago / Stripe Webhooks) *(Completado)*
- [x] **Tarea 7.2:** Subida de Imágenes a S3 con Presigned URLs *(Completado)*
- [x] **Tarea 7.3:** Módulo de Domótica IoT (Control Automático de Luces) *(Completado)*

---

## 🚀 Bloque 8: QA Final, CI/CD & Despliegue (Semana 16)
- [x] **Tarea 8.1:** GitHub Actions CI/CD Pipeline *(Completado)*
- [x] **Tarea 8.2:** Tests de Carga y Estrés de Concurrencia (k6) *(Completado)*

---

## 🗺️ Módulos de Expansión & Nuevas Funcionalidades
- [x] **Módulo WhatsApp:** Recordatorios preventivos con Evolution API y Daemon Scheduler *(Completado)*
- [x] **Módulo Google Auth:** Single Sign-On con Google OAuth 2.0 y soporte multi-inquilino *(Completado)*
- [x] **Módulo Geolocalización & Marketplace B2C:** Coordenadas GPS en `/panel`, botón público "Cómo llegar", links en WhatsApp y buscador de canchas `jugar.turnos.com` con Feature Flag *(Completado)*
- [x] **Módulo Pricing Híbrido & Cupo de Canchas:** Planes Bronce ($29, 2 canchas), Plata ($59, 4 canchas) y Oro ($99, 6 canchas) con gestión visual en Filament (`/admin/plans`), validación de cupo y confirmación de adicionales (+$8, +$10, +$12/mes) en `/panel`, simulador interactivo de presupuesto en `/planes` y desglose dinámico en `/registro-club` *(Completado)*
- [x] **Unificación de Navegación & Sincronización Landing:** Eliminación de sub-barra duplicada en homepage, barra superior global unificada (`/`, `/#funcionalidades`, `/planes`), sincronización del componente de pricing en landing con cupos base, canchas extras, 14 días de prueba y enlace al simulador interactivo *(Completado)*
- [x] **Showcase de Funcionalidades Auto-rotativo & Interactivo:** Rotación automática cada 6 segundos con barra de progreso visual, pausa inteligente al posar el cursor (`onMouseEnter`), soporte de navegación manual por click en cualquier oblea y botones de control (Anterior, Siguiente, Pausa/Play) *(Completado)*
- [x] **Propuesta de Valor Institucional en Hero Section:** Nuevo titular aspiracional ("La plataforma integral que transforma tu complejo en un club de primer nivel") y subtítulo integrador que abarca reservas, cobros, cantina POS, caja diaria, torneos y luces IoT con web propia *(Completado)*
- [x] **Módulo de Tarifas Dinámicas (Pico/Valle) y Luz Artificial Desacoplada:** Configuración flexible por cancha de tarifas diferenciadas para horarios pico y fines de semana (`tarifa_pico`, días y horarios), recargo desacoplado de iluminación artificial nocturna (`precio_luz_adicional`), cálculo dinámico en `DisponibilidadService`, sincronización con modales en `/panel` y badges explicativos en Grilla Horaria *(Completado)*
- [x] **Protocolo de Cancelación Masiva por Lluvia & Vales Tokenizados (Rain Check):** Modal operativo en `/panel` con filtro de horario de inicio, selección de canchas (con preselección inteligente de canchas descubiertas) y bloqueo preventivo de grilla; reembolsos inmediatos a billetera virtual para usuarios registrados y emisión de vales digitales tokenizados con UUID seguro (`ValeCredito`) con notificación WhatsApp y portal público `/vales/[token]` para clientes no registrados o de mostrador *(Completado)*
- [x] **Hardening Contable, Control de Caja & Grilla Operativa ante Contingencias Meteorológicas:** Exclusión de turnos cancelados o bloqueados por lluvia del cálculo de deudas y facturación en `ClubReporteService` (saldos en $0 y remoción de botones de cobro/recordatorio), nuevas métricas KPI (`total_reembolsos_lluvia`, billetera y vales), desglose visual en `ResumenDiarioTurnos.tsx`, categorización explícita `"Cancelación por Lluvia"` y `"Canje Vale de Lluvia"` en `GestionBilleteras.tsx`, prevención de duplicados y acción de desbloqueo de horarios en `GrillaHoraria.tsx` *(Completado)*
- [x] **Módulo de Directorio & CRM de Clientes del Club (Ficha 360° & Autocompletado):** Tabla multi-tenant `clientes` con backfill automático inteligente; endpoints CRUD y Ficha 360° en `ClubClienteController` (historial de turnos, billetera virtual, vales de crédito, notas privadas y bloqueo de clientes); nueva pestaña "👥 Clientes" en `/panel` con componente modular `GestionClientes.tsx`, KPIs, buscador en tiempo real y botón de chat directo a WhatsApp; autocompletado en vivo de clientes habituales y alertas de clientes bloqueados al reservar desde mostrador en `GrillaHoraria.tsx` *(Completado)*
- [x] **Diferenciación Temporal Estricta: Turnos Jugados vs. Turnos en Agenda (Ficha 360° & Directorio):** Desacople de turnos históricos pasados respecto a reservas recurrentes a futuro (turnos fijos de 6 meses). Corrección de falsos positivos donde fechas lejanas (ej. marzo de 2027) se mostraban como jugadas o como último turno; incorporación de desglose `✓ jugados` • `⏱ agenda` • `✗ cancelados`, columna bivalente `Próximo / Último Turno`, sub-filtros interactivos en Ficha 360° y etiquetas de pago auditadas (`Pago Pendiente`, `Señado`, `Pagado Total`, `Turno Fijo`) *(Completado)*
- [x] **Validación Numérica Estricta & WhatsApp Válido en Modal de Clientes:** Filtrado en tiempo real de caracteres no numéricos al escribir o pegar en los campos Teléfono y DNI en `GestionClientes.tsx`; validación estricta de formato telefónico E.164 (8 a 15 dígitos con prefijo `+` opcional) y DNI (6 a 12 dígitos); formateo automático internacional para enlaces directos `wa.me/549...` tanto en el listado como en la Ficha 360°; validación de backend reforzada en `ClubClienteController` y `ClubClienteService` con mensajes de error explícitos en español *(Completado)*
- [x] **Visibilidad de Contraseña (Toggle Ojo) en Checkout Online:** Botón interactivo de mostrar/ocultar contraseña con iconos Eye y EyeOff en `GrillaHoraria.tsx` tanto en la pestaña de registro rápido ("✨ Crear Cuenta Rápida") como en la de inicio de sesión ("🔑 Ya tengo Cuenta"), con padding adecuado (`pr-10`) para evitar solapamientos y reseteo preventivo al cerrar modal o cambiar de pestaña *(Completado)*

---

## 🧪 Guía de Pruebas Paso a Paso para Testers

### Caso de Prueba: Distinción de Turnos Pasados vs. Próximos en Agenda en Clientes con Turnos Fijos (ej. Fernando Belasteguin `bela@gmail.com`)
1. **Acceso al Panel de Administración:**
   - Iniciar sesión como administrador de club (ej. `padel-center` o club 113) y dirigirse a la pestaña **👥 Clientes** en `/panel`.
2. **Búsqueda del Cliente con Turnos Fijos:**
   - En la barra de búsqueda escribir `Bela` o `bela@gmail.com`.
3. **Verificación en la Tabla Principal de Clientes:**
   - **Columna Turnos:** Observar el número total de turnos (ej. 117) y el desglose en la parte inferior:
     - `✓ 12` en verde (turnos efectivamente jugados en el pasado).
     - `⏱ 100` en cyan (turnos futuros agendados en el calendario).
     - `✗ 5` en rojo (turnos cancelados).
     - Comprobar que la suma coincide exactamente: $12 + 100 + 5 = 117$.
   - **Columna Próximo / Último Turno:**
     - Comprobar que el badge cyan **Próx** muestra la fecha más próxima en el calendario (ej. `22/09/2026 • 12:00 hs (Cancha 1)`).
     - Comprobar que el badge slate **Jugado** muestra la fecha pasada más reciente (ej. `18/09/2026 • 22:00 hs (Cancha 2)`).
     - Verificar que **NUNCA** se muestra marzo de 2027 como último turno jugado.
4. **Verificación en la Ficha 360°:**
   - Hacer clic en el icono del ojo **Ver Ficha 360°** de Fernando Belasteguin.
   - En la pestaña **Resumen**:
     - La tarjeta **Total Turnos** exhibe el total con el subtítulo: `12 jugados • 100 agenda`.
     - La tarjeta **Asistencia** refleja la tasa real de cumplimiento sobre turnos pasados.
   - En la pestaña **Historial de Turnos**:
     - Hacer clic en el botón sub-filtro **En Agenda**: verificar que solo aparecen turnos futuros con el badge cyan `En Agenda`, el badge violeta `Turno Fijo` y estado de pago `Pago Pendiente` (ámbar) o `Señado` (azul cielo).
     - Hacer clic en el botón sub-filtro **Jugados**: verificar que solo aparecen turnos de fechas ya transcurridas con el badge `Jugado` (slate) y que el primero de la lista es el último jugado (18 de septiembre de 2026).
     - Comprobar que los turnos de marzo de 2027 figuran en **En Agenda** como turnos fijos pendientes y no como turnos ya utilizados.

### Caso de Prueba: Edición de Datos del Cliente desde la Ficha 360°
1. **Abrir Ficha 360°:**
   - Hacer clic en el botón **Ver Ficha 360°** de cualquier cliente.
2. **Acceder a la Edición:**
   - En el encabezado del modal 360°, hacer clic en el botón **Editar Datos**.
3. **Verificación Visual & Jerarquía:**
   - Comprobar que el modal de edición aparece **en primer plano por encima de la Ficha 360°**, con su propio fondo oscuro difuminado (`backdrop-blur`).
   - Los datos actuales del cliente aparecen precompletados en los campos (Nombre, Teléfono, Email, DNI, Notas, Estado).
4. **Guardado y Sincronización Inmediata:**
   - Modificar cualquier campo (por ejemplo, agregar una nota o cambiar el nombre) y hacer clic en **Guardar Cambios**.
   - Comprobar que el modal de edición se cierra, aparece la notificación toast verde `"Datos actualizados correctamente."`, y la Ficha 360° que estaba abajo queda visible con los datos ya actualizados sin necesidad de recargar la página.

### Caso de Prueba: Validación Numérica y de WhatsApp en Teléfono y DNI (Creación / Edición)
1. **Abrir Modal de Edición o Nuevo Cliente:**
   - En la pestaña **👥 Clientes**, presionar **Nuevo Cliente** o el botón del lápiz **Editar Datos** en cualquier fila.
2. **Verificación de Restricción al Tipear (Input Masking):**
   - En el campo **Teléfono / WhatsApp**, intentar escribir letras (ej. `hola-test`): verificar que **no se escribe ninguna letra**, únicamente números y el prefijo `+`.
   - En el campo **DNI / Documento**, intentar escribir letras o caracteres especiales: verificar que **solo admite dígitos numéricos** (0 al 9).
3. **Verificación de Validación de Longitud & WhatsApp Válido:**
   - Escribir un número incompleto o corto en Teléfono (ej. `12345`): al intentar guardar, el formulario rechaza el envío y muestra la alerta `"El teléfono / WhatsApp debe ser numérico y contener entre 8 y 15 dígitos (ej. 1144556677 o +5491144556677)."`.
   - Escribir un DNI con menos de 6 dígitos (ej. `123`): al intentar guardar, muestra `"El DNI debe ser numérico y contener entre 6 y 12 dígitos."`.
4. **Guardado Exitoso y Enlace Directo a WhatsApp:**
   - Ingresar un teléfono local de 10 dígitos (ej. `1149790220`): guardar los cambios.
   - Observar que el botón verde de WhatsApp en la tabla o en la Ficha 360° enlaza a `https://wa.me/5491149790220` (con código de país 549 preformateado para abrir directamente la conversación en WhatsApp sin error de destino).

### Caso de Prueba: Visibilidad de Contraseña (Toggle Ojo) en Checkout Online al Reservar un Turno
1. **Acceso a la Web Pública de un Club:**
   - Ingresar a cualquier club deportivo como visitante no logueado (ej. `http://nico-padel.localhost:8080/`).
2. **Selección de Cancha y Horario:**
   - Hacer clic sobre un slot de horario disponible y presionar el botón **Confirmar Reserva**.
3. **Pestaña de Registro Rápido ("✨ Crear Cuenta Rápida"):**
   - En el campo **Crear Contraseña (mínimo 6 caracteres)**, escribir una clave (ej. `miClave123`).
   - Comprobar que inicialmente los caracteres aparecen ocultos como puntos/bullets (`type="password"`).
   - Hacer clic en el icono del **ojo** ubicado a la derecha del input: verificar que la contraseña se vuelve legible en texto plano (`type="text"`), el icono cambia a `EyeOff` (ojo tachado) y el tooltip/aria-label pasa a "Ocultar contraseña".
   - Hacer clic nuevamente: verificar que la contraseña vuelve a ocultarse.
4. **Pestaña de Inicio de Sesión ("🔑 Ya tengo Cuenta"):**
   - Hacer clic en la pestaña **Ya tengo Cuenta**.
   - En el campo **Contraseña**, escribir una clave (ej. `passwordSegura`).
   - Hacer clic en el icono del **ojo**: verificar que se revela la contraseña escrita.
   - Hacer clic nuevamente para volver a ocultarla.
5. **Persistencia & Limpieza:**
   - Cerrar el modal mediante la '✕' o 'Volver' y volver a abrirlo: comprobar que el estado de visibilidad se reinicia por seguridad en modo oculto (`type="password"`).

### Caso de Prueba: Facturación B2B, Comisiones de Marketplace y Pasarelas de Pago de Clubes
1. **Atribución de Comisiones desde el Buscador Global (`jugar.turnos.com`):**
   - Ingresar a `http://jugar.localhost:8080/`.
   - Buscar un club y hacer clic en **Ver Canchas** o **Reservar Turno en Este Club**: verificar que la URL incluye el parámetro `?ref=marketplace`.
   - Completar la reserva del turno.
   - Comprobar en base de datos o API que el turno queda registrado con `origen = 'marketplace'`, el porcentaje de comisión del plan del club (ej. 5% para Bronce) y el monto de comisión retenida.
   - Comprobar que las reservas directas realizadas ingresando a `http://[subdominio].localhost:8080/` (sin `ref=marketplace`) registran `origen = 'directo'` con comisión $0.00.
2. **Pestaña "💳 Facturación & Abono" en el Panel de Administración del Club:**
   - Ingresar como dueño o administrador al panel del club: `http://[subdominio].localhost:8080/panel`.
   - Hacer clic en la pestaña **💳 Facturación & Abono**.
   - Verificar las 4 tarjetas de métricas en tiempo real:
     * **Abono Base**: Plan contratado, canchas incluidas y precio base mensual en USD.
     * **Canchas Extras**: Cantidad de canchas excedentes administradas y costo unitario ($8 USD c/u).
     * **Marketplace (jugar.)**: Cantidad de turnos captados por el buscador y total de comisiones acumuladas.
     * **Total Período**: Suma consolidada en USD y conversión automática a Pesos Argentinos (ARS) calculada según la cotización del dólar en tiempo real.
3. **Pasarela de Pagos Multimoneda & Opciones de Cobro:**
   - Presionar el botón **Pagar Abono**.
   - Verificar las 3 opciones de pago disponibles:
     * **Mercado Pago (ARS)**: Muestra el importe en pesos argentinos convertido al tipo de cambio. Al presionar "Pagar Ahora con Mercado Pago", genera la preferencia y abre el checkout oficial.
     * **Stripe (USD)**: Muestra el importe en dólares. Permite pagar con tarjeta internacional.
     * **Transferencia Bancaria**: Muestra el CBU (`0000003100010000000001`), Alias (`TURNOS.SAAS.PAGOS`), y el monto exacto en ARS. Permite ingresar la URL del comprobante y notas aclaratorias. Al enviar, la factura pasa a estado `en_revision` / `revision_transferencia`.
4. **Aprobación de Transferencias en Filament Super Admin:**
   - Ingresar a `http://localhost:8080/admin` como Superadmin.
   - En la sección **Facturación & Finanzas > Facturas de Clubes**, localizar la factura en revisión.
   - Hacer clic en la acción **Aprobar Pago**: la factura pasa a `pagada` y la suscripción del club se renueva automáticamente por 30 días.
5. **Período de Gracia de 7 Días y Banner Persistente:**
   - Cuando un abono vence su fecha límite, el club entra en período de gracia de 7 días (`suscripcion_estado = 'gracia'`).
   - En la parte superior de todas las vistas del panel de administración (`/panel`), aparece de forma persistente el banner de advertencia ámbar:
     * `"⚠️ Período de Gracia Activo: Tu abono mensual se encuentra vencido. Cuentas con un plazo de 7 días (quedan X días) para regularizar tu pago antes de que se restrinjan las funciones operativas."`
     * El botón **Regularizar Pago Ahora →** redirige directamente a la pestaña de facturación y abre las pasarelas de cobro.
   - Si transcurren los 7 días sin regularización, el estado transiciona a `vencida` y el banner se torna rojo de emergencia indicando la suspensión de funciones.
