import { z } from "zod";
import { DineroSchema } from "./dinero.schema.js";

/**
 * Contrato del recurso Cierre.
 * Corresponde a POST /cierres en docs/api/openapi.yaml.
 *
 * El cierre es idempotente por fecha de corte (seccion 6.9): reejecutar el
 * cierre del mismo dia debe producir el mismo resultado sin duplicar
 * movimientos.
 */
export const TipoCierreSchema = z.enum(["DIARIO", "MENSUAL"]);

export const ComandoCierreSchema = z.object({
  tipo: TipoCierreSchema,
  fechaCorte: z.string().date(),
});

export const CierreSchema = z.object({
  fechaCorte: z.string().date(),
  tipo: TipoCierreSchema,
  carteraActiva: DineroSchema,
  carteraEnRiesgo: DineroSchema,
  porcentajeEnRiesgo: z.number().min(0).max(1),
  dadoPorIncobrableEnPeriodo: DineroSchema,
});

export type TipoCierre = z.infer<typeof TipoCierreSchema>;
export type ComandoCierre = z.infer<typeof ComandoCierreSchema>;
export type Cierre = z.infer<typeof CierreSchema>;
