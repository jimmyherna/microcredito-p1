import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ErrorApi, fijarToken, registrarManejadorExpiracion } from "../lib/api";
import type { RespuestaSesion, Usuario } from "../lib/tipos";

// Sesión real: {token, usuario} guardados en localStorage (con try/catch: puede no existir).
// Al abrir la app se valida con GET /api/auth/yo. Si el token venció, se limpia y se manda a /login con aviso.

const CLAVE = "credigest.sesion.v2";

interface SesionGuardada {
  token: string;
  usuario: Usuario;
}

interface SesionValor {
  usuario: Usuario | null;
  token: string | null;
  /** true mientras se valida la sesión guardada al abrir la app. */
  validando: boolean;
  /** Mensaje para mostrar en /login (por ejemplo, "Tu sesión expiró"). */
  aviso: string | null;
  iniciar: (r: RespuestaSesion) => void;
  cerrar: (aviso?: string) => void;
  limpiarAviso: () => void;
  /** Vuelve a leer la cuenta (por ejemplo, tras vincular la ficha de cliente). */
  refrescar: () => Promise<Usuario | null>;
}

const Ctx = createContext<SesionValor | null>(null);

function leer(): SesionGuardada | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const v = JSON.parse(crudo) as Partial<SesionGuardada>;
    if (v && typeof v.token === "string" && v.usuario && typeof v.usuario.id === "string") return { token: v.token, usuario: v.usuario };
  } catch {
    /* sin almacenamiento o dato dañado */
  }
  return null;
}

function guardar(s: SesionGuardada | null): void {
  try {
    if (s) localStorage.setItem(CLAVE, JSON.stringify(s));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* conveniencia local: no es crítico */
  }
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [guardada] = useState<SesionGuardada | null>(() => {
    const g = leer();
    fijarToken(g?.token ?? null);
    return g;
  });
  const [token, setToken] = useState<string | null>(guardada?.token ?? null);
  const [usuario, setUsuario] = useState<Usuario | null>(guardada?.usuario ?? null);
  const [validando, setValidando] = useState<boolean>(!!guardada);
  const [aviso, setAviso] = useState<string | null>(null);

  const cerrar = useCallback((mensaje?: string) => {
    fijarToken(null);
    guardar(null);
    setToken(null);
    setUsuario(null);
    setAviso(mensaje ?? null);
  }, []);

  // 401 NO_AUTENTICADO en cualquier llamada = token vencido.
  useEffect(() => {
    registrarManejadorExpiracion(() => cerrar("Tu sesión expiró. Inicia sesión de nuevo para continuar."));
    return () => registrarManejadorExpiracion(null);
  }, [cerrar]);

  // Validación inicial con GET /api/auth/yo.
  useEffect(() => {
    if (!guardada) return;
    let vivo = true;
    api
      .get<Usuario>("/auth/yo")
      .then((u) => {
        if (!vivo) return;
        setUsuario(u);
        guardar({ token: guardada.token, usuario: u });
      })
      .catch((e) => {
        if (!vivo) return;
        // Sólo se descarta la sesión si el servidor la rechazó; sin red se conserva la guardada.
        if (e instanceof ErrorApi && e.estado === 401) cerrar("Tu sesión expiró. Inicia sesión de nuevo para continuar.");
      })
      .finally(() => {
        if (vivo) setValidando(false);
      });
    return () => {
      vivo = false;
    };
  }, [guardada, cerrar]);

  const iniciar = useCallback((r: RespuestaSesion) => {
    fijarToken(r.token);
    guardar({ token: r.token, usuario: r.usuario });
    setToken(r.token);
    setUsuario(r.usuario);
    setAviso(null);
    setValidando(false);
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const u = await api.get<Usuario>("/auth/yo");
      setUsuario(u);
      setToken((t) => {
        if (t) guardar({ token: t, usuario: u });
        return t;
      });
      return u;
    } catch {
      return null;
    }
  }, []);

  const limpiarAviso = useCallback(() => setAviso(null), []);

  const valor = useMemo<SesionValor>(
    () => ({ usuario, token, validando, aviso, iniciar, cerrar, limpiarAviso, refrescar }),
    [usuario, token, validando, aviso, iniciar, cerrar, limpiarAviso, refrescar]
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion(): SesionValor {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return v;
}

/** Ruta de inicio según el rol. */
export function inicioDeRol(rol: Usuario["rol"] | undefined): string {
  return rol === "gerencia" ? "/gerencia/tablero" : "/menu";
}
