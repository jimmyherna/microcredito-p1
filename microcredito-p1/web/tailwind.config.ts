import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Identidad visual: CrediGest — el nombre que el equipo le dio a su propio
// producto en el prototipo de Figma (el sistema para la empresa Crédito
// Vecino, S. A.). Esta paleta y tipografía se tomaron directamente de ese
// prototipo para que la app implementada se sienta como su evolución
// directa, no como un rediseño de otro equipo:
//
//   navy       #15304D  azul marino corporativo — "Credi" del logotipo,
//              botones de autenticación y navegación (Iniciar Sesión,
//              Ingresar, Continuar)
//   navy-oscuro #0C2036 estado presionado / fondos de encabezado oscuros
//   verde      #2E9E5B  verde del check del logotipo — "Gest" del
//              logotipo, éxito, confirmaciones, estados al día
//   negro-cta  #15181D  negro casi puro — el prototipo usa botones negros
//              para las acciones de "cerrar la operación" (Confirmar y
//              Enviar, Aceptar y Guardar, Registrar un Pago): se conserva
//              esa distinción de dos niveles de acción (navy = navegar/
//              autenticar, negro = confirmar una operación de dinero)
//   papel      #FFFFFF  el prototipo es sobre blanco, no sobre crema
//   campo      #EEF1F5  gris muy claro de los campos de formulario
//   linea      #E1E5EA  bordes y separadores
//   mora       #C23B32  alertas de atraso (terracota-rojo, para tramos y
//              rechazos — no estaba en el Figma pero lo necesita el
//              dominio: mora, montos rechazados, créditos incobrables)
//
// Tipografía:
//   Display / logotipo y títulos: "Poppins"       — geométrica y redondeada,
//                                  como el wordmark "CrediGest"
//   Cuerpo / UI:                  "IBM Plex Sans"  — muy legible en chico
//   Cifras monetarias:            "IBM Plex Mono"  — numerales tabulares
// ---------------------------------------------------------------------------

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tinta: "#15181D",
        papel: "#FFFFFF",
        "papel-alto": "#FFFFFF",
        "papel-hueso": "#F6F7F9",
        navy: { DEFAULT: "#15304D", oscuro: "#0C2036", claro: "#E4EBF2" },
        verde: { DEFAULT: "#2E9E5B", oscuro: "#217A46", claro: "#DEF2E6" },
        negro: { DEFAULT: "#15181D", oscuro: "#000000" },
        mora: { DEFAULT: "#C23B32", oscuro: "#9A2E27", claro: "#FAE1DE" },
        ambar: { DEFAULT: "#D9A441", oscuro: "#AD7F2C", claro: "#FBEFD8" },
        campo: "#EEF1F5",
        linea: "#E1E5EA",
        // alias retrocompatibles usados en algunas pantallas ya construidas
        quetzal: { DEFAULT: "#2E9E5B", oscuro: "#217A46", claro: "#DEF2E6" },
        mango: { DEFAULT: "#D9A441", oscuro: "#AD7F2C", claro: "#FBEFD8" },
      },
      fontFamily: {
        display: ["\"Poppins\"", "system-ui", "sans-serif"],
        sans: ["\"IBM Plex Sans\"", "system-ui", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "monospace"],
      },
      borderRadius: {
        tarjeta: "1.1rem",
      },
      boxShadow: {
        tarjeta: "0 1px 2px rgba(21,24,29,0.05), 0 10px 28px -14px rgba(21,48,77,0.22)",
      },
      maxWidth: {
        movil: "480px",
      },
    },
  },
  plugins: [],
} satisfies Config;
