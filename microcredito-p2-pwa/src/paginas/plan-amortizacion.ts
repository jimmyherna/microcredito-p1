import { Dinero } from "../dominio/dinero.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { obtenerCreditoPorId } from "../almacen/creditos.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { mostrarAccionesSiguientes } from "../navegacion.js";
import { inicializarAyuda } from "../ayuda.js";

const parametros = new URLSearchParams(window.location.search);
const idCredito = parametros.get("id") ?? "";
const credito = obtenerCreditoPorId(idCredito);
const sesion = obtenerSesion();

const cuerpo = document.getElementById("cuerpoTabla") as HTMLTableSectionElement;
const titulo = document.getElementById("idCredito") as HTMLSpanElement;

if (!credito) {
  titulo.textContent = "no encontrado";
  cuerpo.innerHTML = `<tr><td colspan="5">No se encontró este crédito.</td></tr>`;
} else {
  titulo.textContent = credito.id;
  const plan = generarPlanAmortizacionFrances(
    Dinero.deQuetzales(credito.montoQuetzales),
    credito.tasaMensual,
    credito.plazoMeses
  );
  cuerpo.innerHTML = plan.filas
    .map(
      (fila, i) => `
      <tr style="${i < credito.cuotasPagadas ? "opacity:0.5" : ""}">
        <td>${fila.numeroCuota}</td>
        <td>${fila.cuota.toString()}</td>
        <td>${fila.interes.toString()}</td>
        <td>${fila.amortizacion.toString()}</td>
        <td>${fila.saldoFinal.toString()}</td>
      </tr>`
    )
    .join("");

  mostrarAccionesSiguientes(
    "siguientesAcciones",
    sesion?.rol === "ASESOR"
      ? [{ texto: "Volver a mi cartera", href: "/paginas/menu.html" }]
      : [
          { texto: "Registrar pago", href: `/paginas/registrar-pago.html?id=${encodeURIComponent(credito.id)}` },
          { texto: "Volver a mis créditos", href: "/paginas/mi-credito.html", estilo: "secundario" },
        ]
  );
}

inicializarAyuda("Esta tabla muestra cómo se distribuye cada cuota entre interés y capital. Las cuotas ya pagadas aparecen atenuadas.");