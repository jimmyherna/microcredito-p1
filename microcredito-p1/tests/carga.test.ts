import { describe, it, expect } from "vitest";
import path from "node:path";
import { cargarPaqueteEnMemoria } from "../src/persistencia/cargador-memoria.js";
import { calcularEstadoDeCuenta } from "../src/aplicacion/motor-cobranza.js";

// Requiere CV_DATA_DIR apuntando al paquete canónico (nunca incrustado en el código).
const dir = process.env["CV_DATA_DIR"];
const d = dir ? describe : describe.skip;

d("cargador del paquete canónico", () => {
  it("verifica la huella y carga 60 clientes, 75 créditos y 228 eventos de pago (226 aplicados) (2 claves repetidas ignoradas)", async () => {
    const { resumen } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    expect(resumen.huellaCoincide).toBe(true);
    expect(resumen.clientes).toBe(60);
    expect(resumen.creditos).toBe(75);
    expect(resumen.eventosPago).toBe(228);
    expect(resumen.pagos).toBe(226);
    expect(resumen.pagosDuplicadosIgnorados).toBe(2);
    expect(resumen.eventosPagoLeidos).toBe(228);
  });

  it("el motor reproduce cada pago histórico: monto pagado = deuda exigible calculada ese día", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    for (const c of repo.creditos.values()) {
      const pagos = (await repo.listarPagosDeCredito(c.id)).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      const pol = (await repo.obtenerPoliticaMora(c.politicaId))!;
      pagos.forEach((p, i) => {
        const est = calcularEstadoDeCuenta(c, pagos.slice(0, i), pol, p.fecha);
        expect(est.totalExigible.centavos, `${c.id} ${p.fecha}`).toBe(p.montoCentavos);
      });
    }
  });
});
