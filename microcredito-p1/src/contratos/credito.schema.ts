import { z } from "zod";
import { DineroSchema } from "./dinero.schema.js";

/**
 * Contrato del recurso Credito.
 * Corresponde a POST /creditos/{id}/desembolsar y GET /creditos/{id}
 * en docs/api/openapi.yaml.
 *
 * IMPORTANTE: estos valores deben mantenerse sincronizados manualmente con
 * los tipos del nucleo de dominio (src/dominio/credito-estado.ts::EstadoCredito
 * y src/dominio/calculadora-mora.ts::TramoMora), ya que Zod no puede derivar
 * un enum en tiempo de ejecucion directamente de un `type` de TypeScript.
 */
export const EstadoCreditoSchema = z.enum([
  "SOLICITADO",
  "APROBADO",
  "RECHAZADO",
  "ANULADO",
  "VIGENTE",
  "EN_MORA",
  "REESTRUCTURADO",
  "CANCELADO",
  "INCOBRABLE",
]);

export const TramoMoraSchema = z.enum(["AL_DIA", "MORA_1", "MORA_2", "MORA_3", "VENCIDO", "INCOBRABLE"]);

export const CreditoSchema = z.object({
  id: z.string().min(1),
  estado: EstadoCreditoSchema,
  tramo: TramoMoraSchema.optional().describe(
    "Clasificacion derivada de los dias de atraso; NO es el estado (seccion 6.7)."
  ),
  capitalDesembolsado: DineroSchema,
  tasaMensual: z.number().nonnegative(),
  numeroCuotas: z.number().int().positive(),
  politicaVersion: z.string().optional(),
});

export type EstadoCredito = z.infer<typeof EstadoCreditoSchema>;
export type TramoMora = z.infer<typeof TramoMoraSchema>;
export type Credito = z.infer<typeof CreditoSchema>;
