const CACHE_SHELL = "sgmc-shell-v3";
const CACHE_DATOS = "sgmc-datos-v3";

const ARCHIVOS_SHELL = [
  "/index.html",
  "/manifest.json",
  "/css/base.css",
  "/css/nav.css",
  "/dist/app.js",
  "/paginas/inicio-cliente.html",
  "/paginas/mi-credito.html",
  "/paginas/menu.html",
  "/paginas/solicitud-credito.html",
  "/paginas/plan-amortizacion.html",
  "/paginas/detalle-mora.html",
  "/paginas/registrar-pago.html",
  "/paginas/bandeja-comite.html",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(ARCHIVOS_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((n) => n !== CACHE_SHELL && n !== CACHE_DATOS)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;

  if (ARCHIVOS_SHELL.some((ruta) => peticion.url.endsWith(ruta))) {
    // CORRECCIÓN: fetch(peticion.url) — texto, NO fetch(peticion) el objeto.
    evento.respondWith(
      caches.match(peticion).then((respuesta) => respuesta || fetch(peticion.url))
    );
    return;
  }

  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_DATOS).then((cache) => cache.put(peticion, copia));
        return respuesta;
      })
      .catch(() => caches.match(peticion))
  );
});