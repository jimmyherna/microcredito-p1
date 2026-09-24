import { z } from "zod";
import { DineroSchema } from "./dinero.schema.js";

/**
 * Contrato del recurso Cartera en riesgo.
 * Corresponde a GET /cartera/en-riesgo en docs/api/openapi.yaml (seccion 6.8).
 */
export const CarteraEnRiesgoSchema = z.object({
  fechaCorte: z.string().date(),
  carteraActiva: DineroSchema,
  carteraEnRiesgo: DineroSchema,
  porcentaje: z.number().min(0).max(1),
  creditosEnRiesgo: z.array(z.string()),
});

export type CarteraEnRiesgo = z.infer<typeof CarteraEnRiesgoSchema>;
