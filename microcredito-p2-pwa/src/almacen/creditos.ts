import type { EstadoCredito } from "../dominio/credito-estado.js";
import type { VersionPoliticaMora } from "../dominio/calculadora-mora.js";
import { obtenerPoliticaMoraPorFecha } from "../dominio/calculadora-mora.js";

export interface Credito {
  id: string;
  clienteNombre: string;
  montoQuetzales: number;
  plazoMeses: number;
  tasaMensual: number;
  politicaMoraVersion: VersionPoliticaMora;
  fechaAprobacion: string;
  cuotasPagadas: number;
  estado: Extract<EstadoCredito, "VIGENTE" | "EN_MORA" | "REESTRUCTURADO" | "CANCELADO">;
}

const CLAVE = "sgmc-creditos";

function leerCreditos(): Credito[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as unknown;
    if (!Array.isArray(datos)) return [];

    return datos.filter((c): c is Partial<Credito> =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as Credito).id === "string" &&
      typeof (c as Credito).clienteNombre === "string" &&
      Number.isFinite((c as Credito).montoQuetzales) &&
      Number.isInteger((c as Credito).plazoMeses) &&
      typeof (c as Credito).tasaMensual === "number" &&
      typeof (c as Credito).fechaAprobacion === "string" &&
      Number.isInteger((c as Credito).cuotasPagadas)
    ).map((c) => ({
      ...c,
      estado: c.estado ?? "VIGENTE",
      politicaMoraVersion: c.politicaMoraVersion ?? obtenerPoliticaMoraPorFecha(c.fechaAprobacion ?? "2026-01-01T00:00:00").version,
    } as Credito));
  } catch {
    return [];
  }
}

export function obtenerCreditos(): Credito[] { return leerCreditos(); }
export function obtenerCreditosDeCliente(nombre: string): Credito[] {
  const normalizado = nombre.trim().toLocaleLowerCase();
  return leerCreditos().filter((c) => c.clienteNombre.toLocaleLowerCase() === normalizado);
}
export function obtenerCreditoPorId(id: string): Credito | undefined { return leerCreditos().find((c) => c.id === id); }
export function guardarCredito(credito: Credito): boolean {
  const actuales = leerCreditos();
  if (actuales.some((c) => c.id === credito.id)) return false;
  actuales.push(credito);
  localStorage.setItem(CLAVE, JSON.stringify(actuales));
  return true;
}
export function actualizarCredito(id: string, cambios: Partial<Credito>): boolean {
  const actuales = leerCreditos();
  let actualizado = false;
  const resultado = actuales.map((c) => {
    if (c.id !== id) return c;
    actualizado = true;
    return { ...c, ...cambios };
  });
  if (actualizado) localStorage.setItem(CLAVE, JSON.stringify(resultado));
  return actualizado;
}
export function registrarCuotaPagada(id: string): boolean {
  const credito = obtenerCreditoPorId(id);
  if (!credito || credito.cuotasPagadas >= credito.plazoMeses) return false;
  const nuevasCuotas = credito.cuotasPagadas + 1;
  return actualizarCredito(id, {
    cuotasPagadas: nuevasCuotas,
    estado: nuevasCuotas >= credito.plazoMeses ? "CANCELADO" : "VIGENTE",
  });
}
export function calcularDiasDeAtraso(credito: Credito): number {
  if (credito.cuotasPagadas >= credito.plazoMeses || credito.estado === "CANCELADO") return 0;
  const aprobacion = new Date(credito.fechaAprobacion);
  if (Number.isNaN(aprobacion.getTime())) return 0;
  const proximaCuota = new Date(aprobacion);
  proximaCuota.setMonth(proximaCuota.getMonth() + credito.cuotasPagadas + 1);
  const hoy = new Date();
  const diffMs = hoy.getTime() - proximaCuota.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, dias);
}
