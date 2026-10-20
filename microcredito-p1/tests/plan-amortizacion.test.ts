import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import {
  generarPlanAmortizacionFrances,
  sumaAmortizaciones,
  saldoFinalDelPlan,
} from "../src/dominio/plan-amortizacion.js";

// Caso de referencia obligatorio (seccion 6.4.1):
// P = Q10,000.00, TNA nominal 36% -> i = 3% mensual, n = 12 cuotas.
const TABLA_ESPERADA = [
  { saldoInicial: 10000.0, cuota: 1004.62, interes: 300.0, amortizacion: 704.62, saldoFinal: 9295.38 },
  { saldoInicial: 9295.38, cuota: 1004.62, interes: 278.86, amortizacion: 725.76, saldoFinal: 8569.62 },
  { saldoInicial: 8569.62, cuota: 1004.62, interes: 257.09, amortizacion: 747.53, saldoFinal: 7822.09 },
  { saldoInicial: 7822.09, cuota: 1004.62, interes: 234.66, amortizacion: 769.96, saldoFinal: 7052.13 },
  { saldoInicial: 7052.13, cuota: 1004.62, interes: 211.56, amortizacion: 793.06, saldoFinal: 6259.07 },
  { saldoInicial: 6259.07, cuota: 1004.62, interes: 187.77, amortizacion: 816.85, saldoFinal: 5442.22 },
  { saldoInicial: 5442.22, cuota: 1004.62, interes: 163.27, amortizacion: 841.35, saldoFinal: 4600.87 },
  { saldoInicial: 4600.87, cuota: 1004.62, interes: 138.03, amortizacion: 866.59, saldoFinal: 3734.28 },
  { saldoInicial: 3734.28, cuota: 1004.62, interes: 112.03, amortizacion: 892.59, saldoFinal: 2841.69 },
  { saldoInicial: 2841.69, cuota: 1004.62, interes: 85.25, amortizacion: 919.37, saldoFinal: 1922.32 },
  { saldoInicial: 1922.32, cuota: 1004.62, interes: 57.67, amortizacion: 946.95, saldoFinal: 975.37 },
  { saldoInicial: 975.37, cuota: 1004.63, interes: 29.26, amortizacion: 975.37, saldoFinal: 0.0 },
];

describe("Plan de amortizacion frances - caso de referencia 6.4.1", () => {
  const capital = Dinero.deQuetzales(10000.0);
  const tasaMensual = 0.03; // 36% TNA / 12
  const plan = generarPlanAmortizacionFrances(capital, tasaMensual, 12);

  it("reproduce exactamente las 12 filas de la tabla del enunciado", () => {
    expect(plan.filas).toHaveLength(12);
    plan.filas.forEach((fila, idx) => {
      const esperado = TABLA_ESPERADA[idx]!;
      expect(fila.saldoInicial.aNumero()).toBeCloseTo(esperado.saldoInicial, 2);
      expect(fila.cuota.aNumero()).toBeCloseTo(esperado.cuota, 2);
      expect(fila.interes.aNumero()).toBeCloseTo(esperado.interes, 2);
      expect(fila.amortizacion.aNumero()).toBeCloseTo(esperado.amortizacion, 2);
      expect(fila.saldoFinal.aNumero()).toBeCloseTo(esperado.saldoFinal, 2);
    });
  });

  it("la ultima cuota se ajusta a Q1,004.63 (un centavo mas) para cuadrar", () => {
    const ultima = plan.filas[11]!;
    expect(ultima.cuota.aNumero()).toBeCloseTo(1004.63, 2);
  });

  it("invariante: la suma de las amortizaciones es exactamente el capital desembolsado", () => {
    expect(sumaAmortizaciones(plan).igualA(capital)).toBe(true);
  });

  it("invariante: el saldo final es exactamente 0.00", () => {
    expect(saldoFinalDelPlan(plan).esCero()).toBe(true);
  });

  it("caso especial: tasa 0 => cuota = capital / n (sin division por cero)", () => {
    const planSinInteres = generarPlanAmortizacionFrances(Dinero.deQuetzales(1200), 0, 12);
    expect(planSinInteres.filas[0]!.cuota.aNumero()).toBeCloseTo(100.0, 2);
    expect(saldoFinalDelPlan(planSinInteres).esCero()).toBe(true);
  });
});
