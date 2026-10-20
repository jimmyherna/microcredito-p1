import { z } from "zod";

/**
 * Contrato del recurso Cliente.
 * Corresponde a POST /clientes en docs/api/openapi.yaml.
 */
export const NuevoClienteSchema = z.object({
  nombre: z.string().min(1, "El nombre no puede estar vacio"),
  dpi: z.string().regex(/^[A-Za-z0-9-]{8,20}$/, "El DPI debe tener formato válido (13 dígitos o DPI-FICT-######)"),
  direccion: z.string().min(1, "La direccion no puede estar vacia"),
});

export const ClienteSchema = NuevoClienteSchema.extend({
  id: z.string().min(1),
});

export type NuevoCliente = z.infer<typeof NuevoClienteSchema>;
export type Cliente = z.infer<typeof ClienteSchema>;
