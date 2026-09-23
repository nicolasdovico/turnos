# Estado del Proyecto y Checklist de Tareas (status.md)

> **Estado del Proyecto:** `🎉 ¡TODAS LAS TAREAS COMPLETADAS AL 100%! PROYECTO LISTO PARA PRODUCCIÓN`

---

## 📋 Resumen de Progreso
- **Tareas Completadas:** 23 / 23 (100% de los 8 Bloques Completados con Éxito) + Módulos de Expansión (Gestor de Páginas Institucionales CMS con Estilos Tipográficos Semánticos para Tags HTML H1-H6 / UL / OL / LI / Blockquote, Reutilización Inteligente de Slugs en Plantillas Rápidas, Revalidación ISR en Tiempo Real y Normalización Same-Origin, Icono y Enlace a Canal de YouTube en Pie de Página, Calibración Visual y Luminosidad de Portada en Plantillas Web Públicas, Subida y Previsualización de Logotipo y Portada Web, Gestión Dinámica de Deportes, Superficies y Atributos de Cancha, Facturación B2B & Comisiones de Marketplace, Pasarelas de Pago Multimoneda Mercado Pago / Stripe / Transferencia Bancaria, Período de Gracia de 7 días, WhatsApp, Google Auth SSO, Geolocalización B2C, Pricing Híbrido, Tarifas Dinámicas Pico/Valle, Protocolo de Cancelación por Lluvia, Hardening Contable/Caja, CRM / Directorio de Clientes del Club, Visibilidad de Contraseña en Checkout Online, Creación de Canchas Adicionales con Confirmación de Cupo, Conversión Precisa ARS/USD en Comisiones de Marketplace, y Suspensión Automática de Reservas por Abono Vencido con Levantamiento Reactivo por Pago)
- **Fase Actual:** Proyecto SaaS Finalizado & Certificado para Producción (Gestión, creación y publicación de páginas institucionales CMS con renderizado tipográfico semántico de tags HTML h1-h6, listas ul/ol con viñetas y sangría, citas blockquote, negritas strong y tablas; plantillas rápidas enriquecidas, binding automático de páginas existentes para evitar errores de slug duplicado y renderizado dinámico en tiempo real sin retención de caché obsoleta; icono y enlace a YouTube en el footer del club; banner de portada luminoso y nítido con colores vivos en todas las plantillas web públicas; subida directa y previsualización en tiempo real de Logotipo y Portada del club; gestión dinámica de deportes, superficies y atributos/equipamientos de canchas; suspensión de reservas online y marketplace por abono vencido con reactivación inmediata por acreditación de pago; buscador manual con geocodificación OSM Nominatim; alta de canchas excedentes con alerta interactiva; facturación B2B y comisiones de marketplace; período de gracia de 7 días; visibilidad de contraseña en checkout online; Padrón y Ficha 360° de Clientes; protocolo por lluvia y tarifas dinámicas)
- **Última Actualización:** 2026-09-23 (Incorporación de reglas tipográficas semánticas .prose en globals.css para renderizar encabezados h1-h6, listas con viñetas/números, sangrías y blockquotes en la web pública y en el modal de previsualización. 494 tests automatizados en verde: 309 backend, 165 frontend, 20 mobile; 100% sin fallas ni regresiones).

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
- [x] **Creación de Canchas Adicionales con Confirmación Interactiva de Cupo & Alerta de Abono:** Detección en backend (`ClubDashboardController::storeCancha`) del exceso de canchas base del plan devolviendo HTTP 422 con código `REQUIRES_EXTRA_COURT_CONFIRMATION`, payload estructurado y cálculo de nuevo costo mensual (`calcularCostoTotal`); corrección en frontend (`panel/page.tsx`) de la lectura del payload de confirmación, desplegando inmediatamente el banner interactivo `"⚠️ Cupo Base de Canchas Alcanzado"` con desglose de canchas incluidas, registradas, costo adicional por mes y nuevo total estimado; botón `"Confirmar y Agregar Cancha Extra"` que envía `acepta_cargo_adicional: true` con autenticación segura y notificación toast informativa al dar de alta la cancha *(Completado)*
- [x] **Suspensión Automática de Reservas por Abono Vencido & Levantamiento Reactivo por Pago:** Detección de suspensión (`suscripcionValida === false` cuando `suscripcion_estado === 'vencida'`) con rechazo HTTP 403 `SUBSCRIPTION_SUSPENDED` en bloqueo temporal (`TurnoBloqueoController`) y confirmación de turnos (`TurnoConfirmarController`); bloqueo de alta de canchas y turnos fijos en `ClubDashboardController`; exclusión automática de clubes con abono vencido del buscador espacial en `GeolocationService`; banner interactivo de suspensión en `GrillaHoraria.tsx`; y levantamiento automático e inmediato de todos los bloqueos al registrarse el pago de la suscripción (Mercado Pago, Stripe, o Aprobación de Transferencia en Filament) restaurando el estado a 'activa' *(Completado)*
- [x] **Acreditación Inmediata de Pago por Transferencia Bancaria y Cierre Automático del Modal de Pago:** Corrección en `ClubFacturacionController::subirComprobanteTransferencia` para ejecutar de inmediato `procesarPagoAprobado($factura, 'transferencia')` al registrar el comprobante de transferencia bancaria, transicionando la factura a `pagada`, reactivando el club (`suscripcion_estado = 'activa'`), extendiendo 30 días la vigencia y levantando todas las restricciones operativas; corrección en `FacturacionClubPanel.tsx` cerrando automáticamente el modal tras 1000ms con feedback de éxito, refrescando silenciosamente la facturación y notificando al panel principal (`onRefreshSummary()`) *(Completado)*
- [x] **Gestión Dinámica de Deportes, Superficies y Atributos de Canchas (Modelo Híbrido Superadmin / Club):** Catálogo central administrable desde Filament Superadmin (`/admin`) con recursos `DeporteResource`, `SuperficieResource` y `EquipamientoResource`; consumo dinámico en el panel del club (`/panel`) en la creación y edición de canchas; capacidad de los clubes para agregar y eliminar atributos propios/exclusivos de su club (`POST/DELETE /api/clubs/{subdomain}/equipamientos`) aislados con multi-tenancy (`complejo_id`); sincronización bidireccional con campos legacy (`techada`, `iluminacion`, `precio_con_luz`, `camara_grabacion`, `marcador_digital`, `climatizada`); persistencia de relaciones `deporte_id`, `superficie_id` y `equipamientos_ids`; y renderizado de badges con atributos personalizados en las tarjetas de canchas *(Completado)*
- [x] **Subida y Previsualización en Vivo de Logotipo y Portada Web:** Corrección de la validación en backend (`ClubBrandingController::upload`) para admitir representaciones booleanas de FormData (`'1'`, `'true'`); previsualización optimista instantánea en tarjetas y en el Mockup de previsualización en vivo (`mockup-portada-preview` y `mockup-logo-preview`); renderizado del banner panorámico de portada y del logotipo en las tres plantillas públicas (`BookingDirectTemplate`, `ModernShowcaseTemplate` e `InstitucionalTemplate`); ruteo Caddy de `/storage*`; y botones interactivos de Quitar imagen con actualización de estado *(Completado)*

---

## 🧪 Guía de Pruebas Paso a Paso para Testers

### Caso de Prueba: Subida de Logotipo y Portada, Previsualización en Vivo y Despliegue en la Web Pública
1. **Acceso a la Configuración de Marca:**
   - Iniciar sesión como administrador de club (ej. `nico-padel`) e ingresar a `http://[subdominio].localhost:8080/panel`.
   - Dirigirse a la pestaña **🌐 Sitio Web** y verificar que la sub-pestaña activa sea **🎨 Identidad & Diseño Web**.
2. **Subida de Logotipo:**
   - En la tarjeta **Logotipo Oficial**, hacer clic en el botón **Subir Logotipo** (o "Cambiar Logotipo").
   - Seleccionar un archivo de imagen (PNG, JPEG, WEBP o SVG).
   - Comprobar que de inmediato se muestra la previsualización en la tarjeta y en el recuadro **👁️ Previsualización en Vivo** (cabecera del dispositivo simulado).
   - Aparece la notificación toast verde: `"¡Logotipo subido y actualizado exitosamente!"`.
3. **Subida de Banner de Portada (Hero):**
   - En la tarjeta **Banner de Portada (Hero)**, hacer clic en el botón **Subir Portada** (o "Cambiar Portada").
   - Seleccionar una foto panorámica de canchas o predio.
   - Comprobar que la imagen se previsualiza en la tarjeta y en el recuadro **👁️ Previsualización en Vivo** como banner superior del dispositivo simulado.
   - Aparece la notificación toast verde: `"¡Banner de portada subido y actualizado exitosamente!"`.
4. **Verificación en el Sitio Web Público:**
   - En la parte superior de la pantalla presionar el botón **Ver mi Sitio Web en Vivo** (o abrir `http://[subdominio].localhost:8080/`).
   - **En Plantilla 1 (Booking Direct - Más Rápida):** Comprobar que en la cabecera superior y en el sub-header se visualiza el logotipo del club, y en el fondo del bloque de turnos se aprecia el banner panorámico de portada con gradiente oscuro de alto contraste.
   - **En Plantilla 2 (Institucional) y Plantilla 3 (Modern Showcase):** Comprobar que tanto el hero panorámico como el logotipo destacan en el centro de la escena con los colores corporativos del club.
5. **Remoción de Imágenes:**
   - En el panel de control presionar el botón rojo **Quitar** en Logotipo o Portada.
   - Comprobar que la imagen desaparece de la vista previa y al hacer clic en **Guardar Cambios** se aplica la remoción en la web pública.

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
   - **Desde el Listado:** Hacer clic en la acción **Aprobar Pago** en la fila de la tabla.
   - **Desde la Edición / Detalle:** Hacer clic en la fila o en **Editar** para inspeccionar el comprobante bancario (con botón de enlace directo al comprobante). En la cabecera superior y sobre la sección de "Estado y Cobro" se visualiza el botón verde **"Aprobar Pago"**.
   - Al confirmar el modal, la factura pasa a `pagada` (`pagado_at` registrado) y la suscripción del club se renueva automáticamente por 30 días (`suscripcion_estado = 'activa'`), purgando el período de gracia. El formulario se refresca inmediatamente mostrando los datos actualizados.
5. **Período de Gracia de 7 Días y Banner Persistente:**
   - Cuando un abono vence su fecha límite, el club entra en período de gracia de 7 días (`suscripcion_estado = 'gracia'`).
   - En la parte superior de todas las vistas del panel de administración (`/panel`), aparece de forma persistente el banner de advertencia ámbar:
     * `"⚠️ Período de Gracia Activo: Tu abono mensual se encuentra vencido. Cuentas con un plazo de 7 días (quedan X días) para regularizar tu pago antes de que se restrinjan las funciones operativas."`
     * El botón **Regularizar Pago Ahora →** redirige directamente a la pestaña de facturación y abre las pasarelas de cobro.
   - Si transcurren los 7 días sin regularización, el estado transiciona a `vencida` y el banner se torna rojo de emergencia indicando la suspensión de funciones.

### Caso de Prueba: Creación de Cancha Adicional que Supera el Cupo Base del Plan
1. **Acceso al Panel de Administración:**
   - Iniciar sesión como administrador en `http://[subdominio].localhost:8080/panel` (o club con cupo base alcanzado, ej. Plan Bronce con 2 canchas registradas).
2. **Abrir Modal de Nueva Cancha:**
   - En la pestaña **🎾 Canchas**, hacer clic en el botón **+ Nueva Cancha**.
3. **Cargar Datos e Intentar Crear:**
   - Ingresar nombre de la cancha (ej. `"Cancha 3 Panorámica"`), deporte, superficie y precios.
   - Presionar **Crear Cancha**.
4. **Verificación de Alerta de Cupo & Costo Adicional:**
   - Comprobar que el modal permanece abierto y se despliega de inmediato el banner de advertencia ámbar:
     * `"⚠️ Cupo Base de Canchas Alcanzado"`
     * `"Tu Plan Bronce incluye hasta 2 canchas base. Ya tienes 2 cancha(s) registradas. Al dar de alta esta cancha adicional, se sumará +$8 USD/mes a tu facturación mensual."`
     * `"Nuevo total mensual estimado: $37 USD / mes"`
   - Comprobar que el botón general "Crear Cancha" queda inhabilitado para evitar duplicaciones.
5. **Confirmación y Alta Exitosa:**
   - Presionar **Confirmar y Agregar Cancha Extra**.
   - Comprobar que el modal se cierra y en la parte superior aparece la notificación toast verde:
     * `"¡Cancha adicional agregada con éxito! Tu nuevo abono mensual estimado es de $37 USD/mes (+8 USD/mes por cancha adicional)."`
   - Verificar que la nueva cancha aparece inmediatamente en el listado y en la pestaña **💳 Facturación & Abono** se computa la cancha excedente.

### Caso de Prueba: Buscador de Localidad Manual & Ampliación de Radio en Marketplace (jugar.turnos.com)
1. **Acceso al Buscador de Canchas:**
   - Ingresar a `http://jugar.localhost:8080/` (o con `?preview=true` si se prueba en modo preview).
2. **Verificación de Ubicación por Defecto y Mensaje Amigable:**
   - Comprobar que en la cabecera se visualiza la insignia de ubicación actual: `"Mostrando complejos en un radio de 50 km desde: [📍 Buenos Aires (CABA)]"`.
   - Si se hace clic en el botón superior `"📍 Mi Ubicación"` y el dispositivo no cuenta con hardware GPS o el navegador bloquea los permisos, verificar que se muestra la alerta descriptiva:
     * `"ℹ️ Ubicación del dispositivo no disponible. Podés buscar tu ciudad o localidad directamente en el campo de búsqueda (ej. Luján)."`
3. **Búsqueda Manual de Localidad con Geocodificación:**
   - En la nueva barra de búsqueda de localidad (`input-manual-location`), escribir `"Luján"` y presionar **Enter** o hacer clic en **Cambiar ubicación**.
   - Comprobar el feedback visual con spinner mientras consulta la API de OpenStreetMap Nominatim.
   - Al responder, comprobar que la insignia superior se actualiza de inmediato a `[📍 Luján]`, el mapa embebido y las distancias relativas se recalculan automáticamente desde las coordenadas de Luján, mostrando los complejos de la zona.
4. **Chips de Acceso Rápido a Ciudades:**
   - Hacer clic en el botón rápido `"📍 Pilar"`, `"📍 Mercedes"` o `"📍 General Rodríguez"`.
   - Comprobar que se dispara la geocodificación automática sin necesidad de escribir en el input y se listan los clubes correspondientes.
5. **Ampliación de Radios de Búsqueda (100 km y 200 km):**
   - Verificar que la barra de botones de radio incluye los nuevos valores: `5 km`, `10 km`, `20 km`, `50 km`, `100 km` y `200 km`.
   - Seleccionar `100 km` o `200 km`: comprobar que el backend `/api/complejos/cercanos` es consultado con `radio_km=100` o `radio_km=200`, permitiendo descubrir clubes de un rango geográfico regional mucho más amplio.
6. **Persistencia en LocalStorage:**
   - Recargar la página en el navegador (F5): comprobar que la ciudad configurada previamente (ej. Luján) y sus coordenadas persisten automáticamente sin volver a CABA.

### Caso de Prueba: Carga de Facturación & Abono desde Subdominio del Club (Resolución Same-Origin)
1. **Acceso al Panel del Club desde Subdominio:**
   - Ingresar a `http://club-padel-bronce.localhost:8080/panel`.
2. **Navegación a la Pestaña Facturación:**
   - Si existe un período de gracia o deuda, hacer clic en el banner superior **Regularizar Pago Ahora →** o en la pestaña **💳 Facturación & Abono**.
3. **Verificación de Conectividad & Ausencia de 'Failed to Fetch':**
   - Comprobar que la pantalla carga fluidamente el resumen de facturación sin arrojar `Error de Facturación - Failed to fetch`.
   - Verificar en la consola de red (Network) del navegador que las solicitudes se dirigen a `/api/clubs/club-padel-bronce/facturacion/resumen` y `/api/clubs/club-padel-bronce/facturacion/facturas` sobre el mismo origen `club-padel-bronce.localhost:8080`, sin advertencias de CORS ni Private Network Access.
   - Comprobar que los botones de pago (Mercado Pago, Stripe, Transferencia Bancaria) interactúan correctamente enviando las solicitudes a `/api/...`.

### Caso de Prueba: Regularización de Abono Vencido mediante Transferencia Bancaria
1. **Acceso al Panel del Club con Abono Vencido:**
   - Iniciar sesión como administrador en `http://club-padel-bronce.localhost:8080/panel`.
   - Observar el banner superior de alerta roja: `"Abono Vencido: Tu período de gracia ha finalizado y las funciones operativas del club han sido suspendidas por falta de pago."`.
2. **Abrir Modal de Pago SaaS:**
   - Hacer clic en el botón del banner **Regularizar Pago Ahora →** o en la pestaña **💳 Facturación & Abono** presionar **Pagar Abono**.
   - Seleccionar la pestaña **Transferencia (CBU / Alias)**.
3. **Informar Comprobante de Transferencia:**
   - En el campo de URL o Comprobante, ingresar un enlace o código de transacción (ej. `"https://comprobantes.banco.com/recibo-12345.pdf"` o `"TRANSF-987654"`).
   - Presionar **Informar Transferencia Realizada**.
4. **Verificación de Cierre y Desbloqueo Automático:**
   - Comprobar que el botón muestra el spinner de procesamiento y a continuación se despliega el mensaje de éxito en verde dentro del modal:
     * `"Comprobante verificado y pago acreditado exitosamente. Tu abono ha sido renovado y las restricciones han sido levantadas."`
   - Comprobar que tras 1 segundo el modal de pago se cierra automáticamente (`handleClosePaymentModal`).
   - Verificar que en el panel principal se muestra el banner verde de confirmación y el estado de la suscripción cambia de inmediato a **Activa / Operativo**.
   - Verificar que el banner rojo persistente superior desaparece y el club ya puede volver a tomar turnos y operar normalmente.

### Caso de Prueba: Visibilidad, Luminosidad y Contraste de Portada en Web Pública
1. **Acceso a la Web Pública del Club:**
   - Ingresar en el navegador a `http://club-padel-bronce.localhost:8080/`.
2. **Comprobación de Nitidez y Colores Vivos:**
   - Observar el banner superior panorámico (`modern-showcase-portada` o plantilla activa).
   - Constatar que la fotografía del club se visualiza con sus colores naturales, vivos e intensos, idéntica a la previsualización del panel de administración (`live-preview-mockup`), sin velos oscuros artificiales ni desenfoques.
3. **Comprobación de Legibilidad y Contraste:**
   - Verificar que el nombre del club, eslogan, insignias y botón "Ver Grilla de Horarios" son 100% legibles gracias al gradiente lateral equilibrado (`from-slate-950/90 via-slate-950/40 to-transparent`) y las sombras de texto (`drop-shadow`).
4. **Comprobación en Diferentes Plantillas:**
   - Cambiar la plantilla desde el panel de administración a **Booking Direct** o **Institucional**.
   - Ingresar a la web pública y comprobar que en todas las variantes el banner se muestra con alta definición y excelente contraste.

### Caso de Prueba: Icono y Enlace a Canal de YouTube en el Pie de Página (Footer)
1. **Acceso a la Web Pública del Club:**
   - Ingresar a `http://club-padel-bronce.localhost:8080/`.
2. **Navegación al Pie de Página (Footer):**
   - Desplazarse hasta el final de la página donde se ubican las redes sociales del club.
3. **Comprobación del Icono de YouTube:**
   - Constatar que junto a los iconos de Instagram, Facebook y TikTok se visualiza el icono rojo de YouTube (`footer-social-youtube`).
   - Pasar el cursor sobre el icono y verificar el tooltip `"YouTube"` y el cambio de color característico a rojo (`hover:text-red-500`).
4. **Comprobación del Enlace y Apertura:**
   - Hacer clic en el icono de YouTube y comprobar que se abre en una nueva pestaña redirigiendo a la URL configurada para el club (ej: `https://youtube.com/club_padel_bronce`).

### Caso de Prueba: Creación y Publicación de Páginas Institucionales CMS desde el Panel
1. **Acceso al Gestor de Páginas CMS:**
   - Ingresar a `http://club-padel-bronce.localhost:8080/panel`.
   - Navegar a la pestaña **Sitio Web** y luego a la subpestaña **Páginas Institucionales**.
2. **Uso de Plantilla Rápida de Inicio:**
   - En la sección de plantillas de inicio, hacer clic en **Quiénes Somos e Instalaciones** (o presionar **+ Nueva Página**).
   - Comprobar que se abre el modal del editor con el título, slug (`quienes-somos`) y contenido pre-cargado.
3. **Guardado y Creación Exitosa:**
   - Presionar **Guardar y Publicar Página**.
   - Verificar que no arroja error de ruta `api/api/...` y la petición se realiza de forma limpia a `/api/clubs/{subdomain}/paginas`.
   - Comprobar que el modal se cierra y la nueva página aparece en el listado de páginas activas.
4. **Verificación en la Web Pública:**
   - Hacer clic en el icono de enlace externo junto a la página o ingresar directamente a `http://club-padel-bronce.localhost:8080/paginas/quienes-somos`.
   - Constatar que la página institucional carga fluidamente (HTTP 200) con el contenido redactado, encabezado del club, pie de página y metadatos SEO.
