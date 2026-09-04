# Guía Exhaustiva de Casos de Uso y Set de Datos de Prueba (TESTING)

Este documento contiene el **set de datos completo**, las **credenciales de acceso**, el **comando de carga automática** y los **casos de uso paso a paso** para probar y certificar el 100% de la funcionalidad desarrollada en el SaaS Deportivo Multitenant & CMS.

---

## ⚡ 1. Comando de Carga Rápida (Seeding Automático)

Para poblar la base de datos con todos los usuarios, clubes, canchas deportivas, turnos en todos los estados financieros, abonados a 6 meses, billeteras virtuales, productos de buffet, torneos y dispositivos IoT, ejecuta en tu terminal:

```bash
docker compose exec backend php artisan db:seed --class=FullTestingSeeder
```

> **Nota:** El seeder es **idempotente y dinámico** (`Carbon::today('America/Argentina/Buenos_Aires')`), por lo que calcula las fechas relativas a la fecha actual en la que se corra, garantizando que los turnos de hoy, mañana y las series recurrentes estén siempre vigentes.

---

## 🌐 2. Mapa de Accesos y URLs del Sistema

| Entorno / Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **Portal Global SaaS** | `http://localhost:8080/portal` | Marketplace global de clubes, buscador y planes de suscripción. |
| **Planes & Precios** | `http://localhost:8080/planes` | Comparador interactivo de planes Bronce, Plata y Oro. |
| **Onboarding Wizard** | `http://localhost:8080/registro-club` | Wizard de registro asistido en 4 pasos para nuevos clubes. |
| **Club 1: Nico Pádel (Público)** | `http://nico-padel.localhost:8080/` | Sitio web de marca blanca para clientes y reserva de turnos de pádel. |
| **Club 1: Nico Pádel (Panel Admin)** | `http://nico-padel.localhost:8080/panel` | Centro de control del dueño/administrador (Turnos, Canchas, Caja, Fijos). |
| **Club 2: Nico Tenis (Público)** | `http://nico-tenis.localhost:8080/` | Sitio de tenis del mismo dueño (permite probar selector multi-negocio SSO). |
| **Club 2: Nico Tenis (Panel Admin)** | `http://nico-tenis.localhost:8080/panel` | Panel administrativo de tenis. |
| **Complejo 3: Central Fútbol** | `http://complejo-central.localhost:8080/` | Complejo comercial de alquiler de canchas de Fútbol 5 y 7. |
| **Gimnasio 4: Iron Gym** | `http://iron-gym.localhost:8080/` | Gimnasio y Box de Crossfit (tipo de negocio adaptativo). |
| **Super Admin (Filament v3)** | `http://localhost:8080/admin` | Panel de control global del SaaS (CRUD Complejos, Planes, Módulos). |
| **Mailpit (Web UI Correos OTP)** | `http://localhost:8025/` | Bandeja de entrada virtual para inspeccionar emails y códigos OTP de 6 dígitos. |
| **API REST Backend** | `http://localhost:8080/api` | Endpoints desacoplados de Laravel 11. |

---

## 👥 3. Matriz de Usuarios y Credenciales Precargadas

> **Contraseña universal para todas las cuentas de prueba:** `password123`

| Rol | Nombre | Email | Teléfono | Saldo Billetera | Notas / Permisos |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Super Administrador SaaS | `admin@turnos.test` | `1155550000` | - | Acceso total al panel Filament en `/admin`. |
| **Dueño Multi-Club** | Nicolás Dóvico | `nicolas@club.test` | `1149790001` | - | Dueño de `nico-padel` y `nico-tenis` (prueba de menú multinegocio). |
| **Dueño Complejo Fútbol** | Marcos Gómez | `marcos@complejo.test` | `1149790002` | - | Dueño de `complejo-central` (Fútbol 5 y 7). |
| **Dueña Gimnasio** | Laura Benítez | `laura@gym.test` | `1149790003` | - | Dueña de `iron-gym` (Crossfit / Fitness). |
| **Operador Mostrador** | Facundo Recepcionista | `recepcion@nico-padel.test` | `1149790004` | - | Empleado para reservas presenciales y cobros en caja. |
| **Jugador 1 (Con Billetera)** | Fernando Belasteguín | `bela@jugador.test` | `1149790220` | **$15.000,00** | Saldo a favor en `nico-padel` por cancelación previa. |
| **Jugador 2 (Con Reservas)** | Juan Lebrón | `lebron@jugador.test` | `1149790221` | $0,00 | Posee turnos con señas pagadas y saldos pendientes. |
| **Jugador 3 (En Lista Espera)**| Marcos "Chino" Maidana | `chino@jugador.test` | `1149700220` | **$5.000,00** | Suscrito a lista de espera para mañana a las 19:00. |
| **Jugador 4 (Nuevo)** | Lionel Messi | `messi@jugador.test` | `1149790010` | $0,00 | Cliente registrado para pruebas de checkout y reservas. |
| **Cliente Mostrador (Walk-in)** | Carlos Mostrador | *Sin cuenta online* | `1133445566` | - | Turno asignado directamente en recepción sin usuario en BD. |

---

## 🏟️ 4. Inventario de Clubes, Complejos y Canchas

### 🏆 1. Nico Pádel & Sport Club (`nico-padel`)
* **Tipo:** Club Social y Deportivo | **Plan:** Oro (Todos los módulos activos).
* **Políticas:** Seña Obligatoria: **50%** | Cancelación: **4 horas** | Permite Mostrador Público: **Sí**.
* **Horarios:** Lunes a Viernes 08:00 a 23:00 | Sábados 08:00 a 22:00 | Domingos 09:00 a 21:00.
* **Canchas:**
  1. **Cancha 1 - Central Cristal:** Césped sintético azul, techada (indoor), paredes de cristal, luces LED, cámara de grabación, marcador digital. Tarifa base diurna: `$10.000` / nocturna con luz: `$12.000`. Duración fija de **90 min**.
  2. **Cancha 2 - Panorámica Exterior:** Césped sintético pro, al aire libre (outdoor), paredes de cristal, luces LED, marcador digital. **Duración Flexible** (60 min: `$8.000`, 90 min: `$11.000`, 120 min: `$14.000`) con **Algoritmo Anti-Baches activo**.
  3. **Cancha 3 - Muro Clásica:** Cemento pulido, techada (indoor), paredes de muro tradicional, iluminación halógena. Tarifa fija: `$7.000` (con luz `$8.500`). Duración fija de **60 min**.

### 🎾 2. Nico Tenis Park (`nico-tenis`)
* **Tipo:** Club Deportivo | **Plan:** Oro | **Mismo Dueño:** Nicolás Dóvico (`nicolas@club.test`).
* **Horarios:** Lunes a Sábado 08:00 a 22:00 | Domingos Cerrado.
* **Canchas:**
  1. **Court Central - Polvo de Ladrillo:** Polvo de ladrillo, al aire libre, iluminación LED, marcador digital, cámara. Tarifa diurna: `$9.000` / con luz: `$11.500`. Duración: **90 min**.
  2. **Court 2 - Hard Court Rápida:** Cemento rápido, techada (indoor), climatizada. Tarifa: `$11.000` (con luz `$13.000`). Duración: **60 min**.

### ⚽ 3. Complejo Deportivo Central (`complejo-central`)
* **Tipo:** Complejo Comercial | **Plan:** Plata | **Dueño:** Marcos Gómez (`marcos@complejo.test`).
* **Políticas:** Seña Obligatoria: **30%** | Cancelación: **6 horas**.
* **Horarios:** Todos los días de 14:00 a 23:30.
* **Canchas:**
  1. **Cancha 1 - Fútbol 5 Sintético Pro:** Césped sintético 50mm con caucho, techada, luces LED, cámara y marcador. Tarifa: `$18.000` (con luz `$20.000`). Duración: **60 min**.
  2. **Cancha 2 - Fútbol 7 Césped Natural:** Césped natural profesional, al aire libre, luces halógenas. Tarifa: `$28.000` (con luz `$32.000`). Duración: **60 min**.

### 💪 4. Iron Gym & Crossfit Box (`iron-gym`)
* **Tipo:** Gimnasio / Centro de Entrenamiento | **Plan:** Bronce | **Dueña:** Laura Benítez (`laura@gym.test`).
* **Políticas:** Pago Total Online (**100%**) | Cancelación: **2 horas** | Mostrador Público: **No**.
* **Canchas / Salas:**
  1. **Box Principal - Crossfit & Funcional:** Piso de goma de alto impacto, climatizado, sonido profesional. Tarifa: `$5.000` por slot/pase de 60 min.

---

## 📅 5. Turnos Precargados para Pruebas en Vivo (Cancha 1 - Central Cristal)

Para la fecha de **HOY** en `http://nico-padel.localhost:8080/`:

| Horario | Cancha | Titular | Tipo Cliente | Monto Total | Monto Pagado | Saldo Pendiente | Estado Pago | Estado Visual en Panel Admin |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **10:00 - 11:30** | Cancha 1 | Fernando Belasteguín | Registrado | $10.000 | $10.000 | **$0,00** | `pagado` | `✓ Pagado` (Verde esmeralda, sin botón cobrar) |
| **12:00 - 13:30** | Cancha 1 | Juan Lebrón | Registrado | $10.000 | $5.000 (50%) | **$5.000,00** | `senado` | `💳 Seña Pagada` (Azul, con botón `💵 Cobrar`) |
| **14:00 - 15:30** | Cancha 1 | Juan Lebrón | Registrado | $10.000 | $0,00 | **$10.000,00** | `pendiente` | `⏳ Pendiente` (Ámbar, con botón `💵 Cobrar`) |
| **16:00 - 17:30** | Cancha 1 | Carlos Mostrador | **No Registrado** | $10.000 | $0,00 | **$10.000,00** | `pendiente` | `⏳ Pendiente` (Cliente Mostrador, con botón `💵 Cobrar`) |
| **18:00 - 19:30** | Cancha 1 | Dr. Roberto Martínez | **Abonado Fijo** | $10.000 | $10.000 | **$0,00** | `pagado` | `🔁 Fijo` `✓ Pagado` (Borde ámbar y opciones de serie) |
| **19:30 en adelante**| Cancha 1 | *Libres* | - | $12.000 (luz) | - | - | `disponible` | **Slots libres para reservar en vivo desde la web** |

---

## 🧪 6. Casos de Uso Detallados (Paso a Paso)

---

### Caso de Uso 1 (CU-01): Gestión Global en Super Admin (Filament v3)
* **Objetivo:** Verificar la administración centralizada de la plataforma SaaS.
* **URL:** `http://localhost:8080/admin`
* **Credenciales:** `admin@turnos.test` / `password123`
* **Pasos de Prueba:**
  1. Inicia sesión en el panel Filament.
  2. Navega a **Complejos**: verifica que figuran los 4 complejos precargados con sus planes, subdominios y tipos de negocio.
  3. Navega a **Planes & Módulos**: edita las asignaciones de módulos (ej. agrega o quita un módulo a un plan).
  4. Navega a **Tipos de Negocio**: crea o desactiva tipos de negocio (Club, Complejo, Gimnasio).
* **Resultado Esperado:** Visualización fluida de los recursos con Livewire 3 sin errores de FastCGI.

---

### Caso de Uso 2 (CU-02): Onboarding Asistido de Nuevo Club con Validación OTP
* **Objetivo:** Probar el asistente de registro en 4 pasos, disponibilidad de subdominios y verificación OTP vía Mailpit.
* **URL:** `http://localhost:8080/registro-club`
* **Pasos de Prueba:**
  1. **Paso 1 (Tipo de Negocio):** Selecciona *Club Deportivo*. Nota cómo las etiquetas cambian reactivamente.
  2. **Paso 2 (Datos del Club):**
     * Nombre: `Palermo Tenis Club`.
     * Subdominio: escribe `nico-padel` (verás el aviso rojo de subdominio ocupado). Cambia a `palermo-tenis` (badge verde disponible).
     * Deporte principal: `Tenis`. Teléfono y dirección.
  3. **Paso 3 (Plan & Cuenta):**
     * Selecciona el Plan *Plata*.
     * Crea un nuevo usuario: `dueño@palermotenis.com` / `password123`.
  4. **Paso 4 (Canchas Iniciales):** Configura 2 canchas de polvo de ladrillo y haz clic en **"Crear mi Club y Comenzar"**.
  5. **Verificación OTP:** El sistema redirige a `/verificar-email`.
     * Abre Mailpit en `http://localhost:8025/`.
     * Abre el email recibido con el asunto *"Código de Verificación OTP"*.
     * Copia el código de 6 dígitos e ingrésalo en la pantalla de verificación.
* **Resultado Esperado:** Cuenta validada con éxito (`email_verified_at`), login automático y redirección al panel de administración del nuevo club `http://palermo-tenis.localhost:8080/panel`.

---

### Caso de Uso 3 (CU-03): Alta y Edición de Canchas con Atributos Deportivos y Anti-Baches
* **Objetivo:** Configurar equipamiento específico por deporte, dobles tarifas diurna/nocturna, duraciones de 90 min y regla anti-baches.
* **URL:** `http://nico-padel.localhost:8080/panel` (iniciar sesión como `nicolas@club.test` / `password123`).
* **Pasos de Prueba:**
  1. Ve a la solapa **"🎾 Canchas & Pistas"**.
  2. Haz clic en **"+ Agregar Cancha"**:
     * Selecciona Deporte: `Pádel`. Observa que aparece la opción de paredes (`Cristal` o `Muro`).
     * Cambia a Deporte: `Fútbol`. Observa que el campo de paredes se oculta y aparece el selector de formato (`Fútbol 5`, `Fútbol 7`, `Fútbol 11`).
     * Vuelve a Pádel, define Nombre: `Cancha 4 - Cristal Pro`, Tarifa diurna: `$9.000`, Tarifa con luz: `$11.000`.
     * En "Duración & Modalidad", selecciona **Duración Flexible** (60, 90, 120 min) y activa el switch **"Algoritmo Anti-Baches (Yield Management)"**.
     * Guarda la cancha.
  3. Haz clic en `✏️ Editar` en la Cancha 2: modifica el precio o activa/desactiva la iluminación.
  4. Haz clic en `⏸️ Pausar Cancha`: confirma el modal. La cancha pasa a mantenimiento y sus turnos no se ofrecerán al público. Reactívala con `▶️`.
* **Resultado Esperado:** Cancha configurada con persistencia inmediata y ordenamiento alfabético en grilla.

---

### Caso de Uso 4 (CU-04): Configuración de Horarios Semanales y Días Cerrados
* **Objetivo:** Modificar los horarios de apertura y cierre de Lunes a Domingo y cerrar días festivos/descanso.
* **URL:** `http://nico-padel.localhost:8080/panel`, solapa **"🕒 Horarios de Atención"**.
* **Pasos de Prueba:**
  1. Observa los 7 días de la semana ordenados estrictamente de Lunes a Domingo.
  2. Haz clic en el switch toggle del **Domingo** para marcarlo como `Cerrado`.
  3. En el día **Sábado**, modifica la hora de cierre a las `20:00`.
  4. Haz clic en el preset rápido **"⚡ Copiar Lun a Vie"** para clonar los horarios del lunes en toda la semana laboral.
  5. Haz clic en **"Guardar Horarios Semanales"**.
* **Resultado Esperado:** Mensaje de éxito. Al consultar la grilla pública del domingo, el sistema indica que el complejo se encuentra cerrado ese día.

---

### Caso de Uso 5 (CU-05): Reserva Pública por Jugador No Registrado (Checkout Modelo A con OTP in-modal)
* **Objetivo:** Probar el flujo de reserva rápida de un cliente nuevo con validación OTP sin abandonar el modal ni perder el slot retenido.
* **URL:** `http://nico-padel.localhost:8080/` (como visitante no autenticado).
* **Pasos de Prueba:**
  1. En la Grilla Horaria, selecciona la fecha de hoy o mañana.
  2. Haz clic en cualquier horario verde disponible (ej. `20:00 a 21:30`).
  3. **Candado Atómico en Redis:** Observa cómo el slot se bloquea de inmediato con el banner superior y la cuenta regresiva de **10 minutos (10:00)**.
  4. En el modal de reserva (Paso 1/2), ingresa:
     * Nombre: `Martín Palermo`
     * Teléfono: `1166778899`
     * Email: `palermo@boca.test`
     * Contraseña: `password123` (prueba el botón del "ojito" para ver la clave).
     * Método de pago: selecciona *💳 Tarjeta Online (Simulador Dev)* o *Mostrador*.
     * Haz clic en **"✨ Continuar (Paso 1/2)"**.
  5. **Verificación OTP In-Modal (Paso 2/2):**
     * Sin cerrar el modal y manteniendo la cuenta regresiva visible, aparece la pantalla de 6 casilleros de OTP.
     * Abre Mailpit (`http://localhost:8025/`), consulta el código recibido.
     * Escribe o pega el código en los casilleros.
* **Resultado Esperado:** Verificación instantánea, usuario creado y verificado, turno confirmado a estado `reservado`, candado liberado y barra de navegación (`Navbar`) actualizada automáticamente con el nuevo usuario autenticado sin recargar la página.

---

### Caso de Uso 6 (CU-06): Reserva Pública por Jugador Registrado usando Billetera Virtual
* **Objetivo:** Aplicar saldo a favor de cancelaciones anteriores para pagar la seña de un turno.
* **URL:** `http://nico-padel.localhost:8080/`
* **Pasos de Prueba:**
  1. Inicia sesión con la cuenta de **Fernando Belasteguín** (`bela@jugador.test` / `password123`).
  2. Observa en la cabecera el badge `👤 Fernando Belasteguín`.
  3. Selecciona una cancha y haz clic en un slot disponible.
  4. En el modal de confirmación:
     * Desglose: Tarifa `$10.000`, Seña requerida (50%): `$5.000`.
     * Observa el checkbox: **"💰 Usar saldo en Billetera Virtual ($15.000 disponibles)"**.
     * Marca el checkbox. Nota cómo el saldo requerido online pasa a **$0,00**.
     * Haz clic en **"Confirmar Reserva con Saldo de Billetera"**.
* **Resultado Esperado:** Turno reservado con éxito, se debitan `$5.000` de la billetera virtual (saldo restante `$10.000`), registrando el movimiento de auditoría en `wallet_movimientos`.

---

### Caso de Uso 7 (CU-07): Asignación Directa en Mostrador / Recepción (Walk-in sin cuenta)
* **Objetivo:** Registrar reservas presenciales o telefónicas sin exigir registro de email ni validación OTP al cliente.
* **URL:** `http://nico-padel.localhost:8080/` (con sesión de administrador o recepcionista).
* **Pasos de Prueba:**
  1. Haz clic en un slot disponible.
  2. En el modal de reserva, selecciona la pestaña **"🏢 Asignación Mostrador / Teléfono"**.
  3. Ingresa únicamente:
     * Nombre del cliente: `Gustavo Mostrador`
     * Teléfono: `1199887766`
     * Estado del cobro: Selecciona `🕒 Pendiente de Pago` o `💵 Cobrado en Mostrador`.
     * Notas internas opcionales.
  4. Haz clic en **"Asignar Turno en Mostrador"**.
* **Resultado Esperado:** Turno reservado de inmediato en la base de datos con `cliente_id = null`, `cliente_nombre = 'Gustavo Mostrador'` y reflejado en tiempo real en la lista de turnos ocupados.

---

### Caso de Uso 8 (CU-08): Cobro de Saldos Pendientes y Señas en Panel Administrativo
* **Objetivo:** Gestionar el cobro físico o bancario de turnos que adeudan saldo.
* **URL:** `http://nico-padel.localhost:8080/panel` o vista de administrador en portada.
* **Pasos de Prueba:**
  1. En la sección **"📋 Turnos Reservados & Ocupados del Día"**, localiza el turno de las **12:00 a 13:30 (Juan Lebrón)**:
     * Observa la insignia azul **`💳 Seña Pagada ($5.000)`** y el **`Saldo Pendiente: $5.000`**.
  2. Haz clic en el botón verde **`💵 Cobrar`**:
     * Se abre el modal interactivo de cobro.
     * Muestra el precio total ($10.000), la seña previa ($5.000) y el saldo exacto a cobrar ($5.000).
     * Selecciona el método de cobro: `Efectivo en Mostrador`.
     * Haz clic en **"Confirmar Cobro de $5.000"**.
* **Resultado Esperado:** Actualización optimista reactiva inmediata. El estado cambia a **`✓ Pagado`** (verde esmeralda), el saldo pendiente pasa a `$0,00` y el botón `💵 Cobrar` desaparece automáticamente.

---

### Caso de Uso 9 (CU-09): Concurrencia y Prevención de Doble Reserva (Redis Lock)
* **Objetivo:** Garantizar que dos usuarios concurrentes no puedan retener ni confirmar el mismo turno simultáneamente.
* **Pasos de Prueba:**
  1. Abre dos navegadores o pestañas (una en modo incógnito).
  2. En la Pestaña A, haz clic en un slot libre de las `21:30`.
  3. En la Pestaña B, inmediatamente intenta hacer clic en el mismo slot.
* **Resultado Esperado:** La Pestaña A adquiere el bloqueo temporal de 10 minutos (200 OK). La Pestaña B recibe un rechazo de conflicto controlado (`409 Conflict - TURNO_ALREADY_LOCKED`) con un Toast flotante que informa que el slot ya se encuentra retenido por otro usuario.

---

### Caso de Uso 10 (CU-10): Cancelación y Políticas de Billetera Virtual vs Penalidad
* **Objetivo:** Comprobar las reglas de reembolso configurable ($\ge$ 4hs: 100% reintegro a billetera; $<$ 4hs: retención de penalidad).
* **Pasos de Prueba:**
  1. **Prueba con más de 4 horas:**
     * Cancela un turno programado para mañana mediante `POST /api/turnos/{id}/cancelar-cliente` (o botón en portal de cliente).
     * El sistema evalúa `diferencia_horas >= 4`.
     * Se devuelve el 100% de la seña pagada a la billetera virtual del cliente (`user_creditos` y `wallet_movimientos`).
  2. **Prueba con menos de 4 horas:**
     * Intenta cancelar un turno de hoy que inicie dentro de las próximas 2 horas.
     * El sistema retiene la seña como penalidad (`estado_pago = 'retenido_penalidad'`) y no acredita saldo en billetera.
* **Resultado Esperado:** Cumplimiento estricto de la política configurada por el club.

---

### Caso de Uso 11 (CU-11): Lista de Espera Inteligente y Notificación Push
* **Objetivo:** Notificar automáticamente a jugadores en lista de espera cuando un turno ocupado se libera.
* **Pasos de Prueba:**
  1. Revisa que el cliente **Marcos "Chino" Maidana** está en lista de espera para mañana a las `19:00`.
  2. En el panel de administrador o como cliente titular (Lebrón), cancela el turno de las 19:00.
  3. El sistema ejecuta `NotificarListaEsperaJob`.
* **Resultado Esperado:** La lista de espera marca `notificado = true`, despacha la notificación push Firebase Cloud Messaging (FCM) al token del Chino Maidana y vuelve a disponibilizar el horario en la grilla pública.

---

### Caso de Uso 12 (CU-12): Gestión de Turnos Fijos (Abonados a 6 Meses)
* **Objetivo:** Gestionar suscripciones recurrentes de 26 semanas, alertas de vencimiento y liberación puntual de fechas.
* **URL:** `http://nico-padel.localhost:8080/panel`, solapa **"🔁 Turnos Fijos"**.
* **Pasos de Prueba:**
  1. **Alerta de Renovación:** Observa el banner ámbar de advertencia: *"Hay 1 serie fija próxima a vencer en menos de 2 semanas"* (Serie de los Jueves de Belasteguín).
  2. Haz clic en el botón **`⚡ Renovar 6 Meses Más`**: la serie se extiende automáticamente por 26 semanas adicionales sin colisiones.
  3. **Liberación Puntual de Fecha:**
     * En la serie activa de Roberto Martínez (Martes 18:00), expande las próximas fechas.
     * En una fecha puntual, haz clic en **`🗓️ Liberar Fecha`**.
     * Confirma el modal. Observa que esa fecha específica se borra de la agenda y vuelve a estar libre en la grilla pública para que cualquiera la reserve, mientras que las 21 semanas restantes de la serie permanecen intactas.
  4. **Baja Definitiva:** En una serie, haz clic en **`🚫 Dar de Baja Serie`**: todas las fechas futuras ($\ge$ hoy) se cancelan en cascada.
* **Resultado Esperado:** Control total de abonados sin alterar la integridad del calendario.

---

### Caso de Uso 13 (CU-13): Resumen Diario, KPIs Financieros y Control de Arqueo
* **Objetivo:** Monitorear la facturación del club, dinero cobrado real, saldos pendientes y desglose por canal de pago.
* **URL:** `http://nico-padel.localhost:8080/panel`, solapa **"📊 Resumen Diario"**.
* **Pasos de Prueba:**
  1. Observa las 4 tarjetas de KPIs superiores:
     * **Total Facturado:** Suma de todas las tarifas de turnos del período.
     * **Cobrado Real:** Total de dinero percibido en caja o bancos.
     * **Saldo Pendiente:** Total adeudado por cobrar en mostrador.
     * **Ocupación %:** Ratio de minutos ocupados vs minutos totales disponibles según horarios de atención.
  2. Revisa el gráfico de barras por canales de cobro (**Mostrador vs Transferencia vs Online vs Billetera**).
  3. En la tabla inferior día a día, expande el acordeón del día de hoy: revisa la lista detallada de turnos, estado de pago y cobra saldos directamente con el modal integrado.
* **Resultado Esperado:** Datos agregados exactos con filtros por rango de fechas (Hoy, Esta Semana, Este Mes) y por cancha individual.

---

### Caso de Uso 14 (CU-14): Punto de Venta (POS Buffet) y Arqueo Ciego de Caja
* **Objetivo:** Registrar ventas de buffet, descontar stock de inventario y cerrar la sesión de caja con arqueo ciego.
* **Pasos de Prueba:**
  1. Consulta el catálogo de productos vía API o panel: `GET /api/pos/productos`.
  2. Registra una venta en mostrador de 2 Gatorades ($4.000) vía `POST /api/pos/ventas`.
  3. El stock de Gatorades pasa de 45 a 43 unidades.
  4. **Cierre de Caja (Arqueo Ciego):**
     * Ejecuta `POST /api/caja/cierre` enviando el `monto_cierre_declarado` (conteo físico de la gaveta).
     * El sistema calcula `total_esperado_efectivo = monto_apertura + ventas_efectivo + turnos_efectivo`.
     * Computa automáticamente la `diferencia` (sobrante o faltante de caja) y cierra la sesión.
* **Resultado Esperado:** Auditoría financiera completa sin posibilidad de adulterar el conteo previo.

---

### Caso de Uso 15 (CU-15): Partidos Abiertos (Matchmaking) y Split Payment
* **Objetivo:** Convocatoria de jugadores y cobro fraccionado por participante en 4 cuotas.
* **Pasos de Prueba:**
  1. Consulta los partidos abiertos disponibles vía `GET /api/partidos-abiertos`.
  2. Observa el partido de pádel de 4ta categoría en Cancha 2 con 2 cuotas pagadas (Belasteguín y Lebrón) y 2 cuotas vacantes pendientes.
  3. Un nuevo jugador se une al partido enviando `POST /api/partidos-abiertos/{id}/unirse` con sus datos.
  4. Realiza el pago de la cuota 3 y cuota 4 vía `POST /api/split-pagos/{token}/pagar`.
* **Resultado Esperado:** Al completarse el 100% de las cuotas, el turno pasa automáticamente a estado `reservado` y el partido abierto a `completo`.

---

### Caso de Uso 16 (CU-16): Gestor de Torneos, Fixtures y Eliminación Directa
* **Objetivo:** Visualizar el cuadro de llaves (bracket) y cargar resultados deportivos.
* **Pasos de Prueba:**
  1. Consulta la estructura del torneo vía `GET /api/torneos/1/bracket`.
  2. Observa las 8 parejas sembradas en los cuartos de final.
  3. Los partidos 1 y 2 de cuartos ya figuran como `finalizados` con sus resultados en sets.
  4. La Semifinal 1 ya tiene clasificados a **Belasteguín / Coello** vs **Navarro / Di Nenno**.
  5. Carga el resultado de la semifinal enviando `POST /api/torneos/partidos/{id}/resultado`: el ganador avanza automáticamente a la posición correspondiente de la Gran Final.
* **Resultado Esperado:** Propagación matemática del árbol de llaves sin intervención manual.

---

### Caso de Uso 17 (CU-17): Domótica IoT y Sincronización Automática de Luces
* **Objetivo:** Probar el encendido y apagado de luces según el calendario de turnos.
* **Pasos de Prueba:**
  1. Ejecuta el comando Artisan del scheduler:
     ```bash
     docker compose exec backend php artisan iot:sincronizar-luces
     ```
  2. El comando evalúa cada dispositivo activo (`Relay Sonoff Cancha 1` y `Cancha 2`).
  3. Si la hora actual cae dentro del margen de 5 minutos antes o 5 minutos después de un turno confirmado, emite la orden `ENCENDER` vía HTTP/MQTT y actualiza el estado a `encendido`.
  4. Si no hay turnos activos en la cancha, emite la orden `APAGAR`.
* **Resultado Esperado:** Tabla de reporte en consola con el estado y acción tomada por cada cancha.

---

### Caso de Uso 18 (CU-18): CMS Web y Revalidación Perimetral ISR
* **Objetivo:** Editar páginas públicas informativas con purga instantánea de caché.
* **URL:** `http://nico-padel.localhost:8080/paginas/reglamento-interno`
* **Pasos de Prueba:**
  1. Accede a la URL de la página CMS del club.
  2. Observa el contenido HTML sanitizado (sin vectores de ataque XSS).
  3. Actualiza el contenido desde la API o Filament.
  4. El servicio `RevalidationService` dispara el webhook `POST /api/revalidate` en Next.js.
* **Resultado Esperado:** Actualización en el borde en milisegundos sin reiniciar el servidor frontend.

---

### Caso de Uso 19 (CU-19): Polling Silencioso, Campana Sonora y Notificación en Vivo
* **Objetivo:** Notificar a la recepción de nuevas reservas sin recargar la pantalla ni cerrar modales.
* **URL:** `http://nico-padel.localhost:8080/` (con sesión de administrador activa).
* **Pasos de Prueba:**
  1. Mantén abierta la grilla horaria en la pantalla de recepción.
  2. Desde otro navegador o dispositivo, reserva un turno libre en la misma cancha.
  3. En un intervalo máximo de 30 segundos (o inmediatamente al hacer clic en la pestaña si estaba en segundo plano):
* **Resultado Esperado:**
  * Se escucha la **campana armónica bifónica (E5 -> A5)** generada con la Web Audio API.
  * Aparece una alerta Toast flotante con ícono de campana: *"🔔 Nueva Reserva: [Cliente] en [Cancha] ([Horario])"*.
  * Si la pestaña estaba minimizada, el temporizador de 10 segundos se pausa y solo comienza a descontar cuando el usuario vuelve a mirar la pantalla (Page Visibility API).

---

## 🎯 7. Resumen de Certificación y Comandos Útiles

```bash
# 1. Repoblar el dataset completo en cualquier momento:
docker compose exec backend php artisan db:seed --class=FullTestingSeeder

# 2. Ejecutar la suite completa de tests de Backend (PHPUnit):
docker compose exec backend php artisan test

# 3. Ejecutar la suite completa de tests de Frontend (Vitest):
docker compose exec frontend npm test

# 4. Sincronizar luces de domótica IoT:
docker compose exec backend php artisan iot:sincronizar-luces

# 5. Ver logs en tiempo real del webserver Caddy y backend:
docker compose logs -f webserver backend
```
