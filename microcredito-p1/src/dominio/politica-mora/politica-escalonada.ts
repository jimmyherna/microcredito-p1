// Política escalonada (POL-2026-10, vigente desde el 1 de octubre de 2026):
// cada tramo de atraso tiene su propia tasa (sección 7.2 del Proyecto 2).
// Cuando una cuota lleva, por ejemplo, 45 días de atraso, NO estuvo 45 días
// en Mora 2: estuvo 30 en Mora 1 y lleva 15 en Mora 2 — "tramos recorridos",
// no "tramo actual" (sección 7.3, el punto de diseño más delicado).
//
// Regla de redondeo (obligatoria, sección 7.3): se redondea UNA SOLA VEZ, al
// cerrar el cálculo de la cuota vencida — NUNCA tramo por tramo. Redondear
// por tramo en el caso de 45 días da Q10.89 + Q7.26 = Q18.15; redondear una
// sola vez da el valor correcto, Q18.14. Por eso aquí se acumulan los
// montos SIN redondear y solo se redondea el total; el desglose que se
// muestra al cliente se ajusta en el último tramo para que la suma visible
// cuadre exactamente con el total oficial (nunca al revés).

import { Dinero, redondearCentavos } from "../dinero.js";
import type { BaseDeConteo } from "../calculadora-mora.js";
import type { PoliticaMora, DesgloseMoraTramo } from "./politica-mora.js";

export interface TramoPolitica {
  id: string;
  ini: number;
  fin: number;
  tasaAnual: number;
}

export class PoliticaMoraEscalonada implements PoliticaMora {
  constructor(
    public readonly id: string,
    private readonly tramos: TramoPolitica[],
    private readonly baseDeConteo: BaseDeConteo = 360
  ) {}

  calcularMoratorio(capitalEnMora: Dinero, diasDeAtraso: number): DesgloseMoraTramo[] {
    if (diasDeAtraso <= 0) return [];
    const moneda = capitalEnMora.moneda;

    const crudos: { tramo: string; dias: number; tasaAnual: number; montoSinRedondear: number }[] = [];
    let totalSinRedondear = 0;

    for (const tramo of this.tramos) {
      // dias_en_tramo(d, ini, fin) = max(0, min(d, fin) - ini + 1) — fórmula exacta de la sección 7.3.
      const diasEnTramo = Math.max(0, Math.min(diasDeAtraso, tramo.fin) - tramo.ini + 1);
      if (diasEnTramo <= 0) continue;

      const tasaDiaria = tramo.tasaAnual / this.baseDeConteo;
      const montoSinRedondear = capitalEnMora.centavos * tasaDiaria * diasEnTramo;
      crudos.push({ tramo: tramo.id, dias: diasEnTramo, tasaAnual: tramo.tasaAnual, montoSinRedondear });
      totalSinRedondear += montoSinRedondear;
    }

    if (crudos.length === 0) return [];

    // Redondeo único, al final, sobre el total (nunca por tramo).
    const totalRedondeadoCentavos = redondearCentavos(totalSinRedondear);

    // El desglose que se muestra por tramo se redondea también (para poder
    // enseñarlo en pantalla), y el ÚLTIMO tramo absorbe el residuo de
    // redondeo para que la suma visible cuadre exactamente con el total
    // oficial — nunca al revés (el total nunca se recalcula sumando líneas
    // ya redondeadas, que es justo el error que la sección 7.3 prohíbe).
    const desglose: DesgloseMoraTramo[] = crudos.map((c) => ({
      tramo: c.tramo,
      dias: c.dias,
      tasaAnual: c.tasaAnual,
      monto: Dinero.deCentavos(Math.round(c.montoSinRedondear), moneda),
    }));

    const sumaMostrada = desglose.reduce((acc, d) => acc + d.monto.centavos, 0);
    const residuo = totalRedondeadoCentavos - sumaMostrada;
    if (residuo !== 0) {
      const ultimo = desglose[desglose.length - 1]!;
      desglose[desglose.length - 1] = { ...ultimo, monto: ultimo.monto.sumar(Dinero.deCentavos(residuo, moneda)) };
    }

    return desglose;
  }
}
