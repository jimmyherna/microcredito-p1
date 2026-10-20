// Cliente mínimo de Ollama (sin SDK — es una sola llamada HTTP) para el
// endpoint /api/chat con `tools` (function calling). Modelo recomendado en
// el README: qwen2.5:7b (buen español + tool calling confiable) o
// llama3.2:3b si la laptop no tiene mucha RAM. Cualquier modelo de Ollama
// que declare soporte de "tools" en su ficha (ollama.com/library) sirve.

export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const MODELO_CHAT = process.env.OLLAMA_MODELO_CHAT ?? "qwen2.5:7b";

export interface MensajeOllama {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
}

interface RespuestaOllamaChat {
  message: MensajeOllama;
  done: boolean;
}

/** true si Ollama responde — se usa para decidir si el chat usa el modelo real o el respaldo por reglas. */
export async function ollamaDisponible(): Promise<boolean> {
  try {
    const respuesta = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return respuesta.ok;
  } catch {
    return false;
  }
}

/** Una sola llamada a /api/chat (sin streaming — el chat ya espera la respuesta completa). */
export async function llamarOllama(mensajes: MensajeOllama[], tools?: readonly unknown[]): Promise<MensajeOllama> {
  const respuesta = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODELO_CHAT, messages: mensajes, tools, stream: false }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!respuesta.ok) {
    throw new Error(`Ollama respondió ${respuesta.status}. ¿Está corriendo 'ollama serve' y descargado el modelo ${MODELO_CHAT}?`);
  }
  const cuerpo = (await respuesta.json()) as RespuestaOllamaChat;
  return cuerpo.message;
}
