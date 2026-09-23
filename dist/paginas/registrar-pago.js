import { Dinero } from "../dominio/dinero.js";
import { aplicarPagoAPrelacion } from "../dominio/prelacion-pago.js";
import { guardarPagoPendiente, generarClaveIdempotencia } from "../almacen/cola-offline.js";
const parametros = new URLSearchParams(window.location.search);
const idCredito = parametros.get("id") ?? "CV-2026-0410";
const deudaActual = {
    gastos: Dinero.deQuetzales(25.0),
    interesMoratorio: Dinero.deQuetzales(18.14),
    interesCorriente: Dinero.deQuetzales(278.86),
    capital: Dinero.deQuetzales(725.76),
};
document.getElementById("idCredito").textContent = idCredito;
const inputMonto = document.getElementById("monto");
const divDesglose = document.getElementById("desglose");
const btnConfirmar = document.getElementById("btnConfirmar");
const parrafoEstado = document.getElementById("estado");
function mostrarDesglose() {
    const valor = parseFloat(inputMonto.value || "0");
    if (valor <= 0) {
        divDesglose.innerHTML = "";
        return;
    }
    const monto = Dinero.deQuetzales(valor);
    const resultado = aplicarPagoAPrelacion(monto, deudaActual);
    divDesglose.innerHTML = resultado.detalle
        .map((fila, i) => `<p>${i + 1}. ${fila.rubro} — ${fila.aplicado.toString()}</p>`)
        .join("");
}
btnConfirmar.addEventListener("click", async () => {
    const valor = parseFloat(inputMonto.value || "0");
    if (valor <= 0) {
        parrafoEstado.textContent = "Ingresa un monto válido.";
        return;
    }
    await guardarPagoPendiente({
        claveIdempotencia: generarClaveIdempotencia(),
        creditoId: idCredito,
        montoQuetzales: valor,
        fechaCaptura: new Date().toISOString(),
        sincronizado: false,
    });
    parrafoEstado.textContent = navigator.onLine
        ? "Pago registrado. Sincronizando..."
        : "Sin señal: el pago quedó guardado y se sincronizará cuando vuelva la conexión.";
});
inputMonto.addEventListener("input", mostrarDesglose);
