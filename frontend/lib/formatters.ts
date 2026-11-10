/**
 * Utilidad global para formatear montos y precios monetarios
 * Regla: Sin separador de miles (ej: 10000, 8000, 8500), opcionalmente con prefijo '$'.
 */

export function formatPrecio(monto: number | string | null | undefined, incluirSigno: boolean = true): string {
  if (monto === null || monto === undefined || monto === "") {
    return incluirSigno ? "$0" : "0";
  }

  const num = typeof monto === "number" ? monto : parseFloat(String(monto).replace(/[^\d.-]/g, ""));
  if (isNaN(num)) {
    return incluirSigno ? "$0" : "0";
  }

  // Redondear a entero si no tiene centavos significativos, o mantener hasta 2 decimales limpios
  const valorLimpio = Number.isInteger(num) ? Math.round(num).toString() : num.toFixed(2).replace(/\.00$/, "");

  return incluirSigno ? `$${valorLimpio}` : valorLimpio;
}

export function formatMonto(monto: number | string | null | undefined): string {
  return formatPrecio(monto, false);
}
