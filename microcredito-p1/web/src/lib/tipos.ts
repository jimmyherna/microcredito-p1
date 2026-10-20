import type { Dinero } from "./dinero";

export type Rol = "cliente" | "asesor" | "gerencia";

/** Usuario público que devuelve la API (login, registro, /auth/yo). */
export interface Usuario {
  id: string;
  nombre: string;
  identificador: string;
  rol: Rol;
  clienteId: string | null;
  asesorId: string | null;
}

export interface RespuestaSesion {
  token: string;
  usuario: Usuario;
}

export interface Cliente {
  id: string;
  nombre: string;
  dpi: string;
  telefono?: string | null;
  municipio?: string | null;
  direccion?: string | null;
  fechaAlta: string;
  asesorId?: string | null;
}

export interface MiPerfil {
  usuario: Usuario;
  cliente: Cliente | null;
}

export type EstadoSolicitud = "SOLICITADO" | "APROBADO" | "RECHAZADO" | "ANULADO";

export interface SolicitudConCliente {
  id: string;
  /** Crédito generado al desembolsar esta solicitud (null si aún no se desembolsa). */
  creditoId: string | null;
  clienteNombre: string;
  montoSolicitado: Dinero;
  plazoMeses: number;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
}

export interface SolicitudDetalle extends SolicitudConCliente {
  clienteId: string;
  motivoDecision: string | null;
}

/** Fila de GET /api/creditos. */
export interface FilaCredito {
  id: string;
  clienteNombre: string;
  asesorNombre: string | null;
  estado: string;
  tramo: string;
  saldoCapital: Dinero;
  diasDeAtraso: number;
}

export interface HistorialCobros {
  creditoId: string;
  cobros: { numero: number; fecha: string; monto: Dinero }[];
  totalAbonado: Dinero;
}

export interface CreditoDetalle {
  id: string;
  estado: string;
  tramo: string;
  capitalDesembolsado: Dinero;
  tasaMensual: number;
  numeroCuotas: number;
  saldoCapital: Dinero;
  diasDeAtraso: number;
  cuotasPagadas: number;
  cuotasVencidas: number;
  proximaCuota: { numeroCuota: number; fechaVencimiento: string; monto: Dinero } | null;
}

export interface FilaPlan {
  numeroCuota: number;
  fechaVencimiento: string;
  cuota: Dinero;
  capital: Dinero;
  interes: Dinero;
  capitalPagado: Dinero;
  saldada: boolean;
}

export interface RespuestaPlan {
  creditoId: string;
  ultimaCuotaAjustada: boolean;
  cuotaRegular: Dinero | null;
  cuotaFinal: Dinero | null;
  filas: FilaPlan[];
}

export interface DesgloseTramo {
  tramo: string;
  dias: number;
  tasaAnual: number;
  monto: Dinero;
}

export interface DeudaExigible {
  creditoId: string;
  fechaCorte: string;
  cuotaExigible: { numeroCuota: number; fechaVencimiento: string; monto: Dinero } | null;
  gastos: Dinero;
  interesMoratorio: Dinero;
  interesCorriente: Dinero;
  capital: Dinero;
  totalExigible: Dinero;
}

export interface DetalleMora {
  creditoId: string;
  fechaCorte: string;
  diasDeAtraso: number;
  tramoActual: string;
  capitalEnMora: Dinero;
  desglosePorTramo: DesgloseTramo[];
  totalInteresMoratorio: Dinero;
}

export interface DesgloseRubro {
  rubro: string;
  adeudado: Dinero;
  aplicado: Dinero;
  pendiente: Dinero;
}

export interface PrevisualizacionPago {
  creditoId: string;
  fechaCorte: string;
  desglose: { gastos: Dinero; interesMoratorio: Dinero; interesCorriente: Dinero; capital: Dinero };
  montoExigibleCentavos: number;
}

export interface ResultadoPago {
  detalle: DesgloseRubro[];
  excedente: Dinero;
  cuotaSaldada: boolean;
  nuevoEstado: string;
  tramo: string;
  yaAplicado: boolean;
}

export interface FilaCarteraPorTramo {
  tramo: string;
  creditos: string[];
  saldoCapital: Dinero;
  porcentaje: number;
}

export interface CarteraEnRiesgo {
  fechaCorte: string;
  carteraActiva: Dinero;
  carteraEnMora: Dinero;
  carteraEnRiesgo: Dinero;
  /** Fracción 0–1. */
  porcentaje: number;
  creditosEnRiesgo: string[];
  filasPorTramo: FilaCarteraPorTramo[];
  dadoPorIncobrableEnPeriodo: Dinero;
}

export interface CreditoEnMora {
  creditoId: string;
  clienteId: string;
  diasDeAtraso: number;
  tramo: string;
  saldo: Dinero;
}

export interface Vencimientos {
  ventanaDias: number;
  totalCuotas: number;
  montoTotal: Dinero;
  cuotas: { creditoId: string; numeroCuota: number; fechaVencimiento: string; monto: Dinero }[];
}

export interface Cierre {
  fechaCorte: string;
  tipo: "DIARIO" | "MENSUAL";
  /** El backend devuelve FilaCierre con campos *Centavos (ver servicio-cierre.ts). */
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

export interface MensajeChat {
  id: string;
  autor: "usuario" | "asistente";
  texto: string;
  citas?: { documento: string }[];
  requiereAprobacion?: { creditoId: string; montoCentavos: number; descripcion: string };
}

export interface FilaPlanSimulado {
  numeroCuota: number;
  cuota: Dinero;
  capital: Dinero;
  interes: Dinero;
}

export interface PoliticaCredito {
  id: string;
  tnaMinBps: number;
  tnaMaxBps: number;
  tnaDefectoBps: number;
  montoMinCentavos: number;
  montoMaxCentavos: number;
  plazoMinMeses: number;
  plazoMaxMeses: number;
}

export interface Asesor {
  id: string;
  nombre: string;
}

export interface ResumenGerencial {
  fechaCorte: string;
  conteos: {
    clientes: number;
    asesores: number;
    usuarios: number;
    creditosActivos: number;
    creditosEnMora: number;
    solicitudesPendientes: number;
  };
  solicitudesPorEstado: { estado: EstadoSolicitud; cantidad: number }[];
  porAsesor: {
    asesorId: string;
    nombre: string;
    creditos: number;
    carteraActiva: Dinero;
    carteraEnRiesgo: Dinero;
    /** Fracción 0–1. */
    porcentajeRiesgo: number;
    solicitudesPendientes: number;
  }[];
  cobrosPorMes: { mes: string; total: Dinero; pagos: number }[];
  pagosRecientes: { fecha: string; creditoId: string; clienteNombre: string; monto: Dinero }[];
  vencimientosProximos: { dias: number; cantidad: number; total: Dinero };
}

export interface FilaBitacora {
  id: number;
  fecha: string;
  usuarioNombre: string;
  rol: string;
  accion: string;
  detalle: string | null;
}

export interface FilaUsuario {
  id: string;
  nombre: string;
  identificador: string;
  rol: Rol;
  creadoEn: string;
  ultimoAcceso: string | null;
}

export interface ClienteResumen {
  id: string;
  nombre: string;
  dpiEnmascarado: string;
  telefono: string | null;
  municipio: string | null;
  direccion: string | null;
  fechaAlta: string;
}
