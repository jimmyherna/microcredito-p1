export interface AccionSiguiente {
  texto: string;
  href: string;
  estilo?: "primario" | "secundario";
}

export function mostrarAccionesSiguientes(contenedorId: string, acciones: AccionSiguiente[]): void {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  contenedor.innerHTML = acciones
    .map(
      (a) => `
      <a href="${a.href}">
        <button class="${a.estilo === "secundario" ? "secundario" : "primario"}" style="margin-top:0.7rem">${a.texto}</button>
      </a>`
    )
    .join("");
}