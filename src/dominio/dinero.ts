/**
 * Objeto de Valor (Value Object) Dinero.
 *
 * Regla no negociable (seccion 6.2 del enunciado): todo importe monetario se
 * representa como ENTERO en la unidad minima (centavos), nunca con `number`
 * en punto flotante para operaciones aritmeticas de dinero. Aqui el entero
 * de centavos ES el `number`, pero solo se le permiten operaciones enteras
 * (suma, resta, multiplicacion por entero, redondeo explicito) — nunca se
 * divide y se deja flotando una fraccion de centavo sin redondear.
 *
 * Dinero es inmutable: toda operacion devuelve una instancia nueva.
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
 * Redondeo a 2 decimales, medio hacia arriba ("round half up"), aplicado
 * sobre una cantidad expresada en centavos (puede traer fraccion de
 * centavo producto de una multiplicacion por una tasa).
 */
export function redondearCentavos(centavosConFraccion: number): number {
  return Math.floor(centavosConFraccion + 0.5 + 1e-9);
}

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

  /** Crea un Dinero a partir de un monto entero de centavos (forma preferida). */
  static deCentavos(centavos: number, moneda: CodigoMoneda = "GTQ"): Dinero {
    return new Dinero(centavos, moneda);
  }

  /**
   * Crea un Dinero a partir de un valor decimal "humano" (ej. 1004.62),
   * redondeando a centavos con la regla oficial (medio hacia arriba).
   * Util solo en los bordes del sistema (parseo de datos de entrada/pruebas),
   * nunca dentro del motor de calculo.
   */
  static deQuetzales(monto: number, moneda: CodigoMoneda = "GTQ"): Dinero {
    return new Dinero(redondearCentavos(monto * 100), moneda);
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

  /** Multiplica por un factor decimal (ej. una tasa) y redondea a centavos. */
  multiplicarPorFactor(factor: number): Dinero {
    return new Dinero(redondearCentavos(this._centavos * factor), this._moneda);
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

  /** El minimo entre dos montos de Dinero (misma moneda). Util para "consumir lo que corresponde". */
  min(otro: Dinero): Dinero {
    this.verificarMoneda(otro);
    return this._centavos <= otro._centavos ? this : otro;
  }

  igualA(otro: Dinero): boolean {
    return this._moneda === otro._moneda && this._centavos === otro._centavos;
  }

  /** Representacion decimal solo para mostrar/serializar — nunca para calcular. */
  aNumero(): number {
    return this._centavos / 100;
  }

  toString(): string {
    const signo = this._centavos < 0 ? "-" : "";
    const abs = Math.abs(this._centavos);
    const entero = Math.floor(abs / 100);
    const cent = abs % 100;
    return `${signo}Q${entero.toLocaleString("es-GT")}.${cent.toString().padStart(2, "0")}`;
  }
}
