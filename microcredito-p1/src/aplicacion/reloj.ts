import { ErrorAplicacion } from "./tipos.js";
// Puerto "Reloj" (mencionado en el enunciado, sección 7.3: "El puerto Reloj
// del Proyecto 1 ya está diseñado para eso: úselo"). Este archivo es la
// implementación concreta para el Proyecto Final: TODA función de negocio
// que necesite "la fecha de hoy" debe recibirla como parámetro explícito
// (fechaCorte), nunca leerla de `new Date()`. Esto es lo que hace posible
// que G-7 (fecha de corte futura, 2027-01-24) dé el resultado correcto en
// vez de calcular "a hoy" — penalización de -1.0 pt si se viola (sección 8.1).
//
// Las únicas funciones que pueden usar el reloj real del sistema son las de
// auditoría (creado_en en la base de datos), nunca el cálculo financiero.

/** Valida una fecha ISO real (rechaza 2026-02-30, formatos libres, vacíos). Error uniforme FECHA_INVALIDA (E3). */
export function exigirFechaValida(fechaIso: unknown): string {
  if (typeof fechaIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) {
    throw new ErrorAplicacion("FECHA_INVALIDA", `Fecha inválida: '${String(fechaIso)}'. Se espera AAAA-MM-DD.`);
  }
  const [a, m, d] = fechaIso.split("-").map(Number) as [number, number, number];
  const f = new Date(Date.UTC(a, m - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) {
    throw new ErrorAplicacion("FECHA_INVALIDA", `La fecha ${fechaIso} no existe en el calendario.`);
  }
  return fechaIso;
}

/** Parsea 'YYYY-MM-DD' a un Date en UTC (evita corrimientos de zona horaria). */
export function parsearFecha(fechaIso: string): Date {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  if (!anio || !mes || !dia) {
    throw new Error(`Fecha inválida: '${fechaIso}'. Se espera formato YYYY-MM-DD.`);
  }
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function formatearFecha(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Suma N meses a una fecha ISO, sin dependencias externas (equivalente a date-fns addMonths). */
export function sumarMeses(fechaIso: string, meses: number): string {
  const fecha = parsearFecha(fechaIso);
  const diaOriginal = fecha.getUTCDate();
  fecha.setUTCMonth(fecha.getUTCMonth() + meses);
  // Si el mes de destino tiene menos días (ej. 31 de enero + 1 mes), el motor
  // de Date de JS ya "rebota" al mes siguiente; se corrige devolviendo al
  // último día del mes de destino en ese caso.
  if (fecha.getUTCDate() !== diaOriginal) {
    fecha.setUTCDate(0);
  }
  return formatearFecha(fecha);
}

/** Días transcurridos entre dos fechas ISO (b - a). Negativo si b es anterior a a. */
export function diasEntre(fechaIsoA: string, fechaIsoB: string): number {
  const a = parsearFecha(fechaIsoA).getTime();
  const b = parsearFecha(fechaIsoB).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function fechaMaxima(a: string, b: string): string {
  return a > b ? a : b;
}

export function fechaMinima(a: string, b: string): string {
  return a < b ? a : b;
}

/** Suma N días a una fecha ISO (UTC, sin zona horaria). */
export function sumarDias(fechaIso: string, dias: number): string {
  const fecha = parsearFecha(fechaIso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return formatearFecha(fecha);
}

/**
 * "Hoy" en Guatemala (UTC-6 todo el año, sin horario de verano), calculado con un
 * desfase fijo — no con la fecha UTC — para que de noche no salte al día siguiente.
 * Sólo lo usa la capa de API como fecha de operación POR DEFECTO cuando la petición
 * no trae `fechaCorte`; el cálculo financiero siempre recibe la fecha explícita.
 */
export function fechaHoyGuatemala(ahora: Date = new Date()): string {
  return formatearFecha(new Date(ahora.getTime() - 6 * 3600 * 1000));
}
