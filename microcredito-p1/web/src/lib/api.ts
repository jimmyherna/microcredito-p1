// Cliente HTTP hacia la API: ÚNICA puerta de entrada a los datos. Envía `Authorization: Bearer`.
// 401 NO_AUTENTICADO con sesión activa = token vencido -> se avisa a SesionContext para volver a /login.
// 401 CREDENCIALES_INVALIDAS (login fallido) NO es sesión expirada: llega como error normal al formulario.

export class ErrorApi extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
    public detalles?: Record<string, unknown>,
    public estado?: number
  ) {
    super(mensaje);
  }
}

let tokenActual: string | null = null;
let alExpirar: (() => void) | null = null;

export function fijarToken(token: string | null): void {
  tokenActual = token;
}

export function registrarManejadorExpiracion(fn: (() => void) | null): void {
  alExpirar = fn;
}

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
  if (tokenActual) cabeceras["Authorization"] = `Bearer ${tokenActual}`;

  // URL base de la API: lee la variable de entorno o usa el puerto 3000 por defecto para Docker
  const urlBase = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlBase}/api${ruta}`, { ...opciones, headers: cabeceras });
  } catch {
    throw new ErrorApi("SIN_CONEXION", "No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.");
  }

  const cuerpo = (await respuesta.json().catch(() => null)) as { codigo?: string; mensaje?: string; detalles?: Record<string, unknown> } | null;
  
  if (!respuesta.ok) {
    const esAuth = ruta.startsWith("/auth/login") || ruta.startsWith("/auth/registro");
    if (respuesta.status === 401 && cuerpo?.codigo === "NO_AUTENTICADO" && tokenActual && !esAuth) {
      alExpirar?.();
    }
    const generico = respuesta.status >= 500 ? "El servidor tuvo un problema. Inténtalo de nuevo en un momento." : "Ocurrió un error inesperado.";
    throw new ErrorApi(cuerpo?.codigo ?? "ERROR_DESCONOCIDO", cuerpo?.mensaje ?? generico, cuerpo?.detalles, respuesta.status);
  }

  return cuerpo as T;
}

export const api = {
  get: <T>(ruta: string) => peticion<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => peticion<T>(ruta, { method: "POST", body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) }),
};

/** Agrega ?fechaCorte= (o &fechaCorte=) a una ruta. */
export function conFechaCorte(ruta: string, fecha: string): string {
  return `${ruta}${ruta.includes("?") ? "&" : "?"}fechaCorte=${encodeURIComponent(fecha)}`;
}

/** Texto en español para mostrar al usuario a partir de cualquier error. */
export function mensajeError(e: unknown, porDefecto = "Algo salió mal. Inténtalo de nuevo."): string {
  if (e instanceof ErrorApi) return e.message;
  return porDefecto;
}