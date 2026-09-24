import { obtenerSesion } from "../almacen/cuentas.js";
import { obtenerCreditosDeCliente } from "../almacen/creditos.js";
import { inicializarAyuda } from "../ayuda.js";

const sesion = obtenerSesion();
const nombre = sesion?.nombre ?? "";

document.getElementById("saludo")!.textContent = nombre ? `Hola, ${nombre}` : "";

document.getElementById("btnSolicitar")!.addEventListener("click", () => {
  window.location.href = "/paginas/solicitud-credito.html";
});

document.getElementById("btnVer")!.addEventListener("click", () => {
  window.location.href = "/paginas/mi-credito.html";
});

document.getElementById("btnPagar")!.addEventListener("click", () => {
  const creditos = obtenerCreditosDeCliente(nombre);
  const primerCredito = creditos[0];

  if (creditos.length === 0 || !primerCredito) {
    alert("Todavía no tienes ningún crédito para pagar. Solicita uno primero.");
  } else if (creditos.length === 1) {
    window.location.href = `/paginas/registrar-pago.html?id=${encodeURIComponent(primerCredito.id)}`;
  } else {
    window.location.href = "/paginas/mi-credito.html";
  }
});

inicializarAyuda("Desde aquí puedes solicitar un crédito nuevo, pagar uno que ya tengas, o ver el detalle de tus créditos.");