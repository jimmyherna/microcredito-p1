import { obtenerSesion } from "../almacen/cuentas.js";
import { obtenerCreditos, obtenerCreditosDeCliente, calcularDiasDeAtraso } from "../almacen/creditos.js";
import { obtenerSolicitudes } from "../almacen/solicitudes.js";
import { escaparHtml, protegerPagina } from "../seguridad.js";
import { inicializarAyuda } from "../ayuda.js";

if (protegerPagina(["CLIENTE", "ASESOR"])) {
  const sesion = obtenerSesion();
  const contenedor = document.getElementById("contenedorCreditos");

  if (contenedor && sesion) {
    const esAsesor = sesion.rol === "ASESOR";
    const misCreditos = esAsesor ? obtenerCreditos() : obtenerCreditosDeCliente(sesion.nombre);
    const solicitudes = esAsesor
      ? obtenerSolicitudes()
      : obtenerSolicitudes().filter((s) => s.clienteNombre.toLocaleLowerCase() === sesion.nombre.toLocaleLowerCase());

    const solicitudesHtml = solicitudes.length === 0
      ? ""
      : `
        <h2 style="font-size:1.1rem; margin-top:0;">Solicitudes</h2>
        ${solicitudes.map((s) => `
          <div class="tarjeta">
            <strong>${escaparHtml(s.id)}</strong><br />
            Cliente: ${escaparHtml(s.clienteNombre)} · Q${s.montoQuetzales.toFixed(2)} · ${s.plazoMeses} meses<br />
            <span class="etiqueta-mora ${s.estado === "APROBADO" ? "al-dia" : s.estado === "SOLICITADO" ? "al-dia" : "en-mora"}">
              ${escaparHtml(s.estado)}
            </span>
          </div>`).join("")}`;

    const creditosHtml = misCreditos.length === 0
      ? `<div class="tarjeta" style="text-align:center; padding:2rem 1rem;">
          <p style="font-size:1.05rem; font-weight:600; color:var(--color-texto); margin:0 0 0.5rem;">
            ${esAsesor ? "No hay créditos registrados" : "No tienes créditos aprobados"}
          </p>
          <p style="font-size:0.85rem; color:var(--color-texto-suave); margin:0;">
            ${esAsesor ? "Cuando una solicitud sea aprobada aparecerá aquí." : "Las solicitudes pendientes también se muestran arriba."}
          </p>
        </div>`
      : misCreditos.map((c) => {
          const dias = calcularDiasDeAtraso(c);
          const estadoVisual = c.estado === "CANCELADO"
            ? "Cancelado"
            : dias === 0 ? "Al día" : `${dias} días de atraso`;

          return `
            <div class="tarjeta">
              <strong>${escaparHtml(c.id)}</strong> — ${escaparHtml(c.clienteNombre)}<br />
              Monto: Q${c.montoQuetzales.toFixed(2)} · Plazo: ${c.plazoMeses} meses<br />
              <span class="etiqueta-mora ${dias === 0 ? "al-dia" : "en-mora"}">${estadoVisual}</span>
              <div style="margin-top:0.6rem">
                <a href="/paginas/detalle-mora.html?id=${encodeURIComponent(c.id)}">Ver detalle</a> ·
                <a href="/paginas/plan-amortizacion.html?id=${encodeURIComponent(c.id)}">Ver plan</a>
                ${c.estado !== "CANCELADO" ? ` · <a href="/paginas/registrar-pago.html?id=${encodeURIComponent(c.id)}">Registrar pago</a>` : ""}
              </div>
            </div>`;
        }).join("");

    contenedor.innerHTML = `
      ${solicitudesHtml}
      <h2 style="font-size:1.1rem; margin-top:1.5rem;">${esAsesor ? "Cartera de créditos" : "Mis créditos"}</h2>
      ${creditosHtml}
      <a href="/paginas/solicitud-credito.html" style="display:block; text-decoration:none; margin-top:1rem;">
        <button class="secundario" style="width:100%;">${esAsesor ? "Registrar solicitud para cliente" : "Solicitar otro crédito"}</button>
      </a>`;

    inicializarAyuda(esAsesor
      ? "El asesor puede consultar las solicitudes y créditos, registrar solicitudes para clientes y registrar pagos desde cada crédito."
      : "Aquí ves tus solicitudes y créditos aprobados. Desde cada crédito puedes consultar el plan o registrar un pago.");
  }
}
