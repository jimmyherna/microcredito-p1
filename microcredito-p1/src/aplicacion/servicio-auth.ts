// Autenticación y registro de cuentas. Sin librerías nuevas: contraseñas con scrypt (node:crypto)
// y sal aleatoria; sesión = token firmado HMAC-SHA256 sin estado (stateless) que expira a las 12 h.

import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import type { RepositorioPuerto } from "./repositorio-puerto.js";
import type { FilaUsuario, Rol } from "./tipos.js";
import { ErrorAplicacion } from "./tipos.js";

const scrypt = promisify(scryptCb) as (clave: string, sal: Buffer, largo: number, opciones: { N: number; r: number; p: number }) => Promise<Buffer>;

const N = 16384;
const R = 8;
const P = 1;
const LARGO = 64;
export const DURACION_TOKEN_SEGUNDOS = 12 * 3600;

// --- Contraseñas --------------------------------------------------------------------

export async function hashearContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await scrypt(contrasena.normalize("NFKC"), sal, LARGO, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verificarContrasena(contrasena: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, sal, hash] = partes as [string, string, string, string, string, string];
  const esperado = Buffer.from(hash, "base64url");
  const obtenido = await scrypt(contrasena.normalize("NFKC"), Buffer.from(sal, "base64url"), esperado.length, { N: Number(n), r: Number(r), p: Number(p) });
  return obtenido.length === esperado.length && timingSafeEqual(obtenido, esperado);
}

// --- Token de sesión -------------------------------------------------------------------

const SECRETO_DESARROLLO = "credigest-secreto-solo-desarrollo-cambiar-en-produccion";
let advertido = false;

function secreto(): string {
  const s = process.env["CV_SECRETO_SESION"];
  if (s && s.length >= 16) return s;
  if (!advertido) {
    advertido = true;
    console.warn(
      "[auth] ADVERTENCIA: CV_SECRETO_SESION no está definido (o tiene menos de 16 caracteres); se usa un secreto de DESARROLLO. " +
        "Defínalo en .env antes de exponer la API."
    );
  }
  return SECRETO_DESARROLLO;
}

export interface CargaToken {
  sub: string;
  rol: Rol;
  iat: number;
  exp: number;
}

function firmar(cuerpo: string): string {
  return createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
}

export function crearToken(usuario: Pick<FilaUsuario, "id" | "rol">, ahoraMs: number = Date.now()): string {
  const iat = Math.floor(ahoraMs / 1000);
  const carga: CargaToken = { sub: usuario.id, rol: usuario.rol, iat, exp: iat + DURACION_TOKEN_SEGUNDOS };
  const cuerpo = Buffer.from(JSON.stringify(carga)).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

/** Devuelve la carga si la firma es válida y no expiró; null en cualquier otro caso (nunca lanza). */
export function verificarToken(token: string, ahoraMs: number = Date.now()): CargaToken | null {
  try {
    const partes = token.split(".");
    if (partes.length !== 2) return null;
    const [cuerpo, firma] = partes as [string, string];
    const esperada = Buffer.from(firmar(cuerpo));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
    const carga = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8")) as CargaToken;
    if (typeof carga.sub !== "string" || typeof carga.exp !== "number" || Math.floor(ahoraMs / 1000) >= carga.exp) return null;
    return carga;
  } catch {
    return null;
  }
}

// --- Identificadores -----------------------------------------------------------------------

/** Correo (minúsculas) o teléfono (sólo dígitos). Lanza VALIDACION si no es ninguno de los dos. */
export function normalizarIdentificador(bruto: string): string {
  const v = bruto.trim();
  if (v.includes("@")) {
    const correo = v.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 120) {
      throw new ErrorAplicacion("VALIDACION", "El correo electrónico no es válido");
    }
    return correo;
  }
  let digitos = v.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("502")) digitos = digitos.slice(3); // +502 de Guatemala
  if (digitos.length < 8 || digitos.length > 15) {
    throw new ErrorAplicacion("VALIDACION", "Ingresa un correo válido o un teléfono de al menos 8 dígitos");
  }
  return digitos;
}

function normalizarDpi(dpi: string): string {
  return dpi.replace(/[\s-]/g, "").toUpperCase();
}

export function usuarioPublico(u: FilaUsuario) {
  return { id: u.id, nombre: u.nombre, identificador: u.identificador, rol: u.rol, clienteId: u.clienteId, asesorId: u.asesorId };
}
export type UsuarioPublico = ReturnType<typeof usuarioPublico>;

// --- Registro / login -------------------------------------------------------------------------

const CODIGO_GERENCIA_DESARROLLO = "comite-dev-2026";

function codigoGerenciaEsperado(): string | null {
  const c = process.env["CV_CODIGO_GERENCIA"];
  if (c) return c;
  if (process.env["NODE_ENV"] === "production") return null; // en producción NO hay valor por defecto
  console.warn("[auth] ADVERTENCIA: CV_CODIGO_GERENCIA no está definido; se usa el código de DESARROLLO.");
  return CODIGO_GERENCIA_DESARROLLO;
}

const EsquemaRegistro = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  identificador: z.string().trim().min(1, "El correo o teléfono es obligatorio").max(120),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
  rol: z.enum(["cliente", "asesor", "gerencia"], { message: "El rol debe ser cliente, asesor o gerencia" }),
  dpi: z.string().trim().max(40).optional(),
  asesorId: z.string().trim().max(40).optional(),
  codigoComite: z.string().max(200).optional(),
});

function nuevoId(prefijo: string): string {
  return `${prefijo}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function registrarUsuario(repo: RepositorioPuerto, entrada: unknown): Promise<{ token: string; usuario: UsuarioPublico }> {
  const parsed = EsquemaRegistro.safeParse(entrada ?? {});
  if (!parsed.success) throw new ErrorAplicacion("VALIDACION", parsed.error.issues[0]?.message ?? "Datos de registro inválidos");
  const d = parsed.data;
  const identificador = normalizarIdentificador(d.identificador);

  if (d.rol === "gerencia") {
    const esperado = codigoGerenciaEsperado();
    if (!esperado || d.codigoComite !== esperado) {
      throw new ErrorAplicacion("SIN_PERMISO", "El código del comité es incorrecto: no se puede crear una cuenta de gerencia");
    }
  }
  if (await repo.obtenerUsuarioPorIdentificador(identificador)) {
    throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ya existe una cuenta con ese correo o teléfono. Inicia sesión.");
  }

  const usuarios = await repo.listarUsuarios();
  let clienteId: string | null = null;
  let asesorId: string | null = null;

  if (d.rol === "cliente" && d.dpi) {
    const dpi = normalizarDpi(d.dpi);
    const cliente = (await repo.listarClientes()).find((c) => normalizarDpi(c.dpi) === dpi);
    // Sólo se vincula si el cliente existe y aún no tiene cuenta; si no, la cuenta queda sin créditos.
    if (cliente && !usuarios.some((u) => u.clienteId === cliente.id)) clienteId = cliente.id;
  }

  if (d.rol === "asesor") {
    if (d.asesorId) {
      const asesor = (await repo.listarAsesores()).find((a) => a.id === d.asesorId);
      if (!asesor || usuarios.some((u) => u.asesorId === asesor.id)) {
        throw new ErrorAplicacion("VALIDACION", "El asesor elegido no existe o ya tiene una cuenta");
      }
      asesorId = asesor.id;
    } else {
      const existentes = new Set((await repo.listarAsesores()).map((a) => a.id));
      let id = nuevoId("ASE");
      while (existentes.has(id)) id = nuevoId("ASE");
      await repo.crearAsesor({ id, nombre: d.nombre });
      asesorId = id;
    }
  }

  const ahora = new Date().toISOString();
  const usuario = await repo.crearUsuario({
    id: nuevoId("USR"),
    nombre: d.nombre,
    identificador,
    contrasenaHash: await hashearContrasena(d.contrasena),
    rol: d.rol,
    clienteId,
    asesorId,
    creadoEn: ahora,
    ultimoAcceso: ahora,
  });
  await registrarEnBitacora(repo, usuario, "Registro de cuenta", "usuario", usuario.id, `Cuenta de ${usuario.rol} creada (${usuario.identificador})`);
  return { token: crearToken(usuario), usuario: usuarioPublico(usuario) };
}

// Hash de relleno para igualar el tiempo de respuesta cuando el usuario no existe.
let hashRelleno: Promise<string> | undefined;

export async function iniciarSesion(repo: RepositorioPuerto, entrada: unknown): Promise<{ token: string; usuario: UsuarioPublico }> {
  const generico = () => new ErrorAplicacion("CREDENCIALES_INVALIDAS", "Credenciales inválidas");
  const { identificador, contrasena } = (entrada ?? {}) as Record<string, unknown>;
  if (typeof identificador !== "string" || typeof contrasena !== "string" || !contrasena || contrasena.length > 200) throw generico();
  let normalizado: string;
  try {
    normalizado = normalizarIdentificador(identificador);
  } catch {
    throw generico();
  }
  const cuenta = await repo.obtenerUsuarioPorIdentificador(normalizado);
  if (!cuenta) {
    hashRelleno ??= hashearContrasena("relleno-sin-uso");
    await verificarContrasena(contrasena, await hashRelleno);
    throw generico();
  }
  if (!(await verificarContrasena(contrasena, cuenta.contrasenaHash))) throw generico();
  const ahora = new Date().toISOString();
  await repo.registrarAcceso(cuenta.id, ahora);
  const { contrasenaHash: _h, ...usuario } = cuenta;
  await registrarEnBitacora(repo, usuario, "Inicio de sesión", "usuario", usuario.id, null);
  return { token: crearToken(usuario), usuario: usuarioPublico({ ...usuario, ultimoAcceso: ahora }) };
}

/** Asesores que aún no tienen cuenta (para elegir al registrarse como asesor). */
export async function asesoresDisponibles(repo: RepositorioPuerto): Promise<{ id: string; nombre: string }[]> {
  const ocupados = new Set((await repo.listarUsuarios()).map((u) => u.asesorId).filter(Boolean));
  return (await repo.listarAsesores()).filter((a) => !ocupados.has(a.id)).map((a) => ({ id: a.id, nombre: a.nombre }));
}

/** Escribe en la bitácora sin romper la operación principal si el registro falla. */
export async function registrarEnBitacora(
  repo: RepositorioPuerto,
  actor: Pick<FilaUsuario, "id" | "nombre" | "rol">,
  accion: string,
  entidad: string | null,
  entidadId: string | null,
  detalle: string | null
): Promise<void> {
  try {
    await repo.registrarBitacora({ fecha: new Date().toISOString(), usuarioId: actor.id, usuarioNombre: actor.nombre, rol: actor.rol, accion, entidad, entidadId, detalle });
  } catch (e) {
    console.error("[bitacora] no se pudo registrar:", e);
  }
}
