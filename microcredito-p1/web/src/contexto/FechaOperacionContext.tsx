import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSesion } from "./SesionContext";
import { conFechaCorte } from "../lib/api";
import { FECHA_CIERRE_PAQUETE, FORMATO_FECHA, hoyLocal } from "../lib/fecha";

// La fecha de operación es un PARÁMETRO enviado como ?fechaCorte=. Por defecto es HOY (hora local de
// Guatemala del dispositivo). Cliente y asesor operan siempre con hoy; sólo gerencia puede cambiar la
// "fecha de corte" (selector en la barra superior).

const CLAVE = "credigest.fechaCorte";

interface Valor {
  /** Fecha efectiva (AAAA-MM-DD) para todas las llamadas. */
  fecha: string;
  hoy: string;
  esHoy: boolean;
  esCierrePaquete: boolean;
  puedeCambiar: boolean;
  setFecha: (f: string) => void;
  irAHoy: () => void;
  irACierrePaquete: () => void;
  /** Añade ?fechaCorte=<fecha> a una ruta de la API. */
  conFecha: (ruta: string) => string;
}

const Ctx = createContext<Valor | null>(null);

export function FechaOperacionProvider({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const puedeCambiar = usuario?.rol === "gerencia";
  const [hoy, setHoy] = useState<string>(hoyLocal);
  const [elegida, setElegida] = useState<string | null>(() => {
    try {
      const g = sessionStorage.getItem(CLAVE);
      if (g && FORMATO_FECHA.test(g)) return g;
    } catch {
      /* sin almacenamiento */
    }
    return null;
  });

  // Si la app queda abierta pasada la medianoche, "hoy" se actualiza.
  useEffect(() => {
    const id = window.setInterval(() => setHoy(hoyLocal()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Al salir de la sesión (o si no es gerencia) se descarta cualquier fecha elegida.
  useEffect(() => {
    if (!puedeCambiar && elegida !== null) {
      setElegida(null);
      try {
        sessionStorage.removeItem(CLAVE);
      } catch {
        /* no crítico */
      }
    }
  }, [puedeCambiar, elegida]);

  const setFecha = useCallback(
    (f: string) => {
      if (!puedeCambiar || !FORMATO_FECHA.test(f)) return;
      setElegida(f);
      try {
        sessionStorage.setItem(CLAVE, f);
      } catch {
        /* no crítico */
      }
    },
    [puedeCambiar]
  );

  const fecha = puedeCambiar && elegida ? elegida : hoy;

  const valor = useMemo<Valor>(
    () => ({
      fecha,
      hoy,
      esHoy: fecha === hoy,
      esCierrePaquete: fecha === FECHA_CIERRE_PAQUETE,
      puedeCambiar,
      setFecha,
      irAHoy: () => setFecha(hoy),
      irACierrePaquete: () => setFecha(FECHA_CIERRE_PAQUETE),
      conFecha: (ruta: string) => conFechaCorte(ruta, fecha),
    }),
    [fecha, hoy, puedeCambiar, setFecha]
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useFechaOperacion(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFechaOperacion debe usarse dentro de <FechaOperacionProvider>");
  return v;
}
