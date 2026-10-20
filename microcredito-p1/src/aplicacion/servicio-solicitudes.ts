import { randomUUID } from "node:crypto";
import type { RepositorioPuerto } from "./repositorio-puerto.js";
import type { FilaCliente, FilaSolicitud } from "./tipos.js";
import { ErrorAplicacion } from "./tipos.js";

const MONTO_MIN_CENTAVOS = 100_000; // Q1,000.00 — ver comentario de solicitud-credito.schema.ts
const MONTO_MAX_CENTAVOS = 2_500_000; // Q25,000.00

export interface DatosNuevoCliente {
  id?: string;
  nombre: string;
  dpi: string;
  direccion?: string;
  telefono?: string;
  municipio?: string;
  fechaAlta: string;
  /** Asesor que da de alta al cliente (queda en clientes.asesor_id). */
  asesorId?: string | null;
}

/** UC1: alta de cliente. En E1 es el primer paso del flujo de Solicitud de crédito, no una pantalla aparte. */
export async function darDeAltaCliente(repo: RepositorioPuerto, datos: DatosNuevoCliente): Promise<FilaCliente> {
  if (!/^[A-Za-z0-9-]{8,20}$/.test(datos.dpi)) {
    throw new ErrorAplicacion("VALIDACION", "El DPI no tiene un formato válido");
  }
  const id = datos.id ?? `CL-${randomUUID().slice(0, 8).toUpperCase()}`;
  const existente = await repo.obtenerCliente(id);
  if (existente) return existente; // idempotente: si ya existe (ej. re-ejecutar el video), no falla
  if ((await repo.listarClientes()).some((c) => c.dpi.toUpperCase() === datos.dpi.toUpperCase())) {
    throw new ErrorAplicacion("VALIDACION", "Ya existe un cliente registrado con ese DPI");
  }
  return repo.crearCliente({
    id,
    nombre: datos.nombre,
    dpi: datos.dpi,
    direccion: datos.direccion ?? datos.municipio ?? null,
    telefono: datos.telefono ?? null,
    municipio: datos.municipio ?? null,
    fechaAlta: datos.fechaAlta,
    asesorId: datos.asesorId ?? null,
  });
}

export interface DatosNuevaSolicitud {
  id?: string;
  clienteId: string;
  montoCentavos: number;
  plazoMeses: number;
  fechaSolicitud: string;
}

/** UC2: solicitar un nuevo crédito. */
export async function solicitarCredito(repo: RepositorioPuerto, datos: DatosNuevaSolicitud): Promise<FilaSolicitud> {
  const cliente = await repo.obtenerCliente(datos.clienteId);
  if (!cliente) throw new ErrorAplicacion("CLIENTE_INEXISTENTE", `No existe el cliente ${datos.clienteId}`);

  if (datos.plazoMeses < 3 || datos.plazoMeses > 24) {
    throw new ErrorAplicacion("VALIDACION", "El plazo debe estar entre 3 y 24 meses");
  }
  if (datos.montoCentavos < MONTO_MIN_CENTAVOS || datos.montoCentavos > MONTO_MAX_CENTAVOS) {
    throw new ErrorAplicacion("VALIDACION", "El monto solicitado debe estar entre Q1,000.00 y Q25,000.00");
  }

  const id = datos.id ?? `SOL-${randomUUID().slice(0, 8).toUpperCase()}`;
  return repo.crearSolicitud({
    id,
    clienteId: datos.clienteId,
    montoCentavos: datos.montoCentavos,
    plazoMeses: datos.plazoMeses,
    estado: "SOLICITADO",
    fechaSolicitud: datos.fechaSolicitud,
    motivoDecision: null,
  });
}

/** UC3: el comité aprueba o rechaza la solicitud. */
export async function evaluarSolicitud(
  repo: RepositorioPuerto,
  solicitudId: string,
  decision: "APRUEBA" | "RECHAZA",
  motivo?: string
): Promise<FilaSolicitud> {
  const solicitud = await repo.obtenerSolicitud(solicitudId);
  if (!solicitud) throw new ErrorAplicacion("SOLICITUD_INEXISTENTE", `No existe la solicitud ${solicitudId}`);
  if (solicitud.estado !== "SOLICITADO") {
    throw new ErrorAplicacion(
      "TRANSICION_INVALIDA",
      `La solicitud ${solicitudId} ya fue evaluada (estado actual: ${solicitud.estado})`
    );
  }
  const nuevoEstado = decision === "APRUEBA" ? "APROBADO" : "RECHAZADO";
  return repo.actualizarEstadoSolicitud(solicitudId, nuevoEstado, motivo);
}
