import { z } from "zod";

/**
 * Esquema Zod de Dinero (contrato de la API).
 *
 * Corresponde al componente "Dinero" del openapi.yaml (docs/api/openapi.yaml).
 * `centavos` es la fuente de verdad (entero, seccion 6.2 del enunciado);
 * `monto` es un campo derivado de solo lectura, provisto por conveniencia
 * para quien consuma la API sin tener que dividir por 100 manualmente.
 *
 * Este mismo esquema es el que, en el Proyecto Final, define tambien el
 * esquema de las herramientas del servidor MCP (nota 8.2 del enunciado):
 * se escribe una vez y sirve tres veces.
 */
export const CodigoMonedaSchema = z.enum(["GTQ", "USD"]);

export const DineroSchema = z.object({
  centavos: z.number().int({ message: "centavos debe ser un entero (nunca punto flotante fraccionario)" }),
  moneda: CodigoMonedaSchema,
  // Derivado de centavos / 100; se acepta en la entrada solo para no romper
  // clientes que lo envien, pero el servidor SIEMPRE recalcula desde centavos.
  monto: z.number().optional(),
});

export type Dinero = z.infer<typeof DineroSchema>;
export type CodigoMoneda = z.infer<typeof CodigoMonedaSchema>;

/**
 * Esquema uniforme de error (component "Error" del openapi.yaml).
 * Usado por todos los recursos: ErrorValidacion (400), NoEncontrado (404),
 * TransicionInvalida (409).
 */
export const ErrorApiSchema = z.object({
  codigo: z.string(),
  mensaje: z.string(),
  detalles: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorApi = z.infer<typeof ErrorApiSchema>;
