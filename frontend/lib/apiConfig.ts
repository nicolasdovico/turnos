export function getClientApiBase(): string {
  if (typeof window !== "undefined") {
    // En el navegador, las llamadas a la API deben ser siempre relativas a la dirección
    // desde donde el usuario está navegando (ej: http://10.20.30.13:8080/api o http://localhost:8080/api)
    return "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
}
