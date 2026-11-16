/**
 * Registro Oficial de Módulos y Funcionalidades del SaaS Deportivo.
 *
 * Este registro gobierna la visibilidad de los módulos en el Panel de Administración
 * y en las tarjetas de venta/upgrade de planes.
 *
 * REGLA DE ORO:
 * - Un módulo solo debe tener estado "produccion" cuando su pantalla / UI en el Panel
 *   esté 100% desarrollada y lista para que el administrador interactúe con ella.
 * - Los módulos en "en_desarrollo" permanecen automáticamente invisibles en el menú,
 *   en las tarjetas de precios y en los modales de upgrade, evitando prometer funciones
 *   incompletas al cliente.
 */

export interface FeatureModule {
  slug: string;
  nombre: string;
  descripcionCorta: string;
  descripcionLarga: string;
  icon: string;
  planMinimo: "bronce" | "plata" | "oro";
  estado: "produccion" | "en_desarrollo";
  tabId?: string; // ID de solapa en el panel (/panel)
  actionHref?: string;
}

export const PLATFORM_MODULES: FeatureModule[] = [
  {
    slug: "reservas",
    nombre: "Agenda & Grilla de Turnos",
    descripcionCorta: "Grilla horaria interactiva y reservas en tiempo real.",
    descripcionLarga: "Administración integral de canchas, slots por día, bloqueos y confirmación de turnos.",
    icon: "🎾",
    planMinimo: "bronce",
    estado: "produccion",
    tabId: "canchas",
    actionHref: "#canchas",
  },
  {
    slug: "caja",
    nombre: "Control de Caja & Arqueo Ciego",
    descripcionCorta: "Gestión de turnos de caja, ingresos y cierre ciego.",
    descripcionLarga: "Control de fondos iniciales, cobros en mostrador, discriminación por medios de pago y arqueo diario.",
    icon: "💵",
    planMinimo: "bronce",
    estado: "produccion",
    tabId: "caja",
    actionHref: "#caja",
  },
  {
    slug: "clientes",
    nombre: "Padrón de Clientes & CRM 360°",
    descripcionCorta: "Directorio de socios y deportistas con historial de turnos.",
    descripcionLarga: "Base unificada de clientes con balance de billetera, asistencia y preferencias de contacto.",
    icon: "👥",
    planMinimo: "bronce",
    estado: "produccion",
    tabId: "clientes",
    actionHref: "#clientes",
  },
  {
    slug: "cms_web",
    nombre: "Sitio Web Institucional & Marca",
    descripcionCorta: "Página web propia del club con optimización SEO y plantillas.",
    descripcionLarga: "Diseño con paleta de colores del club, subida de logo y portada, y gestor de páginas institucionales.",
    icon: "🎨",
    planMinimo: "bronce",
    estado: "produccion",
    tabId: "sitio-web",
    actionHref: "#sitio-web",
  },
  {
    slug: "billeteras",
    nombre: "Billeteras Virtuales de Clientes",
    descripcionCorta: "Carga de saldo a favor y débito automático en turnos.",
    descripcionLarga: "Cuentas corrientes para jugadores frecuentes, agilizando pagos recurrentes y señas.",
    icon: "👛",
    planMinimo: "bronce",
    estado: "produccion",
    tabId: "billeteras",
    actionHref: "#billeteras",
  },
  {
    slug: "turnos_fijos",
    nombre: "Turnos Fijos Semestrales",
    descripcionCorta: "Asignación recurrente semanal para clientes fijos.",
    descripcionLarga: "Generación periódica automática de turnos semanales y mensuales para socios y abonados fijos.",
    icon: "🔁",
    planMinimo: "plata",
    estado: "produccion",
    tabId: "turnos-fijos",
    actionHref: "#turnos-fijos",
  },
  {
    slug: "pos_buffet",
    nombre: "Buffet & Punto de Venta (POS)",
    descripcionCorta: "Comandas, ventas de mostrador y stock de kiosco.",
    descripcionLarga: "Control de stock de cafetería/kiosco, venta rápida en mostrador e integración con caja diaria.",
    icon: "🍔",
    planMinimo: "plata",
    estado: "produccion",
    tabId: "pos-buffet",
    actionHref: "#pos-buffet",
  },
  // =========================================================================
  // MÓDULOS EN DESARROLLO (ACTIVAR A "produccion" CUANDO SE CONSTRUYA SU UI)
  // =========================================================================
  {
    slug: "split_payment",
    nombre: "Turnos Abiertos & Split Payment",
    descripcionCorta: "Convocatorias abiertas de partidos y cobro fraccionado por jugador.",
    descripcionLarga: "Matchmaking de jugadores incompletos y división automática de la tarifa del turno entre participantes.",
    icon: "💳",
    planMinimo: "plata",
    estado: "en_desarrollo", // 🚧 Activarlo cuando se desarrolle su solapa en el panel
    tabId: "partidos-abiertos",
  },
  {
    slug: "torneos",
    nombre: "Gestor de Torneos & Fixtures",
    descripcionCorta: "Cuadros de llaves eliminatorias y fases de grupos.",
    descripcionLarga: "Administración de torneos, llaves de playoffs, fixtures automáticos y tablas de posiciones.",
    icon: "🏆",
    planMinimo: "oro",
    estado: "en_desarrollo", // 🚧 Activarlo cuando se desarrolle su solapa en el panel
    tabId: "torneos",
  },
  {
    slug: "domotica",
    nombre: "Automatización de Luces IoT",
    descripcionCorta: "Encendido y apagado de reflectores sincronizado con reservas.",
    descripcionLarga: "Control inteligente de iluminación por relés IoT sincronizado con el inicio y fin de cada partido.",
    icon: "💡",
    planMinimo: "oro",
    estado: "en_desarrollo", // 🚧 Activarlo cuando se desarrolle su solapa en el panel
    tabId: "domotica",
  },
];

/**
 * Obtener todos los módulos listos para producción.
 */
export const getModulosProduccion = (): FeatureModule[] => {
  return PLATFORM_MODULES.filter((m) => m.estado === "produccion");
};

/**
 * Obtener las funcionalidades destacadas que deben mostrarse para un plan específico
 * en las tarjetas de precios / upgrade.
 */
export const getFeaturesParaPlan = (planSlug: "bronce" | "plata" | "oro"): FeatureModule[] => {
  return PLATFORM_MODULES.filter(
    (m) => m.estado === "produccion" && m.planMinimo === planSlug
  );
};

/**
 * Comprobar si un slug de módulo está en estado de producción.
 */
export const isModuloEnProduccion = (slug: string): boolean => {
  const mod = PLATFORM_MODULES.find((m) => m.slug === slug);
  return mod?.estado === "produccion";
};
