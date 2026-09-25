import { escaparHtml } from "./seguridad.js";

export interface AccionSiguiente {
  texto: string;
  href: string;
  estilo?: "primario" | "secundario";
}

export function mostrarAccionesSiguientes(contenedorId: string, acciones: AccionSiguiente[]): void {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  contenedor.innerHTML = acciones.map((a) => `
    <a href="${escaparHtml(a.href)}"
       class="${a.estilo === "secundario" ? "secundario" : "primario"}"
       style="display:block; text-decoration:none; margin-top:0.7rem; text-align:center;">
      ${escaparHtml(a.texto)}
    </a>
  `).join("");
}
