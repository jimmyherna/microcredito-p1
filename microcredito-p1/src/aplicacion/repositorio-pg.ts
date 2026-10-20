// Implementación del RepositorioPuerto sobre PostgreSQL (E2). Es el único
// archivo (junto con persistencia/db.ts) que conoce SQL. La API (src/api/)
// y el servidor MCP (src/mcp/) nunca escriben SQL directamente: siempre
// pasan por los servicios de src/aplicacion/, que a su vez usan esto.

import { consultar } from "../persistencia/db.js";
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
  FilaSolicitud,
  FilaUsuario,
  FilaUsuarioConHash,
  ParametrosGlobales,
} from "./tipos.js";
import type { EstadoCredito } from "../dominio/credito-estado.js";
import { ErrorAplicacion } from "./tipos.js";

function aFechaIso(valor: unknown): string {
  // node-postgres regresa columnas `date` como objetos Date por defecto;
  // se normaliza siempre a 'YYYY-MM-DD'.
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor);
}

function filaACliente(r: Record<string, unknown>): FilaCliente {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    dpi: r.dpi as string,
    telefono: (r.telefono as string) ?? null,
    municipio: (r.municipio as string) ?? null,
    direccion: (r.direccion as string) ?? null,
    fechaAlta: aFechaIso(r.fecha_alta),
    asesorId: (r.asesor_id as string) ?? null,
  };
}

function aIso(valor: unknown): string {
  return valor instanceof Date ? valor.toISOString() : String(valor);
}

function filaAUsuario(r: Record<string, unknown>): FilaUsuario {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    identificador: r.identificador as string,
    rol: r.rol as FilaUsuario["rol"],
    clienteId: (r.cliente_id as string) ?? null,
    asesorId: (r.asesor_id as string) ?? null,
    creadoEn: aIso(r.creado_en),
    ultimoAcceso: r.ultimo_acceso ? aIso(r.ultimo_acceso) : null,
  };
}

function esViolacionUnica(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function filaACredito(r: Record<string, unknown>): FilaCredito {
  return {
    id: r.id as string,
    clienteId: r.cliente_id as string,
    asesorId: (r.asesor_id as string) ?? null,
    solicitudId: (r.solicitud_id as string) ?? null,
    fechaDesembolso: aFechaIso(r.fecha_desembolso),
    capitalCentavos: Number(r.capital_centavos),
    plazoMeses: Number(r.plazo_meses),
    tnaBps: Number(r.tna_bps),
    tasaMensual: Number(r.tasa_mensual),
    politicaId: r.politica_id as string,
    estado: r.estado as EstadoCredito,
    reestructurado: Boolean(r.reestructurado),
    moneda: r.moneda as "GTQ" | "USD",
  };
}

function filaAPago(r: Record<string, unknown>): FilaPago {
  return {
    claveIdempotencia: r.clave_idempotencia as string,
    creditoId: r.credito_id as string,
    fecha: aFechaIso(r.fecha),
    montoCentavos: Number(r.monto_centavos),
    canal: (r.canal as string) ?? null,
  };
}

function filaAPolitica(r: Record<string, unknown>): FilaPoliticaMora {
  return {
    id: r.id as string,
    nombre: r.nombre as string,
    tipo: r.tipo as "plana" | "escalonada",
    tnaBps: r.tna_bps === null ? null : Number(r.tna_bps),
    vigenciaDesde: r.vigencia_desde ? aFechaIso(r.vigencia_desde) : null,
    vigenciaHasta: r.vigencia_hasta ? aFechaIso(r.vigencia_hasta) : null,
    baseConteo: Number(r.base_conteo) as 360 | 365,
    datos: r.datos as FilaPoliticaMora["datos"],
  };
}

function filaASolicitud(r: Record<string, unknown>): FilaSolicitud {
  return {
    id: r.id as string,
    clienteId: r.cliente_id as string,
    montoCentavos: Number(r.monto_centavos),
    plazoMeses: Number(r.plazo_meses),
    estado: r.estado as EstadoSolicitud,
    fechaSolicitud: aFechaIso(r.fecha_solicitud),
    motivoDecision: (r.motivo_decision as string) ?? null,
  };
}

export const repositorioPg: RepositorioPuerto = {
  async obtenerCliente(id) {
    const filas = await consultar("SELECT * FROM clientes WHERE id = $1", [id]);
    return filas[0] ? filaACliente(filas[0]) : null;
  },

  async crearCliente(cliente) {
    const filas = await consultar(
      `INSERT INTO clientes (id, nombre, dpi, telefono, municipio, direccion, fecha_alta, asesor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cliente.id, cliente.nombre, cliente.dpi, cliente.telefono, cliente.municipio, cliente.direccion, cliente.fechaAlta, cliente.asesorId ?? null]
    );
    return filaACliente(filas[0]!);
  },

  async listarClientes() {
    const filas = await consultar("SELECT * FROM clientes ORDER BY id");
    return filas.map(filaACliente);
  },

  async crearSolicitud(solicitud) {
    const filas = await consultar(
      `INSERT INTO solicitudes_credito (id, cliente_id, monto_centavos, plazo_meses, estado, fecha_solicitud)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [solicitud.id, solicitud.clienteId, solicitud.montoCentavos, solicitud.plazoMeses, solicitud.estado, solicitud.fechaSolicitud]
    );
    return filaASolicitud(filas[0]!);
  },

  async obtenerSolicitud(id) {
    const filas = await consultar("SELECT * FROM solicitudes_credito WHERE id = $1", [id]);
    return filas[0] ? filaASolicitud(filas[0]) : null;
  },

  async listarSolicitudes() {
    const filas = await consultar("SELECT * FROM solicitudes_credito ORDER BY fecha_solicitud DESC");
    return filas.map(filaASolicitud);
  },

  async actualizarEstadoSolicitud(id, estado, motivo) {
    const filas = await consultar(
      `UPDATE solicitudes_credito SET estado = $2, motivo_decision = $3 WHERE id = $1 RETURNING *`,
      [id, estado, motivo ?? null]
    );
    if (!filas[0]) throw new ErrorAplicacion("SOLICITUD_INEXISTENTE", `No existe la solicitud ${id}`);
    return filaASolicitud(filas[0]);
  },

  async obtenerCredito(id) {
    const filas = await consultar("SELECT * FROM creditos WHERE id = $1", [id]);
    return filas[0] ? filaACredito(filas[0]) : null;
  },

  async listarCreditos() {
    const filas = await consultar("SELECT * FROM creditos ORDER BY id");
    return filas.map(filaACredito);
  },

  async crearCredito(credito) {
    const filas = await consultar(
      `INSERT INTO creditos (id, cliente_id, asesor_id, solicitud_id, fecha_desembolso, capital_centavos,
         plazo_meses, tna_bps, tasa_mensual, politica_id, estado, reestructurado, moneda)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        credito.id,
        credito.clienteId,
        credito.asesorId,
        credito.solicitudId,
        credito.fechaDesembolso,
        credito.capitalCentavos,
        credito.plazoMeses,
        credito.tnaBps,
        credito.tasaMensual,
        credito.politicaId,
        credito.estado,
        credito.reestructurado,
        credito.moneda,
      ]
    );
    return filaACredito(filas[0]!);
  },

  async actualizarEstadoCredito(id, estado) {
    await consultar("UPDATE creditos SET estado = $2 WHERE id = $1", [id, estado]);
  },

  async obtenerPoliticaMora(id) {
    const filas = await consultar("SELECT * FROM politicas_mora WHERE id = $1", [id]);
    return filas[0] ? filaAPolitica(filas[0]) : null;
  },

  async politicaVigenteEn(fecha) {
    const filas = await consultar(
      `SELECT * FROM politicas_mora
       WHERE (vigencia_desde IS NULL OR vigencia_desde <= $1)
         AND (vigencia_hasta IS NULL OR vigencia_hasta >= $1)
       LIMIT 1`,
      [fecha]
    );
    if (!filas[0]) throw new ErrorAplicacion("VALIDACION", `No hay política de mora vigente para la fecha ${fecha}`);
    return filaAPolitica(filas[0]);
  },

  async politicaCreditoVigenteEn(fecha) {
    const filas = await consultar(
      `SELECT * FROM politicas_credito
       WHERE (vigencia_desde IS NULL OR vigencia_desde <= $1) AND (vigencia_hasta IS NULL OR vigencia_hasta >= $1)
       ORDER BY vigencia_desde DESC NULLS LAST LIMIT 1`,
      [fecha]
    );
    const r: any = filas[0];
    if (!r) throw new ErrorAplicacion("VALIDACION", `No hay política de crédito vigente para ${fecha}`);
    return {
      id: r.id,
      vigenciaDesde: r.vigencia_desde ? String(r.vigencia_desde).slice(0, 10) : null,
      vigenciaHasta: r.vigencia_hasta ? String(r.vigencia_hasta).slice(0, 10) : null,
      tnaMinBps: Number(r.tna_min_bps),
      tnaMaxBps: Number(r.tna_max_bps),
      tnaDefectoBps: Number(r.tna_defecto_bps),
      montoMinCentavos: Number(r.monto_min_centavos),
      montoMaxCentavos: Number(r.monto_max_centavos),
      plazoMinMeses: Number(r.plazo_min_meses),
      plazoMaxMeses: Number(r.plazo_max_meses),
      autor: r.autor,
      motivo: r.motivo,
    };
  },

  async obtenerParametrosGlobales() {
    const filas = await consultar("SELECT clave, valor FROM parametros_globales");
    const mapa = Object.fromEntries(filas.map((f: any) => [f.clave, f.valor]));
    return {
      gastoGestionCobro: mapa.gasto_gestion_cobro,
      reglaIncobrableDias: mapa.regla_incobrable_dias,
      reglaRiesgoDias: mapa.regla_riesgo_dias,
    } as ParametrosGlobales;
  },

  async listarPagosDeCredito(creditoId) {
    const filas = await consultar("SELECT * FROM pagos WHERE credito_id = $1 ORDER BY fecha, clave_idempotencia", [creditoId]);
    return filas.map(filaAPago);
  },

  async existePago(claveIdempotencia) {
    const filas = await consultar("SELECT 1 FROM pagos WHERE clave_idempotencia = $1", [claveIdempotencia]);
    return filas.length > 0;
  },

  async registrarPago(pago) {
    const filas = await consultar(
      `INSERT INTO pagos (clave_idempotencia, credito_id, fecha, monto_centavos, canal)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (clave_idempotencia) DO NOTHING
       RETURNING clave_idempotencia`,
      [pago.claveIdempotencia, pago.creditoId, pago.fecha, pago.montoCentavos, pago.canal]
    );
    return { yaExistia: filas.length === 0 };
  },

  async listarPagos(opciones = {}) {
    const filas = await consultar(
      `SELECT * FROM pagos
       WHERE ($1::date IS NULL OR fecha >= $1::date) AND ($2::date IS NULL OR fecha <= $2::date)
       ORDER BY fecha DESC, creado_en DESC, clave_idempotencia DESC
       LIMIT $3`,
      [opciones.desde ?? null, opciones.hasta ?? null, opciones.limite ?? null]
    );
    return filas.map(filaAPago);
  },

  async listarAsesores() {
    const filas = await consultar("SELECT * FROM asesores ORDER BY id");
    return filas.map((r: any) => ({ id: r.id, nombre: r.nombre })) as FilaAsesor[];
  },

  async crearAsesor(asesor) {
    await consultar("INSERT INTO asesores (id, nombre) VALUES ($1,$2)", [asesor.id, asesor.nombre]);
    return asesor;
  },

  async crearUsuario(usuario) {
    try {
      const filas = await consultar(
        `INSERT INTO usuarios (id, nombre, identificador, contrasena_hash, rol, cliente_id, asesor_id, creado_en, ultimo_acceso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [usuario.id, usuario.nombre, usuario.identificador, usuario.contrasenaHash, usuario.rol, usuario.clienteId, usuario.asesorId, usuario.creadoEn, usuario.ultimoAcceso]
      );
      return filaAUsuario(filas[0]!);
    } catch (e) {
      if (esViolacionUnica(e)) throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ya existe una cuenta con ese correo/teléfono o para ese perfil");
      throw e;
    }
  },

  async obtenerUsuarioPorIdentificador(identificador) {
    const filas = await consultar("SELECT * FROM usuarios WHERE identificador = $1", [identificador]);
    const r = filas[0];
    return r ? { ...filaAUsuario(r), contrasenaHash: r.contrasena_hash as string } : null;
  },

  async obtenerUsuario(id) {
    const filas = await consultar("SELECT * FROM usuarios WHERE id = $1", [id]);
    return filas[0] ? filaAUsuario(filas[0]) : null;
  },

  async listarUsuarios() {
    const filas = await consultar("SELECT * FROM usuarios ORDER BY creado_en, id");
    return filas.map(filaAUsuario);
  },

  async registrarAcceso(usuarioId, fechaIso) {
    await consultar("UPDATE usuarios SET ultimo_acceso = $2 WHERE id = $1", [usuarioId, fechaIso]);
  },

  async vincularClienteAUsuario(usuarioId, clienteId) {
    try {
      const filas = await consultar("UPDATE usuarios SET cliente_id = $2 WHERE id = $1 RETURNING *", [usuarioId, clienteId]);
      if (!filas[0]) throw new ErrorAplicacion("NO_AUTENTICADO", "Usuario inexistente");
      return filaAUsuario(filas[0]);
    } catch (e) {
      if (esViolacionUnica(e)) throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ese cliente ya está vinculado a otra cuenta");
      throw e;
    }
  },

  async vincularAsesorAUsuario(usuarioId, asesorId) {
    try {
      const filas = await consultar("UPDATE usuarios SET asesor_id = $2 WHERE id = $1 RETURNING *", [usuarioId, asesorId]);
      if (!filas[0]) throw new ErrorAplicacion("NO_AUTENTICADO", "Usuario inexistente");
      return filaAUsuario(filas[0]);
    } catch (e) {
      if (esViolacionUnica(e)) throw new ErrorAplicacion("IDENTIFICADOR_DUPLICADO", "Ese asesor ya está vinculado a otra cuenta");
      throw e;
    }
  },

  async registrarBitacora(e) {
    await consultar(
      `INSERT INTO bitacora (fecha, usuario_id, usuario_nombre, rol, accion, entidad, entidad_id, detalle)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [e.fecha, e.usuarioId, e.usuarioNombre, e.rol, e.accion, e.entidad, e.entidadId, e.detalle]
    );
  },

  async listarBitacora(limite) {
    const filas = await consultar("SELECT * FROM bitacora ORDER BY fecha DESC, id DESC LIMIT $1", [limite]);
    return filas.map(
      (r: any): FilaBitacora => ({
        id: Number(r.id),
        fecha: aIso(r.fecha),
        usuarioId: r.usuario_id ?? null,
        usuarioNombre: r.usuario_nombre,
        rol: r.rol,
        accion: r.accion,
        entidad: r.entidad ?? null,
        entidadId: r.entidad_id ?? null,
        detalle: r.detalle ?? null,
      })
    );
  },

  async guardarCierre(cierre) {
    await consultar(
      `INSERT INTO cierres (fecha_corte, tipo, cartera_activa_centavos, cartera_en_riesgo_centavos,
         porcentaje_en_riesgo, incobrable_periodo_centavos, desembolsos_centavos,
         recuperacion_gastos_centavos, recuperacion_interes_moratorio_centavos,
         recuperacion_interes_corriente_centavos, recuperacion_capital_centavos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (fecha_corte, tipo) DO UPDATE SET
         cartera_activa_centavos = EXCLUDED.cartera_activa_centavos,
         cartera_en_riesgo_centavos = EXCLUDED.cartera_en_riesgo_centavos,
         porcentaje_en_riesgo = EXCLUDED.porcentaje_en_riesgo,
         incobrable_periodo_centavos = EXCLUDED.incobrable_periodo_centavos,
         desembolsos_centavos = EXCLUDED.desembolsos_centavos,
         recuperacion_gastos_centavos = EXCLUDED.recuperacion_gastos_centavos,
         recuperacion_interes_moratorio_centavos = EXCLUDED.recuperacion_interes_moratorio_centavos,
         recuperacion_interes_corriente_centavos = EXCLUDED.recuperacion_interes_corriente_centavos,
         recuperacion_capital_centavos = EXCLUDED.recuperacion_capital_centavos`,
      [
        cierre.fechaCorte,
        cierre.tipo,
        cierre.carteraActivaCentavos,
        cierre.carteraEnRiesgoCentavos,
        cierre.porcentajeEnRiesgo,
        cierre.incobrablePeriodoCentavos,
        cierre.desembolsosCentavos,
        cierre.recuperacionGastosCentavos,
        cierre.recuperacionInteresMoratorioCentavos,
        cierre.recuperacionInteresCorrienteCentavos,
        cierre.recuperacionCapitalCentavos,
      ]
    );
  },

  async obtenerCierre(fechaCorte, tipo) {
    const filas = await consultar("SELECT * FROM cierres WHERE fecha_corte = $1 AND tipo = $2", [fechaCorte, tipo]);
    const r = filas[0] as any;
    if (!r) return null;
    return {
      fechaCorte: aFechaIso(r.fecha_corte),
      tipo: r.tipo,
      carteraActivaCentavos: Number(r.cartera_activa_centavos),
      carteraEnRiesgoCentavos: Number(r.cartera_en_riesgo_centavos),
      porcentajeEnRiesgo: Number(r.porcentaje_en_riesgo),
      incobrablePeriodoCentavos: Number(r.incobrable_periodo_centavos),
      desembolsosCentavos: Number(r.desembolsos_centavos),
      recuperacionGastosCentavos: Number(r.recuperacion_gastos_centavos),
      recuperacionInteresMoratorioCentavos: Number(r.recuperacion_interes_moratorio_centavos),
      recuperacionInteresCorrienteCentavos: Number(r.recuperacion_interes_corriente_centavos),
      recuperacionCapitalCentavos: Number(r.recuperacion_capital_centavos),
    } as FilaCierre;
  },
};
