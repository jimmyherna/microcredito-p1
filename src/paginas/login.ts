const inputNombre = document.getElementById("nombre") as HTMLInputElement;
const selectRol = document.getElementById("rol") as HTMLSelectElement;
const btnContinuar = document.getElementById("btnContinuar") as HTMLButtonElement;

const DESTINO_POR_ROL: Record<string, string> = {
  ASESOR: "/paginas/menu.html",
  CLIENTE: "/paginas/detalle-mora.html?id=CV-2026-0410",
  GERENCIA: "/paginas/bandeja-comite.html",
};

btnContinuar.addEventListener("click", () => {
  const nombre = inputNombre.value.trim() || "Invitado";
  const rol = selectRol.value;

  sessionStorage.setItem("sgmc-sesion", JSON.stringify({ nombre, rol }));
  window.location.href = DESTINO_POR_ROL[rol] ?? "/paginas/menu.html";
});