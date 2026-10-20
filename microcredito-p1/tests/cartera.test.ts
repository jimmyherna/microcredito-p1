import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import {
  calcularCarteraEnRiesgo,
  CreditoParaCartera,
  ErrorParametrosCartera,
  formatearPorcentaje,
} from "../src/dominio/cartera.js";

// Caso de referencia obligatorio (seccion 6.8.1): cartera de siete creditos.
function carteraBase(): CreditoParaCartera[] {
  return [
    { id: "C-001", saldoCapital: Dinero.deQuetzales(620000.0), diasDeAtraso: 0, reestructurado: false, incobrable: false },
    { id: "C-002", saldoCapital: Dinero.deQuetzales(124000.0), diasDeAtraso: 8, reestructurado: false, incobrable: false },
    { id: "C-003", saldoCapital: Dinero.deQuetzales(24000.0), diasDeAtraso: 45, reestructurado: false, incobrable: false },
    { id: "C-004", saldoCapital: Dinero.deQuetzales(18000.0), diasDeAtraso: 75, reestructurado: false, incobrable: false },
    { id: "C-005", saldoCapital: Dinero.deQuetzales(8000.0), diasDeAtraso: 100, reestructurado: false, incobrable: false },
    { id: "C-006", saldoCapital: Dinero.deQuetzales(6000.0), diasDeAtraso: 0, reestructurado: true, incobrable: false },
    { id: "C-007", saldoCapital: Dinero.deQuetzales(15000.0), diasDeAtraso: 210, reestructurado: false, incobrable: true },
  ];
}

describe("Cartera en riesgo - caso de referencia 6.8.1", () => {
  it("calcula cartera activa Q800,000.00 y en riesgo Q56,000.00 (7.00%)", () => {
    const resultado = calcularCarteraEnRiesgo(carteraBase());
    expect(resultado.carteraActiva.aNumero()).toBeCloseTo(800000.0, 2);
    expect(resultado.carteraEnRiesgo.aNumero()).toBeCloseTo(56000.0, 2);
    expect(resultado.porcentaje).toBeCloseTo(0.07, 4);
    expect(resultado.creditosEnRiesgo.sort()).toEqual(["C-003", "C-004", "C-005", "C-006"]);
  });

  it("C-002 (8 dias de atraso) NO entra en riesgo; C-006 (al dia pero reestructurado) SI entra", () => {
    const resultado = calcularCarteraEnRiesgo(carteraBase());
    expect(resultado.creditosEnRiesgo).not.toContain("C-002");
    expect(resultado.creditosEnRiesgo).toContain("C-006");
  });

  it("C-007 (incobrable) queda excluido de la cartera activa y del riesgo", () => {
    const resultado = calcularCarteraEnRiesgo(carteraBase());
    expect(resultado.creditosEnRiesgo).not.toContain("C-007");
  });

  it("la trampa de dar por incobrable: al declarar incobrable C-005, el % 'mejora' a 6.06% sin cobrar nada", () => {
    const creditos = carteraBase().map((c) => (c.id === "C-005" ? { ...c, incobrable: true } : c));
    const resultado = calcularCarteraEnRiesgo(creditos);
    expect(resultado.carteraActiva.aNumero()).toBeCloseTo(792000.0, 2);
    expect(resultado.carteraEnRiesgo.aNumero()).toBeCloseTo(48000.0, 2);
    expect(resultado.porcentaje).toBeCloseTo(0.0606, 3);
  });

  it("invariante 6.10: el porcentaje de cartera en riesgo siempre esta entre 0 y 1", () => {
    const resultado = calcularCarteraEnRiesgo(carteraBase());
    expect(resultado.porcentaje).toBeGreaterThanOrEqual(0);
    expect(resultado.porcentaje).toBeLessThanOrEqual(1);
  });
});

describe("formatearPorcentaje", () => {
  it("formatea 0.07 como '7.00%' y 0.0606... como '6.06%'", () => {
    expect(formatearPorcentaje(0.07)).toBe("7.00%");
    expect(formatearPorcentaje(48000 / 792000)).toBe("6.06%");
  });
});

describe("calcularCarteraEnRiesgo - validacion de parametros (invariante 6.10)", () => {
  it("lanza ErrorParametrosCartera si el saldo de capital es negativo", () => {
    const creditos: CreditoParaCartera[] = [
      { id: "C-X", saldoCapital: Dinero.deQuetzales(-1.0), diasDeAtraso: 0, reestructurado: false, incobrable: false },
    ];
    expect(() => calcularCarteraEnRiesgo(creditos)).toThrow(ErrorParametrosCartera);
  });

  it("lanza ErrorParametrosCartera si los dias de atraso son negativos", () => {
    const creditos: CreditoParaCartera[] = [
      { id: "C-X", saldoCapital: Dinero.deQuetzales(100.0), diasDeAtraso: -5, reestructurado: false, incobrable: false },
    ];
    expect(() => calcularCarteraEnRiesgo(creditos)).toThrow(ErrorParametrosCartera);
  });
});
