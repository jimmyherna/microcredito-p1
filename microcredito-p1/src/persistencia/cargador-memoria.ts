// Cargador del paquete canónico sobre el repositorio EN MEMORIA.
// Misma lógica que cargador.ts (verifica SHA-256, reproduce eventos por `seq`,
// ignora claves de idempotencia repetidas) pero sin PostgreSQL. Sirve para
// (a) tests de carga, (b) levantar la API/UI con los 75 créditos sin BD
// (REPO_MODO=memoria + CV_DATA_DIR) y (c) validar el motor contra los datos reales.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { RepositorioMemoria } from "../aplicacion/repositorio-memoria.js";

export interface ResumenCarga {
  huellaCalculada: string;
  huellaEsperada: string;
  huellaCoincide: boolean;
  clientes: number;
  creditos: number;
  pagos: number;
  eventosPago: number;
  pagosDuplicadosIgnorados: number;
  eventosPagoLeidos: number;
}

export async function cargarPaqueteEnMemoria(dir: string, repo = new RepositorioMemoria()): Promise<{ repo: RepositorioMemoria; resumen: ResumenCarga }> {
  const bruto = await readFile(path.join(dir, "eventos.jsonl"));
  const huellaCalculada = createHash("sha256").update(bruto).digest("hex");
  const huellaEsperada = (await readFile(path.join(dir, "eventos.sha256"), "utf8")).trim().split(/\s+/)[0]!.toLowerCase();
  if (huellaCalculada !== huellaEsperada) {
    throw new Error(`Huella SHA-256 NO coincide: calculada ${huellaCalculada} vs esperada ${huellaEsperada}. Carga abortada.`);
  }

  const pol = JSON.parse(await readFile(path.join(dir, "politicas.json"), "utf8"));
  for (const [id, p] of Object.entries<any>(pol.politicas_mora)) {
    repo.politicas.set(id, {
      id,
      nombre: p.nombre,
      tipo: p.tipo,
      tnaBps: p.tna_bps ?? null,
      vigenciaDesde: p.vigencia_otorgamiento?.desde ?? null,
      vigenciaHasta: p.vigencia_otorgamiento?.hasta ?? null,
      baseConteo: 360,
      datos: p,
    });
  }
  repo.parametrosGlobales = {
    gastoGestionCobro: pol.gasto_gestion_cobro,
    reglaIncobrableDias: pol.regla_incobrable_dias,
    reglaRiesgoDias: pol.regla_riesgo_dias,
  };

  const asesoresCsv = (await readFile(path.join(dir, "asesores.csv"), "utf8")).trim().split(/\r?\n/);
  const cab = asesoresCsv[0]!.split(",");
  for (const linea of asesoresCsv.slice(1)) {
    const v = linea.split(",");
    const o: Record<string, string> = {};
    cab.forEach((c, i) => (o[c.trim()] = (v[i] ?? "").trim()));
    const id = o["id_asesor"] ?? o["id"] ?? "";
    repo.asesores.set(id, { id, nombre: o["nombre_completo"] ?? o["nombre"] ?? id } as any);
  }

  const eventos = bruto
    .toString("utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
    .sort((a, b) => a.seq - b.seq);

  const politicas = [...repo.politicas.values()];
  let duplicados = 0;
  let eventosPago = 0;
  for (const e of eventos) {
    if (e.tipo === "CLIENTE") {
      repo.clientes.set(e.id_cliente, { id: e.id_cliente, nombre: e.nombre_completo, dpi: e.dpi, telefono: e.telefono, municipio: e.municipio, direccion: null, fechaAlta: e.fecha_alta });
    } else if (e.tipo === "DESEMBOLSO") {
      const vig = politicas.find((p) => (!p.vigenciaDesde || e.fecha >= p.vigenciaDesde) && (!p.vigenciaHasta || e.fecha <= p.vigenciaHasta));
      repo.creditos.set(e.id_credito, {
        id: e.id_credito,
        clienteId: e.id_cliente,
        asesorId: e.id_asesor,
        solicitudId: null,
        fechaDesembolso: e.fecha,
        capitalCentavos: e.capital_centavos,
        plazoMeses: e.plazo_meses,
        tnaBps: e.tna_bps,
        tasaMensual: e.tna_bps / 10000 / 12,
        politicaId: vig!.id,
        estado: "VIGENTE",
        reestructurado: !!e.reestructurado,
        moneda: "GTQ",
      });
    } else if (e.tipo === "PAGO") {
      eventosPago++;
      const r = await repo.registrarPago({ claveIdempotencia: e.clave_idempotencia, creditoId: e.id_credito, fecha: e.fecha, montoCentavos: e.monto_centavos, canal: e.canal });
      if (r.yaExistia) duplicados++;
    }
  }
  return {
    repo,
    resumen: {
      huellaCalculada,
      huellaEsperada,
      huellaCoincide: true,
      clientes: repo.clientes.size,
      creditos: repo.creditos.size,
      pagos: repo.pagos.size,
      eventosPago,
      pagosDuplicadosIgnorados: duplicados,
      eventosPagoLeidos: eventos.filter((e) => e.tipo === "PAGO").length,
    },
  };
}
