import { Dinero } from "./dinero.js";

export type BaseDeConteo = 360 | 365;

export type TramoMora = "AL_DIA" | "MORA_1" | "MORA_2" | "MORA_3" | "VENCIDO" | "INCOBRABLE";

/**
 * Politica de mora: parametro versionado (nunca una constante en el codigo
 * de calculo), tal como exige la seccion 6.3.1 / 6.5. Un credito se calcula
 * con la politica vigente en su fecha de otorgamiento (Strategy).
 */
export interface PoliticaMora {
  tnaMoratoria: number; // ej. 0.24
  baseDeConteo: BaseDeConteo; // Actual/360 (recomendado) o Actual/365
  autor: string;
  fechaVigenciaDesde: string; // ISO yyyy-mm-dd
}

/**
 * Interes moratorio EXCLUSIVAMENTE sobre el capital en mora (nunca sobre la
 * cuota completa ni sobre el interes) — prohibicion legal de anatocismo
 * (Decreto-Ley 106, Codigo Civil de Guatemala).
 *
 *   interes_moratorio = capital_en_mora * tasa_moratoria_diaria * dias_de_atraso
 */
export function calcularInteresMoratorio(
  capitalEnMora: Dinero,
  diasDeAtraso: number,
  politica: PoliticaMora
): Dinero {
  if (diasDeAtraso < 0) {
    throw new Error("Los dias de atraso no pueden ser negativos");
  }
  if (diasDeAtraso === 0) {
    return Dinero.cero(capitalEnMora.moneda);
  }
  const tasaMoratoriaDiaria = politica.tnaMoratoria / politica.baseDeConteo;
  return capitalEnMora.multiplicarPorFactor(tasaMoratoriaDiaria * diasDeAtraso);
}

/**
 * Specification (seccion 9): clasifica el tramo de mora de forma pura y
 * derivada de los dias de atraso de la cuota mas atrasada. El tramo NO es
 * un estado — se recalcula siempre a partir del dato vigente (seccion 6.7.1).
 */
export function clasificarTramoMora(diasDeAtraso: number): TramoMora {
  if (diasDeAtraso <= 0) return "AL_DIA";
  if (diasDeAtraso <= 30) return "MORA_1";
  if (diasDeAtraso <= 60) return "MORA_2";
  if (diasDeAtraso <= 90) return "MORA_3";
  if (diasDeAtraso <= 120) return "VENCIDO";
  return "INCOBRABLE";
}

/** Seccion 6.5: al superar 90 dias de atraso se suspende el devengo de interes corriente. */
export function debeSuspenderDevengo(diasDeAtraso: number): boolean {
  return diasDeAtraso > 90;
}
