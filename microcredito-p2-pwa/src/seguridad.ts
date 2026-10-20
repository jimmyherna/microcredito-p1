import { cerrarSesion, obtenerSesion } from "./almacen/cuentas.js";
import type { Rol } from "./almacen/cuentas.js";

const DESTINO_POR_ROL: Record<Rol, string> = {
  CLIENTE: "/paginas/inicio-cliente.html",
  ASESOR: "/paginas/menu.html",
  GERENCIA: "/paginas/bandeja-comite.html",
};

export function redireccionPorRol(rol: Rol): string {
  return DESTINO_POR_ROL[rol];
}

export function protegerPagina(rolesPermitidos: readonly Rol[]): boolean {
  const sesion = obtenerSesion();

  if (!sesion) {
    window.location.replace("/index.html");
    return false;
  }

  if (!rolesPermitidos.includes(sesion.rol)) {
    window.location.replace(redireccionPorRol(sesion.rol));
    return false;
  }

  return true;
}

export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\'/g, "&#039;");
}

export function configurarCierresDeSesion(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href="/index.html"]').forEach((enlace) => {
    enlace.addEventListener("click", (evento) => {
      evento.preventDefault();
      cerrarSesion();
      window.location.replace("/index.html");
    });
  });
}
