if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").then((registro) => {
    registro.update(); // fuerza a revisar si hay una versión nueva del archivo
  });

  let yaRecargo = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (yaRecargo) return; // evita un bucle infinito de recargas
    yaRecargo = true;
    window.location.reload();
  });
}