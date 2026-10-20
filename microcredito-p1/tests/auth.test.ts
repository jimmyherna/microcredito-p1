// Autenticación, alcance por rol y analítica gerencial (API real con RepositorioMemoria, sin red externa).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { crearServidor } from "../src/api/servidor.js";
import { RepositorioMemoria } from "../src/aplicacion/repositorio-memoria.js";
import { sembrarDatosDeDesarrollo } from "../src/aplicacion/semilla-desarrollo.js";
import { crearToken, normalizarIdentificador, verificarToken } from "../src/aplicacion/servicio-auth.js";
import { fechaHoyGuatemala } from "../src/aplicacion/reloj.js";

const CODIGO = "codigo-de-prueba-123";
let servidor: Server;
let base = "";
let repo: RepositorioMemoria;

async function api(metodo: string, ruta: string, cuerpo?: unknown, token?: string) {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
  const texto = await r.text();
  return { status: r.status, json: texto ? JSON.parse(texto) : null };
}

async function registrar(datos: Record<string, unknown>) {
  const r = await api("POST", "/api/auth/registro", { contrasena: "clave-segura-1", ...datos });
  expect(r.status).toBe(201);
  return r.json as { token: string; usuario: Record<string, unknown> };
}

beforeAll(async () => {
  process.env["CV_SECRETO_SESION"] = "secreto-de-pruebas-0123456789";
  process.env["CV_CODIGO_GERENCIA"] = CODIGO;
  // La semilla de desarrollo (CL-0001/CL-0002, 2 créditos, 1 solicitud) sólo se usa aquí, en pruebas.
  repo = sembrarDatosDeDesarrollo(new RepositorioMemoria());
  servidor = crearServidor(repo).listen(0);
  await new Promise((r) => servidor.once("listening", r));
  base = `http://localhost:${(servidor.address() as AddressInfo).port}`;
});
afterAll(() => {
  servidor.close();
});

const F = "?fechaCorte=2026-10-31";

describe("registro e inicio de sesión", () => {
  it("registra, inicia sesión con el rol de la cuenta y normaliza el identificador", async () => {
    const reg = await registrar({ nombre: "Ana Cliente", identificador: "Ana@Correo.COM", rol: "cliente" });
    expect(reg.usuario["identificador"]).toBe("ana@correo.com");
    expect(reg.usuario["rol"]).toBe("cliente");
    const login = await api("POST", "/api/auth/login", { identificador: "ANA@correo.com", contrasena: "clave-segura-1" });
    expect(login.status).toBe(200);
    expect(login.json.usuario.rol).toBe("cliente");
    const yo = await api("GET", "/api/auth/yo", undefined, login.json.token);
    expect(yo.json.id).toBe(reg.usuario["id"]);
  });

  it("rechaza identificador duplicado, contraseña corta y credenciales malas (401 genérico)", async () => {
    expect((await api("POST", "/api/auth/registro", { nombre: "Otra", identificador: "ana@correo.com", contrasena: "clave-segura-1", rol: "cliente" })).status).toBe(409);
    expect((await api("POST", "/api/auth/registro", { nombre: "Otra", identificador: "otra@correo.com", contrasena: "corta", rol: "cliente" })).status).toBe(400);
    const mala = await api("POST", "/api/auth/login", { identificador: "ana@correo.com", contrasena: "equivocada" });
    const inexistente = await api("POST", "/api/auth/login", { identificador: "nadie@correo.com", contrasena: "equivocada" });
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(inexistente.json.mensaje).toBe(mala.json.mensaje);
  });

  it("gerencia exige el código del comité (403 si no coincide)", async () => {
    const mal = await api("POST", "/api/auth/registro", { nombre: "Gerente Uno", identificador: "g1@correo.com", contrasena: "clave-segura-1", rol: "gerencia", codigoComite: "no" });
    expect(mal.status).toBe(403);
    await registrar({ nombre: "Gerente", identificador: "g2@correo.com", rol: "gerencia", codigoComite: CODIGO });
  });

  it("normaliza teléfonos a sólo dígitos", () => {
    expect(normalizarIdentificador("5555-1001")).toBe("55551001");
    expect(normalizarIdentificador("+502 5555 1001")).toBe("55551001");
  });
});

describe("autenticación de rutas", () => {
  it("sin token o con token inválido responde 401 NO_AUTENTICADO; /api/salud es pública", async () => {
    expect((await api("GET", "/api/salud")).status).toBe(200);
    const sin = await api("GET", "/api/creditos");
    expect(sin.status).toBe(401);
    expect(sin.json.codigo).toBe("NO_AUTENTICADO");
    expect((await api("GET", "/api/creditos", undefined, "basura")).json.codigo).toBe("NO_AUTENTICADO");
  });

  it("un token manipulado (rol/cuenta alterados) o expirado se rechaza", async () => {
    const g = await registrar({ nombre: "Gerente 3", identificador: "g3@correo.com", rol: "gerencia", codigoComite: CODIGO });
    const c = await registrar({ nombre: "Cliente X", identificador: "cx@correo.com", rol: "cliente" });
    // Se toma la firma del token del cliente y se pega a una carga que dice ser gerencia.
    const [, firmaCliente] = c.token.split(".") as [string, string];
    const cargaFalsa = Buffer.from(JSON.stringify({ sub: g.usuario["id"], rol: "gerencia", iat: 1, exp: 9999999999 })).toString("base64url");
    expect((await api("GET", "/api/gerencia/usuarios", undefined, `${cargaFalsa}.${firmaCliente}`)).status).toBe(401);
    expect(verificarToken(g.token)).not.toBeNull();
    const viejo = crearToken({ id: g.usuario["id"] as string, rol: "gerencia" }, Date.now() - 13 * 3600 * 1000);
    expect(verificarToken(viejo)).toBeNull();
    expect((await api("GET", "/api/gerencia/usuarios", undefined, viejo)).status).toBe(401);
  });
});

describe("alcance de datos por rol", () => {
  it("un usuario cliente nuevo recibe listas vacías (sin datos de ejemplo)", async () => {
    const n = await registrar({ nombre: "Nuevo", identificador: "nuevo@correo.com", rol: "cliente", dpi: "9999999999999" });
    expect(n.usuario["clienteId"]).toBeNull();
    expect((await api("GET", `/api/creditos${F}`, undefined, n.token)).json).toEqual([]);
    expect((await api("GET", "/api/solicitudes", undefined, n.token)).json).toEqual([]);
    const perfil = await api("GET", "/api/mi-perfil", undefined, n.token);
    expect(perfil.json.cliente).toBeNull();
  });

  it("aislamiento: el cliente A (vinculado por DPI) no ve nada del cliente B", async () => {
    const a = await registrar({ nombre: "Ana Lucía", identificador: "ana.lucia@correo.com", rol: "cliente", dpi: "1234567890123" });
    const b = await registrar({ nombre: "Carlos Iván", identificador: "55551002", rol: "cliente", dpi: "1234567890124" });
    expect(a.usuario["clienteId"]).toBe("CL-0001");
    expect(b.usuario["clienteId"]).toBe("CL-0002");

    const creditosA = (await api("GET", `/api/creditos${F}`, undefined, a.token)).json as { id: string }[];
    const creditosB = (await api("GET", `/api/creditos${F}`, undefined, b.token)).json as { id: string }[];
    expect(creditosA.map((c) => c.id)).toEqual(["CV-2026-0001"]);
    expect(creditosB.map((c) => c.id)).toEqual(["CV-2026-0002"]);

    for (const sufijo of ["", "/plan", "/mora", "/pagos", "/deuda-exigible"]) {
      expect((await api("GET", `/api/creditos/CV-2026-0002${sufijo}${F}`, undefined, a.token)).status).toBe(403);
    }
    expect((await api("GET", `/api/creditos/CV-2026-0001/plan${F}`, undefined, a.token)).status).toBe(200);
    expect((await api("GET", "/api/solicitudes", undefined, a.token)).json).toHaveLength(1);
    expect((await api("GET", "/api/solicitudes", undefined, b.token)).json).toHaveLength(0);
    expect((await api("GET", "/api/solicitudes/SOL-0003", undefined, b.token)).status).toBe(403);
    // un cliente no puede cobrar ni ver la cartera
    expect((await api("POST", "/api/pagos", { creditoId: "CV-2026-0001", montoCentavos: 1, claveIdempotencia: "k", fecha: "2026-10-31" }, a.token)).status).toBe(403);
    expect((await api("GET", `/api/cartera/en-riesgo${F}`, undefined, a.token)).status).toBe(403);
  });

  it("el cliente crea su ficha (queda vinculada) y su solicitud se fuerza a su clienteId", async () => {
    const n = await registrar({ nombre: "Sin Ficha", identificador: "sinficha@correo.com", rol: "cliente" });
    const sinFicha = await api("POST", "/api/solicitudes", { clienteId: "CL-0001", montoCentavos: 200000, plazoMeses: 6 }, n.token);
    expect(sinFicha.status).toBe(400);
    const ficha = await api("POST", "/api/clientes", { nombre: "Sin Ficha", dpi: "4444444444444", id: "CL-0001" }, n.token);
    expect(ficha.status).toBe(200);
    expect(ficha.json.id === "CL-0001").toBe(false); // no puede adoptar la ficha de otro
    const sol = await api("POST", "/api/solicitudes", { clienteId: "CL-0001", montoCentavos: 200000, plazoMeses: 6 }, n.token);
    expect(sol.status).toBe(200);
    expect(sol.json.clienteId).toBe(ficha.json.id);
    expect((await api("POST", "/api/clientes", { nombre: "Otra", dpi: "4444444444445" }, n.token)).status).toBe(400);
  });

  it("asesor: sólo su cartera; no evalúa solicitudes; crea clientes con su asesor_id", async () => {
    const as = await registrar({ nombre: "Asesor Nuevo", identificador: "ase@correo.com", rol: "asesor" });
    const asesorId = as.usuario["asesorId"] as string;
    expect(asesorId.startsWith("ASE-")).toBe(true);
    expect((await api("GET", `/api/creditos${F}`, undefined, as.token)).json).toEqual([]);
    const cartera = await api("GET", `/api/cartera/en-riesgo${F}`, undefined, as.token);
    expect(cartera.json.carteraActiva.centavos).toBe(0);
    expect((await api("POST", "/api/solicitudes/SOL-0003/evaluar", { decision: "APRUEBA" }, as.token)).status).toBe(403);
    expect((await api("GET", `/api/creditos/CV-2026-0001${F}`, undefined, as.token)).status).toBe(403);
    const cli = await api("POST", "/api/clientes", { nombre: "Cliente Del Asesor", dpi: "5555555555555" }, as.token);
    expect(cli.json.asesorId).toBe(asesorId);
    expect((await api("POST", "/api/solicitudes", { clienteId: cli.json.id, montoCentavos: 300000, plazoMeses: 6 }, as.token)).status).toBe(200);
    expect((await api("POST", "/api/solicitudes", { clienteId: "CL-0001", montoCentavos: 300000, plazoMeses: 6 }, as.token)).status).toBe(403);
    expect((await api("GET", "/api/solicitudes", undefined, as.token)).json).toHaveLength(1);
  });
});

describe("rutas de gerencia", () => {
  it("cliente y asesor reciben 403 en analítica, bitácora, usuarios, cierres y chat", async () => {
    const c = await registrar({ nombre: "Cliente 403", identificador: "c403@correo.com", rol: "cliente" });
    const a = await registrar({ nombre: "Asesor 403", identificador: "a403@correo.com", rol: "asesor" });
    for (const token of [c.token, a.token]) {
      for (const ruta of ["/api/gerencia/resumen", "/api/gerencia/bitacora", "/api/gerencia/usuarios"]) {
        const r = await api("GET", ruta, undefined, token);
        expect(r.status).toBe(403);
        expect(r.json.codigo).toBe("SIN_PERMISO");
      }
      expect((await api("POST", "/api/cierres/mensual", { fechaCorte: "2026-10-31" }, token)).status).toBe(403);
      expect((await api("POST", "/api/chat", { historial: [] }, token)).status).toBe(403);
    }
  });

  it("gerencia ve todo: resumen, bitácora (con lo ocurrido) y usuarios", async () => {
    const g = await registrar({ nombre: "Gerente Final", identificador: "gf@correo.com", rol: "gerencia", codigoComite: CODIGO });
    expect((await api("GET", `/api/creditos${F}`, undefined, g.token)).json).toHaveLength(2);
    const resumen = await api("GET", `/api/gerencia/resumen${F}`, undefined, g.token);
    expect(resumen.status).toBe(200);
    expect(resumen.json.fechaCorte).toBe("2026-10-31");
    expect(resumen.json.cobrosPorMes).toHaveLength(6);
    expect(resumen.json.conteos.creditosActivos > 0).toBe(true);
    const bit = await api("GET", "/api/gerencia/bitacora?limite=500", undefined, g.token);
    expect((bit.json as { accion: string }[]).some((x) => x.accion === "Registro de cuenta")).toBe(true);
    const usuarios = await api("GET", "/api/gerencia/usuarios", undefined, g.token);
    expect((usuarios.json as unknown[]).length > 5).toBe(true);
    // gerencia evalúa la solicitud de ejemplo
    expect((await api("POST", "/api/solicitudes/SOL-0003/evaluar", { decision: "RECHAZA", motivo: "prueba" }, g.token)).status).toBe(200);
  });
});

describe("fecha de operación", () => {
  it("sin ?fechaCorte= se usa hoy en Guatemala (UTC-6), no una constante", () => {
    expect(fechaHoyGuatemala(new Date("2026-10-15T05:59:00Z"))).toBe("2026-10-14");
    expect(fechaHoyGuatemala(new Date("2026-10-15T06:00:00Z"))).toBe("2026-10-15");
  });
});
