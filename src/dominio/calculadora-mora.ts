import { Dinero } from "./dinero.js";

export type BaseDeConteo = 360 | 365;

export type TramoMora = "AL_DIA" | "MORA_1" | "MORA_2" | "MORA_3" | "VENCIDO" | "INCOBRABLE";

export interface PoliticaMora {
  tnaMoratoria: number;
  baseDeConteo: BaseDeConteo;
  autor: string;
  fechaVigenciaDesde: string;
}

/**
 * Cálculo de interés moratorio sobre el capital en mora sin anatocismo.
 */
export const calcularInteresMoratorio = (
  capitalEnMora: Dinero,
  diasDeAtraso: number,
  politica: PoliticaMora
): Dinero => {
  if (diasDeAtraso < 0) {
    throw new Error("Los dias de atraso no pueden ser negativos");
  }

  if (diasDeAtraso === 0) {
    return Dinero.cero(capitalEnMora.moneda);
  }

  const { tnaMoratoria, baseDeConteo } = politica;
  const factorDiario = (tnaMoratoria / baseDeConteo) * diasDeAtraso;

  return capitalEnMora.multiplicarPorFactor(factorDiario);
};

/**
 * Clasificación de tramos de mora según la antigüedad del saldo.
 */
export const clasificarTramoMora = (diasDeAtraso: number): TramoMora => {
  if (diasDeAtraso <= 0) return "AL_DIA";
  if (diasDeAtraso <= 30) return "MORA_1";
  if (diasDeAtraso <= 60) return "MORA_2";
  if (diasDeAtraso <= 90) return "MORA_3";
  if (diasDeAtraso <= 120) return "VENCIDO";
  return "INCOBRABLE";
};

/**
 * Determina si se debe suspender el devengo de interés corriente (> 90 días).
 */
export const debeSuspenderDevengo = (diasDeAtraso: number): boolean => diasDeAtraso > 90;