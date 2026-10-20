export interface PagoPendiente {
  claveIdempotencia: string;
  creditoId: string;
  montoQuetzales: number;
  fechaCaptura: string;
  sincronizado: boolean;
}

const CLAVE = "sgmc-cola-pagos";

function obtenerCola(): PagoPendiente[] {
  const crudo = localStorage.getItem(CLAVE);
  return crudo ? (JSON.parse(crudo) as PagoPendiente[]) : [];
}

function guardarCola(cola: PagoPendiente[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(cola));
}

/**
 * Clave de idempotencia para que, si el usuario pierde señal y reintenta,
 * el mismo pago no se aplique dos veces cuando se sincronice.
 */
export function generarClaveIdempotencia(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function guardarPagoPendiente(pago: PagoPendiente): Promise<void> {
  const cola = obtenerCola();
  if (cola.some((p) => p.claveIdempotencia === pago.claveIdempotencia)) {
    return;
  }
  cola.push(pago);
  guardarCola(cola);
  if (navigator.onLine) {
    await sincronizarPagosPendientes();
  }
}

/**
 * Simula la sincronización contra un backend real: marca como
 * sincronizados los pagos que quedaron pendientes mientras no había señal.
 */
export async function sincronizarPagosPendientes(): Promise<void> {
  const cola = obtenerCola();
  const actualizada = cola.map((p) => (p.sincronizado ? p : { ...p, sincronizado: true }));
  guardarCola(actualizada);
}

export function obtenerPagosPendientes(): PagoPendiente[] {
  return obtenerCola();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void sincronizarPagosPendientes();
  });
}