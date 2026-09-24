export function inicializarAyuda(texto: string): void {
  const boton = document.createElement("button");
  boton.className = "boton-ayuda";
  boton.setAttribute("aria-label", "Ayuda");
  boton.textContent = "?";

  const panel = document.createElement("div");
  panel.className = "panel-ayuda oculto";
  panel.innerHTML = `<p>${texto}</p><button class="secundario cerrar-ayuda">Entendido</button>`;

  boton.addEventListener("click", () => panel.classList.toggle("oculto"));
  panel.querySelector(".cerrar-ayuda")!.addEventListener("click", () => panel.classList.add("oculto"));

  document.body.appendChild(boton);
  document.body.appendChild(panel);
}