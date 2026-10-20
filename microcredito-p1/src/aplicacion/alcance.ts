// Alcance de datos por rol, aplicado en el servidor (nunca en la interfaz).
//   cliente  -> sólo sus créditos y solicitudes (creditos.cliente_id = su clienteId).
//   asesor   -> créditos con su asesor_id; clientes que dio de alta o a quienes atiende; sus solicitudes.
//   gerencia -> todo.

import type { RepositorioPuerto } from "./repositorio-puerto.js";
import type { FilaCredito, FilaSolicitud, Rol } from "./tipos.js";
import { ErrorAplicacion } from "./tipos.js";

/** Usuario autenticado de la petición (siempre re-leído de la BD: refleja vínculos recientes). */
export interface Sesion {
  id: string;
  nombre: string;
  rol: Rol;
  clienteId: string | null;
  asesorId: string | null;
}

export function exigirRol(u: Sesion, ...roles: Rol[]): void {
  if (!roles.includes(u.rol)) throw new ErrorAplicacion("SIN_PERMISO", "No tienes permiso para esta operación");
}

export function puedeVerCredito(u: Sesion, c: FilaCredito): boolean {
  if (u.rol === "gerencia") return true;
  if (u.rol === "cliente") return !!u.clienteId && c.clienteId === u.clienteId;
  return !!u.asesorId && c.asesorId === u.asesorId;
}

export async function creditosVisibles(repo: RepositorioPuerto, u: Sesion): Promise<FilaCredito[]> {
  const todos = await repo.listarCreditos();
  return u.rol === "gerencia" ? todos : todos.filter((c) => puedeVerCredito(u, c));
}

/** Devuelve el crédito si existe y el usuario puede verlo; 404 si no existe, 403 si es ajeno. */
export async function exigirCredito(repo: RepositorioPuerto, u: Sesion, creditoId: string): Promise<FilaCredito> {
  const c = await repo.obtenerCredito(creditoId);
  if (!c) throw new ErrorAplicacion("CREDITO_INEXISTENTE", `No existe el crédito ${creditoId}`);
  if (!puedeVerCredito(u, c)) throw new ErrorAplicacion("SIN_PERMISO", "Ese crédito no pertenece a tu cartera");
  return c;
}

/** Ids de clientes del alcance de un asesor: los que dio de alta + los de sus créditos. */
export async function clientesDeAsesor(repo: RepositorioPuerto, asesorId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const c of await repo.listarClientes()) if (c.asesorId === asesorId) ids.add(c.id);
  for (const cr of await repo.listarCreditos()) if (cr.asesorId === asesorId) ids.add(cr.clienteId);
  return ids;
}

/** ¿Puede el usuario operar (ver/crear solicitudes de) este cliente? */
export async function puedeVerCliente(repo: RepositorioPuerto, u: Sesion, clienteId: string): Promise<boolean> {
  if (u.rol === "gerencia") return true;
  if (u.rol === "cliente") return !!u.clienteId && u.clienteId === clienteId;
  return !!u.asesorId && (await clientesDeAsesor(repo, u.asesorId)).has(clienteId);
}

export async function solicitudesVisibles(repo: RepositorioPuerto, u: Sesion): Promise<FilaSolicitud[]> {
  const todas = await repo.listarSolicitudes();
  if (u.rol === "gerencia") return todas;
  if (u.rol === "cliente") return u.clienteId ? todas.filter((s) => s.clienteId === u.clienteId) : [];
  if (!u.asesorId) return [];
  const mios = await clientesDeAsesor(repo, u.asesorId);
  return todas.filter((s) => mios.has(s.clienteId));
}

export async function exigirSolicitud(repo: RepositorioPuerto, u: Sesion, solicitudId: string): Promise<FilaSolicitud> {
  const s = await repo.obtenerSolicitud(solicitudId);
  if (!s) throw new ErrorAplicacion("SOLICITUD_INEXISTENTE", `No existe la solicitud ${solicitudId}`);
  if (!(await puedeVerCliente(repo, u, s.clienteId))) throw new ErrorAplicacion("SIN_PERMISO", "Esa solicitud no está en tu alcance");
  return s;
}

/**
 * Vista del repositorio donde `listarCreditos` sólo devuelve los créditos dados. Así los servicios de
 * cartera/mora/vencimientos (que recorren listarCreditos) calculan sobre un subconjunto SIN duplicar
 * ni tocar sus fórmulas. Todo lo demás se delega tal cual al repositorio real.
 */
export function vistaConCreditos(repo: RepositorioPuerto, creditos: FilaCredito[]): RepositorioPuerto {
  return new Proxy(repo, {
    get(objetivo, prop) {
      if (prop === "listarCreditos") return async () => creditos;
      const v = Reflect.get(objetivo, prop, objetivo);
      return typeof v === "function" ? v.bind(objetivo) : v;
    },
  });
}

/** Repositorio acotado a la cartera visible del usuario (gerencia: el repositorio completo, sin vista). */
export async function repoDeCartera(repo: RepositorioPuerto, u: Sesion): Promise<RepositorioPuerto> {
  return u.rol === "gerencia" ? repo : vistaConCreditos(repo, await creditosVisibles(repo, u));
}
