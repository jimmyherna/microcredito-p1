import { z } from "zod";
import { DineroSchema } from "./dinero.schema.js";

/**
 * Contrato del recurso Pago.
 * Corresponde a POST /pagos en docs/api/openapi.yaml.
 *
 * `claveIdempotencia` es obligatoria: reintentar el mismo pago con la
 * misma clave no debe cobrar dos veces (invariante 6.10 del enunciado).
 */
export const NuevoPagoSchema = z.object({
  creditoId: z.string().min(1),
  monto: DineroSchema,
  claveIdempotencia: z.string().min(1, "claveIdempotencia es obligatoria (invariante 6.10)"),
  fecha: z.string().date().optional(),
});

export const RubroPagoSchema = z.enum(["gastos", "interesMoratorio", "interesCorriente", "capital"]);

export const DesgloseAplicacionRubroSchema = z.object({
  rubro: RubroPagoSchema,
  adeudado: DineroSchema,
  aplicado: DineroSchema,
  pendiente: DineroSchema,
});

export const ResultadoPagoSchema = z.object({
  detalle: z.array(DesgloseAplicacionRubroSchema),
  excedente: DineroSchema,
  cuotaSaldada: z.boolean(),
  nuevoEstado: z.string().optional(),
  tramo: z.string().optional(),
});

export type NuevoPago = z.infer<typeof NuevoPagoSchema>;
export type RubroPago = z.infer<typeof RubroPagoSchema>;
export type DesgloseAplicacionRubro = z.infer<typeof DesgloseAplicacionRubroSchema>;
export type ResultadoPago = z.infer<typeof ResultadoPagoSchema>;
