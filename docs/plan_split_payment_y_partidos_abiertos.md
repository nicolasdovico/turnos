# Especificación Funcional y Arquitectura: Turnos Abiertos & Split Payment

> **Documento de Diseño y Definición Operativa**  
> **Fecha:** 22 de Noviembre de 2026  
> **Módulo:** `split_payment` (Plan Plata u Oro)  
> **Proyecto:** SaaS Deportivo Multitenant & CMS (Turnos Flow)

---

## 📌 1. Visión General del Módulo

El módulo de **Turnos Abiertos & Split Payment** resuelve dos necesidades críticas de los complejos deportivos:
1. **Fraccionamiento de Pago (Split Payment):** Evitar que un solo jugador (el organizador o capitán) tenga que asumir el costo total de la cancha y luego lidiar con transferencias o reclamos a sus compañeros.
2. **Convocatoria Comunitaria (Partidos Abiertos / Matchmaking):** Completar turnos vacíos o incompletos cuando a un grupo le faltan jugadores (ej: *"Falta el 4to en pádel"*, *"Faltan 2 para el Fútbol 5"* o *"Singles de Tenis nivel intermedio"*).

---

## 🎯 2. Respuestas y Definiciones Clave a los Puntos de Negocio

### 2.1. Obligatoriedad de Sitio Web Propio para el Club
- **Definición:** Para publicar convocatorias abiertas en la web pública del club (`[subdominio].turnosflow.com` o dominio propio), el complejo debe tener activo el módulo de web/CMS.
- **Jerarquía de Planes:** Dado que `split_payment` exige **Plan Plata** ($59/mes) u **Oro** ($99/mes), y ambos planes ya incluyen de forma nativa el módulo **CMS Web** (`cms_web`), **todos los clubes habilitados para Split Payment cuentan automáticamente con su propia web oficial**.
- **Canal Alternativo (Directo sin Web):** Si el club o el organizador prefieren no publicar la convocatoria abierta al público general, el sistema permite generar los enlaces tokenizados de pago (`/split-pagos/[token]`) en modo **"Privado / Entre Amigos"**, permitiendo compartir los links exclusivamente por mensaje directo sin listarlo en la portada pública.

---

### 2.2. Momento del Pago: ¿El jugador debe pagar en el acto al anotarse?
Existen dos modalidades operativas según quién convoque:

#### **Modalidad A: Convocatoria Abierta Pública (Matchmaking / Jugadores Desconocidos)**
- **Regla Estricta:** Al hacer clic en *"Sumarme a este Partido"*, el jugador **debe abonar su cuota en el momento** (vía Mercado Pago, tarjeta o débito) para confirmar su plaza.
- **Justificación:** Si se permitiera anotarse "de palabra" sin pagar, un usuario anónimo podría reservar el lugar, no presentarse a la hora del partido y arruinar el juego a los otros 3 participantes y al club.
- **Garantía:** El cupo solo se descuenta de forma segura una vez que la pasarela confirma el pago de la cuota.

#### **Modalidad B: Split Privado de un Turno ya Reservado (Grupo de Amigos)**
- El organizador reserva el turno y elige *"Dividir el pago entre 4"*.
- El sistema genera los 4 links de pago individuales:
  - **Cuota 1 (Organizador):** Puede pagarla en el acto como seña de compromiso.
  - **Cuotas 2, 3 y 4:** Quedan en estado `pendiente`. Los amigos van ingresando a su link y abonando su parte antes de la hora límite configurada por el club.
  - **Opción de Pago en Mostrador:** El administrador del club también puede marcar manualmente una cuota como *"Pagada en Efectivo / Mostrador"* si el jugador abona al llegar al club.

---

### 2.3. Envío de Links de Pago y Agenda de Teléfonos del Club
¿El club necesita tener agendados previamente los números de los jugadores? **No necesariamente, el sistema ofrece 3 vías ágiles:**

1. **Autocompletado con el CRM / Directorio de Clientes:**
   - Si el jugador ya es cliente habitual registrado en la base del club (`clientes`), el administrador simplemente escribe su nombre o DNI y el sistema autocompleta su teléfono WhatsApp.
   - Con un solo clic en el icono verde de WhatsApp, se abre la conversación con el mensaje prearmado:  
     > *"¡Hola [Nombre]! Te paso el link para abonar tu parte del turno de Pádel de hoy a las 20:00 hs en Cancha 2: [URL_PAGO]"*
2. **Botón Rápido "Copiar Enlace" (Para compartir al Organizador):**
   - El club no necesita agendar a los otros 3 jugadores desconocidos. El administrador o la web le entrega los links al Capitán/Organizador con un botón:  
     > *"Copiar todos los links para el grupo de WhatsApp"*. El capitán los reenvía a su propio grupo de amigos.
3. **Ingreso Manual de Teléfono sin necesidad de agendar en la agenda física del teléfono:**
   - Al usar enlaces `https://wa.me/549XXXXXXXXXX?text=...`, el club puede despachar el WhatsApp desde la PC o celular sin tener que guardar el contacto en la libreta telefónica del dispositivo.

---

### 2.4. ¿Quién crea el partido abierto? (Cliente vs Administrador)

El sistema está concebido con un **modelo híbrido** para que puedan crearlo **ambos**, adaptándose a la dinámica real de los clubes:

#### **Caso 1: El Cliente / Jugador desde la Web Pública del Club**
- **Escenario:** Un jugador quiere jugar un partido (ej. pádel hoy a las 20:00 hs) pero son solo 2 o 3 amigos, o está solo y busca rivales de su nivel.
- **Flujo:**
  1. En la web del club (`[subdominio].turnosflow.com`), al seleccionar un slot libre en la grilla, elige la opción: *"Crear Partido Abierto (Convocatoria)"*.
  2. Define la categoría/nivel deseado (ej. *7ma categoría*) y la cantidad de jugadores totales (ej. 4).
  3. **Compromiso inicial:** Para publicar la convocatoria y que no sea una reserva fantasma, el cliente organizador **paga su cuota parte en el momento** (ej. $4.000 de los $16.000).
  4. La cancha queda **bloqueada preventivamente** para esa convocatoria y aparece publicada en la web del club para que los otros jugadores se sumen y paguen.

#### **Caso 2: El Administrador del Club desde el Panel de Control**
- **Escenario:** El dueño o encargado de mostrador ve que tiene canchas libres en horarios muertos o le avisan por WhatsApp *"Armame un partido para 6ta si tenés gente libre"*.
- **Flujo:**
  1. Desde la solapa **Partidos Abiertos**, hace clic en *"Crear Convocatoria"*.
  2. Selecciona la cancha, fecha, horario y nivel.
  3. Puede iniciarlo con un organizador ya registrado en su padrón de clientes o lanzarlo como *"Convocatoria Oficial del Club"*.
  4. El club obtiene los links de pago para enviarlos a sus clientes habituales por WhatsApp o dejar que la comunidad del club los complete desde la web.

---

## 🏗️ 3. Arquitectura y Componentes a Desarrollar

```
                               ┌───────────────────────────────────────────────┐
                               │           PANEL DE ADMINISTRACIÓN             │
                               │        (GestionPartidosAbiertos.tsx)          │
                               └───────┬───────────────────────────────┬───────┘
                                       │                               │
                      Crea Convocatoria / Fracciona Turno      Monitorea Pagos en Vivo
                                       │                               │
                                       ▼                               ▼
        ┌──────────────────────────────────────────────┐    ┌───────────────────────────────────┐
        │                 WEB PÚBLICA                  │    │       CHECKOUT SPLIT TOKEN        │
        │           (Sección Partidos Abiertos)        │    │      (/split-pagos/[token])       │
        ├──────────────────────────────────────────────┤    ├───────────────────────────────────┤
        │ • Tarjetas de partidos buscando gente        │    │ • Detalle del turno y club        │
        │ • Nivel / Deporte / Horario / Cupos          │    │ • Cuota a abonar ($)              │
        │ • Botón "Sumarme y Pagar Mi Parte"           │    │ • Pago online con Mercado Pago    │
        └──────────────────────────────────────────────┘    └─────────────────┬─────────────────┘
                                                                              │
                                                                       Pago 100% Completo
                                                                              │
                                                                              ▼
                                                            ┌───────────────────────────────────┐
                                                            │     CONFIRMACIÓN ATÓMICA          │
                                                            │   Turno -> 'reservado' en BD      │
                                                            │   Notificación al Club y Jugadores│
                                                            └───────────────────────────────────┘
```

---

## 📋 4. Plan de Trabajo por Etapas

### Etapa 1: Backend & Endpoints Auxiliares para el Club
- Ruta `GET /api/clubs/{subdomain}/partidos-abiertos`: Convocatorias activas y su progreso de pago.
- Ruta `GET /api/clubs/{subdomain}/turnos-para-split`: Listado de turnos que pueden ser fraccionados.
- Ruta `POST /api/clubs/{subdomain}/partidos-abiertos/{id}/cancelar`: Cancelación administrativa y liberación de grilla.
- Tests PHPUnit en `tests/Feature/SplitPaymentTest.php` validando los nuevos endpoints y el aislamiento multi-tenant.

### Etapa 2: Pantalla Pública de Pago Individual (`/split-pagos/[token]`)
- Página responsive en Next.js adaptada a dispositivos móviles.
- Carga de la cuota y datos del club mediante `GET /api/split-pagos/{token}`.
- Formulario de identificación del jugador (Nombre, Teléfono) y botón de pago por Mercado Pago o simulación aprobada.
- Transición en tiempo real al registrarse el pago.

### Etapa 3: Componente de Panel de Control (`GestionPartidosAbiertos.tsx`)
- Pestaña `"partidos-abiertos"` en el panel del club.
- Candado de upgrade para Plan Bronce con explicación comercial.
- Tabla con estado de cuotas (Pagadas vs Pendientes), botón de apertura de WhatsApp con link y cobro manual en mostrador.
- Modal de creación de partido abierto o fraccionamiento de turno existente.

### Etapa 4: Convocatorias en la Web Pública del Club
- Integración en la página principal del club de un bloque dinámico: *"Partidos Abiertos / Sumate a Jugar"*.
- Lista de partidos buscando jugadores con botón de acción directa.

### Etapa 5: Verificación & Tests Automatizados
- Suite Vitest para `GestionPartidosAbiertos.test.tsx` y `SplitPagoCheckout.test.tsx`.
- Transición en `modulesRegistry.ts` a `"produccion"`.
