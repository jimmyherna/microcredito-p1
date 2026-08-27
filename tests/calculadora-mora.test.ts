import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import {
  calcularInteresMoratorio,
  clasificarTramoMora,
  debeSuspenderDevengo,
  PoliticaMora,
} from "../src/dominio/calculadora-mora.js";

const politica: PoliticaMora = {
  tnaMoratoria: 0.24,
  baseDeConteo: 360,
  autor: "Comite de Credito",
  fechaVigenciaDesde: "2026-01-01",
};

describe("Calculadora de mora - ejemplo de la seccion 6.5", () => {
  it("reproduce el interes moratorio de Q7.26 (capital en mora Q725.76, 15 dias, TNA moratoria 24%, Actual/360)", () => {
    const capitalEnMora = Dinero.deQuetzales(725.76);
    const resultado = calcularInteresMoratorio(capitalEnMora, 15, politica);
    expect(resultado.aNumero()).toBeCloseTo(7.26, 2);
  });

  it("el moratorio se calcula EXCLUSIVAMENTE sobre capital en mora, nunca sobre la cuota completa (anatocismo)", () => {
    const capitalEnMora = Dinero.deQuetzales(725.76);
    const cuotaCompleta = Dinero.deQuetzales(1004.62); // incluye interes corriente
    const sobreCapital = calcularInteresMoratorio(capitalEnMora, 15, politica);
    const sobreCuota = calcularInteresMoratorio(cuotaCompleta, 15, politica);
    expect(sobreCapital.centavos).not.toBe(sobreCuota.centavos);
    expect(sobreCapital.aNumero()).toBeCloseTo(7.26, 2);
  });

  it("sin dias de atraso, el interes moratorio es cero", () => {
    expect(calcularInteresMoratorio(Dinero.deQuetzales(1000), 0, politica).esCero()).toBe(true);
  });
});

describe("Clasificacion de tramos de mora (Specification, derivada de dias de atraso)", () => {
  it.each([
    [0, "AL_DIA"],
    [1, "MORA_1"],
    [30, "MORA_1"],
    [31, "MORA_2"],
    [60, "MORA_2"],
    [61, "MORA_3"],
    [90, "MORA_3"],
    [91, "VENCIDO"],
    [120, "VENCIDO"],
    [121, "INCOBRABLE"],
  ] as const)("con %i dias de atraso clasifica como %s", (dias, tramoEsperado) => {
    expect(clasificarTramoMora(dias)).toBe(tramoEsperado);
  });

  it("la reversibilidad: un credito en Mora 2 (45 dias) que paga y queda con 10 dias clasifica en Mora 1", () => {
    expect(clasificarTramoMora(45)).toBe("MORA_2");
    expect(clasificarTramoMora(10)).toBe("MORA_1");
  });
});

describe("Suspension de devengo (seccion 6.5)", () => {
  it("se suspende el devengo de interes corriente al superar 90 dias de atraso", () => {
    expect(debeSuspenderDevengo(90)).toBe(false);
    expect(debeSuspenderDevengo(91)).toBe(true);
  });
});
