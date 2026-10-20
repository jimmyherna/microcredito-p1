import { exigirFechaValida, sumarDias } from "./reloj.js";
import type { RepositorioPuerto } from "./repositorio-puerto.js";
import { calcularCarteraEnRiesgoPorTramo, type CreditoParaCarteraPorTramo } from "../dominio/cartera.js";
import { clasificarTramoMora } from "../dominio/calculadora-mora.js";
import { cargarEstadoDeCuenta } from "./servicio-creditos.js";
import { sincronizarEstadoCredito } from "./motor-cobranza.js";

/**
 * Capacidad "Consultar la cartera" (sección 6.3 del Proyecto Final) — usa
 * cartera.ts::calcularCarteraEnRiesgoPorTramo del núcleo (CP-04.3, Proyecto
 * 2) SIN modificarlo. Reporta cartera activa, cartera EN MORA y cartera EN
 * RIESGO como tres indicadores distintos (sección 7.8: confundirlos es un
 * hallazgo de severidad 4), más el desglose por tramo y lo dado por
 * incobrable en el período — el tablero consume esto tal cual, nunca lo
 * recalcula.
 */
export async function consultarCarteraEnRiesgo(repo: RepositorioPuerto, fechaCorte: string) {
  exigirFechaValida(fechaCorte);
  const creditos = await repo.listarCreditos();

  const creditosParaCartera: CreditoParaCarteraPorTramo[] = [];
  let incobrableEnPeriodoCentavos = 0;

  for (const credito of creditos) {
    const estado = await cargarEstadoDeCuenta(repo, credito.id, fechaCorte);
    const nuevoEstado = sincronizarEstadoCredito(credito.estado, estado.diasDeAtraso, estado.saldoCapitalPendiente.centavos);
    const esIncobrable = nuevoEstado === "INCOBRABLE";

    // "Dado por incobrable en el mes": solo los que CRUZARON los 120 días dentro del mes
    // de la fecha de corte (día 121 = vencimiento de la cuota impaga más antigua + 121).
    // Los que ya eran incobrables en meses anteriores no se vuelven a reportar.
    if (esIncobrable && estado.indiceCuotaExigible !== null) {
      const vence = estado.cuotas[estado.indiceCuotaExigible]!.fechaVencimiento;
      const fechaBaja = sumarDias(vence, 121);
      if (fechaBaja >= `${fechaCorte.slice(0, 7)}-01` && fechaBaja <= fechaCorte) {
        incobrableEnPeriodoCentavos += estado.saldoCapitalPendiente.centavos;
      }
    }

    creditosParaCartera.push({
      id: credito.id,
      saldoCapital: estado.saldoCapitalPendiente,
      diasDeAtraso: estado.diasDeAtraso,
      reestructurado: credito.reestructurado,
      incobrable: esIncobrable,
      tramo: clasificarTramoMora(estado.diasDeAtraso),
    });
  }

  const resultado = calcularCarteraEnRiesgoPorTramo(creditosParaCartera);

  return {
    fechaCorte,
    carteraActiva: { centavos: resultado.carteraActiva.centavos, moneda: "GTQ" as const },
    carteraEnMora: { centavos: resultado.carteraEnMora.centavos, moneda: "GTQ" as const },
    carteraEnRiesgo: { centavos: resultado.carteraEnRiesgo.centavos, moneda: "GTQ" as const },
    porcentaje: resultado.porcentajeEnRiesgo,
    creditosEnRiesgo: resultado.filasPorTramo.flatMap((f) => f.creditos),
    filasPorTramo: resultado.filasPorTramo.map((f) => ({
      tramo: f.tramo,
      creditos: f.creditos,
      saldoCapital: { centavos: f.saldoCapital.centavos, moneda: "GTQ" as const },
      porcentaje: f.porcentajeDeCarteraActiva,
    })),
    dadoPorIncobrableEnPeriodo: { centavos: incobrableEnPeriodoCentavos, moneda: "GTQ" as const },
  };
}
