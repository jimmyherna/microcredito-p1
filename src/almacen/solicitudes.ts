import type { EstadoCredito } from "../dominio/credito-estado.js";

export interface SolicitudCredito {
  id: string;
  clienteNombre: string;
  montoQuetzales: number;
  plazoMeses: number;
  tasaMensual: number;
  estado: EstadoCredito;
  fechaSolicitud: string;
}

const CLAVE = "sgmc-solicitudes";

export function obtenerSolicitudes(): SolicitudCredito[] {
  const crudo = localStorage.getItem(CLAVE);
  return crudo ? (JSON.parse(crudo) as SolicitudCredito[]) : [];
}

export function guardarSolicitud(solicitud: SolicitudCredito): void {
  const actuales = obtenerSolicitudes();
  actuales.push(solicitud);
  localStorage.setItem(CLAVE, JSON.stringify(actuales));
}

export function actualizarEstadoSolicitud(id: string, nuevoEstado: EstadoCredito): void {
  const actuales = obtenerSolicitudes();
  const actualizadas = actuales.map((s) => (s.id === id ? { ...s, estado: nuevoEstado } : s));
  localStorage.setItem(CLAVE, JSON.stringify(actualizadas));
}

export function generarIdSolicitud(): string {
  const año = new Date().getFullYear();
  const aleatorio = Math.floor(1000 + Math.random() * 9000);
  return `CV-${año}-${aleatorio}`;
}