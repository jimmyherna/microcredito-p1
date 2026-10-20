import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSesion } from "../contexto/SesionContext";

/** Prefijo de rutas según el rol: gerencia usa las mismas pantallas dentro del cascarón de escritorio. */
export function useBase(): string {
  const { usuario } = useSesion();
  return usuario?.rol === "gerencia" ? "/gerencia" : "";
}

/**
 * Regreso coherente: si hay historial dentro de la app vuelve atrás; si se entró directo
 * (enlace, recarga, PWA) va a la pantalla de respaldo. Nunca deja al usuario sin salida.
 */
export function useVolver(respaldo: string): () => void {
  const navegar = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navegar(-1);
    else navegar(respaldo, { replace: true });
  }, [navegar, respaldo]);
}

/** Sección de /ayuda más relevante para la pantalla actual. */
export function seccionAyudaDe(ruta: string): string {
  if (ruta.startsWith("/solicitud")) return "solicitar";
  if (ruta.includes("/mora")) return "mora";
  if (ruta.includes("/plan")) return "cuota-plan";
  if (ruta.includes("/pago")) return "pago";
  if (ruta.includes("/credito")) return "saldo";
  if (ruta.includes("/cierre")) return "gerencia-cierres";
  if (ruta.includes("/bitacora")) return "gerencia-bitacora";
  if (ruta.includes("/gerencia")) return "gerencia-tablero";
  if (ruta.startsWith("/cuenta")) return "cuenta";
  return "inicio";
}

export function rutaAyuda(ruta: string): string {
  return `/ayuda#${seccionAyudaDe(ruta)}`;
}
