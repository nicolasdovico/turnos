/**
 * Utilidades centralizadas para resolución de URLs en toda la plataforma:
 * - Soporta acceso por Subdominios (ej: nico-padel.localhost:8080 o nico-padel.turnos.com)
 * - Soporta acceso directo por IP en Mobile / LAN (ej: 10.20.30.13:8080 o 192.168.x.x)
 * - Soporta Dominio Principal / Portal Central (localhost:8080 o turnos.com)
 */

export function isIpAddress(hostname: string): boolean {
  if (!hostname) return false;
  return (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
    hostname === "::1" ||
    hostname.includes(":")
  );
}

/**
 * Obtiene la URL pública de la landing o grilla de un tenant/club.
 * En mobile / IP: /tenants/{subdomain}{path}
 * En subdominio de PC: {protocol}//{subdomain}.{baseDomain}{port}{path}
 */
export function getTenantPublicUrl(subdomain: string, path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : path ? `/${path}` : "";

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";

    if (isIpAddress(hostname)) {
      return `/tenants/${subdomain}${cleanPath}`;
    }

    let baseHost = "localhost";
    if (hostname.endsWith("turnos.com")) {
      baseHost = "turnos.com";
    }
    return `${protocol}//${subdomain}.${baseHost}${port}${cleanPath}`;
  }

  return `http://${subdomain}.localhost:8080${cleanPath}`;
}

/**
 * Obtiene la URL del panel de administración de un tenant/club.
 */
export function getTenantAdminUrl(subdomain: string, token?: string | null): string {
  const activeToken =
    token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("saas_token") || localStorage.getItem("token")
      : null);
  const tokenQuery = activeToken ? `?auth_token=${encodeURIComponent(activeToken)}` : "";

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";

    if (isIpAddress(hostname)) {
      return `/tenants/${subdomain}/panel${tokenQuery}`;
    }

    let baseHost = "localhost";
    if (hostname.endsWith("turnos.com")) {
      baseHost = "turnos.com";
    }
    return `${protocol}//${subdomain}.${baseHost}${port}/panel${tokenQuery}`;
  }

  return `http://${subdomain}.localhost:8080/panel${tokenQuery}`;
}

/**
 * Obtiene la URL hacia el portal o página del dominio raíz central.
 * Ejemplo de uso:
 * - getPortalUrl("/planes") -> en IP: "/planes", en subdominio PC: "http://localhost:8080/planes"
 * - getPortalUrl("/login")  -> en IP: "/login", en subdominio PC: "http://localhost:8080/login"
 * - getPortalUrl("/")       -> en IP: "/", en subdominio PC: "http://localhost:8080"
 */
export function getPortalUrl(path: string = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";

    // Si estamos en mobile/IP, las rutas del portal se navegan directo en la misma IP
    if (isIpAddress(hostname)) {
      return cleanPath;
    }

    // Si estamos en localhost o turnos.com
    let baseHost = "localhost";
    if (hostname.endsWith("turnos.com")) {
      baseHost = "turnos.com";
    }

    // Si ya estamos en el dominio raíz exacto sin subdominios, usar ruta relativa directa
    if (hostname === baseHost) {
      return cleanPath;
    }

    // Si estamos en un subdominio (ej: nico-padel.localhost:8080), regresar a la raíz principal
    return `${protocol}//${baseHost}${port}${cleanPath === "/" ? "" : cleanPath}`;
  }

  return `http://localhost:8080${cleanPath === "/" ? "" : cleanPath}`;
}
