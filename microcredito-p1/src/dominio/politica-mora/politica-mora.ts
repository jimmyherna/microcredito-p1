// Puerto de política de mora — patrón Strategy (GoF) + Inversión de
// Dependencias (SOLID/D): el motor de cobranza (src/aplicacion/motor-cobranza.ts)
// depende de ESTA interfaz, nunca de una política concreta. Agregar una
// política nueva (por ejemplo, una futura "mora con perdón por primera vez")
// es un archivo nuevo que implementa esta interfaz — el motor no se toca
// (principio abierto/cerrado, sección 8.2-O del enunciado del Proyecto 2).
//
// Segregación de interfaces (I): un solo método, lo único que el motor
// necesita. Ninguna implementación tiene que lanzar "no soportado".
//
// Responsabilidad única (S): esta interfaz SOLO decide "cuánto cuesta cada
// tramo recorrido". Decidir "en qué tramo está una cuota hoy" es una
// pregunta distinta y vive en clasificacion-tramo.ts (Specification) — así
// se responde la pregunta S de la sección 8.2: son dos piezas separadas,
// probadas por separado.

import type { Dinero } from "../dinero.js";

export interface DesgloseMoraTramo {
  tramo: string;
  dias: number;
  tasaAnual: number;
  /** Ya redondeado. La política es la ÚNICA que redondea, una sola vez (sección 7.3). */
  monto: Dinero;
}

export interface PoliticaMora {
  readonly id: string;

  /**
   * Calcula el interés moratorio de un capital en mora, recorriendo los
   * tramos que correspondan según los días de atraso. Nunca redondea por
   * tramo — solo al final (invariante de la sección 7.3).
   */
  calcularMoratorio(capitalEnMora: Dinero, diasDeAtraso: number): DesgloseMoraTramo[];
}
