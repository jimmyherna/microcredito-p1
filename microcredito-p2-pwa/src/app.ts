import { cerrarSesion, obtenerSesion } from "./almacen/cuentas.js";

function destinoPorRol(rol: string): string {
  if (rol === "GERENCIA") return "/paginas/bandeja-comite.html";
  if (rol === "ASESOR") return "/paginas/menu.html";
  return "/paginas/inicio-cliente.html";
}

function protegerRutaActual(): void {
  const ruta = window.location.pathname;
  if (ruta === "/" || ruta.endsWith("/index.html") || ruta.endsWith("index.html")) return;

  const sesion = obtenerSesion();
  if (!sesion) {
    window.location.replace("/index.html");
    return;
  }

  const reglas: Array<{ terminaEn: string; roles: string[] }> = [
    { terminaEn: "bandeja-comite.html", roles: ["GERENCIA"] },
    { terminaEn: "inicio-cliente.html", roles: ["CLIENTE"] },
    { terminaEn: "menu.html", roles: ["CLIENTE", "ASESOR"] },
    { terminaEn: "solicitud-credito.html", roles: ["CLIENTE", "ASESOR"] },
    { terminaEn: "mi-credito.html", roles: ["CLIENTE", "ASESOR"] },
    { terminaEn: "registrar-pago.html", roles: ["CLIENTE", "ASESOR"] },
    { terminaEn: "plan-amortizacion.html", roles: ["CLIENTE", "ASESOR"] },
    { terminaEn: "detalle-mora.html", roles: ["CLIENTE", "ASESOR"] },
  ];

  const regla = reglas.find((r) => ruta.endsWith(r.terminaEn));
  if (regla && !regla.roles.includes(sesion.rol)) {
    window.location.replace(destinoPorRol(sesion.rol));
  }
}

function asegurarEncabezadoGlobal(): void {
  const topbar = document.querySelector(".topbar") as HTMLElement | null;
  if (!topbar) return;

  const rutaActual = window.location.pathname;
  const esPantallaMenu = rutaActual.endsWith("menu.html") || rutaActual.endsWith("inicio-cliente.html");
  const esPantallaGerencia = rutaActual.endsWith("bandeja-comite.html");

  if (esPantallaMenu) {
    topbar.style.display = "none";
    topbar.innerHTML = "";
    return;
  }

  if (esPantallaGerencia) {
    topbar.style.display = "flex";
    topbar.innerHTML = `
      <div style="min-width: 100px;"></div>
      <h1>Bandeja del comité</h1>
      <a href="/index.html" class="btn-menu-top" id="btnCerrarSesion">Cerrar sesión</a>
    `;

    document.getElementById("btnCerrarSesion")?.addEventListener("click", (e) => {
      e.preventDefault();
      cerrarSesion();
      window.location.replace("/index.html");
    });
    return;
  }

  topbar.style.display = "flex";
  const tituloTexto = document.title.split("—")[0].trim() || "Crédito Vecino";

  topbar.innerHTML = `
    <button class="volver" id="btnVolver" aria-label="Regresar">← Volver</button>
    <h1>${tituloTexto}</h1>
    <a href="/paginas/menu.html" class="btn-menu-top">Ir al menú</a>
  `;

  document.getElementById("btnVolver")?.addEventListener("click", () => history.back());
}

document.addEventListener("DOMContentLoaded", () => {
  protegerRutaActual();
  asegurarEncabezadoGlobal();
});

setTimeout(() => {
  protegerRutaActual();
  asegurarEncabezadoGlobal();
}, 50);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").then((registro) => {
    registro.update();
  }).catch(() => {
    // La PWA sigue funcionando aunque el registro del SW falle.
  });

  let yaRecargo = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (yaRecargo) return;
    yaRecargo = true;
    window.location.reload();
  });
}
