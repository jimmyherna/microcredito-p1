// Punto de entrada unico de los contratos de la API (E5).
// "Un esquema Zod se escribe una vez y sirve tres veces" (nota 8.2 del enunciado):
// 1) valida la entrada/salida de la API, 2) es la fuente de la especificacion
// OpenAPI (docs/api/openapi.yaml), 3) en el Proyecto Final define tambien el
// esquema de las herramientas del servidor MCP.

export * from "./dinero.schema.js";
export * from "./cliente.schema.js";
export * from "./solicitud-credito.schema.js";
export * from "./credito.schema.js";
export * from "./pago.schema.js";
export * from "./cierre.schema.js";
export * from "./cartera-en-riesgo.schema.js";
