import { describe, it, expect } from "vitest";
import path from "node:path";
import { cargarPaqueteEnMemoria } from "../src/persistencia/cargador-memoria.js";
import { registrarPago, validarPagoAntesDeAprobar, previsualizarPago } from "../src/aplicacion/servicio-pagos.js";
import { emitirTokenAprobacion } from "../src/aplicacion/aprobaciones-pago.js";
import { explicarMora } from "../src/aplicacion/servicio-creditos.js";
import { ErrorAplicacion } from "../src/aplicacion/tipos.js";

const dir = process.env["CV_DATA_DIR"];
const d = dir ? describe : describe.skip;
const F = "2026-10-31";

d("Anexo A / B contra el paquete canónico", () => {
  it("OP-1/OP-4: pago exacto con aprobación y reintento idempotente", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    const { montoExigibleCentavos: m } = await previsualizarPago(repo, "CV-2026-0043", F);
    const datos = { creditoId: "CV-2026-0043", montoCentavos: m, claveIdempotencia: "OP1", fecha: F };
    await validarPagoAntesDeAprobar(repo, datos);
    const r1 = await registrarPago(repo, { ...datos, tokenAprobacion: emitirTokenAprobacion(datos) });
    expect(r1.yaAplicado).toBe(false);
    const r2 = await registrarPago(repo, datos);
    expect(r2.yaAplicado).toBe(true);
    expect((await repo.listarPagosDeCredito("CV-2026-0043")).filter((p) => p.claveIdempotencia === "OP1")).toHaveLength(1);
  });

  it("OP-5: Q500 sobre CV-2026-0061 se rechaza e informa el monto correcto", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    await expect(validarPagoAntesDeAprobar(repo, { creditoId: "CV-2026-0061", montoCentavos: 50000, claveIdempotencia: "OP5", fecha: F })).rejects.toMatchObject({
      codigo: "MONTO_NO_EXACTO",
    });
  });

  it("OP-6: CV-2026-0015 es incobrable y no admite pagos", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    await expect(registrarPago(repo, { creditoId: "CV-2026-0015", montoCentavos: 1, claveIdempotencia: "OP6", fecha: F })).rejects.toBeInstanceOf(ErrorAplicacion);
  });

  it("sin token de aprobación humana no se registra el pago", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    const { montoExigibleCentavos: m } = await previsualizarPago(repo, "CV-2026-0035", F);
    await expect(registrarPago(repo, { creditoId: "CV-2026-0035", montoCentavos: m, claveIdempotencia: "X", fecha: F })).rejects.toThrow();
  });

  it("G-7: cuota 2 de CV-2026-0410 al 2027-01-24 usa su propia fecha y tramos 30+15 días", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    const r: any = await explicarMora(repo, "CV-2026-0410", "2027-01-24", 2);
    expect(r.diasDeAtraso).toBe(45);
    expect(r.desglosePorTramo.map((t: any) => t.dias)).toEqual([30, 15]);
    expect(r.totalInteresMoratorio.centavos).toBe(r.desglosePorTramo.reduce((a: number, t: any) => a + t.monto.centavos, 0));
  });

  it("G-5: CV-2026-0030 es política plana (sin gasto de gestión)", async () => {
    const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
    const r: any = await explicarMora(repo, "CV-2026-0030", F, 3);
    expect(r.politicaId).toBe("POL-2024-01");
    expect(r.gastoGestionCobro.centavos).toBe(0);
  });
});
