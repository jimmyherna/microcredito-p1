import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import { aplicarPagoAPrelacion, aplicarExcedente, DeudaCuota } from "../src/dominio/prelacion-pago.js";

// Deuda de la cuota 2 del caso de referencia (seccion 6.6.1):
// gastos 0, moratorio 7.26, corriente 278.86, capital 725.76 => total 1,011.88
const deudaCuota2: DeudaCuota = {
  gastos: Dinero.deQuetzales(0),
  interesMoratorio: Dinero.deQuetzales(7.26),
  interesCorriente: Dinero.deQuetzales(278.86),
  capital: Dinero.deQuetzales(725.76),
};

describe("Prelacion de pagos (Chain of Responsibility) - seccion 6.6", () => {
  it("Escenario A: pago exacto de Q1,011.88 salda la cuota completa, sin excedente", () => {
    const resultado = aplicarPagoAPrelacion(Dinero.deQuetzales(1011.88), deudaCuota2);
    expect(resultado.cuotaSaldada).toBe(true);
    expect(resultado.excedente.esCero()).toBe(true);
    expect(resultado.detalle.map((d) => d.aplicado.aNumero())).toEqual([0, 7.26, 278.86, 725.76]);
  });

  it("Escenario B: pago de menos (Q500.00) se aplica en orden y no salda la cuota", () => {
    const resultado = aplicarPagoAPrelacion(Dinero.deQuetzales(500.0), deudaCuota2);
    expect(resultado.cuotaSaldada).toBe(false);
    expect(resultado.excedente.esCero()).toBe(true);
    const filaCapital = resultado.detalle.find((d) => d.rubro === "capital")!;
    expect(filaCapital.aplicado.aNumero()).toBeCloseTo(213.88, 2);
    expect(filaCapital.pendiente.aNumero()).toBeCloseTo(511.88, 2);
  });

  it("Escenario C: pago de mas (Q3,000.00) salda la cuota y deja Q1,988.12 de excedente", () => {
    const resultado = aplicarPagoAPrelacion(Dinero.deQuetzales(3000.0), deudaCuota2);
    expect(resultado.cuotaSaldada).toBe(true);
    expect(resultado.excedente.aNumero()).toBeCloseTo(1988.12, 2);

    const destino = aplicarExcedente(resultado.excedente, "AMORTIZACION_CAPITAL");
    expect(destino.monto.aNumero()).toBeCloseTo(1988.12, 2);
  });

  it("nunca se rechaza un pago insuficiente: siempre se registra el abono parcial", () => {
    const resultado = aplicarPagoAPrelacion(Dinero.deQuetzales(1.0), deudaCuota2);
    expect(() => resultado).not.toThrow();
    expect(resultado.detalle[0]!.aplicado.aNumero()).toBe(0); // gastos = 0 primero
  });
});
