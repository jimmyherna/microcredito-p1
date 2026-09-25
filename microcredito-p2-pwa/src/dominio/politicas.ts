/**
 * Políticas institucionales versionadas para Crédito Vecino.
 * Las fechas de vigencia determinan qué política corresponde a cada crédito.
 */

export const FECHA_CAMBIO_POLITICA_MORA = "2026-10-01";

export interface PoliticaCredito {
  version: string;
  tna: number;
  tasaMensual: number;
  fechaVigenciaDesde: string;
  autor: string;
}

export const POLITICA_CREDITO_ACTUAL: PoliticaCredito = {
  version: "POL-CRED-2026-01",
  tna: 0.36,
  tasaMensual: 0.03,
  fechaVigenciaDesde: "2026-01-01",
  autor: "Reglamento de Crédito Vecino",
};

export const obtenerPoliticaCreditoPorFecha = (fechaOtorgamiento: string): PoliticaCredito => {
  // La tasa normal de referencia del proyecto es 36% TNA = 3% mensual.
  // La selección queda versionada para permitir cambios futuros sin modificar la fórmula.
  return POLITICA_CREDITO_ACTUAL;
};
