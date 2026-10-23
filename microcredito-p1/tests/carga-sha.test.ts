// E6 — Pruebas del cargador: FALLO ante SHA-256 alterado.
// Complementa tests/carga.test.ts (que prueba el camino feliz). Aquí se prueba
// el contrario: si eventos.jsonl o eventos.sha256 se alteran, el cargador
// debe DETENERSE sin cargar nada. Trabaja siempre sobre una COPIA temporal del
// paquete: el paquete canónico original nunca se modifica.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cargarPaqueteEnMemoria } from "../src/persistencia/cargador-memoria.js";
import { RepositorioMemoria } from "../src/aplicacion/repositorio-memoria.js";

const execFileAsync = promisify(execFile);
const raizProyecto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Requiere CV_DATA_DIR apuntando al paquete canónico (nunca incrustado en el código).
const dirOriginal = process.env["CV_DATA_DIR"];
const d = dirOriginal ? describe : describe.skip;

d("cargador: se detiene si la huella SHA-256 no coincide", () => {
  let base = "";
  let dirIntacto = "";
  let dirJsonlAlterado = "";
  let dirHashAlterado = "";

  beforeAll(async () => {
    base = await mkdtemp(path.join(os.tmpdir(), "cv-sha-"));
    dirIntacto = path.join(base, "intacto");
    dirJsonlAlterado = path.join(base, "jsonl-alterado");
    dirHashAlterado = path.join(base, "hash-alterado");
    for (const destino of [dirIntacto, dirJsonlAlterado, dirHashAlterado]) {
      await cp(path.resolve(dirOriginal!), destino, { recursive: true });
    }

    // Alteración mínima: UN solo byte añadido al final de eventos.jsonl.
    const jsonl = path.join(dirJsonlAlterado, "eventos.jsonl");
    const original = await readFile(jsonl);
    await writeFile(jsonl, Buffer.concat([original, Buffer.from(" ")]));

    // Alteración del otro lado: eventos.sha256 con una huella distinta (válida en formato).
    await writeFile(path.join(dirHashAlterado, "eventos.sha256"), `${"0".repeat(64)}  eventos.jsonl\n`);
  });

  afterAll(async () => {
    if (base) await rm(base, { recursive: true, force: true });
  });

  it("control: la copia SIN alterar sí carga (la prueba es significativa)", async () => {
    const { resumen } = await cargarPaqueteEnMemoria(dirIntacto);
    expect(resumen.huellaCoincide).toBe(true);
    expect(resumen.creditos).toBe(75);
  });

  it("eventos.jsonl alterado (1 byte): falla con error de huella y no carga NADA", async () => {
    const repo = new RepositorioMemoria();
    await expect(cargarPaqueteEnMemoria(dirJsonlAlterado, repo)).rejects.toThrow(/Huella SHA-256 NO coincide/);
    expect(repo.creditos.size).toBe(0);
  });

  it("eventos.sha256 alterado: también falla y no carga nada", async () => {
    const repo = new RepositorioMemoria();
    await expect(cargarPaqueteEnMemoria(dirHashAlterado, repo)).rejects.toThrow(/Huella SHA-256 NO coincide/);
    expect(repo.creditos.size).toBe(0);
  });

  it(
    "el cargador REAL de PostgreSQL (npm run cargar) aborta con código 1 antes de tocar la base de datos",
    async () => {
      const tsx = path.join(raizProyecto, "node_modules", "tsx", "dist", "cli.mjs");
      let salida = { codigo: 0, texto: "" };
      try {
        await execFileAsync(process.execPath, [tsx, path.join("src", "persistencia", "cargador.ts")], {
          cwd: raizProyecto,
          timeout: 45_000,
          env: {
            ...process.env,
            CV_DATA_DIR: dirJsonlAlterado,
            // Base inexistente a propósito: si el cargador llegara a conectarse, fallaría por OTRA razón.
            DATABASE_URL: "postgres://nadie:nadie@127.0.0.1:1/nada",
          },
        });
      } catch (e: unknown) {
        const err = e as { code?: number; stdout?: string; stderr?: string };
        salida = { codigo: err.code ?? -1, texto: `${err.stdout ?? ""}${err.stderr ?? ""}` };
      }
      expect(salida.codigo).toBe(1);
      expect(salida.texto).toContain("FALLIDA");
      expect(salida.texto).not.toContain("Conteos en la base de datos");
    },
    60_000
  );
});
