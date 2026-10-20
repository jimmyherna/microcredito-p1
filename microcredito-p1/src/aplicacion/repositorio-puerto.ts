// Puerto (interfaz) de repositorio. Los servicios (servicio-*.ts) dependen
// SOLO de esta interfaz, nunca de `pg` directamente. Esto permite dos
// implementaciones intercambiables:
//   - repositorio-pg.ts     -> PostgreSQL real (E2), usada por la API y el MCP.
//   - repositorio-memoria.ts -> en memoria, usada por tests/*.test.ts para
//     poder correr `npm test` sin necesitar una base de datos levantada.

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

export interface RepositorioPuerto {
  // Clientes
  obtenerCliente(id: string): Promise<FilaCliente | null>;
  crearCliente(cliente: FilaCliente): Promise<FilaCliente>;
  listarClientes(): Promise<FilaCliente[]>;

  // Solicitudes
  crearSolicitud(solicitud: FilaSolicitud): Promise<FilaSolicitud>;
  obtenerSolicitud(id: string): Promise<FilaSolicitud | null>;
  listarSolicitudes(): Promise<FilaSolicitud[]>;
  actualizarEstadoSolicitud(id: string, estado: EstadoSolicitud, motivo?: string): Promise<FilaSolicitud>;

  // Créditos
  obtenerCredito(id: string): Promise<FilaCredito | null>;
  listarCreditos(): Promise<FilaCredito[]>;
  crearCredito(credito: FilaCredito): Promise<FilaCredito>;
  actualizarEstadoCredito(id: string, estado: EstadoCredito): Promise<void>;

  // Políticas y parámetros
  obtenerPoliticaMora(id: string): Promise<FilaPoliticaMora | null>;
  politicaVigenteEn(fechaOtorgamiento: string): Promise<FilaPoliticaMora>;
  politicaCreditoVigenteEn(fechaOtorgamiento: string): Promise<FilaPoliticaCredito>;
  obtenerParametrosGlobales(): Promise<ParametrosGlobales>;

  // Pagos
  listarPagosDeCredito(creditoId: string): Promise<FilaPago[]>;
  existePago(claveIdempotencia: string): Promise<boolean>;
  /** Devuelve { yaExistia: true } si la clave ya estaba registrada (invariante 6.10) y NO inserta de nuevo. */
  registrarPago(pago: FilaPago): Promise<{ yaExistia: boolean }>;

  /** Pagos más recientes primero (fecha desc). Filtros opcionales por rango de fecha (inclusive) y límite. */
  listarPagos(opciones?: { desde?: string; hasta?: string; limite?: number }): Promise<FilaPago[]>;

  // Asesores
  listarAsesores(): Promise<FilaAsesor[]>;
  crearAsesor(asesor: FilaAsesor): Promise<FilaAsesor>;

  // Usuarios y bitácora (autenticación y auditoría)
  /** Lanza ErrorAplicacion("IDENTIFICADOR_DUPLICADO") si el identificador (o el cliente/asesor vinculado) ya tiene cuenta. */
  crearUsuario(usuario: FilaUsuarioConHash): Promise<FilaUsuario>;
  obtenerUsuarioPorIdentificador(identificador: string): Promise<FilaUsuarioConHash | null>;
  obtenerUsuario(id: string): Promise<FilaUsuario | null>;
  listarUsuarios(): Promise<FilaUsuario[]>;
  registrarAcceso(usuarioId: string, fechaIso: string): Promise<void>;
  vincularClienteAUsuario(usuarioId: string, clienteId: string): Promise<FilaUsuario>;
  vincularAsesorAUsuario(usuarioId: string, asesorId: string): Promise<FilaUsuario>;
  registrarBitacora(entrada: Omit<FilaBitacora, "id">): Promise<void>;
  /** Más recientes primero. */
  listarBitacora(limite: number): Promise<FilaBitacora[]>;

  // Cierres
  guardarCierre(cierre: FilaCierre): Promise<void>;
  obtenerCierre(fechaCorte: string, tipo: "DIARIO" | "MENSUAL"): Promise<FilaCierre | null>;
}
