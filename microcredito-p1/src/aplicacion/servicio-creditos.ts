import type { RepositorioPuerto } from "./repositorio-puerto.js";
import type { FilaCredito } from "./tipos.js";
import { ErrorAplicacion } from "./tipos.js";
import { calcularEstadoDeCuenta, moraDeCuota, sincronizarEstadoCredito, type EstadoDeCuenta } from "./motor-cobranza.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { Dinero } from "../dominio/dinero.js";
import { exigirFechaValida } from "./reloj.js";

/** UC4: desembolsar una solicitud ya aprobada; genera el crédito y su plan de amortización. */
export async function desembolsarCredito(
  repo: RepositorioPuerto,
  solicitudId: string,
  datos: { creditoId?: string; asesorId: string; fechaDesembolso: string; tnaBps: number }
): Promise<FilaCredito> {
  const solicitud = await repo.obtenerSolicitud(solicitudId);
  if (!solicitud) throw new ErrorAplicacion("SOLICITUD_INEXISTENTE", `No existe la solicitud ${solicitudId}`);
  if (solicitud.estado !== "APROBADO") {
    throw new ErrorAplicacion(
      "TRANSICION_INVALIDA",
      `Solo se puede desembolsar una solicitud APROBADA (estado actual: ${solicitud.estado})`
    );
  }

  const politicaCredito = await repo.politicaCreditoVigenteEn(datos.fechaDesembolso);
  if (datos.tnaBps < politicaCredito.tnaMinBps || datos.tnaBps > politicaCredito.tnaMaxBps) {
    throw new ErrorAplicacion(
      "VALIDACION",
      `La tasa ${(datos.tnaBps / 100).toFixed(2)} % está fuera del rango de la política ${politicaCredito.id} (${(politicaCredito.tnaMinBps / 100).toFixed(2)} %–${(politicaCredito.tnaMaxBps / 100).toFixed(2)} %)`
    );
  }
  const politica = await repo.politicaVigenteEn(datos.fechaDesembolso);
  const tasaMensual = datos.tnaBps / 10000 / 12;
  const id = datos.creditoId ?? solicitud.id.replace("SOL-", "CV-");

  const credito = await repo.crearCredito({
    id,
    clienteId: solicitud.clienteId,
    asesorId: datos.asesorId,
    solicitudId: solicitud.id,
    fechaDesembolso: datos.fechaDesembolso,
    capitalCentavos: solicitud.montoCentavos,
    plazoMeses: solicitud.plazoMeses,
    tnaBps: datos.tnaBps,
    tasaMensual,
    politicaId: politica.id,
    estado: "VIGENTE",
    reestructurado: false,
    moneda: "GTQ",
  });

  return credito;
}

/** Simula el plan de amortización ANTES de confirmar un desembolso (OP-3: "muestre el plan simulado antes de confirmar"). */
export function simularPlanAmortizacion(capitalCentavos: number, tnaBps: number, plazoMeses: number) {
  const tasaMensual = tnaBps / 10000 / 12;
  return generarPlanAmortizacionFrances(Dinero.deCentavos(capitalCentavos, "GTQ"), tasaMensual, plazoMeses);
}

async function cargarEstadoDeCuenta(repo: RepositorioPuerto, creditoId: string, fechaCorte: string): Promise<EstadoDeCuenta> {
  exigirFechaValida(fechaCorte);
  const credito = await repo.obtenerCredito(creditoId);
  if (!credito) throw new ErrorAplicacion("CREDITO_INEXISTENTE", `No existe el crédito ${creditoId}`);
  const politica = await repo.obtenerPoliticaMora(credito.politicaId);
  if (!politica) throw new ErrorAplicacion("VALIDACION", `Política de mora ${credito.politicaId} no encontrada`);
  const pagos = await repo.listarPagosDeCredito(creditoId);
  return calcularEstadoDeCuenta(credito, pagos, politica, fechaCorte);
}

/** UC4/UC5: consultar un crédito a una fecha de corte — capacidad "Consultar un crédito" (sección 6.3). */
export async function consultarCredito(repo: RepositorioPuerto, creditoId: string, fechaCorte: string) {
  const estadoDeCuenta = await cargarEstadoDeCuenta(repo, creditoId, fechaCorte);

  // Sincroniza el ESTADO (patrón State) según los días de atraso actuales,
  // y lo persiste si cambió — así una consulta repetida no queda "atascada"
  // en un estado viejo (ver motor-cobranza.ts::sincronizarEstadoCredito).
  const saldoRestante = estadoDeCuenta.saldoCapitalPendiente.centavos;
  const nuevoEstado = sincronizarEstadoCredito(estadoDeCuenta.credito.estado, estadoDeCuenta.diasDeAtraso, saldoRestante);
  if (nuevoEstado !== estadoDeCuenta.credito.estado) {
    await repo.actualizarEstadoCredito(creditoId, nuevoEstado);
  }

  return {
    id: estadoDeCuenta.credito.id,
    estado: nuevoEstado,
    tramo: estadoDeCuenta.tramo,
    capitalDesembolsado: { centavos: estadoDeCuenta.credito.capitalCentavos, moneda: estadoDeCuenta.credito.moneda },
    tasaMensual: estadoDeCuenta.credito.tasaMensual,
    numeroCuotas: estadoDeCuenta.credito.plazoMeses,
    politicaVersion: estadoDeCuenta.credito.politicaId,
    saldoCapital: { centavos: estadoDeCuenta.saldoCapitalPendiente.centavos, moneda: estadoDeCuenta.credito.moneda },
    diasDeAtraso: estadoDeCuenta.diasDeAtraso,
    cuotasPagadas: estadoDeCuenta.cuotasPagadasCompletas,
    cuotasVencidas: estadoDeCuenta.cuotasVencidasImpagas,
    proximaCuota: estadoDeCuenta.proximaCuota,
  };
}

/** Capacidad "Calcular la deuda de una cuota" (sección 6.3): la cuota exigible actual, desglosada. */
export async function consultarDeudaExigible(repo: RepositorioPuerto, creditoId: string, fechaCorte: string) {
  const e = await cargarEstadoDeCuenta(repo, creditoId, fechaCorte);
  const d = e.deudaExigibleActual;
  const totalCentavos = d.gastos.centavos + d.interesMoratorio.centavos + d.interesCorriente.centavos + d.capital.centavos;
  return {
    creditoId,
    fechaCorte,
    cuotaExigible: e.proximaCuota,
    gastos: { centavos: d.gastos.centavos, moneda: e.credito.moneda },
    interesMoratorio: { centavos: d.interesMoratorio.centavos, moneda: e.credito.moneda },
    interesCorriente: { centavos: d.interesCorriente.centavos, moneda: e.credito.moneda },
    capital: { centavos: d.capital.centavos, moneda: e.credito.moneda },
    totalExigible: { centavos: totalCentavos, moneda: e.credito.moneda },
  };
}

/** Capacidad "Explicar una mora" (sección 6.3): desglose por tramo recorrido. */
export async function explicarMora(repo: RepositorioPuerto, creditoId: string, fechaCorte: string, numeroCuota?: number) {
  const e = await cargarEstadoDeCuenta(repo, creditoId, fechaCorte);
  if (numeroCuota !== undefined) {
    const politicaFila = await repo.obtenerPoliticaMora(e.credito.politicaId);
    const m = politicaFila ? moraDeCuota(e, politicaFila, numeroCuota, fechaCorte) : null;
    if (!m) throw new ErrorAplicacion("VALIDACION", `El crédito ${creditoId} no tiene la cuota ${numeroCuota}`);
    const moneda = e.credito.moneda;
    return {
      creditoId,
      fechaCorte,
      numeroCuota,
      fechaVencimiento: m.cuota.fechaVencimiento,
      politicaId: m.politicaId,
      diasDeAtraso: m.dias,
      tramoActual: m.tramo,
      cuotaSaldada: m.cuota.saldada,
      capitalEnMora: { centavos: m.capitalPendiente.centavos, moneda },
      desglosePorTramo: m.desglose.map((t) => ({ tramo: t.tramo, dias: t.dias, tasaAnual: t.tasaAnual, monto: { centavos: t.monto.centavos, moneda } })),
      totalInteresMoratorio: { centavos: m.total.centavos, moneda },
      gastoGestionCobro: { centavos: m.gasto.centavos, moneda },
    };
  }
  return {
    creditoId,
    fechaCorte,
    diasDeAtraso: e.diasDeAtraso,
    tramoActual: e.tramo,
    capitalEnMora: { centavos: e.deudaExigibleActual.capital.centavos, moneda: e.credito.moneda },
    desglosePorTramo: e.desgloseMoratorioTramos.map((t) => ({
      tramo: t.tramo,
      dias: t.dias,
      tasaAnual: t.tasaAnual,
      monto: { centavos: t.monto.centavos, moneda: e.credito.moneda },
    })),
    totalInteresMoratorio: { centavos: e.deudaExigibleActual.interesMoratorio.centavos, moneda: e.credito.moneda },
  };
}

/** Pantalla "Plan de amortización": el plan completo, con lo ya pagado por cuota. */
export async function consultarPlanAmortizacion(repo: RepositorioPuerto, creditoId: string, fechaCorte: string) {
  const e = await cargarEstadoDeCuenta(repo, creditoId, fechaCorte);
  const primera = e.cuotas[0];
  const ultima = e.cuotas[e.cuotas.length - 1];
  const ajustada = !!primera && !!ultima && e.cuotas.length > 1 && ultima.cuotaOriginal.centavos !== primera.cuotaOriginal.centavos;
  return {
    creditoId,
    // La última cuota absorbe los centavos de redondeo para cerrar el saldo en Q0.00 (P1 6.4).
    ultimaCuotaAjustada: ajustada,
    cuotaRegular: primera ? { centavos: primera.cuotaOriginal.centavos, moneda: e.credito.moneda } : null,
    cuotaFinal: ultima ? { centavos: ultima.cuotaOriginal.centavos, moneda: e.credito.moneda } : null,
    filas: e.cuotas.map((c) => ({
      numeroCuota: c.numeroCuota,
      fechaVencimiento: c.fechaVencimiento,
      cuota: { centavos: c.cuotaOriginal.centavos, moneda: e.credito.moneda },
      capital: { centavos: c.capitalCuota.centavos, moneda: e.credito.moneda },
      interes: { centavos: c.interesCorrienteCuota.centavos, moneda: e.credito.moneda },
      capitalPagado: { centavos: c.capitalPagado.centavos, moneda: e.credito.moneda },
      saldada: c.saldada,
    })),
  };
}

/**
 * Historial de cobros de un crédito, en orden cronológico — es lo que
 * alimenta "Registro de Cobros" en la pantalla Abonar a Crédito (réplica
 * del prototipo de Figma). Se numeran en el orden en que se aplicaron
 * (no necesariamente 1 pago = 1 cuota exacta, pero para un crédito con
 * pagos exactos coincide uno a uno).
 */
export async function listarHistorialDeCobros(repo: RepositorioPuerto, creditoId: string) {
  const pagos = await repo.listarPagosDeCredito(creditoId);
  const ordenados = [...pagos].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const totalCentavos = ordenados.reduce((acc, p) => acc + p.montoCentavos, 0);
  return {
    creditoId,
    cobros: ordenados.map((p, i) => ({
      numero: i + 1,
      fecha: p.fecha,
      monto: { centavos: p.montoCentavos, moneda: "GTQ" as const },
    })),
    totalAbonado: { centavos: totalCentavos, moneda: "GTQ" as const },
  };
}

/** Capacidad "Listar créditos en mora" (sección 6.3), filtrable por tramo. */
export async function listarCreditosEnMora(repo: RepositorioPuerto, fechaCorte: string, tramoFiltro?: string) {
  const creditos = await repo.listarCreditos();
  const resultados = [];
  for (const credito of creditos) {
    const estado = await cargarEstadoDeCuenta(repo, credito.id, fechaCorte);
    if (estado.diasDeAtraso <= 0) continue;
    if (tramoFiltro && estado.tramo !== tramoFiltro) continue;
    resultados.push({
      creditoId: credito.id,
      clienteId: credito.clienteId,
      diasDeAtraso: estado.diasDeAtraso,
      tramo: estado.tramo,
      saldo: { centavos: estado.saldoCapitalPendiente.centavos, moneda: credito.moneda },
    });
  }
  return resultados;
}

/** Capacidad "Ver próximos vencimientos" (sección 6.3). */
export async function proximosVencimientos(repo: RepositorioPuerto, fechaCorte: string, ventanaDias: number) {
  exigirFechaValida(fechaCorte);
  const creditos = await repo.listarCreditos();
  const resultados = [];
  let montoTotalCentavos = 0;
  for (const credito of creditos) {
    const estado = await cargarEstadoDeCuenta(repo, credito.id, fechaCorte);
    const proxima = estado.proximaCuota;
    if (!proxima) continue;
    const dias = Math.floor((new Date(proxima.fechaVencimiento).getTime() - new Date(fechaCorte).getTime()) / 86400000);
    if (dias < 0 || dias > ventanaDias) continue;
    resultados.push({
      creditoId: credito.id,
      numeroCuota: proxima.numeroCuota,
      fechaVencimiento: proxima.fechaVencimiento,
      monto: { centavos: proxima.monto.centavos, moneda: credito.moneda },
    });
    montoTotalCentavos += proxima.monto.centavos;
  }
  return { ventanaDias, totalCuotas: resultados.length, montoTotal: { centavos: montoTotalCentavos, moneda: "GTQ" }, cuotas: resultados };
}

export { cargarEstadoDeCuenta };
