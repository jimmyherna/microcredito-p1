import { Dinero } from "./dinero.js";

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

export type DestinoExcedente =
  | "AMORTIZACION_CAPITAL"
  | "PAGO_ANTICIPADO_CUOTAS_FUTURAS";

export interface ResultadoAplicacionPago {
  detalle: AplicacionRubro[];
  totalAplicadoADeuda: Dinero;
  excedente: Dinero;
  cuotaSaldada: boolean;
}

class EslabonRubro {
  private readonly nombre: AplicacionRubro["rubro"];
  private readonly monto: Dinero;

  constructor(
    nombre: AplicacionRubro["rubro"],
    monto: Dinero
  ) {
    this.nombre = nombre;
    this.monto = monto;
  }

  aplicar(
    disponible: Dinero
  ): {
    fila: AplicacionRubro;
    restante: Dinero;
  } {
    const cantidadAplicada = disponible.min(this.monto);
    const cantidadPendiente = this.monto.restar(cantidadAplicada);
    const cantidadRestante = disponible.restar(cantidadAplicada);

    const fila: AplicacionRubro = {
      rubro: this.nombre,
      adeudado: this.monto,
      aplicado: cantidadAplicada,
      pendiente: cantidadPendiente
    };

    return {
      fila: fila,
      restante: cantidadRestante
    };
  }
}

export function aplicarPagoAPrelacion(
  monto: Dinero,
  deuda: DeudaCuota
): ResultadoAplicacionPago {
  if (monto.esNegativo()) {
    throw new Error("El monto del pago no puede ser negativo");
  }

  const rubros: Array<[string, Dinero]> = [
    ["gastos", deuda.gastos],
    ["interesMoratorio", deuda.interesMoratorio],
    ["interesCorriente", deuda.interesCorriente],
    ["capital", deuda.capital],
  ];

  if (rubros.some(([, valor]) => valor.esNegativo())) {
    throw new Error("La deuda contiene un monto negativo");
  }

  const cadena: EslabonRubro[] = [];

  cadena.push(
    new EslabonRubro("gastos", deuda.gastos)
  );

  cadena.push(
    new EslabonRubro(
      "interesMoratorio",
      deuda.interesMoratorio
    )
  );

  cadena.push(
    new EslabonRubro(
      "interesCorriente",
      deuda.interesCorriente
    )
  );

  cadena.push(
    new EslabonRubro("capital", deuda.capital)
  );

  let disponible = monto;
  const detalle: AplicacionRubro[] = [];

  for (let i = 0; i < cadena.length; i++) {
    const resultado = cadena[i];

    if (!resultado) {
      continue;
    }

    const aplicacion = resultado.aplicar(disponible);

    detalle.push(aplicacion.fila);
    disponible = aplicacion.restante;
  }

  const totalAplicadoADeuda = monto.restar(disponible);

  let cuotaSaldada = true;

  for (const fila of detalle) {
    if (!fila.pendiente.esCero()) {
      cuotaSaldada = false;
      break;
    }
  }

  return {
    detalle: detalle,
    totalAplicadoADeuda: totalAplicadoADeuda,
    excedente: disponible,
    cuotaSaldada: cuotaSaldada
  };
}

export interface ResultadoExcedente {
  destino: DestinoExcedente;
  monto: Dinero;
}

export function aplicarExcedente(
  excedente: Dinero,
  destino: DestinoExcedente
): ResultadoExcedente {
  if (excedente.esNegativo()) {
    throw new Error("El excedente no puede ser negativo");
  }

  return {
    destino: destino,
    monto: excedente
  };
}