import { obtenerSesion } from "../almacen/cuentas.js";
import { obtenerCreditosDeCliente } from "../almacen/creditos.js";
import { configurarCierresDeSesion, protegerPagina } from "../seguridad.js";

if (protegerPagina(["CLIENTE", "ASESOR"])) {
  const sesion = obtenerSesion();
  const saludo = document.getElementById("saludoUsuario");
  if (saludo && sesion) saludo.textContent = `Hola, ${sesion.nombre}`;

  const enlaces = Array.from(document.querySelectorAll<HTMLAnchorElement>(".menu-opciones a"));
  const enlacePago = enlaces.find((a) => a.textContent?.toLocaleLowerCase().includes("pagar"));
  const enlaceSolicitar = enlaces.find((a) => a.textContent?.toLocaleLowerCase().includes("solicitar"));

  if (sesion?.rol === "ASESOR") {
    if (enlaceSolicitar) enlaceSolicitar.href = "/paginas/solicitud-credito.html";
    if (enlacePago) enlacePago.href = "/paginas/mi-credito.html";
  } else if (sesion?.rol === "CLIENTE" && enlacePago) {
    const creditos = obtenerCreditosDeCliente(sesion.nombre);
    if (creditos.length === 1 && creditos[0]) {
      enlacePago.href = `/paginas/registrar-pago.html?id=${encodeURIComponent(creditos[0].id)}`;
    } else {
      enlacePago.href = "/paginas/mi-credito.html";
    }
  }

  configurarCierresDeSesion();
}
