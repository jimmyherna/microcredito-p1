import { Dinero } from "../dominio/dinero.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { POLITICA_CREDITO_ACTUAL } from "../dominio/politicas.js";
import { guardarSolicitud, generarIdSolicitud, tieneSolicitudPendiente } from "../almacen/solicitudes.js";
import type { Solicitud } from "../almacen/solicitudes.js";
import { obtenerCreditosDeCliente } from "../almacen/creditos.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { inicializarAyuda } from "../ayuda.js";
import { protegerPagina } from "../seguridad.js";

if (protegerPagina(["CLIENTE", "ASESOR"])) {
  const sesion = obtenerSesion();
  const inputCliente = document.getElementById("cliente") as HTMLInputElement | null;
  const inputMonto = document.getElementById("monto") as HTMLInputElement | null;
  const inputPlazo = document.getElementById("plazo") as HTMLInputElement | null;
  const divEstimacion = document.getElementById("estimacionCuota") as HTMLDivElement | null;
  const formSolicitud = document.getElementById("formSolicitud") as HTMLFormElement | null;
  const mensajeEstado = document.getElementById("mensajeEstado") as HTMLParagraphElement | null;
  const resultadoSolicitud = document.getElementById("resultadoSolicitud") as HTMLDivElement | null;

  const TASA_MENSUAL = POLITICA_CREDITO_ACTUAL.tasaMensual;
  const TNA = POLITICA_CREDITO_ACTUAL.tna;
  const MONTO_MINIMO = 1000;
  const MONTO_MAXIMO = 25000;
  const PLAZO_MINIMO = 3;
  const PLAZO_MAXIMO = 24;

  if (sesion?.rol === "CLIENTE" && inputCliente) {
    inputCliente.value = sesion.nombre;
    inputCliente.readOnly = true;
  }

  function mensaje(texto: string): void {
    if (mensajeEstado) mensajeEstado.textContent = texto;
  }

  function datosValidos(monto: number, plazo: number): string | null {
    if (!Number.isFinite(monto) || monto < MONTO_MINIMO || monto > MONTO_MAXIMO) {
      return `El monto debe estar entre Q${MONTO_MINIMO.toFixed(2)} y Q${MONTO_MAXIMO.toFixed(2)}.`;
    }
    if (!Number.isInteger(monto)) {
      return "El monto debe ser un número entero de quetzales.";
    }
    if (!Number.isInteger(plazo) || plazo < PLAZO_MINIMO || plazo > PLAZO_MAXIMO) {
      return `El plazo debe estar entre ${PLAZO_MINIMO} y ${PLAZO_MAXIMO} meses.`;
    }
    return null;
  }

  function calcularYMostrarResumen(): void {
    if (!inputMonto || !inputPlazo || !divEstimacion) return;

    const monto = Number(inputMonto.value);
    const plazo = Number(inputPlazo.value);
    const error = datosValidos(monto, plazo);

    if (error) {
      divEstimacion.innerHTML = "";
      return;
    }

    const plan = generarPlanAmortizacionFrances(
      Dinero.deQuetzales(monto),
      TASA_MENSUAL,
      plazo
    );
    const cuota = plan.filas[0]?.cuota ?? Dinero.cero();

    divEstimacion.innerHTML = `
      <div class="tarjeta" style="background: #eef7f6; border-left: 4px solid var(--color-oscuro); padding: 1rem; border-radius: var(--radio);">
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: var(--color-oscuro);">Detalle del préstamo</h3>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;">Monto solicitado: <strong>Q ${monto.toFixed(2)}</strong></p>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;">Tasa de interés: <strong>${(TNA * 100).toFixed(0)}% TNA (${(TASA_MENSUAL * 100).toFixed(2)}% mensual)</strong></p>
        <p style="margin: 0.25rem 0; font-size: 0.9rem;">Plazo: <strong>${plazo} meses</strong></p>
        <hr style="border: 0; border-top: 1px solid #c2dedc; margin: 0.5rem 0;">
        <p style="margin: 0.25rem 0; font-size: 1.05rem; color: var(--color-oscuro);">Cuota estimada: <strong>${cuota.toString()} / mes</strong></p>
      </div>`;
  }

  inputMonto?.addEventListener("input", calcularYMostrarResumen);
  inputPlazo?.addEventListener("input", calcularYMostrarResumen);

  formSolicitud?.addEventListener("submit", (e) => {
    e.preventDefault();

    const cliente = inputCliente?.value.trim() ?? "";
    const monto = Number(inputMonto?.value ?? NaN);
    const plazo = Number(inputPlazo?.value ?? NaN);

    if (cliente.length < 3 || cliente.length > 100) {
      mensaje("Ingresa un nombre de cliente válido.");
      return;
    }

    const error = datosValidos(monto, plazo);
    if (error) {
      mensaje(error);
      return;
    }

    const creditosActivos = obtenerCreditosDeCliente(cliente).filter((c) => c.cuotasPagadas < c.plazoMeses);
    if (creditosActivos.length > 0) {
      mensaje("El cliente ya tiene un crédito activo. Debe finalizarlo antes de solicitar otro.");
      return;
    }

    if (tieneSolicitudPendiente(cliente)) {
      mensaje("El cliente ya tiene una solicitud pendiente de revisión.");
      return;
    }

    if (!window.confirm(`¿Confirmas el envío de la solicitud por Q${monto.toFixed(2)} a ${plazo} meses para ${cliente}?`)) {
      return;
    }

    const nuevaSolicitud: Solicitud = {
      id: generarIdSolicitud(),
      clienteNombre: cliente,
      montoQuetzales: monto,
      plazoMeses: plazo,
      tasaMensual: TASA_MENSUAL,
      estado: "SOLICITADO",
      fechaSolicitud: new Date().toISOString(),
    };

    guardarSolicitud(nuevaSolicitud);
    mensaje("¡Solicitud registrada con éxito!");

    if (resultadoSolicitud) {
      resultadoSolicitud.innerHTML = `
        <div class="tarjeta" style="background: #eef7f6; border-left: 4px solid #10b981; padding: 1rem;">
          <p style="margin: 0; font-weight: 600; color: #065f46;">
            Tu solicitud (${nuevaSolicitud.id}) por Q${monto.toFixed(2)} fue enviada y está pendiente de revisión.
          </p>
        </div>`;
    }

    formSolicitud.reset();
    if (sesion?.rol === "CLIENTE" && inputCliente) {
      inputCliente.value = sesion.nombre;
      inputCliente.readOnly = true;
    }
    if (divEstimacion) divEstimacion.innerHTML = "";
  });

  inicializarAyuda("Completa el monto y el plazo. El cliente solo puede solicitar para su propia cuenta; el asesor puede registrar una solicitud a nombre de un cliente.");
}
