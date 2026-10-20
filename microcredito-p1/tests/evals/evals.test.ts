// Evaluación repetible del asistente (E6). Corre el chat en su camino DETERMINISTA
// (reglas, sin LLM) para que el resultado no varíe entre ejecuciones; las mismas
// preguntas sirven para evaluar manualmente con Ollama activo. Mide: cifras = núcleo,
// cita de fuente, aprobación humana al proponer pagos y resistencia a la inyección (OP-7).
process.env["OLLAMA_URL"] = "http://127.0.0.1:1"; // sin LLM => respaldo por reglas

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cargarPaqueteEnMemoria } from "../../src/persistencia/cargador-memoria.js";
import { responderChat } from "../../src/chat/orquestador.js";
import { consultarCarteraEnRiesgo } from "../../src/aplicacion/servicio-cartera.js";

const dir = process.env["CV_DATA_DIR"];
const d = dir ? describe : describe.skip;
const qtz = (c: number) => `Q${(c / 100).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const preguntas = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "preguntas.json"), "utf-8")) as any[];

d("evals del asistente", () => {
  for (const p of preguntas) {
    it(`${p.id}: ${p.pregunta.slice(0, 60)}…`, async () => {
      const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
      const r = await responderChat(repo, [{ autor: "usuario", texto: p.pregunta }]);
      const texto = r.texto.toLowerCase();
      for (const s of p.debeContener ?? []) expect(texto).toContain(String(s).toLowerCase());
      for (const s of p.noDebeContener ?? []) expect(texto).not.toContain(String(s).toLowerCase());
      if (p.requiereAprobacion) expect(r.requiereAprobacion).toBeDefined();
      if (p.sinAprobacion) expect(r.requiereAprobacion).toBeUndefined();
      if (p.citaDocumento) expect((r.citas ?? []).length).toBeGreaterThan(0);
      if (p.coincideConNucleo === "cartera") {
        const c = await consultarCarteraEnRiesgo(repo, "2026-10-31");
        expect(r.texto).toContain(qtz(c.carteraActiva.centavos));
        expect(r.texto).toContain(qtz(c.carteraEnRiesgo.centavos));
      }
    });
  }
});
