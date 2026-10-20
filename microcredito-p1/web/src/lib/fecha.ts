// Fechas de la interfaz. La fecha de operación por defecto es HOY en el reloj LOCAL del navegador
// (Guatemala), nunca toISOString() (que es UTC y adelanta el día por la noche).

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

/** AAAA-MM-DD de hoy según la hora local del dispositivo. */
export function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Atajo "Cierre del paquete" que pide gerencia (corte de la carga canónica). */
export const FECHA_CIERRE_PAQUETE = "2026-10-31";

export const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "jueves 15 de octubre de 2026" */
export function fechaLarga(fechaIso: string): string {
  if (!FORMATO_FECHA.test(fechaIso)) return fechaIso;
  const [a, m, d] = fechaIso.split("-").map(Number) as [number, number, number];
  const dia = DIAS[new Date(a, m - 1, d).getDay()] ?? "";
  return `${dia} ${d} de ${MESES[m - 1]} de ${a}`;
}

/** "15 oct 2026" para tablas; acepta también marcas de tiempo ISO. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MESES[d.getMonth()]!.slice(0, 3)} ${d.getFullYear()}`;
}

/** "15 oct 2026, 14:05" para la bitácora (hora local). */
export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fechaCorta(iso)}, ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}
