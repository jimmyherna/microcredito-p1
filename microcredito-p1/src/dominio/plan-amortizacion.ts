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

export interface EstrategiaAmortizacion {
  calcularCuotaBase(
    capital: Dinero,
    tasaMensual: number,
    numeroCuotas: number
  ): Dinero;
}

export class EstrategiaFrancesa implements EstrategiaAmortizacion {
  calcularCuotaBase(
    capital: Dinero,
    tasaMensual: number,
    numeroCuotas: number
  ): Dinero {
    if (numeroCuotas <= 0) {
      throw new Error("El numero de cuotas debe ser mayor que cero");
    }

    if (tasaMensual === 0) {
      const cuota = capital.centavos / numeroCuotas;

      return Dinero.deCentavos(
        redondearCentavos(cuota),
        capital.moneda
      );
    }

    const factor = Math.pow(1 + tasaMensual, numeroCuotas);
    const numerador = tasaMensual * factor;
    const denominador = factor - 1;

    const cuotaCentavos =
      capital.centavos * (numerador / denominador);

    return Dinero.deCentavos(
      redondearCentavos(cuotaCentavos),
      capital.moneda
    );
  }
}

export function generarPlanAmortizacionFrances(
  capital: Dinero,
  tasaMensual: number,
  numeroCuotas: number,
  estrategia: EstrategiaAmortizacion = new EstrategiaFrancesa()
): PlanAmortizacion {
  if (capital.esNegativo() || capital.esCero()) {
    throw new Error("El capital desembolsado debe ser mayor que cero");
  }

  const cuotaBase = estrategia.calcularCuotaBase(
    capital,
    tasaMensual,
    numeroCuotas
  );

  const filas: FilaAmortizacion[] = [];
  let saldoActual = capital;

  for (let numero = 1; numero <= numeroCuotas; numero++) {
    const saldoInicial = saldoActual;
    const interes = saldoInicial.multiplicarPorFactor(tasaMensual);

    let amortizacion: Dinero;
    let cuota: Dinero;

    if (numero === numeroCuotas) {
      amortizacion = saldoInicial;
      cuota = amortizacion.sumar(interes);
    } else {
      amortizacion = cuotaBase.restar(interes);
      cuota = cuotaBase;
    }

    const saldoFinal = saldoInicial.restar(amortizacion);

    const fila: FilaAmortizacion = {
      numeroCuota: numero,
      saldoInicial: saldoInicial,
      cuota: cuota,
      interes: interes,
      amortizacion: amortizacion,
      saldoFinal: saldoFinal
    };

    filas.push(fila);
    saldoActual = saldoFinal;
  }

  return {
    capital: capital,
    tasaMensual: tasaMensual,
    numeroCuotas: numeroCuotas,
    filas: filas
  };
}

export function sumaAmortizaciones(
  plan: PlanAmortizacion
): Dinero {
  let total = Dinero.cero(plan.capital.moneda);

  for (const fila of plan.filas) {
    total = total.sumar(fila.amortizacion);
  }

  return total;
}

export function saldoFinalDelPlan(
  plan: PlanAmortizacion
): Dinero {
  const ultimaFila = plan.filas[plan.filas.length - 1];

  if (!ultimaFila) {
    throw new Error("El plan no tiene filas");
  }

  return ultimaFila.saldoFinal;
}