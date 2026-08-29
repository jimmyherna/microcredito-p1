/**
 * Objeto de Valor (Value Object) Dinero.
 * Refactorizado manteniendo inmutabilidad y cálculo entero de centavos.
 */

export type CodigoMoneda = "GTQ" | "USD";

export class ErrorMonedaIncompatible extends Error {
  constructor(a: CodigoMoneda, b: CodigoMoneda) {
    super(`No se pueden operar montos de distinta moneda: ${a} vs ${b}`);
    this.name = "ErrorMonedaIncompatible";
  }
}

export class ErrorMontoInvalido extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorMontoInvalido";
  }
}

/**
 * Redondeo "round half up" aplicado sobre centavos.
 */
export const redondearCentavos = (centavosConFraccion: number): number =>
  Math.floor(centavosConFraccion + 0.5 + 1e-9);

export class Dinero {
  private readonly _centavos: number;
  private readonly _moneda: CodigoMoneda;

  private constructor(centavos: number, moneda: CodigoMoneda) {
    if (!Number.isInteger(centavos)) {
      throw new ErrorMontoInvalido(
        `Dinero debe representarse en centavos enteros; se recibio ${centavos}`
      );
    }
    this._centavos = centavos;
    this._moneda = moneda;
  }

  static deCentavos(centavos: number, moneda: CodigoMoneda = "GTQ"): Dinero {
    return new Dinero(centavos, moneda);
  }

  static deQuetzales(monto: number, moneda: CodigoMoneda = "GTQ"): Dinero {
    const centavosCalculados = redondearCentavos(monto * 100);
    return new Dinero(centavosCalculados, moneda);
  }

  static cero(moneda: CodigoMoneda = "GTQ"): Dinero {
    return new Dinero(0, moneda);
  }

  get centavos(): number {
    return this._centavos;
  }

  get moneda(): CodigoMoneda {
    return this._moneda;
  }

  private verificarMoneda(otro: Dinero): void {
    if (this._moneda !== otro._moneda) {
      throw new ErrorMonedaIncompatible(this._moneda, otro._moneda);
    }
  }

  sumar(otro: Dinero): Dinero {
    this.verificarMoneda(otro);
    return new Dinero(this._centavos + otro._centavos, this._moneda);
  }

  restar(otro: Dinero): Dinero {
    this.verificarMoneda(otro);
    return new Dinero(this._centavos - otro._centavos, this._moneda);
  }

  multiplicarPorFactor(factor: number): Dinero {
    const nuevosCentavos = redondearCentavos(this._centavos * factor);
    return new Dinero(nuevosCentavos, this._moneda);
  }

  negativo(): Dinero {
    return new Dinero(-this._centavos, this._moneda);
  }

  esMayorQue(otro: Dinero): boolean {
    this.verificarMoneda(otro);
    return this._centavos > otro._centavos;
  }

  esMenorQue(otro: Dinero): boolean {
    this.verificarMoneda(otro);
    return this._centavos < otro._centavos;
  }

  esMenorOIgualQue(otro: Dinero): boolean {
    this.verificarMoneda(otro);
    return this._centavos <= otro._centavos;
  }

  esCero(): boolean {
    return this._centavos === 0;
  }

  esNegativo(): boolean {
    return this._centavos < 0;
  }

  min(otro: Dinero): Dinero {
    this.verificarMoneda(otro);
    return this._centavos <= otro._centavos ? this : otro;
  }

  igualA(otro: Dinero): boolean {
    return this._moneda === otro._moneda && this._centavos === otro._centavos;
  }

  aNumero(): number {
    return this._centavos / 100;
  }

  toString(): string {
    const esNeg = this._centavos < 0;
    const absCentavos = Math.abs(this._centavos);
    const parteEntera = Math.floor(absCentavos / 100);
    const parteCentavos = absCentavos % 100;

    const prefijo = esNeg ? "-" : "";
    const formatoMoneda = parteEntera.toLocaleString("es-GT");
    const formatoCentavos = parteCentavos.toString().padStart(2, "0");

    return `${prefijo}Q${formatoMoneda}.${formatoCentavos}`;
  }
}