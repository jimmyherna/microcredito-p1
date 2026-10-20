import { Dinero } from "../dominio/dinero.js";
import { clasificarTramoMora, calcularInteresMoratorio } from "../dominio/calculadora-mora.js";
import { obtenerPoliticaMoraPorFecha } from "../dominio/calculadora-mora.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { obtenerCreditoPorId, calcularDiasDeAtraso } from "../almacen/creditos.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { escaparHtml, protegerPagina } from "../seguridad.js";
import { inicializarAyuda } from "../ayuda.js";

if (protegerPagina(["CLIENTE", "ASESOR"])) {
  const sesion = obtenerSesion();
  const parametros = new URLSearchParams(window.location.search);
  const idCredito = parametros.get("id") ?? "";
  const contenedor = document.getElementById("contenido");
  const credito = obtenerCreditoPorId(idCredito);

  const puedeVer = !!credito &&
    (sesion?.rol === "ASESOR" ||
      credito.clienteNombre.toLocaleLowerCase() === sesion?.nombre.toLocaleLowerCase());

  if (!contenedor) {
    // La página no contiene el contenedor esperado.
  } else if (!credito || !puedeVer) {
    contenedor.innerHTML = `<div class="tarjeta"><p>No se encontró ese crédito o no tienes permiso para consultarlo.</p></div>`;
  } else if (credito.estado === "CANCELADO") {
    contenedor.innerHTML = `
      <p><span class="etiqueta-mora al-dia">Cancelado</span></p>
      <div class="tarjeta">
        <p>Este crédito ya fue pagado completamente.</p>
      </div>
      <a href="/paginas/plan-amortizacion.html?id=${encodeURIComponent(credito.id)}">
        <button class="secundario">Ver plan de amortización</button>
      </a>`;
  } else {
    const diasDeAtraso = calcularDiasDeAtraso(credito);
    const tramo = clasificarTramoMora(diasDeAtraso);
    const plan = generarPlanAmortizacionFrances(
      Dinero.deQuetzales(credito.montoQuetzales),
      credito.tasaMensual,
      credito.plazoMeses
    );
    const filaCuota = plan.filas[credito.cuotasPagadas];
      const POLITICA = obtenerPoliticaMoraPorFecha(credito.fechaAprobacion);

    const capitalEnMora = filaCuota ? filaCuota.amortizacion : Dinero.cero();
    const interesMoratorio = tramo === "AL_DIA" || !filaCuota
      ? Dinero.cero()
      : calcularInteresMoratorio(capitalEnMora, diasDeAtraso, POLITICA);

    contenedor.innerHTML = `
      <p><span class="etiqueta-mora ${tramo === "AL_DIA" ? "al-dia" : "en-mora"}">
        ${tramo === "AL_DIA" ? "Al día" : `${diasDeAtraso} días de atraso (${tramo})`}
      </span></p>
      <div class="tarjeta">
        <p>Cuota actual: <strong>${credito.cuotasPagadas + 1} de ${credito.plazoMeses}</strong></p>
        <p>Capital de la cuota: <strong>${capitalEnMora.toString()}</strong></p>
        <p>Interés moratorio acumulado: <strong>${interesMoratorio.toString()}</strong></p>
      </div>
      <a href="/paginas/registrar-pago.html?id=${encodeURIComponent(credito.id)}">
        <button class="primario">Registrar pago</button>
      </a>
      <a href="/paginas/plan-amortizacion.html?id=${encodeURIComponent(credito.id)}">
        <button class="secundario">Ver plan de amortización</button>
      </a>`;
  }

  inicializarAyuda("Aquí ves el estado de la cuota actual y, si existe atraso, el interés moratorio calculado.");
}
