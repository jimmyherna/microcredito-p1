import { Dinero, redondearCentavos } from "./dinero.js";

export interface FilaAmortizacion {
  numeroCuota: number;
  saldoInicial: Dinero;
  cuota: Dinero;
  interes: Dinero;
  amortizacion: Dinero;
  saldoFinal: Dinero;
}

export interface PlanAmortizacion {
  capital: Dinero;
  tasaMensual: number;
  numeroCuotas: number;
  filas: FilaAmortizacion[];
}

/**
 * Estrategia de calculo de interes (patron Strategy, GoF).
 * Permite sustituir el metodo (frances, sobre saldos, fijo, etc.) sin tocar
 * el motor que arma el plan de amortizacion (Open/Closed Principle).
 */
export interface EstrategiaAmortizacion {
  calcularCuotaBase(capital: Dinero, tasaMensual: number, numeroCuotas: number): Dinero;
}

/**
 * Sistema frances de cuota fija:
 *   cuota = P * [ i * (1+i)^n / ((1+i)^n - 1) ]
 * Caso especial i = 0 => cuota = P / n.
 */
export class EstrategiaFrancesa implements EstrategiaAmortizacion {
  calcularCuotaBase(capital: Dinero, tasaMensual: number, numeroCuotas: number): Dinero {
    if (numeroCuotas <= 0) {
      throw new Error("El numero de cuotas debe ser mayor que cero");
    }
    if (tasaMensual === 0) {
      return Dinero.deCentavos(redondearCentavos(capital.centavos / numeroCuotas), capital.moneda);
    }
    const i = tasaMensual;
    const factor = Math.pow(1 + i, numeroCuotas);
    const cuotaCentavos = capital.centavos * ((i * factor) / (factor - 1));
    return Dinero.deCentavos(redondearCentavos(cuotaCentavos), capital.moneda);
  }
}

/**
 * Construye el plan de amortizacion completo (patron Factory/Builder,
 * seccion 9), garantizando el invariante:
 *   sum(amortizacion_k) === capital  y  saldoFinal en la ultima fila === 0
 *
 * Regla de cuadre (obligatoria, seccion 6.4): en la ULTIMA cuota,
 * amortizacion_n = saldo_{n-1} (todo el saldo restante) y
 * cuota_n = amortizacion_n + interes_n. Esto absorbe el centavo de
 * redondeo acumulado en las cuotas anteriores.
 */
export function generarPlanAmortizacionFrances(
  capital: Dinero,
  tasaMensual: number,
  numeroCuotas: number,
  estrategia: EstrategiaAmortizacion = new EstrategiaFrancesa()
): PlanAmortizacion {
  if (capital.esNegativo() || capital.esCero()) {
    throw new Error("El capital desembolsado debe ser mayor que cero");
  }
  const cuotaBase = estrategia.calcularCuotaBase(capital, tasaMensual, numeroCuotas);

  const filas: FilaAmortizacion[] = [];
  let saldo = capital;

  for (let k = 1; k <= numeroCuotas; k++) {
    const saldoInicial = saldo;
    const interes = saldoInicial.multiplicarPorFactor(tasaMensual);

    let amortizacion: Dinero;
    let cuota: Dinero;

    if (k < numeroCuotas) {
      amortizacion = cuotaBase.restar(interes);
      cuota = cuotaBase;
    } else {
      // Ultima cuota: absorbe el saldo restante exacto (regla de cuadre).
      amortizacion = saldoInicial;
      cuota = amortizacion.sumar(interes);
    }

    const saldoFinal = saldoInicial.restar(amortizacion);

    filas.push({ numeroCuota: k, saldoInicial, cuota, interes, amortizacion, saldoFinal });
    saldo = saldoFinal;
  }

  return { capital, tasaMensual, numeroCuotas, filas };
}

/** Invariante 6.10: la suma de amortizaciones debe ser exactamente el capital. */
export function sumaAmortizaciones(plan: PlanAmortizacion): Dinero {
  return plan.filas.reduce((acc, f) => acc.sumar(f.amortizacion), Dinero.cero(plan.capital.moneda));
}

/** Invariante 6.10: el saldo tras la ultima cuota debe ser exactamente 0.00. */
export function saldoFinalDelPlan(plan: PlanAmortizacion): Dinero {
  const ultima = plan.filas[plan.filas.length - 1];
  if (!ultima) throw new Error("El plan no tiene filas");
  return ultima.saldoFinal;
}
