// Pruebas del servidor MCP (E6): devuelve lo mismo que el núcleo y rechaza lo que debe rechazar.
// Usa el transporte en memoria del SDK (sin procesos hijos ni stdio).
import { describe, it, expect } from "vitest";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { crearServidorMcp } from "../src/mcp/servidor.js";
import { cargarPaqueteEnMemoria } from "../src/persistencia/cargador-memoria.js";
import { consultarCarteraEnRiesgo } from "../src/aplicacion/servicio-cartera.js";

const dir = process.env["CV_DATA_DIR"];
const d = dir ? describe : describe.skip;

async function conectar() {
  const { repo } = await cargarPaqueteEnMemoria(path.resolve(dir!));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await crearServidorMcp(repo).connect(a);
  const client = new Client({ name: "prueba", version: "1.0.0" });
  await client.connect(b);
  return { client, repo };
}
const texto = (r: any) => String(r.content?.[0]?.text ?? "");

d("servidor MCP", () => {
  it("expone las capacidades mínimas y registrar_pago exige tokenAprobacion", async () => {
    const { client } = await conectar();
    const { tools } = await client.listTools();
    const nombres = tools.map((t) => t.name);
    for (const n of ["consultar_credito", "explicar_mora", "registrar_pago"]) expect(nombres).toContain(n);
    const pago = tools.find((t) => t.name === "registrar_pago")!;
    expect(JSON.stringify(pago.inputSchema)).toContain("tokenAprobacion");
    expect(JSON.stringify(pago.inputSchema)).not.toContain("confirmado");
  });

  it("consultar la cartera devuelve lo mismo que el núcleo", async () => {
    const { client, repo } = await conectar();
    const nucleo = await consultarCarteraEnRiesgo(repo, "2026-10-31");
    const r = await client.callTool({ name: "consultar_cartera", arguments: { fechaCorte: "2026-10-31" } });
    expect(JSON.parse(texto(r)).carteraEnRiesgo.centavos).toBe(nucleo.carteraEnRiesgo.centavos);
  });

  it("rechaza crédito inexistente y fecha inválida con código uniforme", async () => {
    const { client } = await conectar();
    const a = await client.callTool({ name: "consultar_credito", arguments: { creditoId: "CV-NO-EXISTE", fechaCorte: "2026-10-31" } });
    expect(texto(a)).toContain("CREDITO_INEXISTENTE");
    const b = await client.callTool({ name: "consultar_credito", arguments: { creditoId: "CV-2026-0001", fechaCorte: "2026-13-45" } });
    expect(texto(b)).toContain("FECHA_INVALIDA");
  });

  it("registrar_pago sin token humano no escribe nada", async () => {
    const { client, repo } = await conectar();
    const antes = repo.pagos.size;
    const r = await client.callTool({ name: "registrar_pago", arguments: { creditoId: "CV-2026-0043", montoCentavos: 56187, claveIdempotencia: "MCP-1", fecha: "2026-10-31" } });
    expect((r as any).isError).toBe(true);
    expect(repo.pagos.size).toBe(antes);
  });
});
