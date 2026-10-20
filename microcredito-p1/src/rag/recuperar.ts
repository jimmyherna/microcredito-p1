// Recuperación (E4): dada una pregunta, regresa los fragmentos más
// similares del corpus ya ingerido (ver ingesta.ts), CON su documento de
// origen — es lo que permite citar la fuente (G-8) y lo que hace posible
// tratar el contenido recuperado como DATO (nunca como instrucción) al
// conectarlo con un LLM real (ver la nota de diseño en src/chat/orquestador.ts).

import { consultar } from "../persistencia/db.js";
import { obtenerEmbedding } from "./embeddings.js";

export interface FragmentoRecuperado {
  documento: string;
  contenido: string;
  similitud: number;
}

export async function recuperarFragmentosRelevantes(pregunta: string, k = 3, incluirBorradores = false): Promise<FragmentoRecuperado[]> {
  const embeddingPregunta = await obtenerEmbedding(pregunta);
  const vectorSql = `[${embeddingPregunta.join(",")}]`;

  // 1 - distancia_coseno = similitud_coseno (pgvector expone el operador <=>
  // como distancia; se resta de 1 para reportar una similitud 0..1 legible).
  const filas = await consultar<{ documento: string; contenido: string; similitud: number }>(
    `SELECT documento, contenido, 1 - (embedding <=> $1) AS similitud
     FROM rag_fragmentos
     WHERE ($3::boolean OR documento <> 'NOTA-CAMPO-07.md')  -- el borrador solo se recupera si la pregunta lo pide; nunca es fuente de política
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [vectorSql, k, incluirBorradores]
  );

  return filas;
}
