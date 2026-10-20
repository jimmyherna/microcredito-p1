import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import Icono from "./Icono";
import { useSesion } from "../contexto/SesionContext";
import { rutaAyuda, useVolver } from "../lib/rutas";

/**
 * Encabezado de pantalla. En móvil (cliente/asesor) es la barra superior con regreso, el "?" de
 * ayuda contextual y el acceso a Mi cuenta. En escritorio (gerencia) esos íconos ya viven en la barra
 * del cascarón, así que aquí sólo se muestra el título con su botón de regreso.
 */
export default function EncabezadoPantalla({ titulo, subtitulo, conRegreso = false, volverA = "/menu", acciones }: { titulo: string; subtitulo?: string; conRegreso?: boolean; volverA?: string; acciones?: ReactNode }) {
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  const volver = useVolver(volverA);
  const escritorio = usuario?.rol === "gerencia";

  const regreso = conRegreso && (
    <button type="button" aria-label="Regresar" onClick={volver} className="boton-icono -ml-2 text-tinta">
      <Icono nombre="atras" />
    </button>
  );

  if (escritorio) {
    return (
      <div className="mb-5 flex items-center gap-2">
        {regreso}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold">{titulo}</h1>
          {subtitulo && <p className="text-sm text-tinta/60">{subtitulo}</p>}
        </div>
        {acciones}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-linea bg-papel/95 px-4 py-2 backdrop-blur">
      {regreso}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-semibold leading-tight">{titulo}</h1>
        {subtitulo && <p className="truncate text-xs text-tinta/60">{subtitulo}</p>}
      </div>
      {acciones}
      <Link to={rutaAyuda(ubicacion.pathname)} aria-label="Ayuda sobre esta pantalla" className="boton-icono">
        <Icono nombre="ayuda" />
      </Link>
      <Link to="/cuenta" aria-label="Mi cuenta" className="boton-icono">
        <Icono nombre="usuario" />
      </Link>
    </header>
  );
}
