import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA (E1): la app debe instalarse y usarse bien tanto en el teléfono del
// asesor/cliente como en el escritorio de gerencia. `registerType: autoUpdate`
// evita que el equipo quede pegado a una versión vieja durante el video.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icono-mascara.svg"],
      manifest: {
        name: "CrediGest — Gestión de Créditos",
        short_name: "CrediGest",
        description: "Gestión de créditos y asistente gerencial de Crédito Vecino, S. A.",
        theme_color: "#15304D",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/icons/icono-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icono-512.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "/icons/icono-mascara.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // El núcleo de cálculo vive en el servidor: nunca se cachean respuestas
        // de /api/** como si fueran estáticas, para no mostrar cifras viejas.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, el frontend (5173) reenvía /api al backend (3000).
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
