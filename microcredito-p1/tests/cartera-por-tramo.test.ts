import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import { calcularCarteraEnRiesgoPorTramo, type CreditoParaCarteraPorTramo } from "../src/dominio/cartera.js";

// Reproduce el oráculo de la sección 7.8 del Proyecto 2 (la misma cartera
// de 7 créditos de la sección 6.8.1 del Proyecto 1, ahora con el desglose
// por tramo que exige CP-04.3).

function credito(
  id: string,
  saldoQ: number,
  diasDeAtraso: number,
  opciones: { reestructurado?: boolean; incobrable?: boolean; tramo?: string } = {}
): CreditoParaCarteraPorTramo {
  const tramo =
    opciones.tramo ??
    (diasDeAtraso <= 0 ? "AL_DIA" : diasDeAtraso <= 30 ? "MORA_1" : diasDeAtraso <= 60 ? "MORA_2" : diasDeAtraso <= 90 ? "MORA_3" : "VENCIDO");
  return {
    id,
    saldoCapital: Dinero.deQuetzales(saldoQ, "GTQ"),
    diasDeAtraso,
    reestructurado: opciones.reestructurado ?? false,
    incobrable: opciones.incobrable ?? false,
    tramo,
  };
}

const CARTERA_7_8: CreditoParaCarteraPorTramo[] = [
  credito("C-001", 620000, 0),
  credito("C-002", 124000, 8), // no entra: no supera 30 días
  credito("C-003", 24000, 45),
  credito("C-004", 18000, 75),
  credito("C-005", 8000, 100),
  credito("C-006", 6000, 0, { reestructurado: true }), // al día pero reestructurado -> sí entra
  credito("C-007", 15000, 210, { incobrable: true, tramo: "INCOBRABLE" }), // excluido de la base
];

describe("Cartera en riesgo por tramo — oráculo sección 7.8", () => {
  const resultado = calcularCarteraEnRiesgoPorTramo(CARTERA_7_8);

  it("cartera activa excluye al incobrable (C-007) => Q800,000.00", () => {
    expect(resultado.carteraActiva.centavos).toBe(80_000_000);
  });

  it("cartera en mora (todo atraso >= 1 día) => Q174,000.00 (21.75%)", () => {
    expect(resultado.carteraEnMora.centavos).toBe(17_400_000);
  });

  it("cartera en riesgo (> 30 días + reestructurados) => Q56,000.00 (7.00%)", () => {
    expect(resultado.carteraEnRiesgo.centavos).toBe(5_600_000);
    expect(resultado.porcentajeEnRiesgo).toBeCloseTo(0.07, 4);
  });

  it("cartera en mora y cartera en riesgo son indicadores DISTINTOS (nunca deben confundirse)", () => {
    expect(resultado.carteraEnMora.centavos).not.toBe(resultado.carteraEnRiesgo.centavos);
  });

  it("C-002 (8 días) no aparece en ningún tramo de riesgo", () => {
    const todos = resultado.filasPorTramo.flatMap((f) => f.creditos);
    expect(todos).not.toContain("C-002");
  });

  it("desglose por tramo: 3.00% + 2.25% + 1.00% + 0.75% = 7.00%, sin error de redondeo acumulado", () => {
    const sumaPorcentajes = resultado.filasPorTramo.reduce((acc, f) => acc + f.porcentajeDeCarteraActiva, 0);
    expect(sumaPorcentajes).toBeCloseTo(resultado.porcentajeEnRiesgo, 6);
  });

  it("C-006 (reestructurado, al día) sigue contando como en riesgo", () => {
    const todos = resultado.filasPorTramo.flatMap((f) => f.creditos);
    expect(todos).toContain("C-006");
  });
});

describe("La trampa de dar por incobrable (sección 6.8 del P1, vigente en el P2)", () => {
  it("dar por incobrable a C-005 baja el % de riesgo sin haber cobrado nada", () => {
    const sinC005 = CARTERA_7_8.map((c) => (c.id === "C-005" ? { ...c, incobrable: true } : c));
    const resultado = calcularCarteraEnRiesgoPorTramo(sinC005);
    expect(resultado.porcentajeEnRiesgo).toBeCloseTo(0.0606, 3); // 48,000 / 792,000 = 6.06%
  });
});
