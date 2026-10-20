import type { NextFunction, Request, Response } from "express";
import type { RepositorioPuerto } from "../aplicacion/repositorio-puerto.js";
import type { Sesion } from "../aplicacion/alcance.js";
import { ErrorAplicacion } from "../aplicacion/tipos.js";
import { verificarToken } from "../aplicacion/servicio-auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Usuario autenticado (lo fija `exigirSesion`; ausente en rutas públicas). */
      usuario?: Sesion;
    }
  }
}

/** Rutas públicas bajo /api (método + ruta relativa a /api). Todo lo demás exige `Authorization: Bearer`. */
const PUBLICAS = new Set(["GET /salud", "POST /auth/registro", "POST /auth/login", "GET /auth/asesores-disponibles"]);

/** Middleware montado en `/api`: valida el token y re-lee la cuenta de la BD (vínculos vigentes). */
export function exigirSesion(repo: RepositorioPuerto) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS" || PUBLICAS.has(`${req.method} ${req.path.replace(/\/+$/, "") || "/"}`)) return next();
    const cabecera = req.headers.authorization ?? "";
    const m = /^Bearer\s+(\S+)$/i.exec(cabecera);
    const carga = m ? verificarToken(m[1]!) : null;
    const usuario = carga ? await repo.obtenerUsuario(carga.sub) : null;
    if (!usuario) throw new ErrorAplicacion("NO_AUTENTICADO", "Sesión inválida o expirada. Inicia sesión de nuevo.");
    req.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, clienteId: usuario.clienteId, asesorId: usuario.asesorId };
    next();
  };
}

/** Usuario de la petición (las rutas protegidas siempre lo tienen). */
export function actor(req: Request): Sesion {
  if (!req.usuario) throw new ErrorAplicacion("NO_AUTENTICADO", "Se requiere autenticación");
  return req.usuario;
}
