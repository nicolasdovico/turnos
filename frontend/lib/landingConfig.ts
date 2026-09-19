export interface LandingFeature {
  id: string;
  title: string;
  category: "reservas" | "cobros" | "gestion" | "innovacion";
  badge: string;
  status: "available" | "coming_soon" | "in_development";
  iconName: string;
  shortDesc: string;
  fullDesc: string;
  highlights: string[];
}

export interface BeforeAfterItem {
  pain: string;
  solution: string;
}

export interface FaqItem {
  pregunta: string;
  respuesta: string;
}

export const LANDING_CONFIG = {
  trialDays: 30,
  trialText: "Prueba Gratis por 30 Días",
  trialSubtext: "Sin tarjeta de crédito. Configuración en 2 minutos.",
  hero: {
    badge: "⚡ Plataforma SaaS de Gestión Deportiva & Turnos",
    title: "La plataforma integral que transforma tu complejo en un club de primer nivel",
    subtitle:
      "Agenda online en tiempo real, cobros automáticos, cantina POS, caja diaria, torneos y control de luces. Todo tu club funcionando de forma autónoma con tu propia web.",
    stats: [
      { label: "Turnos gestionados", value: "+50.000" },
      { label: "Sobreturnos o colisiones", value: "0%" },
      { label: "Aumento en reservas online", value: "+35%" },
      { label: "Disponibilidad en la nube", value: "99.9%" },
    ],
  },
  beforeAfter: [
    {
      pain: "Audios y llamadas de WhatsApp a cualquier hora para consultar si hay cancha.",
      solution: "Grilla online 24/7 donde el jugador consulta horarios libres y reserva solo en 30 segundos.",
    },
    {
      pain: "Turnos 'clavados': clientes que reservan de palabra, no van y te hacen perder la recaudación.",
      solution: "Cobro automático de seña o total online antes de confirmar. Dinero asegurado en cada hora.",
    },
    {
      pain: "Enredos cotejando comprobantes de transferencias bancarias manuales en el celular.",
      solution: "Integración directa con Mercado Pago y cobros con acreditación instantánea.",
    },
    {
      pain: "Conflictos por lluvia o cancelaciones: llamadas reclamando devolución de dinero.",
      solution: "Billetera virtual automática: el saldo se acredita a favor del cliente en tu club para su próximo turno.",
    },
    {
      pain: "Planillas de papel borroneadas y discusiones por turnos fijos semanales.",
      solution: "Gestión de turnos fijos por 6 meses con renovación y opción de liberar fechas aisladas a la venta.",
    },
  ] as BeforeAfterItem[],
  features: [
    {
      id: "reservas-grilla",
      title: "Reservas & Agenda en Tiempo Real",
      category: "reservas",
      badge: "Operativo",
      status: "available",
      iconName: "Calendar",
      shortDesc: "Grilla reactiva con bloqueos de 10 minutos contra sobreturnos.",
      fullDesc:
        "Tus clientes ven la disponibilidad en vivo desde su celular o computadora. Al seleccionar un horario, el sistema lo bloquea atómicamente para evitar que dos personas reserven la misma cancha.",
      highlights: [
        "Bloqueo atómico temporal de 10 minutos",
        "Visualización optimizada para celulares",
        "Diferenciación por tipo de deporte y superficie",
      ],
    },
    {
      id: "senas-billetera",
      title: "Cobro de Señas & Billetera Virtual",
      category: "cobros",
      badge: "Operativo",
      status: "available",
      iconName: "Wallet",
      shortDesc: "Asegurá tu recaudación y fidelizá clientes con saldo a favor.",
      fullDesc:
        "Configurá el porcentaje de seña requerido o cobro total. Si un cliente cancela dentro de la política permitida, el dinero no se pierde: se le acredita en su billetera virtual exclusiva de tu club.",
      highlights: [
        "Configuración flexible de seña (% o total)",
        "Reembolsos automáticos a billetera por cancelación o lluvia",
        "Panel de auditoría de saldos y extractos para el administrador",
      ],
    },
    {
      id: "turnos-fijos",
      title: "Turnos Fijos y Recurrentes",
      category: "gestion",
      badge: "Operativo",
      status: "available",
      iconName: "Repeat",
      shortDesc: "Organizá tus abonados semanales por 6 meses sin fricciones.",
      fullDesc:
        "Cargá los turnos semanales fijos con un solo clic. Si un abonado no puede asistir una fecha puntual, puede liberarla para que vuelva a la grilla pública y se notifique a la lista de espera.",
      highlights: [
        "Vigencia por 6 meses con alerta de renovación",
        "Liberación de fechas puntuales a venta libre",
        "Registro de pagos por turno o mensuales",
      ],
    },
    {
      id: "tarifa-luz",
      title: "Tarifas Inteligentes de Iluminación",
      category: "cobros",
      badge: "Operativo",
      status: "available",
      iconName: "SunMoon",
      shortDesc: "Cobro automático con o sin luz artificial según la estación del año.",
      fullDesc:
        "Definí el horario de corte de iluminación para invierno y verano. El sistema calcula de forma transparente el precio correcto del turno según la hora en que finaliza el partido.",
      highlights: [
        "Horario de corte configurable (ej. invierno 18:00 hs vs verano 20:00 hs)",
        "Cálculo automático en la grilla y en el checkout",
        "Diferenciación por canchas cubiertas vs descubiertas",
      ],
    },
    {
      id: "lista-espera",
      title: "Lista de Espera Inteligente",
      category: "reservas",
      badge: "Operativo",
      status: "available",
      iconName: "Users",
      shortDesc: "Si se libera un turno ocupado, avisamos al instante a los interesados.",
      fullDesc:
        "Los jugadores pueden anotarse para recibir una alerta inmediata si se libera una cancha en su horario deseado. Nunca más una cancha vacía por una baja de último momento.",
      highlights: [
        "Suscripción en 1 clic desde la grilla",
        "Despacho instantáneo al liberarse el turno",
        "Maximiza la ocupación en horarios pico",
      ],
    },
    {
      id: "subdominio-propio",
      title: "Subdominio y Web Propia para tu Club",
      category: "gestion",
      badge: "Operativo",
      status: "available",
      iconName: "Globe",
      shortDesc: "Presencia digital con tu identidad de marca y enlace directo.",
      fullDesc:
        "Cada club cuenta con su propia dirección web (ej: tuclub.localhost:8080 o tuclub.turnos.com). Personalizá tu logo, fotos de canchas, políticas de reserva y promociones.",
      highlights: [
        "Dirección web exclusiva para compartir en Instagram y WhatsApp",
        "Diseño moderno y adaptable a tu identidad",
        "Independencia y aislamiento total de datos de tu club",
      ],
    },
    // Roadmap Features
    {
      id: "pos-buffet",
      title: "POS & Buffet / Cantina",
      category: "innovacion",
      badge: "En Desarrollo",
      status: "coming_soon",
      iconName: "Coffee",
      shortDesc: "Punto de venta para cantina, control de stock y comanda vinculada al turno.",
      fullDesc:
        "Administrá las ventas de bebidas, pelotas, paletas y comidas en el club. Asigná consumiciones directamente a la cancha para cobrar todo junto al finalizar el partido y realizá el arqueo diario.",
      highlights: [
        "Control de inventario y stock mínimo",
        "Comandas asociadas a turnos o venta directa en barra",
        "Arqueo ciego de caja diaria y reportes",
      ],
    },
    {
      id: "torneos-fixtures",
      title: "Gestor de Torneos & Fixtures",
      category: "innovacion",
      badge: "En Desarrollo",
      status: "coming_soon",
      iconName: "Trophy",
      shortDesc: "Armado de cuadros, llaves eliminatorias y resultados en vivo para torneos.",
      fullDesc:
        "Organización integral de torneos por categorías. Creá zonas, llaves de eliminación directa, programá los partidos en las canchas de tu club y mostrá las tablas en tiempo real a los jugadores.",
      highlights: [
        "Generador automático de llaves y zonas",
        "Asignación de horarios y canchas a partidos de torneo",
        "Tablas de posiciones y cuadros en vivo",
      ],
    },
    {
      id: "turnos-abiertos",
      title: "Partidos Abiertos & Matchmaking",
      category: "innovacion",
      badge: "En Desarrollo",
      status: "coming_soon",
      iconName: "Flame",
      shortDesc: "Conectá jugadores faltantes con Split Payment (pago fraccionado).",
      fullDesc:
        "Los jugadores pueden abrir un turno incompleto y buscar compañeros o rivales de su misma categoría. Cada uno paga su porcentaje correspondiente (25% en pádel) directamente desde su celular.",
      highlights: [
        "Búsqueda de jugadores por nivel y categoría",
        "Split Payment: cada jugador abona su propia cuota",
        "Confirmación automática al completar el cuarteto",
      ],
    },
    {
      id: "domotica-iot",
      title: "Domótica IoT: Control de Luces",
      category: "innovacion",
      badge: "En Desarrollo",
      status: "coming_soon",
      iconName: "Zap",
      shortDesc: "Encendido y apagado autónomo de iluminación según la grilla horaria.",
      fullDesc:
        "Conectá los reflectores de tus canchas con relés inteligentes (Sonoff / Shelly). La iluminación se enciende 5 minutos antes del turno confirmado y se apaga automáticamente al finalizar.",
      highlights: [
        "Ahorro de hasta un 30% en consumo eléctrico",
        "Elimina descuidos de luces encendidas en canchas vacías",
        "Control manual y de emergencia desde el panel admin",
      ],
    },
  ] as LandingFeature[],
  faqs: [
    {
      pregunta: "¿Cómo funciona la prueba gratuita por 30 días?",
      respuesta:
        "Podés registrar tu club en 2 minutos y acceder de inmediato a todas las funcionalidades del sistema sin pagar nada. No te solicitamos tarjeta de crédito ni compromiso de permanencia.",
    },
    {
      pregunta: "¿Mis clientes tienen que instalarse alguna app pesada?",
      respuesta:
        "No. Nuestra plataforma funciona 100% en la web moderna. Tus clientes simplemente tocan el enlace de tu club desde Instagram, WhatsApp o Google y reservan en 30 segundos desde su navegador.",
    },
    {
      pregunta: "¿Puedo seguir tomando turnos en mostrador o por teléfono?",
      respuesta:
        "¡Absolutamente! La grilla para recepcionistas te permite bloquear o asignar un turno en solo 2 clics, cobrar en efectivo o con tarjeta, e incluso registrar clientes rápidos sin demoras.",
    },
    {
      pregunta: "¿Cómo se gestiona el dinero de las señas?",
      respuesta:
        "Las señas se cobran directamente a través de tu cuenta de Mercado Pago o tarjetas. El dinero ingresa a tu propia cuenta sin intermediarios.",
    },
    {
      pregunta: "¿Qué pasa si llueve o se suspende un turno?",
      respuesta:
        "El administrador puede cancelar el turno y el dinero se acredita automáticamente en la Billetera Virtual del cliente dentro de tu complejo. El cliente podrá usar ese saldo para su próxima reserva, evitando transferencias bancarias manuales.",
    },
    {
      pregunta: "¿Cómo se actualizan los módulos en desarrollo (Buffet, Torneos, etc.)?",
      respuesta:
        "Nuestra plataforma está en constante evolución. Cuando un nuevo módulo es lanzado, se activa automáticamente en tu panel según tu plan contratado, sin necesidad de instalaciones ni migraciones técnicas.",
    },
  ] as FaqItem[],
};
