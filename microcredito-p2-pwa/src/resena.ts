import { guardarResena } from "./almacen/resenas.js";
import { obtenerSesion } from "./almacen/cuentas.js";

export function mostrarFormularioResena(contenedorId: string): void {
  const sesion = obtenerSesion();
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || !sesion) return;

  const claveResena = `sgmc-resena-hecha:${sesion.nombre.toLocaleLowerCase()}`;
  if (sessionStorage.getItem(claveResena)) return;

  let estrellasSeleccionadas = 0;

  const div = document.createElement("div");
  div.className = "tarjeta";
  div.innerHTML = `
    <strong>¿Cómo calificarías tu experiencia?</strong>
    <div class="selector-estrellas" style="margin:0.6rem 0; font-size:1.6rem; cursor:pointer;">
      ${[1, 2, 3, 4, 5].map((n) => `<span data-valor="${n}" style="opacity:0.3">★</span>`).join("")}
    </div>
    <textarea id="comentarioResena" placeholder="Comentarios o sugerencias (opcional)" rows="3"
      style="width:100%; border-radius:0.75rem; border:1.5px solid #dbe3e3; padding:0.6rem; font-family:inherit;"></textarea>
    <button id="btnEnviarResena" class="primario">Enviar calificación</button>
    <button id="btnOmitirResena" class="secundario" style="margin-top:0.5rem;">Omitir</button>`;
  contenedor.appendChild(div);

  const estrellas = div.querySelectorAll<HTMLSpanElement>(".selector-estrellas span");
  estrellas.forEach((estrella) => {
    estrella.addEventListener("click", () => {
      estrellasSeleccionadas = Number(estrella.dataset.valor);
      estrellas.forEach((e) => {
        e.style.opacity = Number(e.dataset.valor) <= estrellasSeleccionadas ? "1" : "0.3";
      });
    });
  });

  div.querySelector("#btnEnviarResena")!.addEventListener("click", () => {
    if (estrellasSeleccionadas === 0) { alert("Selecciona al menos una estrella."); return; }
    const comentario = (div.querySelector("#comentarioResena") as HTMLTextAreaElement).value.trim();
    if (comentario.length > 500) {
      alert("El comentario no puede superar 500 caracteres.");
      return;
    }
    guardarResena({ nombre: sesion.nombre, rol: sesion.rol, estrellas: estrellasSeleccionadas, comentario, fecha: new Date().toISOString() });
    sessionStorage.setItem(claveResena, "1");
    div.remove();
  });

  div.querySelector("#btnOmitirResena")!.addEventListener("click", () => {
    sessionStorage.setItem(claveResena, "1");
    div.remove();
  });
}