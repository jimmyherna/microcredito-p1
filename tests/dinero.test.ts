import { describe, it, expect } from "vitest";
import { Dinero, ErrorMonedaIncompatible } from "../src/dominio/dinero.js";

describe("Dinero (Objeto de Valor)", () => {
  it("se representa en centavos enteros, nunca en punto flotante", () => {
    const d = Dinero.deQuetzales(1004.62);
    expect(d.centavos).toBe(100462);
    expect(Number.isInteger(d.centavos)).toBe(true);
  });

  it("sumar() devuelve una instancia nueva y no muta el original (inmutabilidad)", () => {
    const a = Dinero.deQuetzales(10);
    const b = Dinero.deQuetzales(5);
    const c = a.sumar(b);
    expect(a.centavos).toBe(1000);
    expect(c.centavos).toBe(1500);
    expect(c).not.toBe(a);
  });

  it("prohibe sumar montos de distinta moneda", () => {
    const gtq = Dinero.deCentavos(1000, "GTQ");
    const usd = Dinero.deCentavos(1000, "USD");
    expect(() => gtq.sumar(usd)).toThrow(ErrorMonedaIncompatible);
  });

  it("redondea a 2 decimales, medio hacia arriba", () => {
    // 0.005 -> 0.01 (medio hacia arriba), no banker's rounding
    expect(Dinero.deCentavos(1000).multiplicarPorFactor(0.0005).centavos).toBe(1); // 0.5 -> 1
  });
});
