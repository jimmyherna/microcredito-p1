import { crearServidor } from "./servidor.js";
import { repositorioPg } from "../aplicacion/repositorio-pg.js";
import { RepositorioMemoria } from "../aplicacion/repositorio-memoria.js";
import { cargarPaqueteEnMemoria } from "../persistencia/cargador-memoria.js";

// REPO_MODO=memoria levanta todo EN MEMORIA, sin necesitar PostgreSQL — útil para
// desarrollar/mostrar la interfaz. Sin CV_DATA_DIR arranca VACÍO (sin clientes, créditos ni
// solicitudes de ejemplo): cada persona se registra y crea sus propios datos. Con CV_DATA_DIR
// carga el paquete canónico verificado. Memoria no persiste: el video de defensa SIEMPRE debe
// grabarse con REPO_MODO=pg (o sin la variable, que es el valor por defecto).
const modo = process.env.REPO_MODO ?? "pg";
const repo =
  modo === "memoria"
    ? process.env.CV_DATA_DIR
      ? (await cargarPaqueteEnMemoria(process.env.CV_DATA_DIR)).repo
      : seedVacio()
    : repositorioPg;

function seedVacio(): RepositorioMemoria {
  const r = new RepositorioMemoria();
  // Sin datos de ejemplo, pero las políticas de mora son parámetros del sistema (no datos de usuario):
  // sin ellas no se podría desembolsar ningún crédito. Se cargan las vigentes del Comité.
  r.politicas.set("POL-2024-01", {
    id: "POL-2024-01",
    nombre: "Mora plana 24% nominal anual",
    tipo: "plana",
    tnaBps: 2400,
    vigenciaDesde: null,
    vigenciaHasta: "2026-09-30",
    baseConteo: 360,
    datos: { nombre: "Mora plana 24% nominal anual", tipo: "plana", tna_bps: 2400, vigencia_otorgamiento: { hasta: "2026-09-30" }, autor: "Comité de Crédito", motivo: "Política original." },
  });
  r.politicas.set("POL-2026-10", {
    id: "POL-2026-10",
    nombre: "Mora escalonada por tramo recorrido",
    tipo: "escalonada",
    tnaBps: null,
    vigenciaDesde: "2026-10-01",
    vigenciaHasta: null,
    baseConteo: 360,
    datos: {
      nombre: "Mora escalonada por tramo recorrido",
      tipo: "escalonada",
      vigencia_otorgamiento: { desde: "2026-10-01" },
      tramos: [
        { id: "mora_1", ini: 1, fin: 30, bps: 1800 },
        { id: "mora_2", ini: 31, fin: 60, bps: 2400 },
        { id: "mora_3", ini: 61, fin: 90, bps: 3000 },
        { id: "vencido", ini: 91, fin: 120, bps: 3600 },
      ],
      autor: "Comité de Crédito, Acta 09-2026",
      motivo: "Distinguir el descuido del deterioro.",
    },
  });
  return r;
}

const puerto = Number(process.env.PUERTO ?? 3000);
const app = crearServidor(repo);
app.listen(puerto, () => {
  console.log(`API de Crédito Vecino escuchando en http://localhost:${puerto} (REPO_MODO=${modo})`);
});
