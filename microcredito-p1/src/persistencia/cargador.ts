// Cargador del paquete de datos canónico (E2).
//
// Ejecutar con: npm run cargar   (ver script agregado en package.json)
// Lee la ruta del paquete SIEMPRE de la variable de entorno CV_DATA_DIR,
// nunca incrustada en el código (regla explícita del enunciado, sección 5.3).
//
// Hace tres cosas, en este orden (sección 5.2 del enunciado):
//   1. Verifica la huella SHA-256 de eventos.jsonl contra eventos.sha256.
//      Si no coincide, se detiene sin tocar la base de datos.
//   2. Aplica el esquema (schema.sql) si no existe todavía.
//   3. Carga asesores.csv, politicas.json y reproduce eventos.jsonl en
//      orden (`seq`) usando UPSERTs idempotentes: correr este script dos
//      veces no duplica nada (créditos y clientes por `id`, pagos por
//      `clave_idempotencia` — la misma invariante 6.10 del núcleo).

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { obtenerPool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface EventoClienteRaw {
  seq: number;
  tipo: "CLIENTE";
  id_cliente: string;
  nombre_completo: string;
  dpi: string;
  telefono: string;
  municipio: string;
  fecha_alta: string;
}

interface EventoDesembolsoRaw {
  seq: number;
  tipo: "DESEMBOLSO";
  id_credito: string;
  id_cliente: string;
  id_asesor: string;
  fecha: string;
  capital_centavos: number;
  plazo_meses: number;
  tna_bps: number;
  reestructurado: boolean;
}

interface EventoPagoRaw {
  seq: number;
  tipo: "PAGO";
  clave_idempotencia: string;
  id_credito: string;
  fecha: string;
  monto_centavos: number;
  canal: string;
}

type EventoRaw = EventoClienteRaw | EventoDesembolsoRaw | EventoPagoRaw;

interface PoliticaMoraJson {
  nombre: string;
  tipo: "plana" | "escalonada";
  tna_bps?: number;
  vigencia_otorgamiento: { desde?: string; hasta?: string };
  tramos?: { id: string; ini: number; fin: number; bps: number }[];
  autor: string;
  motivo: string;
}

interface PoliticasJson {
  version: string;
  moneda: string;
  base_conteo: string; // "Actual/360"
  politicas_mora: Record<string, PoliticaMoraJson>;
  gasto_gestion_cobro: { monto_centavos: number; dia_generacion: number; aplica_a_politicas: string[]; nota?: string };
  regla_incobrable_dias: number;
  regla_riesgo_dias: number;
}

function rutaDatos(): string {
  const dir = process.env.CV_DATA_DIR;
  if (!dir) {
    throw new Error(
      "Falta la variable de entorno CV_DATA_DIR apuntando a la carpeta del paquete de datos canónico " +
        "(la que contiene eventos.jsonl). Ejemplo: CV_DATA_DIR=./datos/datos-proyecto-final npm run cargar"
    );
  }
  return dir;
}

/** Paso 1 del enunciado (sección 5.2): verificar la huella antes de cargar. */
async function verificarHuella(dir: string): Promise<void> {
  const contenido = await readFile(path.join(dir, "eventos.jsonl"));
  const huellaCalculada = createHash("sha256").update(contenido).digest("hex");

  const huellaEsperadaRaw = (await readFile(path.join(dir, "eventos.sha256"), "utf-8")).trim();
  // El formato típico de sha256sum es "<hash>  <archivo>"; nos quedamos solo con el hash.
  const huellaEsperada = huellaEsperadaRaw.split(/\s+/)[0]?.toLowerCase();

  if (!huellaEsperada) {
    throw new Error("No se pudo leer un hash válido desde eventos.sha256");
  }

  if (huellaCalculada.toLowerCase() !== huellaEsperada) {
    throw new Error(
      `✗ Verificación de huella SHA-256 FALLIDA.\n` +
        `  Esperada:  ${huellaEsperada}\n` +
        `  Calculada: ${huellaCalculada}\n` +
        `  Los datos pueden estar alterados o incompletos. La carga se detiene sin tocar la base de datos.`
    );
  }

  console.log(`✓ Huella SHA-256 verificada correctamente (${huellaCalculada}).`);
}

async function aplicarEsquema(): Promise<void> {
  const sql = await readFile(path.join(__dirname, "schema.sql"), "utf-8");
  await obtenerPool().query(sql);
  console.log("✓ Esquema aplicado (CREATE TABLE IF NOT EXISTS — no destruye datos existentes).");
}

async function cargarAsesores(dir: string): Promise<number> {
  const contenido = await readFile(path.join(dir, "asesores.csv"), "utf-8");
  const filas = parsearCsv(contenido);
  let cargados = 0;
  for (const fila of filas) {
    await obtenerPool().query(
      `INSERT INTO asesores (id, nombre) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre`,
      [fila.id_asesor, fila.nombre_completo]
    );
    cargados++;
  }
  console.log(`✓ Asesores cargados: ${cargados}`);
  return cargados;
}

async function cargarPoliticas(dir: string): Promise<void> {
  const contenido = await readFile(path.join(dir, "politicas.json"), "utf-8");
  const politicas = JSON.parse(contenido) as PoliticasJson;
  const baseConteo = politicas.base_conteo === "Actual/360" ? 360 : 365;

  for (const [id, politica] of Object.entries(politicas.politicas_mora)) {
    await obtenerPool().query(
      `INSERT INTO politicas_mora (id, nombre, tipo, tna_bps, vigencia_desde, vigencia_hasta, base_conteo, datos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, tna_bps = EXCLUDED.tna_bps,
         vigencia_desde = EXCLUDED.vigencia_desde, vigencia_hasta = EXCLUDED.vigencia_hasta,
         base_conteo = EXCLUDED.base_conteo, datos = EXCLUDED.datos`,
      [
        id,
        politica.nombre,
        politica.tipo,
        politica.tna_bps ?? null,
        politica.vigencia_otorgamiento.desde ?? null,
        politica.vigencia_otorgamiento.hasta ?? null,
        baseConteo,
        JSON.stringify(politica),
      ]
    );
  }

  await obtenerPool().query(
    `INSERT INTO parametros_globales (clave, valor) VALUES
       ('gasto_gestion_cobro', $1),
       ('regla_incobrable_dias', $2),
       ('regla_riesgo_dias', $3)
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    [
      JSON.stringify(politicas.gasto_gestion_cobro),
      JSON.stringify(politicas.regla_incobrable_dias),
      JSON.stringify(politicas.regla_riesgo_dias),
    ]
  );

  console.log(`✓ Políticas de mora cargadas: ${Object.keys(politicas.politicas_mora).length}`);
}

/** Elige la política de mora vigente para un crédito según su fecha de desembolso. */
function politicaVigenteEn(politicas: PoliticasJson, fechaDesembolso: string): string {
  for (const [id, politica] of Object.entries(politicas.politicas_mora)) {
    const desde = politica.vigencia_otorgamiento.desde;
    const hasta = politica.vigencia_otorgamiento.hasta;
    if (desde && fechaDesembolso < desde) continue;
    if (hasta && fechaDesembolso > hasta) continue;
    return id;
  }
  throw new Error(`No hay política de mora vigente para un crédito otorgado el ${fechaDesembolso}`);
}

async function cargarEventos(dir: string, politicas: PoliticasJson) {
  const contenido = await readFile(path.join(dir, "eventos.jsonl"), "utf-8");
  const lineas = contenido.split("\n").filter((l) => l.trim().length > 0);
  const eventos: EventoRaw[] = lineas.map((l) => JSON.parse(l));
  eventos.sort((a, b) => a.seq - b.seq);

  let clientes = 0;
  let creditos = 0;
  let pagos = 0;

  for (const evento of eventos) {
    let aplicado = true;
    if (evento.tipo === "CLIENTE") {
      await obtenerPool().query(
        `INSERT INTO clientes (id, nombre, dpi, telefono, municipio, direccion, fecha_alta)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          evento.id_cliente,
          evento.nombre_completo,
          evento.dpi,
          evento.telefono,
          evento.municipio,
          evento.municipio, // el paquete canónico no trae dirección; se deriva del municipio (ver README)
          evento.fecha_alta,
        ]
      );
      clientes++;
    } else if (evento.tipo === "DESEMBOLSO") {
      const politicaId = politicaVigenteEn(politicas, evento.fecha);
      const tasaMensual = evento.tna_bps / 10000 / 12;
      await obtenerPool().query(
        `INSERT INTO creditos
           (id, cliente_id, asesor_id, fecha_desembolso, capital_centavos, plazo_meses, tna_bps,
            tasa_mensual, politica_id, estado, reestructurado, moneda)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'VIGENTE', $10, 'GTQ')
         ON CONFLICT (id) DO NOTHING`,
        [
          evento.id_credito,
          evento.id_cliente,
          evento.id_asesor,
          evento.fecha,
          evento.capital_centavos,
          evento.plazo_meses,
          evento.tna_bps,
          tasaMensual,
          politicaId,
          evento.reestructurado,
        ]
      );
      creditos++;
    } else if (evento.tipo === "PAGO") {
      // Invariante 6.10 aplicada también en la carga: ON CONFLICT DO NOTHING
      // por clave_idempotencia significa que una clave repetida se ignora.
      const resultado = await obtenerPool().query(
        `INSERT INTO pagos (clave_idempotencia, credito_id, fecha, monto_centavos, canal)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (clave_idempotencia) DO NOTHING
         RETURNING clave_idempotencia`,
        [evento.clave_idempotencia, evento.id_credito, evento.fecha, evento.monto_centavos, evento.canal]
      );
      if (resultado.rowCount && resultado.rowCount > 0) pagos++;
      else aplicado = false; // clave repetida: reintento ignorado (en una 2.ª ejecución el INSERT de la bitácora no cambia nada)
    }
    await obtenerPool().query(
      `INSERT INTO eventos_carga (seq, tipo, payload, aplicado) VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (seq) DO NOTHING`,
      [evento.seq, evento.tipo, JSON.stringify(evento), aplicado]
    );
  }

  console.log(`✓ Eventos reproducidos: ${clientes} clientes, ${creditos} créditos, ${pagos} pagos.`);
  return { clientes, creditos, pagos };
}

/** Parser CSV mínimo (sin dependencias): soporta comillas dobles y comas dentro de comillas. */
function parsearCsv(contenido: string): Record<string, string>[] {
  const lineas = contenido.split(/\r?\n/).filter((l) => l.length > 0);
  const encabezados = dividirLineaCsv(lineas[0] ?? "");
  return lineas.slice(1).map((linea) => {
    const valores = dividirLineaCsv(linea);
    const fila: Record<string, string> = {};
    encabezados.forEach((encabezado, i) => {
      fila[encabezado] = valores[i] ?? "";
    });
    return fila;
  });
}

function dividirLineaCsv(linea: string): string[] {
  const resultado: string[] = [];
  let actual = "";
  let dentroDeComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      dentroDeComillas = !dentroDeComillas;
    } else if (c === "," && !dentroDeComillas) {
      resultado.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  resultado.push(actual);
  return resultado;
}

async function main() {
  const dir = rutaDatos();
  console.log(`Cargando paquete canónico desde: ${dir}`);

  await verificarHuella(dir);
  await aplicarEsquema();
  await cargarAsesores(dir);

  const politicasContenido = await readFile(path.join(dir, "politicas.json"), "utf-8");
  const politicas = JSON.parse(politicasContenido) as PoliticasJson;
  await cargarPoliticas(dir);

  const conteos = await cargarEventos(dir, politicas);

  await obtenerPool().query(
    `INSERT INTO carga_meta (clave, valor) VALUES ('ultima_carga_sha256', $1), ('ultima_carga_fecha', $2)
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, fecha = now()`,
    [(await readFile(path.join(dir, "eventos.sha256"), "utf-8")).trim(), new Date().toISOString()]
  );

  const q = async (sql: string) => Number((await obtenerPool().query(sql)).rows[0].n);
  const nClientes = await q("SELECT count(*) AS n FROM clientes");
  const nCreditos = await q("SELECT count(*) AS n FROM creditos");
  const nPagosAplicados = await q("SELECT count(*) AS n FROM pagos");
  const nEventosPago = await q("SELECT count(*) AS n FROM eventos_carga WHERE tipo = 'PAGO'");
  const nEventos = await q("SELECT count(*) AS n FROM eventos_carga");
  console.log("");
  console.log("Conteos en la base de datos (valores absolutos, también tras una segunda ejecución):");
  console.log(`  Clientes:            ${nClientes}   (esperado 60)`);
  console.log(`  Créditos:            ${nCreditos}   (esperado 75)`);
  console.log(`  Pagos (eventos):     ${nEventosPago}  (esperado 228, bitácora de eventos_carga)`);
  console.log(`  Pagos aplicados:     ${nPagosAplicados}  (${nEventosPago - nPagosAplicados} reintentos con clave repetida ignorados, P1 6.10)`);
  console.log(`  Eventos totales:     ${nEventos}  (esperado 363)`);
  console.log(conteos.pagos === 0 && nPagosAplicados > 0 ? "  (Segunda ejecución: nada nuevo que insertar — idempotente.)" : "");

  process.exit(0);
}

main().catch((error) => {
  console.error("✗ La carga se detuvo:", error instanceof Error ? error.message : error);
  process.exit(1);
});
