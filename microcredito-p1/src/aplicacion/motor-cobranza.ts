// =============================================================================
// Motor de cobranza — capa de APLICACIÓN, no de dominio.
//
// Orquesta el núcleo (src/dominio/) sin reescribirlo: cada cálculo real
// (cuota francesa, tramos recorridos, prelación, transición de estado) llama
// a una función o clase de src/dominio/ ya existente y verificada contra los
// oráculos del enunciado (ver tests/politica-mora.test.ts — reproduce
// exactamente M-1 a M-5, CP-03 y el desglose de cartera de la sección 7.8).
//
// Lo que SÍ es responsabilidad de este archivo — y que no vive en ningún
// otro lado — es la orquestación temporal: "dado un crédito y una fecha de
// corte, ¿cuál es la cuota exigible hoy, y qué pasa cuando le aplico un
// pago?". Esa lógica de "cuenta corriente" no es cálculo financiero puro
// (no tiene un oráculo numérico propio en el enunciado), así que aquí sí
// hay una decisión de diseño explícita, documentada donde ocurre:
//
// [DECISIÓN] Excedente de un pago (cuando alcanza para más de la cuota
//   exigible): se aplica como abono anticipado a la siguiente cuota
//   pendiente, en cascada (destino "PAGO_ANTICIPADO_CUOTAS_FUTURAS" de la
//   sección 6.6.5). En el guion del video (Anexo A) los montos son siempre
//   exactos, así que este camino no se ejercita en la demo, pero se cubre
//   por completitud.
// =============================================================================

import { Dinero } from "../dominio/dinero.js";
import { generarPlanAmortizacionFrances, type PlanAmortizacion } from "../dominio/plan-amortizacion.js";
import { clasificarTramoMora, type TramoMora } from "../dominio/calculadora-mora.js";
import { construirPolitica } from "../dominio/politica-mora/catalogo-politicas.js";
import type { DesgloseMoraTramo, PoliticaMora } from "../dominio/politica-mora/politica-mora.js";
import { correspondeGastoGestionCobro, gastoAplicaAPolitica, montoGastoGestionCobro } from "../dominio/politica-mora/gasto-gestion-cobro.js";
import { clasificarInteresCorriente } from "../dominio/interes-suspenso.js";
import { aplicarPagoAPrelacion, type DeudaCuota, type ResultadoAplicacionPago } from "../dominio/prelacion-pago.js";
import { aplicarEvento, admitePago, type EstadoCredito } from "../dominio/credito-estado.js";
import { diasEntre, sumarMeses } from "./reloj.js";
import type { FilaCredito, FilaPago, FilaPoliticaMora } from "./tipos.js";

export interface CuotaConEstado {
  numeroCuota: number;
  fechaVencimiento: string;
  capitalCuota: Dinero;
  interesCorrienteCuota: Dinero;
  cuotaOriginal: Dinero;
  capitalPagado: Dinero;
  interesCorrientePagado: Dinero;
  interesMoratorioPagado: Dinero;
  gastosPagados: Dinero;
  saldada: boolean;
}

export interface EstadoDeCuenta {
  credito: FilaCredito;
  plan: PlanAmortizacion;
  cuotas: CuotaConEstado[];
  indiceCuotaExigible: number | null;
  diasDeAtraso: number;
  tramo: TramoMora;
  desgloseMoratorioTramos: DesgloseMoraTramo[];
  deudaExigibleActual: DeudaCuota;
  totalExigible: Dinero;
  saldoCapitalPendiente: Dinero;
  cuotasPagadasCompletas: number;
  cuotasVencidasImpagas: number;
  proximaCuota: { numeroCuota: number; fechaVencimiento: string; monto: Dinero } | null;
  interesEnSuspenso: Dinero;
}

/** Convierte la fila de política guardada en BD (E2) en la Strategy de dominio correspondiente (CP-01). */
export function politicaComoEstrategia(fila: FilaPoliticaMora): PoliticaMora {
  return construirPolitica({
    id: fila.id,
    tipo: fila.tipo,
    baseDeConteo: fila.baseConteo,
    ...(fila.tnaBps ? { tnaAnual: fila.tnaBps / 10000 } : {}),
    ...(fila.datos.tramos ? { tramos: fila.datos.tramos.map((t) => ({ id: t.id, ini: t.ini, fin: t.fin, tasaAnual: t.bps / 10000 })) } : {}),
    ...(fila.vigenciaDesde ? { vigenciaDesde: fila.vigenciaDesde } : {}),
    ...(fila.vigenciaHasta ? { vigenciaHasta: fila.vigenciaHasta } : {}),
  });
}

function sumarDineros(items: Dinero[], moneda: "GTQ" | "USD"): Dinero {
  return items.reduce((acc, d) => acc.sumar(d), Dinero.cero(moneda));
}

export function calcularEstadoDeCuenta(
  credito: FilaCredito,
  pagosOrdenados: FilaPago[],
  politicaFila: FilaPoliticaMora,
  fechaCorte: string,
  recolectarAplicaciones?: { fecha: string; detalle: ResultadoAplicacionPago }[]
): EstadoDeCuenta {
  const politica = politicaComoEstrategia(politicaFila);
  const moneda = credito.moneda;
  const capital = Dinero.deCentavos(credito.capitalCentavos, moneda);
  const plan = generarPlanAmortizacionFrances(capital, credito.tasaMensual, credito.plazoMeses);

  const cuotas: CuotaConEstado[] = plan.filas.map((fila, i) => ({
    numeroCuota: fila.numeroCuota,
    fechaVencimiento: sumarMeses(credito.fechaDesembolso, i + 1),
    capitalCuota: fila.amortizacion,
    interesCorrienteCuota: fila.interes,
    cuotaOriginal: fila.cuota,
    capitalPagado: Dinero.cero(moneda),
    interesCorrientePagado: Dinero.cero(moneda),
    interesMoratorioPagado: Dinero.cero(moneda),
    gastosPagados: Dinero.cero(moneda),
    saldada: false,
  }));

  const pagosAReplicar = pagosOrdenados
    .filter((p) => p.fecha <= fechaCorte)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  for (const pago of pagosAReplicar) {
    const resultado = aplicarUnPago(cuotas, moneda, politica, Dinero.deCentavos(pago.montoCentavos, moneda), pago.fecha);
    if (resultado && recolectarAplicaciones) recolectarAplicaciones.push({ fecha: pago.fecha, detalle: resultado });
  }

  const indiceCuotaExigible = cuotas.findIndex((c) => !c.saldada);

  let diasDeAtraso = 0;
  let deudaExigibleActual: DeudaCuota = {
    gastos: Dinero.cero(moneda),
    interesMoratorio: Dinero.cero(moneda),
    interesCorriente: Dinero.cero(moneda),
    capital: Dinero.cero(moneda),
  };
  let desgloseMoratorioTramos: DesgloseMoraTramo[] = [];
  let interesEnSuspenso = Dinero.cero(moneda);

  if (indiceCuotaExigible !== -1) {
    const cuota = cuotas[indiceCuotaExigible]!;
    diasDeAtraso = Math.max(0, diasEntre(cuota.fechaVencimiento, fechaCorte));
    const construccion = construirDeudaCuota(cuota, moneda, politica, diasDeAtraso);
    deudaExigibleActual = construccion.deuda;
    desgloseMoratorioTramos = construccion.desgloseMoratorio;
    interesEnSuspenso = construccion.interesEnSuspenso;
  }

  const tramo = clasificarTramoMora(diasDeAtraso);
  const totalExigible = sumarDineros(
    [deudaExigibleActual.gastos, deudaExigibleActual.interesMoratorio, deudaExigibleActual.interesCorriente, deudaExigibleActual.capital],
    moneda
  );

  const saldoCapitalPendiente = sumarDineros(
    cuotas.map((c) => c.capitalCuota.restar(c.capitalPagado)),
    moneda
  );

  const cuotasPagadasCompletas = cuotas.filter((c) => c.saldada).length;
  const cuotasVencidasImpagas =
    cuotas.filter((c, i) => !c.saldada && i !== indiceCuotaExigible && c.fechaVencimiento <= fechaCorte).length +
    (indiceCuotaExigible !== -1 && diasDeAtraso > 0 ? 1 : 0);

  const proximaCuota =
    indiceCuotaExigible !== -1
      ? {
          numeroCuota: cuotas[indiceCuotaExigible]!.numeroCuota,
          fechaVencimiento: cuotas[indiceCuotaExigible]!.fechaVencimiento,
          monto: cuotas[indiceCuotaExigible]!.cuotaOriginal,
        }
      : null;

  return {
    credito,
    plan,
    cuotas,
    indiceCuotaExigible: indiceCuotaExigible === -1 ? null : indiceCuotaExigible,
    diasDeAtraso,
    tramo,
    desgloseMoratorioTramos,
    deudaExigibleActual,
    totalExigible,
    saldoCapitalPendiente,
    cuotasPagadasCompletas,
    cuotasVencidasImpagas,
    proximaCuota,
    interesEnSuspenso,
  };
}

function construirDeudaCuota(
  cuota: CuotaConEstado,
  moneda: "GTQ" | "USD",
  politica: PoliticaMora,
  diasDeAtraso: number
): { deuda: DeudaCuota; desgloseMoratorio: DesgloseMoraTramo[]; interesEnSuspenso: Dinero } {
  const capitalPendiente = cuota.capitalCuota.restar(cuota.capitalPagado);
  const interesCorrientePendiente = cuota.interesCorrienteCuota.restar(cuota.interesCorrientePagado);

  const clasificacion = clasificarInteresCorriente(interesCorrientePendiente, diasDeAtraso);

  const desgloseMoratorio = politica.calcularMoratorio(capitalPendiente, diasDeAtraso);
  const interesMoratorioTotal = sumarDineros(
    desgloseMoratorio.map((t) => t.monto),
    moneda
  );
  const interesMoratorioPendiente = interesMoratorioTotal.restar(cuota.interesMoratorioPagado);

  const gastosTotal = gastoAplicaAPolitica(politica.id) && correspondeGastoGestionCobro(diasDeAtraso) ? montoGastoGestionCobro(moneda) : Dinero.cero(moneda);
  const gastosPendiente = gastosTotal.restar(cuota.gastosPagados);

  const cero = Dinero.cero(moneda);
  return {
    deuda: {
      gastos: gastosPendiente.esNegativo() ? cero : gastosPendiente,
      interesMoratorio: interesMoratorioPendiente.esNegativo() ? cero : interesMoratorioPendiente,
      interesCorriente: interesCorrientePendiente.esNegativo() ? cero : interesCorrientePendiente,
      capital: capitalPendiente.esNegativo() ? cero : capitalPendiente,
    },
    desgloseMoratorio,
    interesEnSuspenso: clasificacion.enSuspenso,
  };
}

function aplicarUnPago(
  cuotas: CuotaConEstado[],
  moneda: "GTQ" | "USD",
  politica: PoliticaMora,
  monto: Dinero,
  fechaPago: string
): ResultadoAplicacionPago | null {
  const indice = cuotas.findIndex((c) => !c.saldada);
  if (indice === -1) return null;

  const cuota = cuotas[indice]!;
  const diasDeAtraso = Math.max(0, diasEntre(cuota.fechaVencimiento, fechaPago));
  const { deuda } = construirDeudaCuota(cuota, moneda, politica, diasDeAtraso);

  const resultado = aplicarPagoAPrelacion(monto, deuda);

  for (const fila of resultado.detalle) {
    if (fila.rubro === "gastos") cuota.gastosPagados = cuota.gastosPagados.sumar(fila.aplicado);
    if (fila.rubro === "interesMoratorio") cuota.interesMoratorioPagado = cuota.interesMoratorioPagado.sumar(fila.aplicado);
    if (fila.rubro === "interesCorriente") cuota.interesCorrientePagado = cuota.interesCorrientePagado.sumar(fila.aplicado);
    if (fila.rubro === "capital") cuota.capitalPagado = cuota.capitalPagado.sumar(fila.aplicado);
  }

  cuota.saldada = resultado.cuotaSaldada;

  if (resultado.cuotaSaldada && !resultado.excedente.esCero()) {
    aplicarUnPago(cuotas, moneda, politica, resultado.excedente, fechaPago);
  }

  return resultado;
}

export function sincronizarEstadoCredito(estadoActual: EstadoCredito, diasDeAtraso: number, saldoRestanteCentavos: number): EstadoCredito {
  const estado = estadoActual;

  if (!admitePago(estado) && estado !== "VIGENTE") return estado;

  if (saldoRestanteCentavos === 0) {
    try {
      return aplicarEvento(estado, "PAGA_ULTIMA_CUOTA", { saldoRestante: 0 });
    } catch {
      return estado;
    }
  }

  if (diasDeAtraso > 120) {
    try {
      const previo = estado === "VIGENTE" ? aplicarEvento(estado, "VENCE_CUOTA_IMPAGADA", { diasDeAtraso: 1 }) : estado;
      return aplicarEvento(previo, "SUPERA_120_DIAS_SIN_ARREGLO", { diasDeAtraso });
    } catch {
      return estado;
    }
  }

  if (diasDeAtraso >= 1 && estado === "VIGENTE") {
    try {
      return aplicarEvento(estado, "VENCE_CUOTA_IMPAGADA", { diasDeAtraso });
    } catch {
      return estado;
    }
  }

  if (diasDeAtraso === 0 && estado === "EN_MORA") {
    try {
      return aplicarEvento(estado, "PAGA_TODO_LO_VENCIDO", { diasDeAtraso: 0 });
    } catch {
      return estado;
    }
  }

  return estado;
}

/**
 * Mora de UNA cuota concreta a la fecha de corte (G-5: "cuota 3 de CV-2026-0030";
 * G-7: "cuota 2 de CV-2026-0410"). Cada cuota vencida e impaga genera mora propia:
 * días = corte − vencimiento de ESA cuota; base = capital pendiente de ESA cuota.
 */
export function moraDeCuota(estado: EstadoDeCuenta, politicaFila: FilaPoliticaMora, numeroCuota: number, fechaCorte: string) {
  const cuota = estado.cuotas.find((c) => c.numeroCuota === numeroCuota);
  if (!cuota) return null;
  const politica = politicaComoEstrategia(politicaFila);
  const moneda = estado.credito.moneda;
  const dias = Math.max(0, diasEntre(cuota.fechaVencimiento, fechaCorte));
  const capitalPendiente = cuota.capitalCuota.restar(cuota.capitalPagado);
  const desglose = cuota.saldada || dias === 0 ? [] : politica.calcularMoratorio(capitalPendiente, dias);
  const total = sumarDineros(desglose.map((t) => t.monto), moneda);
  const gasto = !cuota.saldada && gastoAplicaAPolitica(politica.id) && correspondeGastoGestionCobro(dias) ? montoGastoGestionCobro(moneda) : Dinero.cero(moneda);
  return { cuota, dias, tramo: clasificarTramoMora(dias), capitalPendiente, desglose, total, gasto, politicaId: politica.id };
}
