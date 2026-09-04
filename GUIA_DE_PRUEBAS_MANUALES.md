# 🎮 Guía de Casos de Uso y Pruebas Manuales (End-to-End)

Esta guía contiene la especificación formal y práctica de **todos los Casos de Uso (CU)** del sistema. Cada caso incluye su **Actor**, **Precondiciones**, **Datos de Entrada (listos para copiar y pegar)**, **Flujo Paso a Paso** y **Resultado Esperado** para que puedas probar manualmente el 100% de la plataforma desde tu navegador.

---

## 🛠️ Herramientas y Entornos de Prueba

| Entorno | URL de Acceso | Utilidad Principal |
| :--- | :--- | :--- |
| **Portal Global SaaS** | [`http://localhost:8080/`](http://localhost:8080/) | Marketplace de clubes, registro y login central. |
| **Mailpit (Correos & OTP)** | [`http://localhost:8025/`](http://localhost:8025/) | Bandeja de entrada para ver correos y códigos de 6 dígitos. |
| **Super Admin (Filament)** | [`http://localhost:8080/admin`](http://localhost:8080/admin) | Panel de control central del SaaS. |
| **Contraseña Universal** | `password123` | Clave estándar recomendada para todas las cuentas. |

---

## 📑 Índice de Casos de Uso

* [CU-01: Acceso y Gestión Global en Super Admin (Filament v3)](#cu-01-acceso-y-gestión-global-en-super-admin-filament-v3)
* [CU-02: Registro y Onboarding Asistido de un Nuevo Club con Validación OTP](#cu-02-registro-y-onboarding-asistido-de-un-nuevo-club-con-validación-otp)
* [CU-03: Alta y Edición de Canchas con Atributos Deportivos y Regla Anti-Baches](#cu-03-alta-y-edición-de-canchas-con-atributos-deportivos-y-regla-anti-baches)
* [CU-04: Configuración de Horarios de Atención Semanales y Días Cerrados](#cu-04-configuración-de-horarios-de-atención-semanales-y-días-cerrados)
* [CU-05: Configuración de Políticas de Seña, Cancelación y Billetera Virtual](#cu-05-configuración-de-políticas-de-seña-cancelación-y-billetera-virtual)
* [CU-06: Menú Multi-Negocio y Transferencia de Sesión (SSO)](#cu-06-menú-multi-negocio-y-transferencia-de-sesión-sso)
* [CU-07: Reserva Pública por Jugador No Registrado (Checkout Modelo A con OTP In-Modal)](#cu-07-reserva-pública-por-jugador-no-registrado-checkout-modelo-a-con-otp-in-modal)
* [CU-08: Reserva Pública por Jugador Registrado usando Billetera Virtual](#cu-08-reserva-pública-por-jugador-registrado-usando-billetera-virtual)
* [CU-09: Asignación Manual Directa en Mostrador / Recepción (Walk-in sin cuenta)](#cu-09-asignación-manual-directa-en-mostrador--recepción-walk-in-sin-cuenta)
* [CU-10: Cobro de Señas y Saldos Pendientes en Mostrador (`💵 Cobrar`)](#cu-10-cobro-de-señas-y-saldos-pendientes-en-mostrador--cobrar)
* [CU-11: Cancelación de Turno con Reembolso en Billetera Virtual vs Penalidad](#cu-11-cancelación-de-turno-con-reembolso-en-billetera-virtual-vs-penalidad)
* [CU-12: Concurrencia, Candado Atómico en Redis y Prevención Anti Doble Reserva](#cu-12-concurrencia-candado-atómico-en-redis-y-prevención-anti-doble-reserva)
* [CU-13: Suscripción a Lista de Espera Inteligente y Notificación Push Automática](#cu-13-suscripción-a-lista-de-espera-inteligente-y-notificación-push-automática)
* [CU-14: Gestión Integral de Turnos Fijos (Abonados 6 Meses, Alerta y Liberación Puntual)](#cu-14-gestión-integral-de-turnos-fijos-abonados-6-meses-alerta-y-liberación-puntual)
* [CU-15: Resumen Diario, KPIs Financieros y Control de Arqueo de Turnos](#cu-15-resumen-diario-kpis-financieros-y-control-de-arqueo-de-turnos)
* [CU-16: Punto de Venta (POS Buffet), Stock y Cierre Ciego de Caja Diaria](#cu-16-punto-de-venta-pos-buffet-stock-y-cierre-ciego-de-caja-diaria)
* [CU-17: Partidos Abiertos (Matchmaking) y Pago Dividido (Split Payment en 4 Cuotas)](#cu-17-partidos-abiertos-matchmaking-y-pago-dividido-split-payment-en-4-cuotas)
* [CU-18: Gestor de Torneos, Inscripción de Parejas y Cuadro de Eliminación Directa](#cu-18-gestor-de-torneos-inscripción-de-parejas-y-cuadro-de-eliminación-directa)
* [CU-19: Domótica IoT y Sincronización Automática de Luces por Turno](#cu-19-domótica-iot-y-sincronización-automática-de-luces-por-turno)
* [CU-20: Páginas Informativas CMS con Sanitización XSS y Revalidación ISR](#cu-20-páginas-informativas-cms-con-sanitización-xss-y-revalidación-isr)
* [CU-21: Polling Silencioso, Page Visibility API y Notificación Sonora en Tiempo Real](#cu-21-polling-silencioso-page-visibility-api-y-notificación-sonora-en-tiempo-real)

---

### CU-01: Acceso y Gestión Global en Super Admin (Filament v3)
* **Actor:** Super Administrador de la plataforma.
* **Precondición:** Contenedores en ejecución.
* **URL:** [`http://localhost:8080/admin`](http://localhost:8080/admin)
* **Datos de Entrada:**
  * Email: `admin@turnos.test`
  * Contraseña: `password123`
* **Flujo Paso a Paso:**
  1. Ingresa las credenciales en el formulario de login de Filament.
  2. En el menú lateral izquierdo, haz clic en **Complejos**: verifica el listado de clubes activos, sus subdominios y planes contratados.
  3. Haz clic en **Planes**: visualiza los tiers Bronce, Plata y Oro. Edita un plan para ver sus módulos asignados.  
  4. Haz clic en **Tipos de Negocio**: visualiza los tipos de negocio disponibles (`Club`, `Complejo`, `Gimnasio`).
* **Resultado Esperado:** Autenticación exitosa, navegación reactiva con Livewire 3 sin errores de FastCGI y acceso a los registros maestros del SaaS.

---

### CU-02: Registro y Onboarding Asistido de un Nuevo Club con Validación OTP
* **Actor:** Nuevo Dueño de Club / Cliente B2B.
* **Precondición:** Mailpit activo en `http://localhost:8025/`.
* **URL:** [`http://localhost:8080/registro-club`](http://localhost:8080/registro-club)
* **Datos de Entrada:**
  * **Paso 1 (Tipo):** `Club Deportivo`
  * **Paso 2 (Club):** Nombre: `Pádel Park Olivos` | Subdominio: `padel-olivos` | Deporte: `Pádel` | Tel: `1134567890` | Dirección: `Av. del Libertador 2200, Olivos`.
  * **Paso 3 (Plan & Cuenta):** Plan: `Plata` | Dueño: `Gonzalo Martínez` | Email: `gonzalo@olivos.test` | Tel: `1134567890` | Clave: `password123`.
  * **Paso 4 (Canchas):** Cancha 1: `Pista Central Cristal` ($12.000) | Cancha 2: `Pista Panorámica` ($10.000).
* **Flujo Paso a Paso:**
  1. Completa los pasos 1 al 4. Observa cómo al escribir el subdominio `padel-olivos` se comprueba dinámicamente su disponibilidad con badge verde.
  2. Haz clic en **"Crear mi Club y Comenzar"**.
  3. El sistema redirige a `/verificar-email`.   
  4. Abre Mailpit en [`http://localhost:8025/`], abre el correo recibido por `gonzalo@olivos.test`, copia el código de 6 dígitos.
  5. Pega el código en la pantalla de verificación.
* **Resultado Esperado:** La cuenta marca `email_verified_at = now()`, se emite el token Sanctum de sesión y se redirige automáticamente al panel oficial del nuevo club: `http://padel-olivos.localhost:8080/panel`. 

---

### CU-03: Alta y Edición de Canchas con Atributos Deportivos y Regla Anti-Baches
* **Actor:** Dueño o Administrador del Club.
* **Precondición:** Sesión iniciada como dueño (`gonzalo@olivos.test` o `nicolas@gmail.com`).
* **URL:** [`http://padel-olivos.localhost:8080/panel`](http://padel-olivos.localhost:8080/panel) (o `http://nico-padel.localhost:8080/panel`).
* **Datos de Entrada:**
  * Nombre: `Pista 3 - Muro Tradicional`
  * Deporte: `Pádel` $\rightarrow$ Tipo de pared: `Muro` $\rightarrow$ Superficie: `Sintético`.
  * Tarifas: Tarifa diurna: `$9.000` | Tarifa con luz: `$11.000`.
  * Equipamiento: Iluminación LED `✓`, Techada `✓`.
  * Modalidad de Duración: `Duración Flexible` (60, 90, 120 min).
  * Regla de Rendimiento: Switch **"Algoritmo Anti-Baches (Yield Management)"** `Activo`.
* **Flujo Paso a Paso:**
  1. Ve a la pestaña **"🎾 Canchas & Pistas"**.
  2. Haz clic en **"+ Agregar Cancha"**, completa los campos y guarda.
  3. En la tarjeta de la cancha recién creada, haz clic en **"✏️ Editar"**: modifica el precio base a `$9.500` y guarda.
  4. Haz clic en **"⏸️ Pausar"** y confirma el modal: la cancha pasa a estado mantenimiento (inactiva para reservas públicas).
  5. Haz clic en **"▶️ Reactivar"**: la cancha vuelve a estar operativa.
* **Resultado Esperado:** Guardado transaccional en PostgreSQL, ordenamiento alfabético en grilla y renderizado de badges con las características configuradas.

---

### CU-04: Configuración de Horarios de Atención Semanales y Días Cerrados
* **Actor:** Administrador del Club.
* **Precondición:** Acceso al panel de administración del club.
* **URL:** Solapa **"🕒 Horarios de Atención"** del panel.
* **Flujo Paso a Paso:**
  1. Visualiza las 7 tarjetas ordenadas estrictamente de Lunes (1) a Domingo (0).
  2. En la tarjeta del **Domingo**, desactiva el switch toggle `Abierto/Cerrado` para marcarlo como `Cerrado`. Observa cómo aparece el aviso de cambios pendientes ("⚠️ Tienes cambios pendientes de guardar...") y el botón "Descartar cambios". Si cambias de pestaña o navegas sin guardar, tus modificaciones se mantienen intactas y no se reinician.
  3. En el día **Sábado**, modifica la hora de apertura a las `08:00` y cierre a las `20:00`.
  4. Haz clic en el preset de productividad **"⚡ Copiar Lun a Vie"**.
  5. Haz clic en **"Guardar Horarios de Atención"**.
* **Resultado Esperado:** Al consultar la grilla horaria pública del club un día domingo (en la página pública o panel de turnos), el sistema muestra el cartel distintivo **"Complejo cerrado este día"** ("El club no cuenta con horarios de atención habilitados para la fecha seleccionada"), impidiendo la reserva de turnos ese día.

---

### CU-05: Configuración de Políticas de Seña, Cancelación y Billetera Virtual
* **Actor:** Dueño del Club.
* **Precondición:** Acceso al panel del club.
* **URL:** Solapa **"💳 Políticas de Seña & Cancelación"** del panel.
* **Datos de Entrada:**
  * Modalidad de Cobro: `Seña Obligatoria (Recomendado)`
  * Porcentaje de Seña: `50%` (ajustable mediante slider o botones rápidos).
  * Ventana de Cancelación: `4 horas`.
  * Reservas Mostrador para Clientes Públicos: `Permitido`.
* **Flujo Paso a Paso:**
  1. Selecciona la modalidad de seña obligatoria.
  2. Ajusta el slider a 50% y observa la caja interactiva de simulación de cobro en vivo.
  3. Configura 4 horas como límite de cancelación.
  4. Haz clic en **"Guardar Políticas de Reserva"**.
* **Resultado Esperado:** El backend persiste los valores en la tabla `complejos` y a partir de ese instante todo turno público exige el 50% de seña para ser confirmado.

---

### CU-06: Menú Multi-Negocio y Transferencia de Sesión (SSO)
* **Actor:** Dueño de múltiples complejos (ej. `nicolas@gmail.com`).
* **Precondición:** Usuario vinculado a 2 o más clubes (`nico-padel` y `nico-tenis`).
* **URL:** [`http://nico-padel.localhost:8080/`](http://nico-padel.localhost:8080/)
* **Flujo Paso a Paso:**
  1. Inicia sesión con `nicolas@gmail.com` / `password123`.
  2. En la barra superior (`Navbar`), observa el menú desplegable interactivo **`🏢 Mis Negocios (2) ▾`**.
  3. Haz clic en el menú: verás las tarjetas de **Nico Pádel & Sport Club** y **Nico Tenis Park**.
  4. Haz clic en **"Nico Tenis Park"**.
* **Resultado Esperado:** Redirección fluida hacia `http://nico-tenis.localhost:8080/` manteniendo la sesión activa (Single Sign-On) sin requerir volver a ingresar usuario y contraseña.

---

### CU-07: Reserva Pública por Jugador No Registrado (Checkout Modelo A con OTP In-Modal)
* **Actor:** Cliente / Jugador visitante sin cuenta previa.
* **Precondición:** Sitio público del club en ventana normal o incógnito.
* **URL:** [`http://padel-olivos.localhost:8080/`](http://padel-olivos.localhost:8080/) (o `nico-padel`).
* **Datos de Entrada:**
  * Nombre: `Rodrigo De Paul`
  * Teléfono: `1177889900`
  * Email: `depaul@jugador.test`
  * Contraseña: `password123`
  * Método de Pago: `💳 Tarjeta Online (Simulador Sandbox Dev)`
* **Flujo Paso a Paso:**
  1. Selecciona una cancha y haz clic en un horario libre verde (ej. 18:00 a 19:30).
  2. **Bloqueo Redis:** Se activa el banner con la cuenta regresiva de **10 minutos**.
  3. En el modal (Paso 1/2), completa los datos de entrada y haz clic en **"✨ Continuar (Paso 1/2)"**.
  4. En el Paso 2/2 (sin abandonar el modal), ve a Mailpit (`http://localhost:8025/`), consulta el código OTP de 6 dígitos enviado a `depaul@jugador.test`.
  5. Ingresa el código en los 6 casilleros.
  6. Haz clic en **"💳 Simular Pago Aprobado ($6.000)"**.
* **Resultado Esperado:** El turno queda confirmado en estado `senado` ($6.000 pagados, $6.000 de saldo pendiente), se libera el candado Redis y el `Navbar` superior se actualiza reactivamente en tiempo real mostrando `👤 Rodrigo De Paul` sin recargar la página. **ALGO NO FUNCIONÓ. EL TURNO QUEDÓ RESERVADO SIN COBRAR LA SEÑA Y ESTA CONFIGURADO PARA RESERVAR CON 50% DE SEÑA. PUEDE SER QUE NO ANDE EL BOTON DE SANDBOX**. **ADEMAS, SI ESTA CONFIRMADA LA RESERVA, SE SIGUE MOSTRANDO EL TURNO RETENIDO CON LA CUENTA REGRESIVA**. **LE DI A "CANCELAR" AL TURNO RETENIDO Y NO LO MUESTRA COMO DISPONIBLE** . **TAMPOCO LO MUESTRA COMO OTORGADO EN LA PARTE DE ABAJO**

---

### CU-08: Reserva Pública por Jugador Registrado usando Billetera Virtual
* **Actor:** Cliente con saldo a favor en su cuenta del club.
* **Precondición:** Jugador con créditos en `user_creditos` (ej. `bela@jugador.test` con $15.000 en `nico-padel`).
* **URL:** [`http://nico-padel.localhost:8080/`](http://nico-padel.localhost:8080/)
* **Flujo Paso a Paso:**
  1. Inicia sesión como `bela@jugador.test` / `password123`.  **CUANDO ME LOGUEO COMO bela@gmail.com EN LA URL http://nico-padel.localhost:8080/ LOGUEA PERO ME REDIRIGE A http://localhost:8080/ DEBERIA MANTENERME EN EL SUBDOMINIO**
  2. Haz clic en un slot libre verde.
  3. En el modal de reserva, observa el desglose financiero (Total $10.000 / Seña $5.000).
  4. Observa el checkbox interactivo: **"💰 Usar saldo en Billetera Virtual ($15.000 disponibles)"**.
  5. Marca el checkbox: nota que el monto a pagar online pasa a **$0,00**.
  6. Haz clic en **"Confirmar Reserva con Saldo de Billetera"**.
* **Resultado Esperado:** Turno confirmado inmediatamente. Se debitan $5.000 de la billetera virtual del cliente (saldo restante $10.000) y se registra el movimiento auditable en `wallet_movimientos`.

---

### CU-09: Asignación Manual Directa en Mostrador / Recepción (Walk-in sin cuenta)
* **Actor:** Empleado de recepción o Dueño del club.
* **Precondición:** Sesión iniciada como personal del club.
* **URL:** Grilla horaria en portada o panel de club.
* **Datos de Entrada:**
  * Nombre: `Marcelo Gallardo`
  * Teléfono: `1199881122`
  * Estado del Cobro: `🕒 Pendiente de Pago`
* **Flujo Paso a Paso:**
  1. Haz clic en un slot disponible.
  2. En el modal de reserva, selecciona la pestaña **"🏢 Asignación Mostrador / Teléfono"**.
  3. Ingresa el nombre y teléfono del cliente (sin exigirle email).
  4. Selecciona el estado del cobro y haz clic en **"Asignar Turno en Mostrador"**.
* **Resultado Esperado:** Turno reservado con éxito en la base de datos con `cliente_id = null`, `cliente_nombre = 'Marcelo Gallardo'` y visible en la grilla para control de recepción.

---

### CU-10: Cobro de Señas y Saldos Pendientes en Mostrador (`💵 Cobrar`)
* **Actor:** Recepcionista o Dueño del Club.
* **Precondición:** Existencia de turnos adeudando saldo (ej. turno con seña previa o pendiente 100%).
* **URL:** Sección *"📋 Turnos Reservados & Ocupados del Día"* en el panel o grilla admin.
* **Flujo Paso a Paso:**
  1. Localiza un turno con badge azul **`💳 Seña Pagada`** o ámbar **`⏳ Pendiente`**.
  2. Haz clic en el botón verde **`💵 Cobrar`**.
  3. En el diálogo modal, verifica el desglose (Precio acordado, Seña pagada y Saldo exacto restante).
  4. Selecciona el método de cobro: `Efectivo en Mostrador` (o `Transferencia Bancaria`).
  5. Haz clic en **"Confirmar Cobro"**.
* **Resultado Esperado:** Actualización optimista reactiva inmediata. El badge cambia a **`✓ Pagado`** (verde esmeralda), el saldo pendiente pasa a `$0,00` y el botón `💵 Cobrar` desaparece automáticamente.

---

### CU-11: Cancelación de Turno con Reembolso en Billetera Virtual vs Penalidad
* **Actor:** Cliente titular de una reserva.
* **Precondición:** Turno reservado con seña abonada.
* **Flujo 1 (Con más de 4 horas de anticipación):**
  1. El cliente cancela un turno programado para dentro de varios días.
  2. El sistema valida `horas_restantes >= 4`.
  3. Se acredita el 100% de la seña pagada en su billetera virtual del club (`user_creditos`).
* **Flujo 2 (Con menos de 4 horas de anticipación):**
  1. El cliente intenta cancelar un turno que inicia dentro de las próximas 2 horas.
  2. El sistema valida `horas_restantes < 4`.
  3. Se cancela el turno pero el club retiene la seña como penalidad (`estado_pago = 'retenido_penalidad'`) sin acreditar dinero en billetera.
* **Resultado Esperado:** Aplicación exacta de la política configurada y despacho de evento para lista de espera.

---

### CU-12: Concurrencia, Candado Atómico en Redis y Prevención Anti Doble Reserva
* **Actor:** Dos usuarios compitiendo por el mismo slot en simultáneo.
* **Precondición:** Dos navegadores o pestañas (Pestaña A y Pestaña B).
* **Flujo Paso a Paso:**
  1. En la Pestaña A, haz clic en un slot libre de las `21:30`.
  2. Inmediatamente en la Pestaña B, intenta hacer clic en el mismo slot.
* **Resultado Esperado:** La Pestaña A adquiere el candado Redis (`SET NX EX 600`) y ve su contador de 10 minutos. La Pestaña B recibe un rechazo de conflicto controlado (`409 Conflict - TURNO_ALREADY_LOCKED`) con Toast flotante que informa que el slot ya se encuentra retenido.

---

### CU-13: Suscripción a Lista de Espera Inteligente y Notificación Push Automática
* **Actor:** Cliente interesado en un turno ya reservado.
* **Precondición:** Turno ocupado en la grilla.
* **Flujo Paso a Paso:**
  1. Inicia sesión como jugador (ej. `messi@jugador.test`).
  2. En un turno ocupado por otro usuario, haz clic en el botón **`[ 🔔 Avisarme ]`**.
  3. El botón cambia su estado a **`[ ✓ Notificación Activa ]`**.
  4. En otra ventana, como administrador o titular, cancela o libera ese turno.
* **Resultado Esperado:** El job `NotificarListaEsperaJob` se despacha en segundo plano, marca `notificado = true` en la base de datos, envía la notificación push (FCM) al dispositivo del usuario suscrito y vuelve a colocar el slot como disponible en la grilla pública.

---

### CU-14: Gestión Integral de Turnos Fijos (Abonados 6 Meses, Alerta y Liberación Puntual)
* **Actor:** Administrador del Club.
* **Precondición:** Módulo `turnos_fijos` activo en el plan.
* **URL:** Solapa **"🔁 Turnos Fijos"** del panel.
* **Datos de Entrada:**
  * Cancha: `Pista Central Cristal` | Día: `Miércoles` | Horario: `20:00 a 21:30` | Titular: `Dr. Alberto Crescenti` | Tel: `1144332211` | Tarifa: `$12.000` | Método: `Efectivo`.
* **Flujo Paso a Paso:**
  1. Haz clic en **"+ Fijar Nuevo Turno Recurrente"**, completa los datos y presiona **"Generar Serie Fija (26 Semanas / 6 Meses)"**.
  2. En la lista de series, observa el banner de alerta cuando una serie tiene $\le$ 2 semanas restantes.
  3. Haz clic en **`⚡ Renovar 6 Meses Más`**: la serie se extiende automáticamente por 26 semanas adicionales.
  4. En una serie activa, despliega las próximas fechas y haz clic en **`🗓️ Liberar Fecha`** en una fecha puntual.
* **Resultado Esperado:** La fecha puntual seleccionada se elimina de la agenda y vuelve a ofrecerse como slot libre al público general, mientras que las restantes 25 semanas del abonado siguen intactas.

---

### CU-15: Resumen Diario, KPIs Financieros y Control de Arqueo de Turnos
* **Actor:** Dueño o Gerente del Club.
* **URL:** Solapa **"📊 Resumen Diario"** del panel de club.
* **Flujo Paso a Paso:**
  1. Visualiza las 4 tarjetas métricas superiores: **Total Facturado**, **Cobrado Real**, **Saldo Pendiente** y **% Ocupación**.
  2. Revisa el gráfico de barras comparativo de canales de cobro (**Mostrador vs Transferencia vs Online vs Billetera**).
  3. En la tabla inferior día a día, expande el acordeón de hoy: revisa la lista individual de partidos y sus estados de pago.
  4. Utiliza el selector de filtros para alternar entre "Hoy", "Esta Semana", "Este Mes" o filtrar por una cancha específica.
* **Resultado Esperado:** Cálculo matemático exacto de ingresos y saldos pendientes en tiempo real sin desfasajes de zona horaria.

---

### CU-16: Punto de Venta (POS Buffet), Stock y Cierre Ciego de Caja Diaria
* **Actor:** Operador de Mostrador / Dueño.
* **Precondición:** Módulo `pos_buffet` contratado.
* **Flujo Paso a Paso:**
  1. Abre sesión de caja ingresando el fondo inicial en efectivo (ej. `$20.000`).
  2. Realiza ventas en mostrador de productos del catálogo (ej. 2 bebidas Gatorade a `$2.000` c/u).
  3. Comprueba que el stock del producto disminuye automáticamente en la base de datos (de 45 a 43 unidades).
  4. Al finalizar el turno, realiza el **Arqueo Ciego**: ingresa el monto total de dinero en efectivo contado en la gaveta física sin ver el sistema.
* **Resultado Esperado:** El sistema computa `total_esperado_efectivo` sumando apertura, ventas físicas y turnos cobrados en mostrador, calculando la diferencia exacta (sobrante o faltante de caja) y cerrando la sesión de manera inmutable.

---

### CU-17: Partidos Abiertos (Matchmaking) y Pago Dividido (Split Payment en 4 Cuotas)
* **Actor:** Jugador organizador y participantes convocados.
* **Precondición:** Módulo `split_payment` activo.
* **Flujo Paso a Paso:**
  1. En el checkout de un turno de `$12.000`, selecciona **"Split Payment (Dividir en 4 cuotas de $3.000)"**.
  2. El organizador paga su cuota de `$3.000`.
  3. El sistema genera los tokens UUID y URLs individuales de checkout para compartir a los restantes 3 jugadores.
  4. Cada participante accede a su enlace único y abona su cuota correspondiente.
* **Resultado Esperado:** Conforme se pagan las cuotas se actualiza el saldo; al confirmarse el pago de la 4ta cuota, el turno pasa automáticamente a estado `reservado` y el partido abierto a `completo`.

---

### CU-18: Gestor de Torneos, Inscripción de Parejas y Cuadro de Eliminación Directa
* **Actor:** Organizador de Torneos / Dueño.
* **Precondición:** Módulo `torneos` activo.
* **Flujo Paso a Paso:**
  1. Da de alta un torneo en formato `eliminación directa` para 8 equipos (categoría 4ta caballeros).
  2. Inscribe las 8 parejas sembradas del 1 al 8.
  3. Genera el fixture: el sistema construye el árbol de llaves (cuartos de final $\rightarrow$ semifinal $\rightarrow$ final).
  4. Carga el resultado del Partido 1 de cuartos (ej. 6-3, 6-4).
* **Resultado Esperado:** El equipo ganador avanza automáticamente a la posición correspondiente de la llave de Semifinales sin intervención manual.

---

### CU-19: Domótica IoT y Sincronización Automática de Luces por Turno
* **Actor:** Sistema automatizado / Administrador.
* **Precondición:** Dispositivo IoT configurado en la cancha con minutos de antelación (5m) y gracia (5m).
* **Flujo Paso a Paso:**
  1. Ejecuta el comando Artisan en consola:
     ```bash
     docker compose exec backend php artisan iot:sincronizar-luces
     ```
  2. El comando evalúa si la hora actual cae dentro de la ventana `[inicio - 5min, fin + 5min]` de un turno confirmado.
* **Resultado Esperado:** Si hay partido activo emite la orden `ENCENDER` vía webhook HTTP / MQTT y cambia el estado a `encendido`; al finalizar el partido y vencer el tiempo de gracia, emite la orden `APAGAR`.

---

### CU-20: Páginas Informativas CMS con Sanitización XSS y Revalidación ISR
* **Actor:** Administrador del Club / Visitante público.
* **Precondición:** Módulo `cms_web` activo.
* **URL:** [`http://nico-padel.localhost:8080/paginas/reglamento-interno`](http://nico-padel.localhost:8080/paginas/reglamento-interno)
* **Flujo Paso a Paso:**
  1. Visita la página pública del club: observa el contenido HTML estructurado.
  2. Edita el contenido de la página agregando texto nuevo o modificando una regla.
  3. Guarda los cambios.
* **Resultado Esperado:** El backend sanitiza cualquier etiqueta peligrosa (`<script>`, `<iframe>`, `onclick`) y despacha el webhook a Next.js (`/api/revalidate`), purgando la caché perimetral ISR para que el cambio sea visible de inmediato sin reiniciar la aplicación.

---

### CU-21: Polling Silencioso, Page Visibility API y Notificación Sonora en Tiempo Real
* **Actor:** Personal de Mostrador / Recepción.
* **Precondición:** Pantalla de grilla horaria abierta en recepción con sesión admin iniciada.
* **Flujo Paso a Paso:**
  1. Mantén abierta la grilla horaria en una pestaña del navegador.
  2. Minimiza la pestaña o cambia a otra ventana.
  3. Desde otro navegador o ventana de incógnito, reserva un turno libre en esa misma fecha y cancha.
  4. Vuelve a enfocar y maximizar la pestaña de recepción.
* **Resultado Esperado:**
  * Se reproduce la **campana sonora bifónica (E5 $\rightarrow$ A5)** generada mediante Web Audio API.
  * Aparece una alerta Toast flotante con ícono de campana indicando: *"🔔 Nueva Reserva: [Cliente] en [Cancha] ([Horario])"*.
  * Gracias a la **Page Visibility API**, el temporizador de 10 segundos de la notificación estuvo pausado mientras la pestaña estuvo oculta y recién comienza a descontar cuando el recepcionista vuelve a mirar la pantalla.
