// Capa única de búsqueda en el corpus — la usan tanto la herramienta
// "buscar_politica" del LLM (herramientas.ts) como el respaldo por reglas
// (orquestador.ts cuando Ollama no está disponible). Intenta primero la
// recuperación semántica real (E4: embeddings + pgvector); si la base de
// datos o el modelo de embeddings no están listos todavía, cae a una
// búsqueda por palabras clave sobre los archivos del corpus directamente
// — para que el chat sea útil desde el primer día, antes de correr
// `npm run ingesta:rag`.
//
// En ambos caminos, NOTA-CAMPO-07.md queda excluido: nunca es una fuente
// de política citable (es el caso de prueba de seguridad OP-7).

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { recuperarFragmentosRelevantes } from "../rag/recuperar.js";
import { neutralizarContenido } from "./neutralizar-contenido.js";

const PIDE_BORRADOR = /nota[- ]?(de )?campo|NOTA-CAMPO/i;

export interface ResultadoBusquedaPolitica {
  encontrado: boolean;
  fragmentos: { documento: string; contenido: string; sospechoso?: boolean }[];
}

/** Todo fragmento sale NEUTRALIZADO: el contenido recuperado es dato, nunca instrucción. */
function sanear(r: ResultadoBusquedaPolitica): ResultadoBusquedaPolitica {
  return {
    ...r,
    fragmentos: r.fragmentos.map((f) => {
      const n = neutralizarContenido(f.contenido);
      return { documento: f.documento, contenido: n.texto, ...(n.sospechoso ? { sospechoso: true } : {}) };
    }),
  };
}

export async function buscarEnCorpus(consulta: string): Promise<ResultadoBusquedaPolitica> {
  const incluirBorradores = PIDE_BORRADOR.test(consulta);
  try {
    const fragmentos = await recuperarFragmentosRelevantes(consulta, 3, incluirBorradores);
    if (fragmentos.length > 0) {
      return sanear({ encontrado: true, fragmentos: fragmentos.map((f) => ({ documento: f.documento, contenido: f.contenido })) });
    }
  } catch {
    // pgvector/Ollama embeddings no disponibles todavía — se sigue al respaldo por palabras clave.
  }

  return sanear(await buscarPorPalabrasClave(consulta, incluirBorradores));
}

async function buscarPorPalabrasClave(consulta: string, incluirBorradores: boolean): Promise<ResultadoBusquedaPolitica> {
  const dir = process.env.CV_DATA_DIR;
  if (!dir) return { encontrado: false, fragmentos: [] };

  const carpetaCorpus = path.join(dir, "corpus");
  const archivos = await readdir(carpetaCorpus).catch(() => [] as string[]);
  const palabrasClave = consulta
    .toLowerCase()
    .split(/\W+/)
    .filter((p) => p.length > 3);

  const candidatos: { archivo: string; texto: string; puntaje: number }[] = [];
  for (const archivo of archivos) {
    if ((archivo === "NOTA-CAMPO-07.md" && !incluirBorradores) || !archivo.endsWith(".md")) continue;
    const contenido = await readFile(path.join(carpetaCorpus, archivo), "utf-8");
    const contenidoMin = contenido.toLowerCase();
    const puntaje = palabrasClave.reduce((acc, p) => acc + (contenidoMin.includes(p) ? 1 : 0), 0);
    if (puntaje > 0) candidatos.push({ archivo, texto: contenido, puntaje });
  }

  candidatos.sort((a, b) => b.puntaje - a.puntaje);
  const mejores = candidatos.slice(0, 2);

  return {
    encontrado: mejores.length > 0,
    fragmentos: mejores.map((c) => ({
      documento: c.archivo,
      contenido: c.texto.split("\n").filter((l) => l.trim().length > 0).slice(0, 12).join("\n").slice(0, 1500),
    })),
  };
}
