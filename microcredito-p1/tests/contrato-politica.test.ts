import { describe, it, expect } from "vitest";
import { Dinero } from "../src/dominio/dinero.js";
import type { PoliticaMora } from "../src/dominio/politica-mora/politica-mora.js";
import { PoliticaMoraPlana } from "../src/dominio/politica-mora/politica-plana.js";
import { PoliticaMoraEscalonada } from "../src/dominio/politica-mora/politica-escalonada.js";
import { PoliticaMoraRetroactiva } from "../src/dominio/politica-mora/politica-retroactiva.js";

// Prueba de sustitución de Liskov (sección 8.2-L): la MISMA batería de
// pruebas de contrato se ejecuta contra las tres implementaciones de
// PoliticaMora. Si alguna rompe un invariante que las demás cumplen, esa
// implementación no es sustituible y el principio L no se cumple.

const TRAMOS = [
  { id: "mora_1", ini: 1, fin: 30, tasaAnual: 0.18 },
  { id: "mora_2", ini: 31, fin: 60, tasaAnual: 0.24 },
  { id: "mora_3", ini: 61, fin: 90, tasaAnual: 0.3 },
  { id: "vencido", ini: 91, fin: 120, tasaAnual: 0.36 },
];

const IMPLEMENTACIONES: [string, PoliticaMora][] = [
  ["Plana", new PoliticaMoraPlana("POL-PLANA", 0.24, 360)],
  ["Escalonada", new PoliticaMoraEscalonada("POL-ESCALONADA", TRAMOS, 360)],
  ["Retroactiva (solo prueba, no se adopta)", new PoliticaMoraRetroactiva("POL-RETRO", TRAMOS, 360)],
];

describe.each(IMPLEMENTACIONES)("Contrato de PoliticaMora — %s", (_nombre, politica) => {
  const capital = Dinero.deCentavos(72576, "GTQ");

  it("sin atraso (0 días) no genera moratorio", () => {
    expect(politica.calcularMoratorio(capital, 0)).toEqual([]);
  });

  it("el total nunca excede el capital en mora", () => {
    for (const dias of [1, 15, 45, 90, 120]) {
      const total = politica.calcularMoratorio(capital, dias).reduce((acc, d) => acc + d.monto.centavos, 0);
      expect(total).toBeLessThanOrEqual(capital.centavos);
    }
  });

  it("es monótona creciente respecto de los días de atraso", () => {
    let anterior = 0;
    for (const dias of [1, 15, 30, 45, 60, 90, 120]) {
      const total = politica.calcularMoratorio(capital, dias).reduce((acc, d) => acc + d.monto.centavos, 0);
      expect(total).toBeGreaterThanOrEqual(anterior);
      anterior = total;
    }
  });

  it("nunca regresa un monto negativo", () => {
    for (const dias of [1, 45, 120]) {
      for (const linea of politica.calcularMoratorio(capital, dias)) {
        expect(linea.monto.centavos).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("cada política expone su propio id", () => {
    expect(politica.id).toBeTruthy();
  });
});
