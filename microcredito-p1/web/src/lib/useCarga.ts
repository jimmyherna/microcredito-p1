import { useCallback, useEffect, useRef, useState } from "react";
import { mensajeError } from "./api";

export interface EstadoCarga<T> {
  datos: T | null;
  error: string | null;
  cargando: boolean;
  recargar: () => void;
}

/**
 * Carga de datos con estados explícitos (cargando / error / datos). Cancela las respuestas de
 * peticiones obsoletas. `deps` son las dependencias que disparan una nueva carga (p. ej. id, fecha).
 */
export function useCarga<T>(cargador: () => Promise<T>, deps: readonly unknown[]): EstadoCarga<T> {
  const [estado, setEstado] = useState<{ datos: T | null; error: string | null; cargando: boolean }>({ datos: null, error: null, cargando: true });
  const [version, setVersion] = useState(0);
  const ref = useRef(cargador);
  ref.current = cargador;

  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    ref
      .current()
      .then((d) => {
        if (vivo) setEstado({ datos: d, error: null, cargando: false });
      })
      .catch((e) => {
        if (vivo) setEstado((s) => ({ datos: s.datos, error: mensajeError(e, "No se pudo cargar la información."), cargando: false }));
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, recargar };
}
