import { crearCuenta, iniciarSesion } from "../almacen/cuentas.js";
import type { Rol } from "../almacen/cuentas.js";
import { redireccionPorRol } from "../seguridad.js";

const tabIngresar = document.getElementById("tabIngresar") as HTMLButtonElement | null;
const tabCrear = document.getElementById("tabCrear") as HTMLButtonElement | null;
const formIngresar = document.getElementById("formIngresar") as HTMLFormElement | null;
const formCrear = document.getElementById("formCrear") as HTMLFormElement | null;

function mostrarEstado(id: string, mensaje: string): void {
  const estado = document.getElementById(id);
  if (estado) estado.textContent = mensaje;
}

tabIngresar?.addEventListener("click", () => {
  tabIngresar.classList.add("activa");
  tabCrear?.classList.remove("activa");
  if (formIngresar) formIngresar.style.display = "block";
  if (formCrear) formCrear.style.display = "none";
});

tabCrear?.addEventListener("click", () => {
  tabCrear.classList.add("activa");
  tabIngresar?.classList.remove("activa");
  if (formCrear) formCrear.style.display = "block";
  if (formIngresar) formIngresar.style.display = "none";
});

formIngresar?.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nombre = (document.getElementById("nombreIngresar") as HTMLInputElement).value.trim();
  const clave = (document.getElementById("claveIngresar") as HTMLInputElement).value;

  const resultado = iniciarSesion(nombre, clave);
  if (!resultado.exito) {
    mostrarEstado("estadoIngresar", resultado.mensaje ?? "No se pudo iniciar sesión.");
    return;
  }

  const sesionCrudo = sessionStorage.getItem("sgmc-sesion");
  const sesion = sesionCrudo ? JSON.parse(sesionCrudo) as { rol?: Rol } : null;
  if (!sesion?.rol) {
    mostrarEstado("estadoIngresar", "La sesión no pudo ser creada correctamente.");
    return;
  }

  window.location.replace(redireccionPorRol(sesion.rol));
});

formCrear?.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nombre = (document.getElementById("nombreCrear") as HTMLInputElement).value.trim();
  const clave = (document.getElementById("claveCrear") as HTMLInputElement).value;
  const rol = (document.getElementById("rolCrear") as HTMLSelectElement).value as Rol;

  const resultado = crearCuenta(nombre, clave, rol);
  if (!resultado.exito) {
    mostrarEstado("estadoCrear", resultado.mensaje ?? "No se pudo crear la cuenta.");
    return;
  }

  const sesion = iniciarSesion(nombre, clave);
  if (!sesion.exito) {
    mostrarEstado("estadoCrear", "La cuenta fue creada, pero no se pudo iniciar sesión automáticamente.");
    return;
  }

  window.location.replace(redireccionPorRol(rol));
});
