import { Dinero } from "../dominio/dinero.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { obtenerCreditoPorId } from "../almacen/creditos.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { inicializarAyuda } from "../ayuda.js";
import { escaparHtml, protegerPagina } from "../seguridad.js";

if (protegerPagina(["CLIENTE", "ASESOR"])) {
  const sesion = obtenerSesion();
  const parametros = new URLSearchParams(window.location.search);
  const idCredito = parametros.get("id") ?? "";
  const credito = obtenerCreditoPorId(idCredito);
  const cuerpo = document.getElementById("cuerpoTabla");
  const titulo = document.getElementById("idCredito");

  const puedeVer = !!credito &&
    (sesion?.rol === "ASESOR" ||
      credito.clienteNombre.toLocaleLowerCase() === sesion?.nombre.toLocaleLowerCase());

  if (!credito || !puedeVer) {
    if (titulo) titulo.textContent = "no encontrado";
    if (cuerpo) cuerpo.innerHTML = `<tr><td colspan="5">No se encontró este crédito o no tienes permiso para consultarlo.</td></tr>`;
  } else {
    if (titulo) titulo.textContent = escaparHtml(credito.id);
    if (cuerpo) {
      const plan = generarPlanAmortizacionFrances(
        Dinero.deQuetzales(credito.montoQuetzales),
        credito.tasaMensual,
        credito.plazoMeses
      );
      cuerpo.innerHTML = plan.filas.map((fila, i) => `
        <tr style="${i < credito.cuotasPagadas ? "opacity:0.5" : ""}">
          <td>${fila.numeroCuota}</td>
          <td>${fila.cuota.toString()}</td>
          <td>${fila.interes.toString()}</td>
          <td>${fila.amortizacion.toString()}</td>
          <td>${fila.saldoFinal.toString()}</td>
        </tr>`).join("");
    }
  }

  inicializarAyuda("Esta tabla muestra cómo se distribuye cada cuota entre interés y capital. Las cuotas ya pagadas aparecen atenuadas.");
}
