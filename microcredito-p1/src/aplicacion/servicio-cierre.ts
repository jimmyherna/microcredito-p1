import { exigirFechaValida } from "./reloj.js";
import type { RepositorioPuerto } from "./repositorio-puerto.js";
import type { FilaCierre } from "./tipos.js";
import { calcularEstadoDeCuenta } from "./motor-cobranza.js";
import { consultarCarteraEnRiesgo } from "./servicio-cartera.js";
import type { ResultadoAplicacionPago } from "../dominio/prelacion-pago.js";

/** Primer día del mes calendario al que pertenece fechaCorte. */
function inicioDeMes(fechaCorte: string): string {
  return `${fechaCorte.slice(0, 7)}-01`;
}

/**
 * E1/sección 6.9: ejecuta (o recupera, si ya se ejecutó) el cierre DIARIO o
 * MENSUAL de una fecha de corte. Es idempotente: correrlo dos veces para la
 * misma (fechaCorte, tipo) sobrescribe con el mismo resultado, nunca
 * duplica movimientos (guardarCierre usa UPSERT).
 */
export async function ejecutarCierre(repo: RepositorioPuerto, tipo: "DIARIO" | "MENSUAL", fechaCorte: string): Promise<FilaCierre> {
  exigirFechaValida(fechaCorte);
  // Idempotente por RECÁLCULO: el cierre es una función pura de los eventos hasta la fecha de
  // corte; se recalcula y se hace UPSERT por (fechaCorte, tipo). Así nunca queda un cierre
  // viejo si después se registran pagos con esa misma fecha, y repetirlo no duplica nada.

  const fechaInicio = tipo === "DIARIO" ? fechaCorte : inicioDeMes(fechaCorte);

  const creditos = await repo.listarCreditos();
  let desembolsosCentavos = 0;
  let recGastos = 0;
  let recMoratorio = 0;
  let recCorriente = 0;
  let recCapital = 0;

  for (const credito of creditos) {
    if (credito.fechaDesembolso >= fechaInicio && credito.fechaDesembolso <= fechaCorte) {
      desembolsosCentavos += credito.capitalCentavos;
    }

    const politica = await repo.obtenerPoliticaMora(credito.politicaId);
    if (!politica) continue;
    const pagos = await repo.listarPagosDeCredito(credito.id);
    const aplicaciones: { fecha: string; detalle: ResultadoAplicacionPago }[] = [];
    calcularEstadoDeCuenta(credito, pagos, politica, fechaCorte, aplicaciones);

    for (const { fecha, detalle } of aplicaciones) {
      if (fecha < fechaInicio || fecha > fechaCorte) continue;
      for (const fila of detalle.detalle) {
        if (fila.rubro === "gastos") recGastos += fila.aplicado.centavos;
        if (fila.rubro === "interesMoratorio") recMoratorio += fila.aplicado.centavos;
        if (fila.rubro === "interesCorriente") recCorriente += fila.aplicado.centavos;
        if (fila.rubro === "capital") recCapital += fila.aplicado.centavos;
      }
    }
  }

  const cartera = await consultarCarteraEnRiesgo(repo, fechaCorte);

  const cierre: FilaCierre = {
    fechaCorte,
    tipo,
    carteraActivaCentavos: cartera.carteraActiva.centavos,
    carteraEnRiesgoCentavos: cartera.carteraEnRiesgo.centavos,
    porcentajeEnRiesgo: cartera.porcentaje,
    incobrablePeriodoCentavos: cartera.dadoPorIncobrableEnPeriodo.centavos,
    desembolsosCentavos,
    recuperacionGastosCentavos: recGastos,
    recuperacionInteresMoratorioCentavos: recMoratorio,
    recuperacionInteresCorrienteCentavos: recCorriente,
    recuperacionCapitalCentavos: recCapital,
  };

  await repo.guardarCierre(cierre);
  return cierre;
}
