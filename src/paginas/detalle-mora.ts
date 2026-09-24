import { Dinero } from "../dominio/dinero.js";
import { clasificarTramoMora, calcularInteresMoratorio, type PoliticaMora } from "../dominio/calculadora-mora.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { obtenerCreditoPorId, calcularDiasDeAtraso } from "../almacen/creditos.js";
import { inicializarAyuda } from "../ayuda.js";

const parametros = new URLSearchParams(window.location.search);
const idCredito = parametros.get("id") ?? "";
const contenedor = document.getElementById("contenido") as HTMLDivElement;
const credito = obtenerCreditoPorId(idCredito);

if (!credito) {
  contenedor.innerHTML = `<div class="tarjeta"><p>No se encontró ese crédito.</p></div>`;
} else {
  const diasDeAtraso = calcularDiasDeAtraso(credito);
  const tramo = clasificarTramoMora(diasDeAtraso);
  const plan = generarPlanAmortizacionFrances(
    Dinero.deQuetzales(credito.montoQuetzales),
    credito.tasaMensual,
    credito.plazoMeses
  );
  const filaCuota = plan.filas[credito.cuotasPagadas];

  const POLITICA: PoliticaMora = {
    tnaMoratoria: 0.36,
    baseDeConteo: 360,
    autor: "Reglamento de Crédito Vecino",
    fechaVigenciaDesde: "2026-01-01",
  };

  const capitalEnMora = filaCuota ? filaCuota.saldoInicial : Dinero.deQuetzales(0);
  const interesMoratorio =
    tramo === "AL_DIA" ? Dinero.deQuetzales(0) : calcularInteresMoratorio(capitalEnMora, diasDeAtraso, POLITICA);

  contenedor.innerHTML = `
    <p><span class="etiqueta-mora ${tramo === "AL_DIA" ? "al-dia" : "en-mora"}">
      ${tramo === "AL_DIA" ? "Al día" : `${diasDeAtraso} días de atraso (${tramo})`}
    </span></p>
    <div class="tarjeta">
      <p>Cuota actual: <strong>${credito.cuotasPagadas + 1} de ${credito.plazoMeses}</strong></p>
      <p>Saldo de capital de la cuota: <strong>${capitalEnMora.toString()}</strong></p>
      <p>Interés moratorio acumulado: <strong>${interesMoratorio.toString()}</strong></p>
    </div>
    <a href="/paginas/registrar-pago.html?id=${encodeURIComponent(credito.id)}">
      <button class="primario">Registrar pago</button>
    </a>
    <a href="/paginas/plan-amortizacion.html?id=${encodeURIComponent(credito.id)}">
      <button class="secundario">Ver plan de amortización</button>
    </a>`;
}

inicializarAyuda("Aquí ves el estado real de este crédito, calculado desde la fecha en que se aprobó y las cuotas que ya se han pagado.");