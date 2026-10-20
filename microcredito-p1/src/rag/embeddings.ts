// Cliente HTTP mínimo hacia Ollama para generar embeddings (E4).
// Modelo elegido: nomic-embed-text (768 dimensiones) — liviano, corre bien
// en CPU en una laptop de estudiante. Si el equipo prefiere bge-m3
// (mejor para español, pero 1024 dimensiones y más lento en CPU), hay que
// cambiar MODELO_EMBEDDING de abajo Y la dimensión de la columna
// `embedding` en persistencia/schema.sql (vector(768) -> vector(1024)).

export const DIMENSION_EMBEDDING = 768;
const MODELO_EMBEDDING = process.env.OLLAMA_MODELO_EMBEDDING ?? "nomic-embed-text";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

export async function obtenerEmbedding(texto: string): Promise<number[]> {
  const respuesta = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELO_EMBEDDING, prompt: texto }),
  });
  if (!respuesta.ok) {
    throw new Error(`Ollama respondió ${respuesta.status} al pedir un embedding. ¿Está corriendo 'ollama serve'?`);
  }
  const cuerpo = (await respuesta.json()) as { embedding: number[] };
  return cuerpo.embedding;
}
