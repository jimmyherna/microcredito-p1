// Política plana (POL-2024-01, la del Proyecto 1): una sola tasa para
// cualquier cantidad de días de atraso. Se conserva intacta para los
// créditos otorgados ANTES del 1 de octubre de 2026 (CP-03: coexistencia
// de políticas — sección 7.6 del Proyecto 2).

import { Dinero } from "../dinero.js";
import { calcularInteresMoratorio, type BaseDeConteo } from "../calculadora-mora.js";
import type { PoliticaMora, DesgloseMoraTramo } from "./politica-mora.js";

export class PoliticaMoraPlana implements PoliticaMora {
  constructor(
    public readonly id: string,
    private readonly tnaAnual: number,
    private readonly baseDeConteo: BaseDeConteo = 360
  ) {}

  calcularMoratorio(capitalEnMora: Dinero, diasDeAtraso: number): DesgloseMoraTramo[] {
    if (diasDeAtraso <= 0) return [];

    // Una sola tasa -> un solo redondeo. calcularInteresMoratorio (calculadora-mora.ts,
    // que NO se modifica) ya hace exactamente eso para el caso plano.
    const monto = calcularInteresMoratorio(capitalEnMora, diasDeAtraso, {
      tnaMoratoria: this.tnaAnual,
      baseDeConteo: this.baseDeConteo,
      autor: "Comité de Crédito",
      fechaVigenciaDesde: "",
    });

    return [{ tramo: "PLANA", dias: diasDeAtraso, tasaAnual: this.tnaAnual, monto }];
  }
}
