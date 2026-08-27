/**
 * Ciclo de vida del credito (seccion 6.7). El ESTADO es un hecho o decision
 * que no se recalcula (aprobado, incobrable...); el TRAMO de mora (Mora 1..
 * Vencido) NO es un estado, es una clasificacion derivada de los dias de
 * atraso (ver calculadora-mora.ts::clasificarTramoMora). Confundirlos
 * duplicaria la fuente de verdad (seccion 6.7.1).
 *
 * Se implementa como patron State (GoF): las transiciones invalidas son
 * imposibles por diseño (se rechazan explicitamente), no evitadas con un
 * `if` disperso por el codigo cliente.
 */

export type EstadoCredito =
  | "SOLICITADO"
  | "APROBADO"
  | "RECHAZADO"
  | "ANULADO"
  | "VIGENTE"
  | "EN_MORA"
  | "REESTRUCTURADO"
  | "CANCELADO"
  | "INCOBRABLE";

export type EventoCredito =
  | "COMITE_APRUEBA"
  | "COMITE_RECHAZA"
  | "SE_DESEMBOLSA"
  | "CLIENTE_DESISTE_O_EXPIRA"
  | "VENCE_CUOTA_IMPAGADA"
  | "PAGA_ULTIMA_CUOTA"
  | "PAGA_TODO_LO_VENCIDO"
  | "PAGA_PARTE_DE_LO_VENCIDO"
  | "ACUERDA_NUEVAS_CONDICIONES"
  | "SUPERA_120_DIAS_SIN_ARREGLO"
  | "RECUPERACION_VIA_CASA_DE_COBRO";

export interface ContextoTransicion {
  diasDeAtraso?: number;
  saldoRestante?: number; // en centavos; 0 => saldado
  cumplePoliticaCredito?: boolean;
  comiteAutoriza?: boolean;
}

export class ErrorTransicionInvalida extends Error {
  constructor(estado: EstadoCredito, evento: EventoCredito) {
    super(`Transicion invalida: el evento '${evento}' no es aplicable en el estado '${estado}'`);
    this.name = "ErrorTransicionInvalida";
  }
}

interface DefinicionTransicion {
  desde: EstadoCredito;
  evento: EventoCredito;
  guarda?: (ctx: ContextoTransicion) => boolean;
  hasta: EstadoCredito;
}

/** Tabla de transiciones — contrato obligatorio de la seccion 6.7.1. */
const TABLA_TRANSICIONES: DefinicionTransicion[] = [
  { desde: "SOLICITADO", evento: "COMITE_APRUEBA", guarda: (c) => c.cumplePoliticaCredito === true, hasta: "APROBADO" },
  { desde: "SOLICITADO", evento: "COMITE_RECHAZA", hasta: "RECHAZADO" },
  { desde: "APROBADO", evento: "SE_DESEMBOLSA", hasta: "VIGENTE" },
  { desde: "APROBADO", evento: "CLIENTE_DESISTE_O_EXPIRA", hasta: "ANULADO" },
  { desde: "VIGENTE", evento: "VENCE_CUOTA_IMPAGADA", guarda: (c) => (c.diasDeAtraso ?? 0) >= 1, hasta: "EN_MORA" },
  { desde: "VIGENTE", evento: "PAGA_ULTIMA_CUOTA", guarda: (c) => c.saldoRestante === 0, hasta: "CANCELADO" },
  { desde: "EN_MORA", evento: "PAGA_TODO_LO_VENCIDO", guarda: (c) => (c.diasDeAtraso ?? -1) === 0, hasta: "VIGENTE" },
  { desde: "EN_MORA", evento: "PAGA_PARTE_DE_LO_VENCIDO", guarda: (c) => (c.diasDeAtraso ?? 0) > 0, hasta: "EN_MORA" },
  { desde: "EN_MORA", evento: "VENCE_CUOTA_IMPAGADA", guarda: (c) => (c.diasDeAtraso ?? 0) >= 1, hasta: "EN_MORA" },
  { desde: "EN_MORA", evento: "ACUERDA_NUEVAS_CONDICIONES", guarda: (c) => c.comiteAutoriza === true, hasta: "REESTRUCTURADO" },
  { desde: "EN_MORA", evento: "SUPERA_120_DIAS_SIN_ARREGLO", guarda: (c) => (c.diasDeAtraso ?? 0) > 120, hasta: "INCOBRABLE" },
  { desde: "REESTRUCTURADO", evento: "VENCE_CUOTA_IMPAGADA", guarda: (c) => (c.diasDeAtraso ?? 0) >= 1, hasta: "EN_MORA" },
  { desde: "REESTRUCTURADO", evento: "PAGA_ULTIMA_CUOTA", guarda: (c) => c.saldoRestante === 0, hasta: "CANCELADO" },
  { desde: "INCOBRABLE", evento: "RECUPERACION_VIA_CASA_DE_COBRO", hasta: "INCOBRABLE" },
];

/**
 * Aplica un evento al estado actual del credito. Lanza ErrorTransicionInvalida
 * si el evento no esta permitido desde ese estado o si su guarda no se cumple
 * (p. ej. pagar un credito 'SOLICITADO', o pretender regularizar con dias de
 * atraso > 0).
 */
export function aplicarEvento(
  estadoActual: EstadoCredito,
  evento: EventoCredito,
  contexto: ContextoTransicion = {}
): EstadoCredito {
  const candidatas = TABLA_TRANSICIONES.filter((t) => t.desde === estadoActual && t.evento === evento);
  for (const t of candidatas) {
    if (!t.guarda || t.guarda(contexto)) {
      return t.hasta;
    }
  }
  throw new ErrorTransicionInvalida(estadoActual, evento);
}

export const ESTADOS_TERMINALES: ReadonlySet<EstadoCredito> = new Set([
  "RECHAZADO",
  "ANULADO",
  "CANCELADO",
]);

/** Un pago solo puede aplicarse si el credito ya tiene capital entregado y no esta cancelado/incobrable en firme. */
export function admitePago(estado: EstadoCredito): boolean {
  return estado === "VIGENTE" || estado === "EN_MORA" || estado === "REESTRUCTURADO";
}
