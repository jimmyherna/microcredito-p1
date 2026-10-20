import { RepositorioMemoria } from "./repositorio-memoria.js";

/**
 * Datos de ejemplo — NO son el paquete canónico (datos-proyecto-final.zip).
 * Sirven solo para desarrollar y enseñar la interfaz de inmediato
 * (REPO_MODO=memoria). El video de defensa debe grabarse contra la carga
 * canónica real en PostgreSQL (npm run cargar), nunca contra esta semilla.
 */
export function sembrarDatosDeDesarrollo(repo: RepositorioMemoria): RepositorioMemoria {
  repo.politicas.set("POL-2024-01", {
    id: "POL-2024-01",
    nombre: "Mora plana 24% nominal anual",
    tipo: "plana",
    tnaBps: 2400,
    vigenciaDesde: null,
    vigenciaHasta: "2026-09-30",
    baseConteo: 360,
    datos: { nombre: "Mora plana 24% nominal anual", tipo: "plana", tna_bps: 2400, vigencia_otorgamiento: { hasta: "2026-09-30" }, autor: "Comité de Crédito", motivo: "Política original." },
  });
  repo.politicas.set("POL-2026-10", {
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

  repo.asesores.set("AS-01", { id: "AS-01", nombre: "Byron Estuardo Cifuentes" });

  repo.clientes.set("CL-0001", { id: "CL-0001", nombre: "Ana Lucía Pérez Gómez", dpi: "1234567890123", telefono: "5555-1001", municipio: "Mixco", direccion: "Mixco", fechaAlta: "2026-01-10" });
  repo.clientes.set("CL-0002", { id: "CL-0002", nombre: "Carlos Iván Morales Tzul", dpi: "1234567890124", telefono: "5555-1002", municipio: "Chinautla", direccion: "Chinautla", fechaAlta: "2026-01-12" });

  // Crédito al día (política escalonada).
  repo.creditos.set("CV-2026-0001", {
    id: "CV-2026-0001",
    clienteId: "CL-0001",
    asesorId: "AS-01",
    solicitudId: null,
    fechaDesembolso: "2026-06-15",
    capitalCentavos: 1_000_000, // Q10,000.00
    plazoMeses: 12,
    tnaBps: 3600,
    tasaMensual: 3600 / 10000 / 12,
    politicaId: "POL-2026-10",
    estado: "VIGENTE",
    reestructurado: false,
    moneda: "GTQ",
  });

  // Crédito en mora (sin pagos, para demostrar Detalle de la mora).
  repo.creditos.set("CV-2026-0002", {
    id: "CV-2026-0002",
    clienteId: "CL-0002",
    asesorId: "AS-01",
    solicitudId: null,
    fechaDesembolso: "2026-05-01",
    capitalCentavos: 500_000, // Q5,000.00
    plazoMeses: 6,
    tnaBps: 4000,
    tasaMensual: 4000 / 10000 / 12,
    politicaId: "POL-2026-10",
    estado: "VIGENTE",
    reestructurado: false,
    moneda: "GTQ",
  });

  // Una solicitud "sin aprobar" (Créditos Existentes, como en el Figma).
  repo.solicitudes.set("SOL-0003", {
    id: "SOL-0003",
    clienteId: "CL-0001",
    montoCentavos: 1_000_000, // Q10,000.00
    plazoMeses: 48,
    estado: "SOLICITADO",
    fechaSolicitud: "2026-10-20",
    motivoDecision: null,
  });

  return repo;
}
