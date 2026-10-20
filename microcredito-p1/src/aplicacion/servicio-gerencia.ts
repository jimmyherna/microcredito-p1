// Analítica gerencial: reutiliza los servicios existentes (cartera, mora, vencimientos); no recalcula mora.

import { exigirFechaValida, sumarMeses } from "./reloj.js";
import type { RepositorioPuerto } from "./repositorio-puerto.js";
import { clientesDeAsesor, vistaConCreditos } from "./alcance.js";
import { consultarCarteraEnRiesgo } from "./servicio-cartera.js";
import { cargarEstadoDeCuenta, listarCreditosEnMora, proximosVencimientos } from "./servicio-creditos.js";
import { sincronizarEstadoCredito } from "./motor-cobranza.js";

const dinero = (centavos: number) => ({ centavos, moneda: "GTQ" as const });

export async function resumenGerencial(repo: RepositorioPuerto, fechaCorte: string) {
  exigirFechaValida(fechaCorte);
  const [clientes, asesores, usuarios, creditos, solicitudes] = await Promise.all([
    repo.listarClientes(),
    repo.listarAsesores(),
    repo.listarUsuarios(),
    repo.listarCreditos(),
    repo.listarSolicitudes(),
  ]);

  // Créditos activos = con saldo y no incobrables/cancelados a la fecha de corte (misma sincronización de estado que la cartera).
  let creditosActivos = 0;
  for (const c of creditos) {
    const e = await cargarEstadoDeCuenta(repo, c.id, fechaCorte);
    const estado = sincronizarEstadoCredito(c.estado, e.diasDeAtraso, e.saldoCapitalPendiente.centavos);
    if (estado !== "INCOBRABLE" && estado !== "CANCELADO" && e.saldoCapitalPendiente.centavos > 0) creditosActivos++;
  }
  const enMora = await listarCreditosEnMora(repo, fechaCorte);

  const solicitudesPorEstado = (["SOLICITADO", "APROBADO", "RECHAZADO", "ANULADO"] as const).map((estado) => ({
    estado,
    cantidad: solicitudes.filter((s) => s.estado === estado).length,
  }));
  const solicitudesPendientes = solicitudesPorEstado.find((x) => x.estado === "SOLICITADO")!.cantidad;

  const porAsesor = [];
  for (const a of asesores) {
    const suyos = creditos.filter((c) => c.asesorId === a.id);
    const cartera = await consultarCarteraEnRiesgo(vistaConCreditos(repo, suyos), fechaCorte);
    const clientesAsesor = await clientesDeAsesor(repo, a.id);
    porAsesor.push({
      asesorId: a.id,
      nombre: a.nombre,
      creditos: suyos.length,
      carteraActiva: cartera.carteraActiva,
      carteraEnRiesgo: cartera.carteraEnRiesgo,
      porcentajeRiesgo: cartera.porcentaje, // fracción 0..1, igual que /api/cartera/en-riesgo
      solicitudesPendientes: solicitudes.filter((s) => s.estado === "SOLICITADO" && clientesAsesor.has(s.clienteId)).length,
    });
  }

  // Cobros de los últimos 6 meses calendario (el de la fecha de corte incluido), hasta la fecha de corte.
  const mesCorte = fechaCorte.slice(0, 7);
  const meses = Array.from({ length: 6 }, (_, i) => sumarMeses(`${mesCorte}-01`, i - 5).slice(0, 7));
  const pagosPeriodo = await repo.listarPagos({ desde: `${meses[0]}-01`, hasta: fechaCorte });
  const cobrosPorMes = meses.map((mes) => {
    const delMes = pagosPeriodo.filter((p) => p.fecha.slice(0, 7) === mes);
    return { mes, total: dinero(delMes.reduce((s, p) => s + p.montoCentavos, 0)), pagos: delMes.length };
  });

  const recientes = await repo.listarPagos({ hasta: fechaCorte, limite: 10 });
  const pagosRecientes = [];
  for (const p of recientes) {
    const credito = await repo.obtenerCredito(p.creditoId);
    const cliente = credito ? await repo.obtenerCliente(credito.clienteId) : null;
    pagosRecientes.push({ fecha: p.fecha, creditoId: p.creditoId, clienteNombre: cliente?.nombre ?? credito?.clienteId ?? "—", monto: dinero(p.montoCentavos) });
  }

  const venc = await proximosVencimientos(repo, fechaCorte, 7);

  return {
    fechaCorte,
    conteos: {
      clientes: clientes.length,
      asesores: asesores.length,
      usuarios: usuarios.length,
      creditosActivos,
      creditosEnMora: enMora.length,
      solicitudesPendientes,
    },
    solicitudesPorEstado,
    porAsesor,
    cobrosPorMes,
    pagosRecientes,
    vencimientosProximos: { dias: 7, cantidad: venc.totalCuotas, total: venc.montoTotal },
  };
}
