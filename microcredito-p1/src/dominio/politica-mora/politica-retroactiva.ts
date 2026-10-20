// Política retroactiva — el comité la consideró y la RECHAZÓ (sección 7.4,
// caso M-3: "Política retroactiva (NO adoptada): Q72.58"). Existe en este
// código únicamente para la prueba de sustitución de Liskov (sección 8.2-L):
// demuestra que el motor puede intercambiar cualquier PoliticaMora sin
// romper sus invariantes, incluida una que aplica la tasa del tramo actual
// a TODOS los días de atraso — nunca se instancia desde el catálogo de
// producción (catalogo-politicas.ts).

import { Dinero, redondearCentavos } from "../dinero.js";
import type { BaseDeConteo } from "../calculadora-mora.js";
import type { PoliticaMora, DesgloseMoraTramo } from "./politica-mora.js";
import type { TramoPolitica } from "./politica-escalonada.js";

export class PoliticaMoraRetroactiva implements PoliticaMora {
  constructor(
    public readonly id: string,
    private readonly tramos: TramoPolitica[],
    private readonly baseDeConteo: BaseDeConteo = 360
  ) {}

  calcularMoratorio(capitalEnMora: Dinero, diasDeAtraso: number): DesgloseMoraTramo[] {
    if (diasDeAtraso <= 0) return [];

    const tramoActual =
      this.tramos.find((t) => diasDeAtraso >= t.ini && diasDeAtraso <= t.fin) ?? this.tramos[this.tramos.length - 1];
    if (!tramoActual) return [];

    const tasaDiaria = tramoActual.tasaAnual / this.baseDeConteo;
    const montoCentavos = redondearCentavos(capitalEnMora.centavos * tasaDiaria * diasDeAtraso);

    return [
      { tramo: tramoActual.id, dias: diasDeAtraso, tasaAnual: tramoActual.tasaAnual, monto: Dinero.deCentavos(montoCentavos, capitalEnMora.moneda) },
    ];
  }
}
