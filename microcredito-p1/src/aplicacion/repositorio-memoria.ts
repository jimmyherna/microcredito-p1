// Implementación en memoria de RepositorioPuerto. Sirve para dos cosas:
//   1. tests/*.test.ts la usan para poder correr `npm test` sin necesitar
//      una instancia de PostgreSQL levantada — cubre E6 ("pruebas nuevas
//      del cargador y del servidor MCP").
//   2. Es un ejemplo vivo de que los servicios (src/aplicacion/servicio-*.ts)
//      de verdad no dependen de SQL: si mañana el equipo cambia a SQLite o
//      a Prisma, solo se reemplaza esta clase, nunca los servicios.

import type { RepositorioPuerto } from "./repositorio-puerto.js";
import type {
  EstadoSolicitud,
  FilaAsesor,
  FilaBitacora,
  FilaCierre,
  FilaCliente,
  FilaCredito,
  FilaPago,
  FilaPoliticaMora,
  FilaPoliticaCredito,
  FilaSolicitud,
  FilaUsuario,
  FilaUsuarioConHash,
  ParametrosGlobales,
} from "./tipos.js";
import type { EstadoCredito } from "../dominio/credito-estado.js";
import { ErrorAplicacion } from "./tipos.js";

export class RepositorioMemoria implements RepositorioPuerto {
  clientes = new Map<string, FilaCliente>();
  solicitudes = new Map<string, FilaSolicitud>();
  creditos = new Map<string, FilaCredito>();
  pagos = new Map<string, FilaPago>();
  politicas = new Map<string, FilaPoliticaMora>();
  asesores = new Map<string, FilaAsesor>();
  cierres = new Map<string, FilaCierre>();
  usuarios = new Map<string, FilaUsuarioConHash>();
  bitacora: FilaBitacora[] = [];
  parametrosGlobales: ParametrosGlobales = {
    gastoGestionCobro: { monto_centavos: 2500, dia_generacion: 31, aplica_a_politicas: ["POL-2026-10"] },
    reglaIncobrableDias: 120,
    reglaRiesgoDias: 30,
  };

  async obtenerCliente(id: string) {
    return this.clientes.get(id) ?? null;
  }
  async crearCliente(cliente: FilaCliente) {
    this.clientes.set(cliente.id, cliente);
    return cliente;
  }
  async listarClientes() {
    return [...this.clientes.values()];
  }

  async crearSolicitud(solicitud: FilaSolicitud) {
    this.solicitudes.set(solicitud.id, solicitud);
    return solicitud;
  }
  async obtenerSolicitud(id: string) {
    return this.solicitudes.get(id) ?? null;
  }
  async listarSolicitudes() {
    return [...this.solicitudes.values()];
  }
  async actualizarEstadoSolicitud(id: string, estado: EstadoSolicitud, motivo?: string) {
    const actual = this.solicitudes.get(id);
    if (!actual) throw new ErrorAplicacion("SOLICITUD_INEXISTENTE", `No existe la solicitud ${id}`);
    const nueva = { ...actual, estado, motivoDecision: motivo ?? actual.motivoDecision };
    this.solicitudes.set(id, nueva);
    return nueva;
  }

  async obtenerCredito(id: string) {
    return this.creditos.get(id) ?? null;
  }
  async listarCreditos() {
    return [...this.creditos.values()];
  }
  async crearCredito(credito: FilaCredito) {
    this.creditos.set(credito.id, credito);
    return credito;
  }
  async actualizarEstadoCredito(id: string, estado: EstadoCredito) {
    const actual = this.creditos.get(id);
    if (actual) this.creditos.set(id, { ...actual, estado });
  }

  async obtenerPoliticaMora(id: string) {
    return this.politicas.get(id) ?? null;
  }
  async politicaVigenteEn(fecha: string) {
    for (const politica of this.politicas.values()) {
      if (politica.vigenciaDesde && fecha < politica.vigenciaDesde) continue;
      if (politica.vigenciaHasta && fecha > politica.vigenciaHasta) continue;
      return politica;
    }
    throw new ErrorAplicacion("VALIDACION", `No hay política de mora vigente para la fecha ${fecha}`);
  }
  politicasCredito: FilaPoliticaCredito[] = [
    { id: "POLC-2026-01", vigenciaDesde: null, vigenciaHasta: null, tnaMinBps: 2400, tnaMaxBps: 4800, tnaDefectoBps: 3600, montoMinCentavos: 100000, montoMaxCentavos: 2500000, plazoMinMeses: 3, plazoMaxMeses: 24, autor: "Comité de Crédito", motivo: "Rango de razonabilidad inicial." },
  ];
  async politicaCreditoVigenteEn(fecha: string) {
    const p = this.politicasCredito.find((x) => (!x.vigenciaDesde || fecha >= x.vigenciaDesde) && (!x.vigenciaHasta || fecha <= x.vigenciaHasta));
    if (!p) throw new ErrorAplicacion("VALIDACION", `No hay política de crédito vigente para ${fecha}`);
    return p;
  }
  async obtenerParametrosGlobales() {
    return this.parametrosGlobales;
  }

  async listarPagosDeCredito(creditoId: string) {
    return [...this.pagos.values()].filter((p) => p.creditoId === creditoId).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  }
  async existePago(clave: string) {
    return this.pagos.has(clave);
  }
  async registrarPago(pago: FilaPago) {
    if (this.pagos.has(pago.claveIdempotencia)) return { yaExistia: true };
    this.pagos.set(pago.claveIdempotencia, pago);
    return { yaExistia: false };
  }

  async listarPagos(opciones: { desde?: string; hasta?: string; limite?: number } = {}) {
    const filas = [...this.pagos.values()]
      .filter((p) => (!opciones.desde || p.fecha >= opciones.desde) && (!opciones.hasta || p.fecha <= opciones.hasta))
      .sort((a, b) => (a.fecha === b.fecha ? (a.claveIdempotencia < b.claveIdempotencia ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
    return opciones.limite !== undefined ? filas.slice(0, opciones.limite) : filas;
  }

  async listarAsesores() {
    return [...this.asesores.values()];
  }
  async crearAsesor(asesor: FilaAsesor) {
    this.asesores.set(asesor.id, asesor);
    return asesor;
  }

  private sinHash(u: FilaUsuarioConHash): FilaUsuario {
    const { contrasenaHash: _omitido, ...publico } = u;
    return publico;
  }
  async crearUsuario(usuario: FilaUsuarioConHash) {
    for (const u of this.usuarios.values()) {
      if (
        u.identificador === usuario.identificador ||
        (usuario.clienteId && u.clienteId === usuario.clienteId) ||
        (usuario.asesorId && u.asesorId === usuario.asesorId)
      ) {
        throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ya existe una cuenta con ese correo/teléfono o para ese perfil");
      }
    }
    this.usuarios.set(usuario.id, { ...usuario });
    return this.sinHash(usuario);
  }
  async obtenerUsuarioPorIdentificador(identificador: string) {
    for (const u of this.usuarios.values()) if (u.identificador === identificador) return { ...u };
    return null;
  }
  async obtenerUsuario(id: string) {
    const u = this.usuarios.get(id);
    return u ? this.sinHash(u) : null;
  }
  async listarUsuarios() {
    return [...this.usuarios.values()].map((u) => this.sinHash(u));
  }
  async registrarAcceso(usuarioId: string, fechaIso: string) {
    const u = this.usuarios.get(usuarioId);
    if (u) u.ultimoAcceso = fechaIso;
  }
  async vincularClienteAUsuario(usuarioId: string, clienteId: string) {
    const u = this.usuarios.get(usuarioId);
    if (!u) throw new ErrorAplicacion("NO_AUTENTICADO", "Usuario inexistente");
    for (const o of this.usuarios.values()) {
      if (o.id !== usuarioId && o.clienteId === clienteId) throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ese cliente ya está vinculado a otra cuenta");
    }
    u.clienteId = clienteId;
    return this.sinHash(u);
  }
  async vincularAsesorAUsuario(usuarioId: string, asesorId: string) {
    const u = this.usuarios.get(usuarioId);
    if (!u) throw new ErrorAplicacion("NO_AUTENTICADO", "Usuario inexistente");
    for (const o of this.usuarios.values()) {
      if (o.id !== usuarioId && o.asesorId === asesorId) throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ese asesor ya está vinculado a otra cuenta");
    }
    u.asesorId = asesorId;
    return this.sinHash(u);
  }
  private seqBitacora = 0;
  async registrarBitacora(entrada: Omit<FilaBitacora, "id">) {
    this.bitacora.push({ ...entrada, id: ++this.seqBitacora });
  }
  async listarBitacora(limite: number) {
    return [...this.bitacora].reverse().slice(0, limite);
  }

  async guardarCierre(cierre: FilaCierre) {
    this.cierres.set(`${cierre.fechaCorte}|${cierre.tipo}`, cierre);
  }
  async obtenerCierre(fechaCorte: string, tipo: "DIARIO" | "MENSUAL") {
    return this.cierres.get(`${fechaCorte}|${tipo}`) ?? null;
  }
}
