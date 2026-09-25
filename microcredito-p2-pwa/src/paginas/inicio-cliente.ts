import { obtenerSesion } from "../almacen/cuentas.js";
import { obtenerCreditosDeCliente } from "../almacen/creditos.js";
import { inicializarAyuda } from "../ayuda.js";
import { mostrarFormularioResena } from "../resena.js";
import { configurarCierresDeSesion, protegerPagina } from "../seguridad.js";

if (protegerPagina(["CLIENTE"])) {
  const sesion = obtenerSesion();
  const nombre = sesion?.nombre ?? "";

  const saludoEl = document.getElementById("saludo");
  if (saludoEl) saludoEl.textContent = nombre ? `Hola, ${nombre}` : "";

  document.getElementById("btnSolicitar")?.addEventListener("click", () => {
    window.location.href = "/paginas/solicitud-credito.html";
  });

  document.getElementById("btnVer")?.addEventListener("click", () => {
    window.location.href = "/paginas/mi-credito.html";
  });

  document.getElementById("btnPagar")?.addEventListener("click", () => {
    const creditos = obtenerCreditosDeCliente(nombre);
    if (creditos.length === 0) {
      alert("Todavía no tienes ningún crédito para pagar.");
    } else if (creditos.length === 1 && creditos[0]) {
      window.location.href = `/paginas/registrar-pago.html?id=${encodeURIComponent(creditos[0].id)}`;
    } else {
      window.location.href = "/paginas/mi-credito.html";
    }
  });

  configurarCierresDeSesion();
  mostrarFormularioResena("contenedorResena");
  inicializarAyuda("Desde aquí puedes solicitar un crédito, consultar tus créditos y registrar pagos.");
}
