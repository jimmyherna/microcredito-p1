/**
 * Objeto de Valor (Value Object) Dinero.
 * Refactorizado manteniendo inmutabilidad y cálculo entero de centavos.
 */
export class ErrorMonedaIncompatible extends Error {
    constructor(a, b) {
        super(`No se pueden operar montos de distinta moneda: ${a} vs ${b}`);
        this.name = "ErrorMonedaIncompatible";
    }
}
export class ErrorMontoInvalido extends Error {
    constructor(mensaje) {
        super(mensaje);
        this.name = "ErrorMontoInvalido";
    }
}
/**
 * Redondeo "round half up" aplicado sobre centavos.
 */
export const redondearCentavos = (centavosConFraccion) => Math.floor(centavosConFraccion + 0.5 + 1e-9);
export class Dinero {
    _centavos;
    _moneda;
    constructor(centavos, moneda) {
        if (!Number.isInteger(centavos)) {
            throw new ErrorMontoInvalido(`Dinero debe representarse en centavos enteros; se recibio ${centavos}`);
        }
        this._centavos = centavos;
        this._moneda = moneda;
    }
    static deCentavos(centavos, moneda = "GTQ") {
        return new Dinero(centavos, moneda);
    }
    static deQuetzales(monto, moneda = "GTQ") {
        const centavosCalculados = redondearCentavos(monto * 100);
        return new Dinero(centavosCalculados, moneda);
    }
    static cero(moneda = "GTQ") {
        return new Dinero(0, moneda);
    }
    get centavos() {
        return this._centavos;
    }
    get moneda() {
        return this._moneda;
    }
    verificarMoneda(otro) {
        if (this._moneda !== otro._moneda) {
            throw new ErrorMonedaIncompatible(this._moneda, otro._moneda);
        }
    }
    sumar(otro) {
        this.verificarMoneda(otro);
        return new Dinero(this._centavos + otro._centavos, this._moneda);
    }
    restar(otro) {
        this.verificarMoneda(otro);
        return new Dinero(this._centavos - otro._centavos, this._moneda);
    }
    multiplicarPorFactor(factor) {
        const nuevosCentavos = redondearCentavos(this._centavos * factor);
        return new Dinero(nuevosCentavos, this._moneda);
    }
    negativo() {
        return new Dinero(-this._centavos, this._moneda);
    }
    esMayorQue(otro) {
        this.verificarMoneda(otro);
        return this._centavos > otro._centavos;
    }
    esMenorQue(otro) {
        this.verificarMoneda(otro);
        return this._centavos < otro._centavos;
    }
    esMenorOIgualQue(otro) {
        this.verificarMoneda(otro);
        return this._centavos <= otro._centavos;
    }
    esCero() {
        return this._centavos === 0;
    }
    esNegativo() {
        return this._centavos < 0;
    }
    min(otro) {
        this.verificarMoneda(otro);
        return this._centavos <= otro._centavos ? this : otro;
    }
    igualA(otro) {
        return this._moneda === otro._moneda && this._centavos === otro._centavos;
    }
    aNumero() {
        return this._centavos / 100;
    }
    toString() {
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
