import { obtenerSesion } from "../almacen/cuentas.js";
import { obtenerCreditosDeCliente, calcularDiasDeAtraso } from "../almacen/creditos.js";
import { inicializarAyuda } from "../ayuda.js";

const sesion = obtenerSesion();
const nombre = sesion?.nombre ?? "";
const contenedor = document.getElementById("contenido") as HTMLDivElement;

const misCreditos = obtenerCreditosDeCliente(nombre);

const listaHtml = misCreditos.length === 0
  ? `<div class="tarjeta"><p>Aún no tienes créditos aprobados.</p></div>`
  : misCreditos
      .map((c) => {
        const dias = calcularDiasDeAtraso(c);
        return `
        <div class="tarjeta">
          <strong>${c.id}</strong><br />
          Monto: Q${c.montoQuetzales.toFixed(2)} · Plazo: ${c.plazoMeses} meses<br />
          <span class="etiqueta-mora ${dias === 0 ? "al-dia" : "en-mora"}">
            ${dias === 0 ? "Al día" : `${dias} días de atraso`}
          </span>
          <div style="margin-top:0.6rem">
            <a href="/paginas/detalle-mora.html?id=${encodeURIComponent(c.id)}">Ver detalle</a> ·
            <a href="/paginas/plan-amortizacion.html?id=${encodeURIComponent(c.id)}">Ver plan</a> ·
            <a href="/paginas/registrar-pago.html?id=${encodeURIComponent(c.id)}">Pagar</a>
          </div>
        </div>`;
      })
      .join("");

contenedor.innerHTML = `
  ${listaHtml}
  <a href="/paginas/solicitud-credito.html">
    <button class="secundario" style="margin-top:1rem">Solicitar otro crédito</button>
  </a>`;

inicializarAyuda("Aquí ves todos tus créditos aprobados. Si necesitas uno nuevo, puedes solicitarlo desde el botón de abajo.");