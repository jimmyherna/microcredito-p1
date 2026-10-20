// Formato de dinero y etiquetas para la interfaz. Regla E1: "ninguna cifra mostrada se calcula en la
// interfaz" — aquí SOLO se da formato de texto a valores que ya vienen calculados por la API.

export interface Dinero {
  centavos: number;
  moneda: "GTQ" | "USD";
}

const SIMBOLO: Record<Dinero["moneda"], string> = { GTQ: "Q", USD: "$" };

/** Q1,234.56 (separador de miles con coma, dos decimales). */
export function formatearDinero(d: Dinero | null | undefined): string {
  if (!d) return "—";
  const negativo = d.centavos < 0;
  const absolutos = Math.abs(d.centavos);
  const entero = Math.floor(absolutos / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const centavos = String(absolutos % 100).padStart(2, "0");
  return `${negativo ? "-" : ""}${SIMBOLO[d.moneda]}${entero}.${centavos}`;
}

export function quetzales(centavos: number): string {
  return formatearDinero({ centavos, moneda: "GTQ" });
}

export function formatearFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Fracción 0–1 a "12.5 %". */
export function formatearPorcentaje(fraccion: number): string {
  return `${(fraccion * 100).toFixed(1)} %`;
}

/** Nombre corto para el saludo: primer nombre. */
export function primerNombre(nombre: string | undefined | null): string {
  const n = (nombre ?? "").trim().split(/\s+/)[0] ?? "";
  return n || "";
}

export const ETIQUETA_TRAMO: Record<string, string> = {
  AL_DIA: "Al día",
  MORA_1: "Mora 1 (1–30 días)",
  MORA_2: "Mora 2 (31–60 días)",
  MORA_3: "Mora 3 (61–90 días)",
  VENCIDO: "Vencido (91–120 días)",
  INCOBRABLE: "Incobrable (más de 120 días)",
};

export const ETIQUETA_TRAMO_CORTA: Record<string, string> = {
  AL_DIA: "Al día",
  MORA_1: "1–30 días",
  MORA_2: "31–60 días",
  MORA_3: "61–90 días",
  VENCIDO: "91–120 días",
  INCOBRABLE: "+120 días",
};

/** Colores de la gráfica por tramo (de verde a rojo). */
export const COLOR_TRAMO: Record<string, string> = {
  AL_DIA: "#2E9E5B",
  MORA_1: "#D9A441",
  MORA_2: "#E08A3C",
  MORA_3: "#C23B32",
  VENCIDO: "#9A2E27",
  INCOBRABLE: "#5C1A16",
};

export const ETIQUETA_ESTADO: Record<string, string> = {
  SOLICITADO: "En revisión",
  APROBADO: "Aprobada",
  RECHAZADO: "Rechazada",
  ANULADO: "Anulada",
  VIGENTE: "Vigente",
  EN_MORA: "En mora",
  REESTRUCTURADO: "Reestructurado",
  CANCELADO: "Cancelado",
  INCOBRABLE: "Incobrable",
};

/** Rotulado de solicitudes (lenguaje del cliente). */
export const ETIQUETA_SOLICITUD: Record<string, string> = {
  SOLICITADO: "En revisión",
  APROBADO: "Aprobada",
  RECHAZADO: "Rechazada",
  ANULADO: "Anulada",
};

export const ETIQUETA_RUBRO: Record<string, string> = {
  gastos: "Gastos de cobranza",
  interesMoratorio: "Interés por atraso (mora)",
  interesCorriente: "Interés de la cuota",
  capital: "Capital (lo prestado)",
};

export const ETIQUETA_ROL: Record<string, string> = {
  cliente: "Cliente",
  asesor: "Asesor de campo",
  gerencia: "Comité gerencial",
};

/** Texto simple del estado de un crédito para el cliente. */
export function estadoEnPalabras(estado: string, diasDeAtraso: number): string {
  if (estado === "CANCELADO") return "Pagado por completo";
  if (estado === "INCOBRABLE") return "Cuenta cerrada por falta de pago";
  if (diasDeAtraso > 0) return `${diasDeAtraso} ${diasDeAtraso === 1 ? "día" : "días"} de atraso`;
  return "Estás al día";
}

/** Rango de días legible a partir del id de tramo de la política de mora (mora_1, vencido…). */
export function rangoDeTramoMora(tramo: string): string {
  const t = tramo.toLowerCase();
  return ({ mora_1: "1 a 30 días", mora_2: "31 a 60 días", mora_3: "61 a 90 días", vencido: "91 a 120 días" } as Record<string, string>)[t] ?? tramo;
}

/** "1234.50" o "1,234.5" a centavos sin pasar por decimales binarios; null si no es un monto válido. */
export function aCentavos(texto: string): number | null {
  const sinQ = texto.trim().replace(/^Q/i, "");
  const t = sinQ.includes(".") ? sinQ.replace(/,/g, "") : sinQ.replace(",", ".");
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
}
