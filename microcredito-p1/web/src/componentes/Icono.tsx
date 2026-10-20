export type NombreIcono =
  | "inicio" | "ayuda" | "usuario" | "atras" | "cerrar" | "ojo" | "ojo-cerrado" | "chat" | "credito" | "solicitud"
  | "pago" | "tablero" | "bitacora" | "usuarios" | "cierre" | "alerta" | "check" | "buscar" | "flecha" | "mas"
  | "salir" | "calendario" | "chevron" | "plan" | "riesgo" | "ordenar" | "enviar" | "reloj";

const TRAZOS: Record<NombreIcono, string> = {
  inicio: "M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z",
  ayuda: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.4 1-1.4 1.9v.3M12 17h.01",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  atras: "M15 5 8 12l7 7",
  cerrar: "M6 6l12 12M18 6 6 18",
  ojo: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "ojo-cerrado": "M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  chat: "M4 5h16v11H9l-5 4V5Z",
  credito: "M3.5 6h17a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM2.5 10h19",
  solicitud: "M7 3h8l4 4v14H7V3Zm8 0v4h4M10 12h6M10 16h6",
  pago: "M12 3v18M16.5 7c0-1.7-2-3-4.5-3S7.5 5.300 7.500 7s2 2.700 4.500 3.200 4.500 1.500 4.500 3.300-2 3.500-4.500 3.500-4.500-1.300-4.500-3",
  tablero: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bitacora: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  usuarios: "M9 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7ZM2 20a7 7 0 0 1 14 0M16 4.300a3.500 3.500 0 0 1 0 6.400M18 14a6 6 0 0 1 4 6",
  cierre: "M5 4h14v17H5V4Zm3 5h8M8 13h8M8 17h5",
  alerta: "M12 9v4M12 16.500h.01M10.300 4.300 2.900 18a1.600 1.600 0 0 0 1.400 2.400h15.400a1.600 1.600 0 0 0 1.400-2.400L13.700 4.300a1.600 1.600 0 0 0-2.800 0Z",
  check: "M5 12.500 10 17.500 19 7",
  buscar: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5",
  flecha: "M5 12h14M13 6l6 6-6 6",
  mas: "M12 5v14M5 12h14",
  salir: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9",
  calendario: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 5h16M8 3v4M16 3v4",
  chevron: "m6 9 6 6 6-6",
  plan: "M4 5h16v14H4V5Zm0 5h16M9 5v14",
  riesgo: "M12 3 3 19h18L12 3Zm0 6v5M12 17h.01",
  ordenar: "M8 4v16m0 0-3-3m3 3 3-3M16 20V4m0 0-3 3m3-3 3 3",
  enviar: "M4 12 20 4l-4 16-4-6-8-2Z",
  reloj: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
};

/** Ícono de línea (SVG propio, sin librerías). Decorativo salvo que se dé `titulo`. */
export default function Icono({ nombre, tamano = 22, grosor = 1.8, titulo, className }: { nombre: NombreIcono; tamano?: number; grosor?: number; titulo?: string; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
