import { z } from "zod";
import { DineroSchema } from "./dinero.schema.js";

/**
 * Contrato del recurso SolicitudCredito.
 * Corresponde a POST /solicitudes y POST /solicitudes/{id}/evaluar
 * en docs/api/openapi.yaml.
 *
 * Rango de montos y plazos tomado de la seccion 2 del enunciado:
 * Credito Vecino coloca creditos entre Q1,000 y Q25,000, con plazos
 * de 3 a 24 meses.
 */
export const NuevaSolicitudCreditoSchema = z.object({
  clienteId: z.string().min(1),
  montoSolicitado: DineroSchema,
  plazoMeses: z.number().int().min(3).max(24),
});

export const EstadoSolicitudSchema = z.enum(["SOLICITADO", "APROBADO", "RECHAZADO", "ANULADO"]);

export const SolicitudCreditoSchema = NuevaSolicitudCreditoSchema.extend({
  id: z.string().min(1),
  estado: EstadoSolicitudSchema,
  fechaSolicitud: z.string().date(), // formato YYYY-MM-DD (OpenAPI: format date)
});

export const DecisionComiteSchema = z.object({
  decision: z.enum(["APRUEBA", "RECHAZA"]),
  motivo: z.string().optional(),
});

export type NuevaSolicitudCredito = z.infer<typeof NuevaSolicitudCreditoSchema>;
export type SolicitudCredito = z.infer<typeof SolicitudCreditoSchema>;
export type DecisionComite = z.infer<typeof DecisionComiteSchema>;
export type EstadoSolicitud = z.infer<typeof EstadoSolicitudSchema>;
