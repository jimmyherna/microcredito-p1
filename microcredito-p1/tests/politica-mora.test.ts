import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import { PoliticaMoraEscalonada } from "../src/dominio/politica-mora/politica-escalonada.js";
import { PoliticaMoraPlana } from "../src/dominio/politica-mora/politica-plana.js";
import { resolverPoliticaVigente } from "../src/dominio/politica-mora/catalogo-politicas.js";
import { montoGastoGestionCobro, correspondeGastoGestionCobro } from "../src/dominio/politica-mora/gasto-gestion-cobro.js";

// Reproduce exactamente los casos M-1 a M-5 y CP-03 de la sección 7.4/7.6
// del enunciado del Proyecto 2. Capital en mora y interés corriente son
// siempre los de la cuota 2 del caso de referencia del Proyecto 1 (6.4.1).

const CAPITAL_EN_MORA = Dinero.deCentavos(72576, "GTQ"); // Q725.76
const INTERES_CORRIENTE_CUOTA_2 = 27886; // Q278.86

const TRAMOS_CP01 = [
  { id: "mora_1", ini: 1, fin: 30, tasaAnual: 0.18 },
  { id: "mora_2", ini: 31, fin: 60, tasaAnual: 0.24 },
  { id: "mora_3", ini: 61, fin: 90, tasaAnual: 0.3 },
  { id: "vencido", ini: 91, fin: 120, tasaAnual: 0.36 },
];

function totalCentavos(desglose: { monto: Dinero }[]): number {
  return desglose.reduce((acc, d) => acc + d.monto.centavos, 0);
}

describe("Política escalonada — casos M (sección 7.4)", () => {
  const escalonada = new PoliticaMoraEscalonada("POL-2026-10", TRAMOS_CP01, 360);

  it("M-1 · 15 días de atraso => Q5.44", () => {
    expect(totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 15))).toBe(544);
  });

  it("M-2 · 45 días de atraso (trampa del redondeo por tramo) => Q18.14, NUNCA Q18.15", () => {
    const desglose = escalonada.calcularMoratorio(CAPITAL_EN_MORA, 45);
    expect(totalCentavos(desglose)).toBe(1814);
    // Si alguien reintroduce el redondeo por tramo, este total se rompe a 1815.
  });

  it("M-3 · 100 días de atraso (los cuatro tramos) => Q50.80", () => {
    expect(totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 100))).toBe(5080);
  });

  it("M-4 · 120 días de atraso (frontera con incobrable) => Q65.32", () => {
    expect(totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 120))).toBe(6532);
  });

  it("M-5 · total adeudado de la cuota 2 a 45 días, con gasto de gestión => Q1,047.76", () => {
    const moratorio = totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 45));
    const gastos = correspondeGastoGestionCobro(45) ? montoGastoGestionCobro("GTQ").centavos : 0;
    const total = gastos + moratorio + INTERES_CORRIENTE_CUOTA_2 + CAPITAL_EN_MORA.centavos;
    expect(total).toBe(104776);
  });

  it("M-5 · a 15 días (Mora 1, sin gasto todavía) => Q1,010.06", () => {
    const moratorio = totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 15));
    const gastos = correspondeGastoGestionCobro(15) ? montoGastoGestionCobro("GTQ").centavos : 0;
    expect(gastos).toBe(0);
    const total = gastos + moratorio + INTERES_CORRIENTE_CUOTA_2 + CAPITAL_EN_MORA.centavos;
    expect(total).toBe(101006);
  });

  it("invariante: nunca excede el propio capital en mora (días extremos)", () => {
    const total = totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 120));
    expect(total).toBeLessThanOrEqual(CAPITAL_EN_MORA.centavos);
  });

  it("invariante: monótono creciente respecto de los días de atraso", () => {
    const a = totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 80));
    const b = totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 81));
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it("equivalencia en el primer tramo: 1-30 días es igual a una política plana al 18%", () => {
    const plana18 = new PoliticaMoraPlana("TEMP", 0.18, 360);
    for (const dias of [1, 10, 30]) {
      expect(totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, dias))).toBe(
        totalCentavos(plana18.calcularMoratorio(CAPITAL_EN_MORA, dias))
      );
    }
  });
});

describe("CP-03 · coexistencia de políticas (sección 7.6)", () => {
  const plana24 = new PoliticaMoraPlana("POL-2024-01", 0.24, 360);
  const escalonada = new PoliticaMoraEscalonada("POL-2026-10", TRAMOS_CP01, 360);

  it("crédito otorgado antes del 1/oct/2026 (plana 24%), 45 días => Q21.77", () => {
    expect(totalCentavos(plana24.calcularMoratorio(CAPITAL_EN_MORA, 45))).toBe(2177);
  });

  it("crédito otorgado después (escalonada), 45 días => Q18.14 (más barato para atraso moderado)", () => {
    expect(totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 45))).toBe(1814);
  });

  it("la política escalonada SIEMPRE resulta <= la plana 24% para el mismo atraso moderado", () => {
    expect(totalCentavos(escalonada.calcularMoratorio(CAPITAL_EN_MORA, 45))).toBeLessThanOrEqual(
      totalCentavos(plana24.calcularMoratorio(CAPITAL_EN_MORA, 45))
    );
  });
});

describe("Regresión del Proyecto 1 (no debe romperse)", () => {
  it("15 días de atraso con la política plana original del P1 (24%) => Q7.26", () => {
    const plana = new PoliticaMoraPlana("POL-2024-01", 0.24, 360);
    expect(totalCentavos(plana.calcularMoratorio(CAPITAL_EN_MORA, 15))).toBe(726);
  });
});

describe("Catálogo de políticas — resuelve por fecha de otorgamiento (DIP)", () => {
  const catalogo = [
    { id: "POL-2024-01", tipo: "plana" as const, tnaAnual: 0.24, vigenciaHasta: "2026-09-30" },
    { id: "POL-2026-10", tipo: "escalonada" as const, tramos: TRAMOS_CP01, vigenciaDesde: "2026-10-01" },
  ];

  it("un crédito de agosto de 2026 usa la política plana", () => {
    expect(resolverPoliticaVigente(catalogo, "2026-08-15").id).toBe("POL-2024-01");
  });

  it("un crédito de octubre de 2026 usa la política escalonada", () => {
    expect(resolverPoliticaVigente(catalogo, "2026-10-10").id).toBe("POL-2026-10");
  });
});

describe("CP-02 · gasto de gestión de cobro (sección 7.5)", () => {
  it("no se genera en Mora 1 (antes de 31 días)", () => {
    expect(correspondeGastoGestionCobro(30)).toBe(false);
  });

  it("se genera exactamente al entrar a Mora 2 (31 días)", () => {
    expect(correspondeGastoGestionCobro(31)).toBe(true);
    expect(montoGastoGestionCobro("GTQ").centavos).toBe(2500);
  });

  it("sigue generado (una sola vez, no se duplica) al subir a Mora 3 o Vencido", () => {
    // La función es pura: "¿corresponde tener generado el gasto?" sigue
    // siendo true sin importar cuántas veces se pregunte — la idempotencia
    // real la garantiza que el llamador solo lo cobra una vez (motor-cobranza.ts
    // descuenta `cuota.gastosPagados`, nunca vuelve a sumarlo).
    expect(correspondeGastoGestionCobro(75)).toBe(true);
    expect(correspondeGastoGestionCobro(100)).toBe(true);
  });
});
