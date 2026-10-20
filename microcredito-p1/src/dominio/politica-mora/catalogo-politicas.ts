// Resuelve, por fecha de otorgamiento, qué política de mora aplica — sin
// que el motor de cálculo conozca ninguna política concreta (Inversión de
// Dependencias). Las tasas y tramos llegan como DATOS (parámetro de esta
// función), nunca como constantes en el código: si mañana el comité cambia
// el 30% de Mora 3, se edita un registro, no este archivo (principio
// abierto/cerrado — igual exigencia que ya tenía el Proyecto 1, 6.3.1).

import type { PoliticaMora } from "./politica-mora.js";
import { PoliticaMoraPlana } from "./politica-plana.js";
import { PoliticaMoraEscalonada, type TramoPolitica } from "./politica-escalonada.js";
import type { BaseDeConteo } from "../calculadora-mora.js";

export interface DatosPoliticaParaCatalogo {
  id: string;
  tipo: "plana" | "escalonada";
  tnaAnual?: number; // solo si tipo = "plana"
  tramos?: TramoPolitica[]; // solo si tipo = "escalonada"
  vigenciaDesde?: string; // YYYY-MM-DD, inclusive
  vigenciaHasta?: string; // YYYY-MM-DD, inclusive
  baseDeConteo?: BaseDeConteo;
}

export function construirPolitica(datos: DatosPoliticaParaCatalogo): PoliticaMora {
  if (datos.tipo === "plana") {
    return new PoliticaMoraPlana(datos.id, datos.tnaAnual ?? 0, datos.baseDeConteo ?? 360);
  }
  return new PoliticaMoraEscalonada(datos.id, datos.tramos ?? [], datos.baseDeConteo ?? 360);
}

/**
 * Un crédito se calcula con la política vigente en SU fecha de
 * otorgamiento, aunque la política cambie después (sección 6.3.1 del
 * Proyecto 1, resuelto formalmente por el Acta 09-2026 del comité).
 */
export function resolverPoliticaVigente(
  politicasDisponibles: DatosPoliticaParaCatalogo[],
  fechaOtorgamiento: string
): PoliticaMora {
  const encontrada = politicasDisponibles.find((p) => {
    if (p.vigenciaDesde && fechaOtorgamiento < p.vigenciaDesde) return false;
    if (p.vigenciaHasta && fechaOtorgamiento > p.vigenciaHasta) return false;
    return true;
  });

  if (!encontrada) {
    throw new Error(`No hay política de mora vigente para un crédito otorgado el ${fechaOtorgamiento}`);
  }

  return construirPolitica(encontrada);
}
