import { Dinero } from "../dominio/dinero.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { guardarSolicitud, generarIdSolicitud } from "../almacen/solicitudes.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { inicializarAyuda } from "../ayuda.js";

const TASA_ANUAL = 0.36;
const TASA_MENSUAL = TASA_ANUAL / 12;

const sesion = obtenerSesion();
const campoCliente = document.getElementById("cliente") as HTMLInputElement;

if (sesion?.rol === "CLIENTE") {
  campoCliente.value = sesion.nombre;
  campoCliente.readOnly = true;
}

const inputMonto = document.getElementById("monto") as HTMLInputElement;
const inputPlazo = document.getElementById("plazo") as HTMLInputElement;
const divSimulacion = document.getElementById("simulacion") as HTMLDivElement;
const parrafoCuota = document.getElementById("cuotaMensual") as HTMLParagraphElement;
const spanTasa = document.getElementById("tasaAnual") as HTMLSpanElement;
const btnConfirmar = document.getElementById("btnConfirmar") as HTMLButtonElement;
const parrafoEstado = document.getElementById("estado") as HTMLParagraphElement;

function actualizarSimulacion(): void {
  const monto = parseFloat(inputMonto.value || "0");
  const plazo = parseInt(inputPlazo.value || "0", 10);
  if (monto <= 0 || plazo <= 0) { divSimulacion.style.display = "none"; return; }

  const plan = generarPlanAmortizacionFrances(Dinero.deQuetzales(monto), TASA_MENSUAL, plazo);
  const primeraCuota = plan.filas[0];
  if (!primeraCuota) return;

  divSimulacion.style.display = "block";
  parrafoCuota.textContent = `${primeraCuota.cuota.toString()}/mes`;
  spanTasa.textContent = `${(TASA_ANUAL * 100).toFixed(2)}%`;
}

btnConfirmar.addEventListener("click", () => {
  const cliente = campoCliente.value.trim();
  const monto = parseFloat(inputMonto.value || "0");
  const plazo = parseInt(inputPlazo.value || "0", 10);

  if (!cliente || monto <= 0 || plazo <= 0) {
    parrafoEstado.textContent = "Completa cliente, monto y plazo antes de continuar.";
    return;
  }

  guardarSolicitud({
    id: generarIdSolicitud(),
    clienteNombre: cliente,
    montoQuetzales: monto,
    plazoMeses: plazo,
    tasaMensual: TASA_MENSUAL,
    estado: "SOLICITADO",
    fechaSolicitud: new Date().toISOString(),
  });

  parrafoEstado.textContent = "Solicitud enviada al comité. Quedará pendiente de aprobación.";
});

[inputMonto, inputPlazo].forEach((el) => el.addEventListener("input", actualizarSimulacion));

inicializarAyuda("Completa el monto y el plazo para ver la cuota estimada. Al confirmar, la solicitud queda pendiente de aprobación del comité.");