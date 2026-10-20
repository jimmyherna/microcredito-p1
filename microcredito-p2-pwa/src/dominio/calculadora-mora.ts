import { Dinero, redondearCentavos } from "./dinero.js";

export type BaseDeConteo = 360 | 365;

export type TramoMora = "AL_DIA" | "MORA_1" | "MORA_2" | "MORA_3" | "VENCIDO" | "INCOBRABLE";

export type VersionPoliticaMora = "POL-2024-01" | "POL-2026-10";

export interface TramoPoliticaMora {
  hastaDias: number;
  tnaMoratoria: number;
}

export interface PoliticaMora {
  version: VersionPoliticaMora;
  baseDeConteo: BaseDeConteo;
  autor: string;
  fechaVigenciaDesde: string;
  tramos: TramoPoliticaMora[];
  tasaPlana?: number;
}

/** Política plana anterior: créditos otorgados antes del 01/10/2026. */
export const POLITICA_MORA_2024: PoliticaMora = {
  version: "POL-2024-01",
  baseDeConteo: 360,
  autor: "Reglamento de Crédito Vecino",
  fechaVigenciaDesde: "2024-01-01",
  tasaPlana: 0.24,
  tramos: [{ hastaDias: 120, tnaMoratoria: 0.24 }],
};

/** Política escalonada: créditos otorgados desde el 01/10/2026. */
export const POLITICA_MORA_2026: PoliticaMora = {
  version: "POL-2026-10",
  baseDeConteo: 360,
  autor: "Reglamento de Crédito Vecino",
  fechaVigenciaDesde: "2026-10-01",
  tramos: [
    { hastaDias: 30, tnaMoratoria: 0.18 },
    { hastaDias: 60, tnaMoratoria: 0.24 },
    { hastaDias: 90, tnaMoratoria: 0.30 },
    { hastaDias: 120, tnaMoratoria: 0.36 },
  ],
};

export const obtenerPoliticaMoraPorFecha = (fechaOtorgamiento: string): PoliticaMora => {
  const fecha = new Date(fechaOtorgamiento);
  const corte = new Date("2026-10-01T00:00:00");
  return !Number.isNaN(fecha.getTime()) && fecha >= corte
    ? POLITICA_MORA_2026
    : POLITICA_MORA_2024;
};

/**
 * Calcula interés moratorio sobre el capital en mora, sin anatocismo.
 * En la política escalonada se recorren todos los tramos atravesados por los días
 * de atraso y se redondea una sola vez al final.
 */
export const calcularInteresMoratorio = (
  capitalEnMora: Dinero,
  diasDeAtraso: number,
  politica: PoliticaMora
): Dinero => {
  if (diasDeAtraso < 0) {
    throw new Error("Los dias de atraso no pueden ser negativos");
  }
  if (diasDeAtraso === 0 || capitalEnMora.esCero()) {
    return Dinero.cero(capitalEnMora.moneda);
  }
  if (diasDeAtraso > 120) {
    return Dinero.cero(capitalEnMora.moneda);
  }

  const diasAplicables = Math.min(diasDeAtraso, 120);
  let factorTotal = 0;

  if (politica.tasaPlana !== undefined) {
    factorTotal = (politica.tasaPlana / politica.baseDeConteo) * diasAplicables;
  } else {
    let diasInicioTramo = 1;
    for (const tramo of politica.tramos) {
      if (diasInicioTramo > diasAplicables) break;
      const diasFinTramo = Math.min(diasAplicables, tramo.hastaDias);
      const diasEnTramo = diasFinTramo - diasInicioTramo + 1;
      if (diasEnTramo > 0) {
        factorTotal += (tramo.tnaMoratoria / politica.baseDeConteo) * diasEnTramo;
      }
      diasInicioTramo = tramo.hastaDias + 1;
    }
  }

  // Redondeo único sobre el total, evitando redondear cada tramo por separado.
  const interesCentavos = redondearCentavos(capitalEnMora.centavos * factorTotal);
  const interes = Dinero.deCentavos(interesCentavos, capitalEnMora.moneda);

  // La mora acumulada no puede superar el propio capital en mora.
  return interes.esMayorQue(capitalEnMora) ? capitalEnMora : interes;
};

export const clasificarTramoMora = (diasDeAtraso: number): TramoMora => {
  if (diasDeAtraso <= 0) return "AL_DIA";
  if (diasDeAtraso <= 30) return "MORA_1";
  if (diasDeAtraso <= 60) return "MORA_2";
  if (diasDeAtraso <= 90) return "MORA_3";
  if (diasDeAtraso <= 120) return "VENCIDO";
  return "INCOBRABLE";
};

/** Suspende el devengo corriente después de 90 días de atraso. */
export const debeSuspenderDevengo = (diasDeAtraso: number): boolean => diasDeAtraso > 90;
