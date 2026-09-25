import type { EstadoCredito } from "../dominio/credito-estado.js";

export interface Solicitud {
  id: string;
  clienteNombre: string;
  montoQuetzales: number;
  plazoMeses: number;
  tasaMensual: number;
  estado: Extract<EstadoCredito, "SOLICITADO" | "APROBADO" | "RECHAZADO" | "ANULADO">;
  fechaSolicitud: string;
}

const CLAVE = "sgmc-solicitudes";

function leerSolicitudes(): Solicitud[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos.filter((s): s is Solicitud =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as Solicitud).id === "string" &&
      typeof (s as Solicitud).clienteNombre === "string" &&
      Number.isFinite((s as Solicitud).montoQuetzales) &&
      Number.isInteger((s as Solicitud).plazoMeses) &&
      typeof (s as Solicitud).tasaMensual === "number" &&
      typeof (s as Solicitud).fechaSolicitud === "string" &&
      ["SOLICITADO", "APROBADO", "RECHAZADO", "ANULADO"].includes((s as Solicitud).estado)
    );
  } catch {
    return [];
  }
}

export function obtenerSolicitudes(): Solicitud[] {
  return leerSolicitudes();
}

export function obtenerSolicitudPorId(id: string): Solicitud | undefined {
  return leerSolicitudes().find((s) => s.id === id);
}

export function guardarSolicitud(solicitud: Solicitud): void {
  const actuales = leerSolicitudes();
  actuales.push(solicitud);
  localStorage.setItem(CLAVE, JSON.stringify(actuales));
}

export function actualizarEstadoSolicitud(
  id: string,
  nuevoEstado: Solicitud["estado"]
): boolean {
  const actuales = leerSolicitudes();
  let actualizada = false;
  const resultado = actuales.map((s) => {
    if (s.id !== id) return s;
    actualizada = true;
    return { ...s, estado: nuevoEstado };
  });

  if (actualizada) localStorage.setItem(CLAVE, JSON.stringify(resultado));
  return actualizada;
}

export function tieneSolicitudPendiente(clienteNombre: string): boolean {
  const nombre = clienteNombre.trim().toLocaleLowerCase();
  return leerSolicitudes().some(
    (s) => s.clienteNombre.toLocaleLowerCase() === nombre && s.estado === "SOLICITADO"
  );
}

let contadorEnMemoria = 0;

export function generarIdSolicitud(): string {
  contadorEnMemoria += 1;
  return `SOL-${Date.now()}-${contadorEnMemoria}`;
}
