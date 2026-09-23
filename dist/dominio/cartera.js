import { Dinero } from "./dinero.js";
export class ErrorParametrosCartera extends Error {
    constructor(mensaje) {
        super(mensaje);
        this.name = "ErrorParametrosCartera";
    }
}
/** Invariante 6.10: "ningun saldo de capital es negativo" y los dias de atraso no pueden ser negativos. */
function validarCredito(credito) {
    if (credito.saldoCapital.centavos < 0) {
        throw new ErrorParametrosCartera(`El credito ${credito.id} tiene saldo de capital negativo.`);
    }
    if (!Number.isInteger(credito.diasDeAtraso) || credito.diasDeAtraso < 0) {
        throw new ErrorParametrosCartera(`El credito ${credito.id} tiene dias de atraso invalidos.`);
    }
}
/**
 * Un credito entra a "cartera en riesgo" si:
 *   - tiene mas de 30 dias de atraso en su cuota mas atrasada, O
 *   - esta reestructurado (aunque este al dia bajo el nuevo plan),
 * y NO esta dado de baja como incobrable (los incobrables ya salieron
 * de la cartera activa y no participan ni en el numerador ni en el
 * denominador). Seccion 6.8.
 */
export function calcularCarteraEnRiesgo(creditos) {
    for (const credito of creditos) {
        validarCredito(credito);
    }
    const activos = creditos.filter((c) => !c.incobrable);
    const moneda = activos[0]?.saldoCapital.moneda ?? "GTQ";
    let carteraActiva = Dinero.cero(moneda);
    let carteraEnRiesgo = Dinero.cero(moneda);
    const creditosEnRiesgo = [];
    for (const credito of activos) {
        carteraActiva = carteraActiva.sumar(credito.saldoCapital);
        const enRiesgo = credito.diasDeAtraso > 30 || credito.reestructurado;
        if (enRiesgo) {
            carteraEnRiesgo = carteraEnRiesgo.sumar(credito.saldoCapital);
            creditosEnRiesgo.push(credito.id);
        }
    }
    if (carteraActiva.esCero()) {
        return { carteraActiva, carteraEnRiesgo, porcentaje: 0, creditosEnRiesgo };
    }
    const porcentaje = carteraEnRiesgo.centavos / carteraActiva.centavos;
    return { carteraActiva, carteraEnRiesgo, porcentaje, creditosEnRiesgo };
}
/**
 * Formatea una fraccion (0..1) como porcentaje legible para el cierre
 * mensual (seccion 6.9), ej. 0.07 -> "7.00%".
 */
export function formatearPorcentaje(fraccion) {
    return `${(fraccion * 100).toFixed(2)}%`;
}
