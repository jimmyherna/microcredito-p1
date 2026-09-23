import { Dinero } from "../dominio/dinero.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";

const parametros = new URLSearchParams(window.location.search);
const idCredito = parametros.get("id") ?? "CV-2026-0410";

const CAPITAL_EJEMPLO = Dinero.deQuetzales(15000);
const TASA_MENSUAL_EJEMPLO = 0.36 / 12;
const PLAZO_EJEMPLO = 18;

document.getElementById("idCredito")!.textContent = idCredito;

const plan = generarPlanAmortizacionFrances(CAPITAL_EJEMPLO, TASA_MENSUAL_EJEMPLO, PLAZO_EJEMPLO);
const cuerpo = document.getElementById("cuerpoTabla") as HTMLTableSectionElement;

cuerpo.innerHTML = plan.filas
  .map(
    (fila) => `
      <tr>
        <td>${fila.numeroCuota}</td>
        <td>${fila.cuota.toString()}</td>
        <td>${fila.interes.toString()}</td>
        <td>${fila.amortizacion.toString()}</td>
        <td>${fila.saldoFinal.toString()}</td>
      </tr>`
  )
  .join("");