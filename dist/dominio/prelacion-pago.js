class EslabonRubro {
    nombre;
    monto;
    constructor(nombre, monto) {
        this.nombre = nombre;
        this.monto = monto;
    }
    aplicar(disponible) {
        const cantidadAplicada = disponible.min(this.monto);
        const cantidadPendiente = this.monto.restar(cantidadAplicada);
        const cantidadRestante = disponible.restar(cantidadAplicada);
        const fila = {
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
export function aplicarPagoAPrelacion(monto, deuda) {
    const cadena = [];
    cadena.push(new EslabonRubro("gastos", deuda.gastos));
    cadena.push(new EslabonRubro("interesMoratorio", deuda.interesMoratorio));
    cadena.push(new EslabonRubro("interesCorriente", deuda.interesCorriente));
    cadena.push(new EslabonRubro("capital", deuda.capital));
    let disponible = monto;
    const detalle = [];
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
export function aplicarExcedente(excedente, destino) {
    if (excedente.esNegativo()) {
        throw new Error("El excedente no puede ser negativo");
    }
    return {
        destino: destino,
        monto: excedente
    };
}
