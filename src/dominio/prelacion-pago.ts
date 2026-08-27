import { Dinero } from "./dinero.js";

/** Deuda pendiente de una cuota vencida, desglosada por rubro (seccion 6.6.1). */
export interface DeudaCuota {
  gastos: Dinero;
  interesMoratorio: Dinero;
  interesCorriente: Dinero;
  capital: Dinero;
}

export interface AplicacionRubro {
  rubro: "gastos" | "interesMoratorio" | "interesCorriente" | "capital";
  adeudado: Dinero;
  aplicado: Dinero;
  pendiente: Dinero;
}

export type DestinoExcedente = "AMORTIZACION_CAPITAL" | "PAGO_ANTICIPADO_CUOTAS_FUTURAS";

export interface ResultadoAplicacionPago {
  detalle: AplicacionRubro[];
  totalAplicadoADeuda: Dinero;
  excedente: Dinero;
  cuotaSaldada: boolean;
}

/**
 * Eslabon de la cadena (Chain of Responsibility, GoF): consume lo que le
 * corresponde de un rubro y devuelve cuanto le quedo disponible al pago
 * para el siguiente eslabon.
 */
class EslabonRubro {
  constructor(
    private readonly nombre: AplicacionRubro["rubro"],
    private readonly monto: Dinero
  ) {}

  aplicar(disponible: Dinero): { fila: AplicacionRubro; restante: Dinero } {
    const aplicado = disponible.min(this.monto);
    const pendiente = this.monto.restar(aplicado);
    const restante = disponible.restar(aplicado);
    return {
      fila: { rubro: this.nombre, adeudado: this.monto, aplicado, pendiente },
      restante,
    };
  }
}

/**
 * Orden de aplicacion obligatorio (seccion 6.6.2):
 *   1. Gastos y comisiones
 *   2. Interes moratorio
 *   3. Interes corriente
 *   4. Capital
 *
 * Cambiar el orden es una decision de negocio (Chain of Responsibility):
 * basta reordenar la cadena, sin tocar la logica de cada eslabon.
 */
export function aplicarPagoAPrelacion(monto: Dinero, deuda: DeudaCuota): ResultadoAplicacionPago {
  const cadena: EslabonRubro[] = [
    new EslabonRubro("gastos", deuda.gastos),
    new EslabonRubro("interesMoratorio", deuda.interesMoratorio),
    new EslabonRubro("interesCorriente", deuda.interesCorriente),
    new EslabonRubro("capital", deuda.capital),
  ];

  let disponible = monto;
  const detalle: AplicacionRubro[] = [];

  for (const eslabon of cadena) {
    const { fila, restante } = eslabon.aplicar(disponible);
    detalle.push(fila);
    disponible = restante;
  }

  // Tras pasar por los 4 eslabones, `disponible` es lo que sobro (nunca
  // negativo, porque cada eslabon solo consume el minimo entre lo
  // disponible y lo que adeuda su rubro).
  const totalAplicadoADeuda = monto.restar(disponible);

  return {
    detalle,
    totalAplicadoADeuda,
    excedente: disponible, // lo que sobro tras saldar todos los rubros (Escenario C)
    cuotaSaldada: detalle.every((f) => f.pendiente.esCero()),
  };
}

/**
 * Escenario C (seccion 6.6.5): el excedente que queda tras saldar la cuota
 * vencida se aplica a favor del cliente segun la politica de adelanto
 * (Strategy): a capital (recomendada) o a cuotas futuras.
 */
export interface ResultadoExcedente {
  destino: DestinoExcedente;
  monto: Dinero;
}

export function aplicarExcedente(excedente: Dinero, destino: DestinoExcedente): ResultadoExcedente {
  if (excedente.esNegativo()) {
    throw new Error("El excedente no puede ser negativo");
  }
  return { destino, monto: excedente };
}
