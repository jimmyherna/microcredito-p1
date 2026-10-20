// CP-02 (Proyecto 2, sección 7.5): gasto de gestión de cobro en campo.
// Q25.00 fijos, UNA SOLA VEZ por cuota vencida, generado en el momento en
// que esa cuota alcanza 31 días de atraso (entrada a Mora 2). Nunca se
// vuelve a generar por el mismo hecho: ni al subir de Mora 2 a Mora 3 o a
// Vencido, ni al reejecutar el cierre del mismo día (idempotencia, 6.10).
//
// Es monto y regla de negocio, así que en rigor también debería poder
// cambiar sin recompilar — se deja como constante documentada porque el
// enunciado lo fija en Q25.00 explícitamente (a diferencia de las tasas de
// mora, que sí llegan versionadas desde politicas.json).

import { Dinero } from "../dinero.js";

export const MONTO_GASTO_GESTION_COBRO_CENTAVOS = 2500; // Q25.00
export const DIAS_ATRASO_QUE_GENERAN_GASTO = 31; // entrada a Mora 2

export function montoGastoGestionCobro(moneda: "GTQ" | "USD" = "GTQ"): Dinero {
  return Dinero.deCentavos(MONTO_GASTO_GESTION_COBRO_CENTAVOS, moneda);
}

/**
 * true si, dado el atraso actual de la cuota, corresponde tener generado el
 * gasto de gestión de cobro. Es una función pura y sin estado: como el
 * gasto nunca se revierte ni se vuelve a generar, "cuántos gastos van
 * generados para esta cuota" siempre es 0 o 1, determinado solo por si
 * ALGUNA VEZ el atraso llegó a 31 días — que es exactamente lo mismo que
 * preguntar si el atraso ACTUAL es >= 31 (los días de atraso de una cuota
 * impagada nunca bajan salvo que se pague, y en ese caso el gasto ya
 * generado se conserva porque se pagó, no porque se olvida).
 */
export function correspondeGastoGestionCobro(diasDeAtraso: number): boolean {
  return diasDeAtraso >= DIAS_ATRASO_QUE_GENERAN_GASTO;
}

/**
 * Políticas a las que aplica el gasto de gestión (politicas.json → gasto_gestion_cobro.aplica_a_politicas,
 * decisión RP-08: solo POL-2026-10; los créditos con mora plana no lo generan).
 */
export const POLITICAS_CON_GASTO_GESTION: readonly string[] = ["POL-2026-10"];

export function gastoAplicaAPolitica(politicaId: string): boolean {
  return POLITICAS_CON_GASTO_GESTION.includes(politicaId);
}
