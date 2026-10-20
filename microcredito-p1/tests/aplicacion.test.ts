import { describe, it, expect, beforeEach } from "vitest";
import { RepositorioMemoria } from "../src/aplicacion/repositorio-memoria.js";
import { sembrarDatosDeDesarrollo } from "../src/aplicacion/semilla-desarrollo.js";
import { consultarCredito, explicarMora } from "../src/aplicacion/servicio-creditos.js";
import { previsualizarPago, registrarPago } from "../src/aplicacion/servicio-pagos.js";
import { consultarCarteraEnRiesgo } from "../src/aplicacion/servicio-cartera.js";
import { ErrorAplicacion } from "../src/aplicacion/tipos.js";
import { emitirTokenAprobacion } from "../src/aplicacion/aprobaciones-pago.js";

/** Simula el clic humano en "Aprobar": solo la API/UI puede emitir este token. */
const aprobar = (creditoId: string, montoCentavos: number, claveIdempotencia: string) =>
  emitirTokenAprobacion({ creditoId, montoCentavos, claveIdempotencia });

// Estas pruebas cubren la capa de ORQUESTACIÓN nueva del Proyecto Final
// (src/aplicacion/), usando RepositorioMemoria para no depender de una
// instancia de PostgreSQL levantada. Complementan, no reemplazan, la
// suite original de src/dominio/ (tests/*.test.ts ya existentes), que
// sigue corriendo intacta.

describe("motor de cobranza + servicios de aplicación", () => {
  let repo: RepositorioMemoria;
  const hoy = "2026-10-31";

  beforeEach(() => {
    repo = sembrarDatosDeDesarrollo(new RepositorioMemoria());
  });

  it("consulta un crédito y calcula días de atraso contra la fecha de corte, nunca contra el reloj", async () => {
    const credito = await consultarCredito(repo, "CV-2026-0001", hoy);
    expect(credito.diasDeAtraso).toBeGreaterThan(0);

    // Fecha de corte distinta -> resultado distinto y determinista (no depende de Date.now()).
    const otraFecha = await consultarCredito(repo, "CV-2026-0001", "2026-07-20");
    expect(otraFecha.diasDeAtraso).toBeLessThan(credito.diasDeAtraso);
  });

  it("rechaza CREDITO_INEXISTENTE con el código uniforme", async () => {
    await expect(consultarCredito(repo, "CV-NO-EXISTE", hoy)).rejects.toMatchObject({
      codigo: "CREDITO_INEXISTENTE",
    });
  });

  it("registrar un pago con el monto exacto salda la deuda exigible y actualiza el estado", async () => {
    const prev = await previsualizarPago(repo, "CV-2026-0001", hoy);
    const resultado = await registrarPago(repo, {
      creditoId: "CV-2026-0001",
      montoCentavos: prev.montoExigibleCentavos,
      claveIdempotencia: "TEST-IDEM-01",
      fecha: hoy,
      tokenAprobacion: aprobar("CV-2026-0001", prev.montoExigibleCentavos, "TEST-IDEM-01"),
    });
    expect(resultado.cuotaSaldada).toBe(true);
    expect(resultado.yaAplicado).toBe(false);
  });

  it("invariante 6.10: una clave de idempotencia repetida se ignora (no cobra dos veces)", async () => {
    const prev = await previsualizarPago(repo, "CV-2026-0001", hoy);
    await registrarPago(repo, {
      creditoId: "CV-2026-0001",
      montoCentavos: prev.montoExigibleCentavos,
      claveIdempotencia: "TEST-IDEM-REPETIDA",
      fecha: hoy,
      tokenAprobacion: aprobar("CV-2026-0001", prev.montoExigibleCentavos, "TEST-IDEM-REPETIDA"),
    });
    const pagosAntes = (await repo.listarPagosDeCredito("CV-2026-0001")).length;

    const segundaVez = await registrarPago(repo, {
      creditoId: "CV-2026-0001",
      montoCentavos: prev.montoExigibleCentavos,
      claveIdempotencia: "TEST-IDEM-REPETIDA",
      fecha: hoy,
    });
    const pagosDespues = (await repo.listarPagosDeCredito("CV-2026-0001")).length;

    expect(segundaVez.yaAplicado).toBe(true);
    expect(pagosDespues).toBe(pagosAntes); // no se insertó un segundo pago
  });

  it("sin token de aprobación humana el pago NO se registra (menor privilegio)", async () => {
    const prev = await previsualizarPago(repo, "CV-2026-0001", hoy);
    await expect(
      registrarPago(repo, { creditoId: "CV-2026-0001", montoCentavos: prev.montoExigibleCentavos, claveIdempotencia: "SIN-TOKEN", fecha: hoy })
    ).rejects.toMatchObject({ detalles: { campo: "tokenAprobacion" } });
    expect(await repo.existePago("SIN-TOKEN")).toBe(false);
  });

  it("un token no sirve para otro monto ni se puede reutilizar", async () => {
    const prev = await previsualizarPago(repo, "CV-2026-0001", hoy);
    const token = aprobar("CV-2026-0001", prev.montoExigibleCentavos, "T1");
    await registrarPago(repo, { creditoId: "CV-2026-0001", montoCentavos: prev.montoExigibleCentavos, claveIdempotencia: "T1", fecha: hoy, tokenAprobacion: token });
    const prev2 = await previsualizarPago(repo, "CV-2026-0001", hoy);
    await expect(
      registrarPago(repo, { creditoId: "CV-2026-0001", montoCentavos: prev2.montoExigibleCentavos, claveIdempotencia: "T2", fecha: hoy, tokenAprobacion: token })
    ).rejects.toThrow();
  });

  it("fecha inválida => FECHA_INVALIDA", async () => {
    await expect(consultarCredito(repo, "CV-2026-0001", "2026-02-30")).rejects.toMatchObject({ codigo: "FECHA_INVALIDA" });
  });

  it("rechaza un monto no exacto e informa el monto correcto", async () => {
    const prev = await previsualizarPago(repo, "CV-2026-0001", hoy);
    await expect(
      registrarPago(repo, {
        creditoId: "CV-2026-0001",
        montoCentavos: prev.montoExigibleCentavos + 100,
        claveIdempotencia: "TEST-MONTO-MAL",
        fecha: hoy,
      })
    ).rejects.toMatchObject({
      codigo: "MONTO_NO_EXACTO",
      detalles: { montoCorrectoCentavos: prev.montoExigibleCentavos },
    });
  });

  it("rechaza un pago sobre un crédito incobrable (>120 días de atraso)", async () => {
    // CV-2026-0002 en la semilla de desarrollo ya supera los 120 días al 31/oct.
    await expect(
      registrarPago(repo, { creditoId: "CV-2026-0002", montoCentavos: 100, claveIdempotencia: "TEST-INCOBRABLE", fecha: hoy })
    ).rejects.toMatchObject({ codigo: "CREDITO_INCOBRABLE" });
  });

  it("explica la mora con desglose por tramo recorrido (política escalonada)", async () => {
    const detalle = await explicarMora(repo, "CV-2026-0002", hoy);
    expect(detalle.desglosePorTramo.length).toBeGreaterThan(0);
    const sumaTramos = detalle.desglosePorTramo.reduce((acc, t) => acc + t.monto.centavos, 0);
    expect(sumaTramos).toBe(detalle.totalInteresMoratorio.centavos);
  });

  it("la cartera en riesgo y el crédito individual son consistentes entre sí (misma fuente)", async () => {
    const cartera = await consultarCarteraEnRiesgo(repo, hoy);
    const credito = await consultarCredito(repo, "CV-2026-0001", hoy);
    if (credito.diasDeAtraso > 0) {
      expect(cartera.creditosEnRiesgo).toContain("CV-2026-0001");
    }
  });
});

describe("ErrorAplicacion", () => {
  it("expone un código estable para que la API/MCP lo traduzcan a un estado HTTP uniforme", () => {
    const error = new ErrorAplicacion("VALIDACION", "mensaje de prueba");
    expect(error.codigo).toBe("VALIDACION");
    expect(error).toBeInstanceOf(Error);
  });
});
