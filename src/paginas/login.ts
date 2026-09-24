import { crearCuenta, iniciarSesion, type Rol } from "../almacen/cuentas.js";

const DESTINO_POR_ROL: Record<Rol, string> = {
  ASESOR: "/paginas/menu.html",
  CLIENTE: "/paginas/inicio-cliente.html",
  GERENCIA: "/paginas/bandeja-comite.html",
};

const tabIngresar = document.getElementById("tabIngresar") as HTMLButtonElement;
const tabCrear = document.getElementById("tabCrear") as HTMLButtonElement;
const formIngresar = document.getElementById("formIngresar") as HTMLFormElement;
const formCrear = document.getElementById("formCrear") as HTMLFormElement;

tabIngresar.addEventListener("click", () => {
  tabIngresar.classList.add("activa");
  tabCrear.classList.remove("activa");
  formIngresar.style.display = "block";
  formCrear.style.display = "none";
});

tabCrear.addEventListener("click", () => {
  tabCrear.classList.add("activa");
  tabIngresar.classList.remove("activa");
  formCrear.style.display = "block";
  formIngresar.style.display = "none";
});

formIngresar.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nombre = (document.getElementById("nombreIngresar") as HTMLInputElement).value.trim();
  const clave = (document.getElementById("claveIngresar") as HTMLInputElement).value;
  const estado = document.getElementById("estadoIngresar") as HTMLParagraphElement;

  const resultado = iniciarSesion(nombre, clave);
  if (!resultado.exito) {
    estado.textContent = resultado.mensaje ?? "No se pudo iniciar sesión.";
    return;
  }

  const sesionCrudo = sessionStorage.getItem("sgmc-sesion");
  const sesion = sesionCrudo ? JSON.parse(sesionCrudo) : null;
  window.location.href = DESTINO_POR_ROL[sesion.rol as Rol] ?? "/paginas/menu.html";
});

formCrear.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nombre = (document.getElementById("nombreCrear") as HTMLInputElement).value.trim();
  const clave = (document.getElementById("claveCrear") as HTMLInputElement).value;
  const rol = (document.getElementById("rolCrear") as HTMLSelectElement).value as Rol;
  const estado = document.getElementById("estadoCrear") as HTMLParagraphElement;

  const resultado = crearCuenta(nombre, clave, rol);
  if (!resultado.exito) {
    estado.textContent = resultado.mensaje ?? "No se pudo crear la cuenta.";
    return;
  }

  iniciarSesion(nombre, clave);
  window.location.href = DESTINO_POR_ROL[rol];
});