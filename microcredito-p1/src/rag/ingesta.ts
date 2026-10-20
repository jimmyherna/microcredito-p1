// Ingesta del corpus (E4). Ejecutar con: npm run ingesta:rag
// Requiere: Ollama corriendo en local con el modelo de embeddings ya
// descargado (`ollama pull nomic-embed-text`), y CV_DATA_DIR apuntando al
// paquete de datos (para encontrar datos/corpus/*.md).
//
// Estrategia de fragmentación (documentar también en el README, lo pide
// E4): por PÁRRAFO (separador "\n\n"), fusionando párrafos consecutivos
// menores a 200 caracteres para no crear fragmentos demasiado pequeños sin
// contexto. Es simple y funciona bien porque el corpus son documentos de
// política cortos y ya estructurados en párrafos temáticos — no hace falta
// un splitter recursivo más sofisticado (LangChain.js) para 7 documentos.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { obtenerPool } from "../persistencia/db.js";
import { obtenerEmbedding, DIMENSION_EMBEDDING } from "./embeddings.js";

function fragmentarPorParrafos(texto: string): string[] {
  const parrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const fragmentos: string[] = [];
  let actual = "";
  for (const parrafo of parrafos) {
    actual = actual ? `${actual}\n\n${parrafo}` : parrafo;
    if (actual.length >= 200) {
      fragmentos.push(actual);
      actual = "";
    }
  }
  if (actual) fragmentos.push(actual);
  return fragmentos;
}

async function main() {
  const dir = process.env.CV_DATA_DIR;
  if (!dir) throw new Error("Falta CV_DATA_DIR");
  const carpetaCorpus = path.join(dir, "corpus");
  const archivos = await readdir(carpetaCorpus);

  await obtenerPool().query(
    `-- eslint-disable-next-line
     SELECT 1` // noop, solo confirma conexión antes de truncar
  );
  await obtenerPool().query("DELETE FROM rag_fragmentos"); // re-ingesta idempotente: se reemplaza todo

  let total = 0;
  for (const archivo of archivos) {
    if (!archivo.endsWith(".md")) continue;
    const contenido = await readFile(path.join(carpetaCorpus, archivo), "utf-8");
    const fragmentos = fragmentarPorParrafos(contenido);

    for (let i = 0; i < fragmentos.length; i++) {
      const embedding = await obtenerEmbedding(fragmentos[i]!);
      await obtenerPool().query(
        `INSERT INTO rag_fragmentos (documento, indice, contenido, embedding) VALUES ($1, $2, $3, $4)
         ON CONFLICT (documento, indice) DO UPDATE SET contenido = EXCLUDED.contenido, embedding = EXCLUDED.embedding`,
        [archivo, i, fragmentos[i], `[${embedding.join(",")}]`]
      );
      total++;
    }
    console.log(`✓ ${archivo}: ${fragmentos.length} fragmentos`);
  }

  console.log(`\nListo. ${total} fragmentos indexados (dimensión ${DIMENSION_EMBEDDING}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error("✗ Falló la ingesta del RAG:", e instanceof Error ? e.message : e);
  console.error("¿Está Ollama corriendo? ¿Se descargó el modelo con `ollama pull nomic-embed-text`?");
  process.exit(1);
});
