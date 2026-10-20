// Tipos de la capa de aplicación (orquestación). No son el dominio
// (src/dominio/ no cambia) ni el contrato de la API (src/contratos/ no
// cambia): son la forma en que se representan las filas de la base de
// datos y se pasan entre repositorio -> servicios -> API/MCP.

import type { EstadoCredito } from "../dominio/credito-estado.js";

export interface FilaAsesor {
  id: string;
  nombre: string;
}

export interface FilaCliente {
  id: string;
  nombre: string;
  dpi: string;
  telefono: string | null;
  municipio: string | null;
  direccion: string | null;
  fechaAlta: string; // YYYY-MM-DD
  /** Asesor que dio de alta al cliente (null/ausente: paquete canónico o autoalta del propio cliente). */
  asesorId?: string | null;
}

export type Rol = "cliente" | "asesor" | "gerencia";

/** Cuenta de usuario (sin el hash de contraseña). */
export interface FilaUsuario {
  id: string;
  nombre: string;
  /** Correo en minúsculas o teléfono sólo con dígitos (normalizado, único). */
  identificador: string;
  rol: Rol;
  clienteId: string | null;
  asesorId: string | null;
  creadoEn: string; // ISO timestamp
  ultimoAcceso: string | null; // ISO timestamp
}

export interface FilaUsuarioConHash extends FilaUsuario {
  contrasenaHash: string;
}

/** Entrada de la bitácora de actividad (auditoría legible). */
export interface FilaBitacora {
  id: number;
  fecha: string; // ISO timestamp
  usuarioId: string | null;
  usuarioNombre: string;
  rol: string;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: string | null;
}

export type EstadoSolicitud = "SOLICITADO" | "APROBADO" | "RECHAZADO" | "ANULADO";

export interface FilaSolicitud {
  id: string;
  clienteId: string;
  montoCentavos: number;
  plazoMeses: number;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  motivoDecision: string | null;
}

export interface TramoPoliticaMora {
  id: string;
  ini: number;
  fin: number;
  bps: number;
}

export interface DatosPoliticaMora {
  nombre: string;
  tipo: "plana" | "escalonada";
  tna_bps?: number;
  vigencia_otorgamiento: { desde?: string; hasta?: string };
  tramos?: TramoPoliticaMora[];
  autor: string;
  motivo: string;
}

export interface FilaPoliticaMora {
  id: string;
  nombre: string;
  tipo: "plana" | "escalonada";
  tnaBps: number | null;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  baseConteo: 360 | 365;
  datos: DatosPoliticaMora;
}

export interface ParametrosGlobales {
  gastoGestionCobro: { monto_centavos: number; dia_generacion: number; aplica_a_politicas: string[] };
  reglaIncobrableDias: number;
  reglaRiesgoDias: number;
}

export interface FilaCredito {
  id: string;
  clienteId: string;
  asesorId: string | null;
  solicitudId: string | null;
  fechaDesembolso: string; // YYYY-MM-DD
  capitalCentavos: number;
  plazoMeses: number;
  tnaBps: number;
  tasaMensual: number;
  politicaId: string;
  estado: EstadoCredito;
  reestructurado: boolean;
  moneda: "GTQ" | "USD";
}

export interface FilaPago {
  claveIdempotencia: string;
  creditoId: string;
  fecha: string; // YYYY-MM-DD
  montoCentavos: number;
  canal: string | null;
}

export interface FilaCierre {
  fechaCorte: string;
  tipo: "DIARIO" | "MENSUAL";
  carteraActivaCentavos: number;
  carteraEnRiesgoCentavos: number;
  porcentajeEnRiesgo: number;
  incobrablePeriodoCentavos: number;
  desembolsosCentavos: number;
  recuperacionGastosCentavos: number;
  recuperacionInteresMoratorioCentavos: number;
  recuperacionInteresCorrienteCentavos: number;
  recuperacionCapitalCentavos: number;
}

/** Errores de aplicación con código uniforme (E3: "convención uniforme de errores"). */
export class ErrorAplicacion extends Error {
  constructor(
    public readonly codigo:
      | "CREDITO_INEXISTENTE"
      | "CLIENTE_INEXISTENTE"
      | "SOLICITUD_INEXISTENTE"
      | "CUOTA_YA_PAGADA"
      | "CREDITO_INCOBRABLE"
      | "MONTO_NO_EXACTO"
      | "FECHA_INVALIDA"
      | "TRANSICION_INVALIDA"
      | "NO_AUTENTICADO"
      | "CREDENCIALES_INVALIDAS"
      | "SIN_PERMISO"
      | "IDENTIFICADOR_DUPLICADO"
      | "VALIDACION",
    mensaje: string,
    public readonly detalles?: Record<string, unknown>
  ) {
    super(mensaje);
    this.name = "ErrorAplicacion";
  }
}

/** Política de crédito (tasa corriente, monto y plazo): versionada por fecha de otorgamiento (P1 6.3.1). */
export interface FilaPoliticaCredito {
  id: string;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  tnaMinBps: number;
  tnaMaxBps: number;
  tnaDefectoBps: number;
  montoMinCentavos: number;
  montoMaxCentavos: number;
  plazoMinMeses: number;
  plazoMaxMeses: number;
  autor: string;
  motivo: string;
}
