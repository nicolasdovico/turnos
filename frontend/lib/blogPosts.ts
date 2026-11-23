export function formatBlogDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}-${month}-${year}`;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: "Rentabilidad" | "Gestión" | "Pádel" | "Fútbol";
  readTime: string;
  date: string;
  author: string;
  keywords: string[];
  content: string[]; // párrafos o secciones con markdown simple
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "como-evitar-que-te-claven-con-turnos-canchas-padel-futbol",
    title: "Cómo evitar que te claven con turnos y reservas en canchas de pádel y fútbol",
    excerpt: "El 'no-show' o turno fantasma es el mayor drenaje de dinero en un complejo deportivo. Conocé la estrategia definitiva de señas automatizadas con Mercado Pago.",
    category: "Rentabilidad",
    readTime: "4 min de lectura",
    date: "2026-11-20",
    author: "Equipo TurnosFlow",
    keywords: [
      "como cobrar senas canchas padel",
      "turnos fantasmas complejos deportivos",
      "politica de cancelacion canchas de futbol",
      "no show canchas de padel",
      "cobrar senas mercado pago turnos"
    ],
    content: [
      "Todo administrador de canchas ha vivido la misma pesadilla un viernes o sábado a las 20:00 hs: una cancha reservada por WhatsApp, luces encendidas, personal listo... y el grupo nunca aparece o avisa 10 minutos antes que 'se les cayó uno'.",
      "En un complejo de 3 o 4 canchas, un 10% de ausencias no avisadas representa fácilmente pérdidas superiores a los $300.000 o $400.000 pesos mensuales. No se trata solo de la hora de cancha vacía: son costos fijos de iluminación, empleados y turnos rechazados a clientes serios.",
      "### Por qué el WhatsApp manual no alcanza para frenar las ausencias",
      "Gestionar señas por chat pidiendo comprobantes por transferencia bancaria genera un cuello de botella agotador: clientes que tardan horas en enviar el recibo, transferencias duplicadas o falsificadas, y horarios que quedan bloqueados preventivamente hasta que se cae la reserva.",
      "### La solución: Seña obligatoria automática con liberación de horario",
      "La regla de oro de los complejos modernos con alta rentabilidad es simple: **el turno no existe hasta que se abona la seña**. Con una plataforma como TurnosFlow, el jugador selecciona su horario en la web del club y dispone de 10 minutos para pagar el 50% vía Mercado Pago. Si no lo hace, el slot se libera al instante.",
      "### Políticas claras de cancelación y billetera virtual",
      "¿Qué pasa cuando un cliente realmente necesita cancelar por fuerza mayor? La automatización resuelve el conflicto sin desgastes personales:",
      "- **Cancelación con más de 4 horas de anticipación:** El sistema le reintegra el monto automáticamente a su Billetera Virtual en el club para que lo use en su próximo turno (el dinero nunca sale del complejo).",
      "- **Cancelación tardía:** Se retiene la seña en concepto de penalidad para cubrir el costo operativo de la cancha.",
      "Implementar este circuito simple elimina el 98% de las ausencias no avisadas y profesionaliza la imagen de tu predio desde el primer día."
    ],
  },
  {
    slug: "planilla-excel-vs-software-turnos-complejos-deportivos",
    title: "Planilla de Excel vs Software de Turnos: ¿Cuándo conviene dar el salto en tu complejo?",
    excerpt: "Analizamos los costos ocultos de gestionar reservas con cuadernos o Excel frente a los beneficios de una grilla online automatizada disponible 24/7.",
    category: "Gestión",
    readTime: "5 min de lectura",
    date: "2026-11-18",
    author: "Equipo TurnosFlow",
    keywords: [
      "planilla excel turnos canchas gratis",
      "software reservas deportivas vs excel",
      "como administrar complejo deportivo",
      "control de caja para canchas padel",
      "sistema de reservas online clubes"
    ],
    content: [
      "Cuando un complejo abre sus puertas con 1 o 2 canchas, una planilla de cálculo compartida en Google Drive o una libreta parecen suficientes. Pero a medida que el flujo de reservas crece, lo que empezó siendo una herramienta gratis se convierte en una fuga constante de tiempo y dinero.",
      "### Los 4 costos ocultos de seguir usando Excel",
      "1. **Superposición de turnos (El temido 'doble turno'):** Dos personas anotando reservas al mismo tiempo por WhatsApp y teléfono terminan prometiendo la misma cancha a las 20:00 hs. La discusión y el mal momento con los jugadores daña la reputación del club.",
      "2. **Dependencia absoluta de una persona:** El dueño o encargado tiene que estar pegado al teléfono las 24 horas del día respondiendo si 'hay lugar a las 19 hs'. Un mensaje no contestado a tiempo es un turno que se lleva el complejo vecino.",
      "3. **Descontrol en la caja diaria:** Registrar pagos en efectivo, transferencias sueltas y fiados en una celda de Excel casi siempre resulta en diferencias al momento del arqueo final.",
      "4. **Falta de historial de clientes:** Con Excel es imposible saber quién es tu cliente más fiel, quién cancela seguido o a quién premiar con una promoción para llenar un horario muerto de la tarde.",
      "### El salto a la automatización: ¿Qué cambia con TurnosFlow?",
      "Al pasar a un software en la nube:",
      "- **Tus clientes reservan solos las 24 horas:** La grilla online muestra los horarios libres en tiempo real desde el celular del jugador.",
      "- **Cobro automático de señas:** La plata entra directo a tu cuenta de Mercado Pago o caja del club.",
      "- **Punto de Venta (POS) y Cantina:** Las bebidas, alquiler de paletas y pelotas se cargan directo al turno o cliente.",
      "Dar el salto no requiere conocimientos técnicos ni instalaciones complejas: en menos de 15 minutos tu club ya puede tener su web operativa."
    ],
  },
  {
    slug: "como-abrir-complejo-padel-rentabilidad-tendencias-2026",
    title: "Guía definitiva para abrir o modernizar un complejo de pádel en 2026",
    excerpt: "Canchas panorámicas de cristal, césped monofilamento, domótica de luces y reservas digitales: las claves para maximizar el retorno de inversión.",
    category: "Pádel",
    readTime: "6 min de lectura",
    date: "2026-11-15",
    author: "Equipo TurnosFlow",
    keywords: [
      "abrir complejo de padel rentabilidad",
      "costo cancha padel cristal",
      "administrar canchas de padel argentina",
      "domotica luces canchas padel",
      "software para canchas de padel"
    ],
    content: [
      "El auge global del pádel ha transformado por completo el modelo de negocios de los clubes. El jugador actual ya no se conforma con una cancha de muro despintada y un fixture en una pizarra: busca canchas de cristal panorámico, iluminación LED uniforme y la posibilidad de reservar y pagar desde su teléfono móvil.",
      "### 1. La infraestructura que marca la diferencia",
      "- **Canchas de Cristal y Césped Sintético Texturado:** Son el estándar exigido por los jugadores para evitar lesiones y disfrutar de un rebote limpio.",
      "- **Techado o Cubierta:** En zonas de lluvias o calor extremo, las canchas techadas garantizan facturación 100% predecible durante los 365 días del año.",
      "### 2. Eficiencia energética y domótica inteligente",
      "La luz artificial es uno de los costos operativos más pesados de un predio. Encender reflectores manualmente o dejarlos prendidos entre turnos desaprovecha miles de kilowatts.",
      "Con sistemas de automatización IoT integrados al software de turnos, los reflectores se encienden 5 minutos antes de la hora pactada y se apagan automáticamente si la cancha no está ocupada, reduciendo la factura eléctrica hasta un 30%.",
      "### 3. Crear comunidad: El verdadero secreto de la ocupación plena",
      "El éxito financiero de un club no radica en los turnos de las 20:00 hs (que se llenan solos), sino en los horarios valle (de 14:00 a 18:00 hs). Fomentar torneos relámpago, ligas corporativas y convocatorias de partidos abiertos permite captar a jugadores que no tienen pareja fija y mantener las canchas girando todo el día."
    ],
  },
  {
    slug: "partidos-abiertos-split-payment-llenar-turnos-vacios",
    title: "Partidos Abiertos y Split Payment: La nueva forma en que los clubes llenan turnos vacíos",
    excerpt: "Descubrí cómo el pago fraccionado por jugador y el armado de partidos comunitarios aumentan la ocupación de tus canchas hasta un 35%.",
    category: "Pádel",
    readTime: "4 min de lectura",
    date: "2026-11-12",
    author: "Equipo TurnosFlow",
    keywords: [
      "partidos abiertos padel",
      "split payment canchas",
      "pago dividido turnos padel",
      "como armar partidos de padel",
      "matchmaking jugadores de padel"
    ],
    content: [
      "Uno de los principales frenos que sufren los deportes grupales como el pádel o el fútbol es el 'factor organizador': la persona que quiere jugar pero se cansa de llamar a tres amigos, perseguirlos para que paguen y terminar haciéndose cargo de toda la cancha.",
      "### ¿Qué es el Split Payment o Pago Fraccionado?",
      "Tradicionalmente, un jugador titular pagaba la totalidad del turno y luego enviaba su alias a los demás por WhatsApp para recolectar el dinero. Si alguien no le pagaba, el titular salía perdiendo.",
      "El sistema de **Split Payment de TurnosFlow** divide automáticamente el valor del turno en cuotas individuales (por ejemplo, 4 cuotas de $2.500 para un turno de $10.000). Cada jugador recibe su enlace exclusivo de pago y abona con su propio medio (Mercado Pago, tarjeta de débito o transferencia).",
      "### Partidos Abiertos y Convocatorias Comunitarias",
      "¿Qué pasa cuando un jugador o una pareja no tiene rivales? El club o el propio usuario puede crear un **Partido Abierto** en la web comunitaria del predio.",
      "- Se publica la fecha, horario, cancha y nivel sugerido (ej. 5ta o 6ta categoría).",
      "- Otros jugadores se inscriben directamente desde su celular y abonan su parte.",
      "- A medida que las 4 cuotas se acreditan, el turno se confirma automáticamente en la grilla y el club recibe el 100% de la tarifa sin mover un dedo.",
      "Esta funcionalidad convierte a tu complejo en un punto de encuentro social, atrayendo a cientos de jugadores que antes no jugaban por no tener con quién coordinar."
    ],
  },
];
