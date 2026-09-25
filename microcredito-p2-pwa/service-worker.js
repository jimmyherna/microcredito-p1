const CACHE_NAME = "sgmc-cache-v5";

const ARCHIVOS_A_CACHEAR = [
"/",
"/index.html",
"/manifest.json",
"/paginas/menu.html",
"/paginas/inicio-cliente.html",
"/paginas/registrar-pago.html",
"/paginas/plan-amortizacion.html",
"/paginas/detalle-mora.html",
"/paginas/mi-credito.html",
"/paginas/solicitud-credito.html",
"/paginas/bandeja-comite.html",
"/css/base.css",
"/css/nav.css",
"/icons/icon-192.png",
"/icons/icon-512.png",
"/dist/seguridad.js",
"/dist/ayuda.js",
"/dist/navegacion.js",
"/dist/resena.js",
"/dist/app.js",
"/dist/dominio/cartera.js",
"/dist/dominio/prelacion-pago.js",
"/dist/dominio/calculadora-mora.js",
"/dist/dominio/politicas.js",
"/dist/dominio/plan-amortizacion.js",
"/dist/dominio/dinero.js",
"/dist/dominio/credito-estado.js",
"/dist/almacen/cuentas.js",
"/dist/almacen/cola-offline.js",
"/dist/almacen/creditos.js",
"/dist/almacen/resenas.js",
"/dist/almacen/solicitudes.js",
"/dist/paginas/login.js",
"/dist/paginas/inicio-cliente.js",
"/dist/paginas/mi-credito.js",
"/dist/paginas/registrar-pago.js",
"/dist/paginas/plan-amortizacion.js",
"/dist/paginas/detalle-mora.js",
"/dist/paginas/bandeja-comite.js",
"/dist/paginas/solicitud-credito.js",
"/dist/paginas/menu.js"
];



// Instalación e intercepción inmediata del Service Worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARCHIVOS_A_CACHEAR);
    })
  );
});

// Activación y eliminación de cachés obsoletas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de red primero, cayendo a caché si no hay conexión
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((respuestaRed) => {
        if (respuestaRed && respuestaRed.status === 200 && event.request.method === "GET") {
          const respuestaClonada = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, respuestaClonada);
          });
        }
        return respuestaRed;
      })
      .catch(() => caches.match(event.request))
  );
});