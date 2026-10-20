import { Dinero } from "../dominio/dinero.js";
import { aplicarPagoAPrelacion } from "../dominio/prelacion-pago.js";
import { guardarPagoPendiente, generarClaveIdempotencia } from "../almacen/cola-offline.js";
import { clasificarTramoMora, calcularInteresMoratorio, debeSuspenderDevengo } from "../dominio/calculadora-mora.js";
import { obtenerPoliticaMoraPorFecha } from "../dominio/calculadora-mora.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { obtenerCreditoPorId, calcularDiasDeAtraso, registrarCuotaPagada, actualizarCredito } from "../almacen/creditos.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { inicializarAyuda } from "../ayuda.js";
import { protegerPagina } from "../seguridad.js";

if (protegerPagina(["CLIENTE", "ASESOR"])) {
  const sesion = obtenerSesion();
  const parametros = new URLSearchParams(window.location.search);
  const idCredito = parametros.get("id") ?? "";
  const credito = obtenerCreditoPorId(idCredito);

  const inputMonto = document.getElementById("montoRecibido") as HTMLInputElement | null;
  const divDesglose = document.getElementById("detalleMontoPago") as HTMLDivElement | null;
  const formPago = document.getElementById("formPago") as HTMLFormElement | null;
  const btnConfirmar = document.getElementById("btnConfirmarPago") as HTMLButtonElement | null;
  const parrafoEstado = document.getElementById("estadoPago") as HTMLParagraphElement | null;

  if (!credito) {
    if (parrafoEstado) parrafoEstado.textContent = "No se encontró este crédito.";
    if (divDesglose) divDesglose.innerHTML = "<p>No se puede calcular el detalle del pago.</p>";
    if (btnConfirmar) btnConfirmar.disabled = true;
  } else if (sesion?.rol === "CLIENTE" && credito.clienteNombre.toLocaleLowerCase() !== sesion.nombre.toLocaleLowerCase()) {
    if (parrafoEstado) parrafoEstado.textContent = "No tienes permiso para registrar pagos sobre este crédito.";
    if (divDesglose) divDesglose.innerHTML = "<p>El crédito no pertenece a tu cuenta.</p>";
    if (btnConfirmar) btnConfirmar.disabled = true;
  } else if (credito.estado === "CANCELADO" || credito.cuotasPagadas >= credito.plazoMeses) {
    if (parrafoEstado) parrafoEstado.textContent = "Este crédito ya se encuentra totalmente pagado.";
    if (divDesglose) divDesglose.innerHTML = "<p>El crédito no tiene cuotas pendientes de pago.</p>";
    if (btnConfirmar) btnConfirmar.disabled = true;
    if (inputMonto) inputMonto.disabled = true;
  } else {
    const diasDeAtraso = calcularDiasDeAtraso(credito);
    const tramo = clasificarTramoMora(diasDeAtraso);
    const plan = generarPlanAmortizacionFrances(
      Dinero.deQuetzales(credito.montoQuetzales),
      credito.tasaMensual,
      credito.plazoMeses
    );
    const filaCuota = plan.filas[credito.cuotasPagadas];

    if (!filaCuota) {
      if (parrafoEstado) parrafoEstado.textContent = "No se pudo calcular la cuota actual.";
      if (btnConfirmar) btnConfirmar.disabled = true;
    } else {
      const capitalCuota = filaCuota.amortizacion;
      const interesCorriente = debeSuspenderDevengo(diasDeAtraso)
        ? Dinero.cero()
        : filaCuota.interes;
      const POLITICA = obtenerPoliticaMoraPorFecha(credito.fechaAprobacion);

      const interesMoratorio = tramo === "AL_DIA"
        ? Dinero.cero()
        : calcularInteresMoratorio(capitalCuota, diasDeAtraso, POLITICA);
      const gastosGestion = diasDeAtraso > 30 ? Dinero.deQuetzales(25) : Dinero.cero();

      const deudaActual = {
        gastos: gastosGestion,
        interesMoratorio,
        interesCorriente,
        capital: capitalCuota,
      };

      const cuotaBase = capitalCuota.sumar(interesCorriente);
      const moraTotal = interesMoratorio.sumar(gastosGestion);
      const totalExigible = cuotaBase.sumar(moraTotal);

      function renderizarResumenCobro(): void {
        if (!divDesglose) return;
        divDesglose.innerHTML = `
          <p style="margin:0.25rem 0; color:var(--color-texto-suave);">Cuota regular: <strong>${cuotaBase.toString()}</strong></p>
          ${diasDeAtraso > 0 ? `<p style="margin:0.25rem 0; color:var(--color-acento);">Mora / recargos (${diasDeAtraso} días): <strong>${moraTotal.toString()}</strong></p>` : ""}
          <hr style="border:0; border-top:1px solid #eef1f1; margin:0.5rem 0;">
          <p style="margin:0.25rem 0; font-size:1.1rem; color:var(--color-oscuro);">Total exacto de la cuota: <strong>${totalExigible.toString()}</strong></p>`;
      }

      function mostrarDesglose(): void {
        if (!inputMonto || !divDesglose) return;
        const valor = Number(inputMonto.value);
        if (!Number.isFinite(valor) || valor <= 0) {
          renderizarResumenCobro();
          return;
        }

        const resultado = aplicarPagoAPrelacion(Dinero.deQuetzales(valor), deudaActual);
        const excedente = resultado.excedente.aNumero();

        divDesglose.innerHTML = `
          <p style="margin-bottom:0.5rem; font-weight:600;">Aplicación del pago ingresado:</p>
          ${resultado.detalle.map((fila, i) =>
            `<p style="margin:0.2rem 0; font-size:0.9rem;">${i + 1}. ${fila.rubro} — <strong>${fila.aplicado.toString()}</strong></p>`
          ).join("")}
          ${excedente > 0 ? `<p style="margin-top:0.5rem;"><strong>Excedente: ${resultado.excedente.toString()}</strong></p>` : ""}
        `;
      }

      renderizarResumenCobro();
      inputMonto?.addEventListener("input", mostrarDesglose);

      formPago?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!inputMonto || !btnConfirmar) return;

        const valor = Number(inputMonto.value);
        if (!Number.isFinite(valor) || valor <= 0) {
          if (parrafoEstado) parrafoEstado.textContent = "Ingresa un monto válido mayor que Q0.00.";
          return;
        }

        const monto = Dinero.deQuetzales(valor);
        if (!monto.igualA(totalExigible)) {
          if (parrafoEstado) {
            parrafoEstado.textContent = `Para registrar la cuota debes ingresar exactamente ${totalExigible.toString()}. Los pagos parciales o excedentes no están habilitados en esta versión.`;
          }
          return;
        }

        if (!window.confirm(`¿Confirmas el pago exacto de ${totalExigible.toString()} para el crédito ${credito.id}?`)) {
          return;
        }

        btnConfirmar.disabled = true;

        try {
          await guardarPagoPendiente({
            claveIdempotencia: generarClaveIdempotencia(),
            creditoId: credito.id,
            montoQuetzales: valor,
            fechaCaptura: new Date().toISOString(),
            sincronizado: false,
          });

          if (!registrarCuotaPagada(credito.id)) {
            throw new Error("No se pudo actualizar la cuota del crédito.");
          }

          const creditoActualizado = obtenerCreditoPorId(credito.id);
          if (creditoActualizado && creditoActualizado.estado !== "CANCELADO") {
            actualizarCredito(credito.id, {
              estado: "VIGENTE",
            });
          }

          if (parrafoEstado) {
            parrafoEstado.textContent = navigator.onLine
              ? "Pago registrado correctamente."
              : "Sin conexión: el pago quedó guardado y se sincronizará cuando vuelva la conexión.";
          }
          inputMonto.disabled = true;
        } catch (error) {
          btnConfirmar.disabled = false;
          if (parrafoEstado) {
            parrafoEstado.textContent = error instanceof Error ? error.message : "No se pudo registrar el pago.";
          }
        }
      });
    }
  }

  inicializarAyuda("El pago se aplica en el orden de gastos, mora, interés corriente y capital. Para evitar inconsistencias, esta versión registra una cuota únicamente cuando se recibe el total exacto exigible.");
}
