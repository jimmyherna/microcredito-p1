// Configuración de Vitest (ADITIVA: no cambia ninguna prueba existente).
//
// Problema que resuelve: las pruebas del cargador, del MCP, las evals y las
// Operaciones del Anexo A solo corren si existe CV_DATA_DIR, y Vitest NO lee
// el archivo .env. Sin esto, `npm test` las OMITÍA en silencio (18 pruebas).
//
// Regla: si CV_DATA_DIR ya viene definida (en la terminal o en CI), se respeta
// tal cual. Si no, se usa el paquete canónico del repositorio
// (datos/datos-proyecto-final) SOLO si existe y trae eventos.jsonl; en caso
// contrario no se define nada y esas pruebas se siguen omitiendo como antes.

import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(fileURLToPath(import.meta.url));
const paqueteDelRepo = path.join(raiz, "datos", "datos-proyecto-final");

const cvDataDir =
  process.env["CV_DATA_DIR"] ??
  (existsSync(path.join(paqueteDelRepo, "eventos.jsonl")) ? paqueteDelRepo : undefined);

export default defineConfig({
  test: {
    env: cvDataDir ? { CV_DATA_DIR: cvDataDir } : {},
  },
});
