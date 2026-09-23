export interface PagoPendiente {
  claveIdempotencia: string;
  creditoId: string;
  montoQuetzales: number;
  fechaCaptura: string;
  sincronizado: boolean;
}

const NOMBRE_DB = "sgmc-offline";
const NOMBRE_STORE = "pagosPendientes";

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, rechazar) => {
    const solicitud = indexedDB.open(NOMBRE_DB, 1);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(NOMBRE_STORE)) {
        db.createObjectStore(NOMBRE_STORE, { keyPath: "claveIdempotencia" });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

export async function guardarPagoPendiente(pago: PagoPendiente): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, rechazar) => {
    const tx = db.transaction(NOMBRE_STORE, "readwrite");
    tx.objectStore(NOMBRE_STORE).put(pago);
    tx.oncomplete = () => resolve();
    tx.onerror = () => rechazar(tx.error);
  });
}

export async function obtenerPagosPendientes(): Promise<PagoPendiente[]> {
  const db = await abrirDB();
  return new Promise((resolve, rechazar) => {
    const tx = db.transaction(NOMBRE_STORE, "readonly");
    const solicitud = tx.objectStore(NOMBRE_STORE).getAll();
    solicitud.onsuccess = () => resolve(solicitud.result as PagoPendiente[]);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

export function generarClaveIdempotencia(): string {
  return crypto.randomUUID();
}