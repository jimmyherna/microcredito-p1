export interface Credito {
  id: string;
  clienteNombre: string;
  montoQuetzales: number;
  plazoMeses: number;
  tasaMensual: number;
  fechaAprobacion: string; // ISO
  cuotasPagadas: number;
}

const CLAVE = "sgmc-creditos";

export function obtenerCreditos(): Credito[] {
  const crudo = localStorage.getItem(CLAVE);
  return crudo ? (JSON.parse(crudo) as Credito[]) : [];
}

export function obtenerCreditosDeCliente(nombre: string): Credito[] {
  return obtenerCreditos().filter((c) => c.clienteNombre.toLowerCase() === nombre.toLowerCase());
}

export function obtenerCreditoPorId(id: string): Credito | undefined {
  return obtenerCreditos().find((c) => c.id === id);
}

export function guardarCredito(credito: Credito): void {
  const actuales = obtenerCreditos();
  actuales.push(credito);
  localStorage.setItem(CLAVE, JSON.stringify(actuales));
}

export function registrarCuotaPagada(id: string): void {
  const actuales = obtenerCreditos().map((c) =>
    c.id === id ? { ...c, cuotasPagadas: c.cuotasPagadas + 1 } : c
  );
  localStorage.setItem(CLAVE, JSON.stringify(actuales));
}

/** Días de atraso de la próxima cuota no pagada — calculado, nunca hardcodeado. */
export function calcularDiasDeAtraso(credito: Credito): number {
  const aprobacion = new Date(credito.fechaAprobacion);
  const proximaCuota = new Date(aprobacion);
  proximaCuota.setMonth(proximaCuota.getMonth() + credito.cuotasPagadas + 1);

  const hoy = new Date();
  const diffMs = hoy.getTime() - proximaCuota.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, dias);
}