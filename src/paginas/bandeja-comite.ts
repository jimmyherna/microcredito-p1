import { Dinero } from "../dominio/dinero.js";
import { aplicarEvento } from "../dominio/credito-estado.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { calcularCarteraEnRiesgo, formatearPorcentaje, type CreditoParaCartera } from "../dominio/cartera.js";
import { obtenerSolicitudes, actualizarEstadoSolicitud, type SolicitudCredito } from "../almacen/solicitudes.js";
import { obtenerCreditos, guardarCredito, calcularDiasDeAtraso } from "../almacen/creditos.js";
import { inicializarAyuda } from "../ayuda.js";

function cumplePoliticaCredito(s: SolicitudCredito): boolean {
  return s.montoQuetzales <= 20000 && s.plazoMeses <= 24;
}

function renderizarSolicitudes(): void {
  const contenedor = document.getElementById("listaSolicitudes") as HTMLDivElement;
  const pendientes = obtenerSolicitudes().filter((s) => s.estado === "SOLICITADO");

  contenedor.innerHTML = pendientes.length === 0
    ? "<p>No hay solicitudes pendientes.</p>"
    : pendientes
        .map((s) => {
          const cumple = cumplePoliticaCredito(s);
          const plan = generarPlanAmortizacionFrances(Dinero.deQuetzales(s.montoQuetzales), s.tasaMensual, s.plazoMeses);
          const cuota = plan.filas[0]?.cuota.toString() ?? "—";
          return `
            <div class="tarjeta" data-id="${s.id}">
              <strong>${s.id}</strong> — ${s.clienteNombre}<br />
              Monto: Q${s.montoQuetzales.toFixed(2)} · Plazo: ${s.plazoMeses} meses · Cuota estimada: ${cuota}<br />
              <span class="etiqueta-mora ${cumple ? "al-dia" : "en-mora"}">
                ${cumple ? "Cumple política de crédito" : "No cumple política de crédito"}
              </span>
              <div style="margin-top:0.6rem">
                <button class="primario btn-aprobar" data-id="${s.id}">Aprobar</button>
                <button class="secundario btn-rechazar" data-id="${s.id}">Rechazar</button>
              </div>
            </div>`;
        })
        .join("");

  contenedor.querySelectorAll<HTMLButtonElement>(".btn-aprobar").forEach((boton) => {
    boton.addEventListener("click", () => decidir(boton.dataset.id!, "COMITE_APRUEBA"));
  });
  contenedor.querySelectorAll<HTMLButtonElement>(".btn-rechazar").forEach((boton) => {
    boton.addEventListener("click", () => decidir(boton.dataset.id!, "COMITE_RECHAZA"));
  });

  renderizarHistorial();
}

function renderizarHistorial(): void {
  const contenedor = document.getElementById("historial") as HTMLDivElement;
  const decididas = obtenerSolicitudes().filter((s) => s.estado !== "SOLICITADO");

  contenedor.innerHTML = decididas.length === 0
    ? "<p>Todavía no se ha decidido ninguna solicitud.</p>"
    : decididas
        .map(
          (s) => `
          <div class="tarjeta">
            <strong>${s.id}</strong> — ${s.clienteNombre} —
            <span class="etiqueta-mora ${s.estado === "APROBADO" ? "al-dia" : "en-mora"}">${s.estado}</span>
          </div>`
        )
        .join("");
}

function decidir(id: string, evento: "COMITE_APRUEBA" | "COMITE_RECHAZA"): void {
  const solicitud = obtenerSolicitudes().find((s) => s.id === id);
  if (!solicitud) return;

  try {
    const nuevoEstado = aplicarEvento(solicitud.estado, evento, {
      cumplePoliticaCredito: cumplePoliticaCredito(solicitud),
    });
    actualizarEstadoSolicitud(id, nuevoEstado);

    if (nuevoEstado === "APROBADO") {
      guardarCredito({
        id: solicitud.id,
        clienteNombre: solicitud.clienteNombre,
        montoQuetzales: solicitud.montoQuetzales,
        plazoMeses: solicitud.plazoMeses,
        tasaMensual: solicitud.tasaMensual,
        fechaAprobacion: new Date().toISOString(),
        cuotasPagadas: 0,
      });
    }
  } catch (error) {
    alert((error as Error).message);
  }

  renderizarSolicitudes();
  renderizarCarteraEnRiesgo();
}

function renderizarCarteraEnRiesgo(): void {
  const contenedor = document.getElementById("carteraRiesgo") as HTMLDivElement;
  const creditos = obtenerCreditos();

  if (creditos.length === 0) {
    contenedor.innerHTML = `<p style="margin-top:0.4rem">Todavía no hay créditos aprobados para calcular la cartera.</p>`;
    return;
  }

  const creditosParaCartera: CreditoParaCartera[] = creditos.map((c) => ({
    id: c.id,
    saldoCapital: Dinero.deQuetzales(c.montoQuetzales),
    diasDeAtraso: calcularDiasDeAtraso(c),
    reestructurado: false,
    incobrable: false,
  }));

  const resultado = calcularCarteraEnRiesgo(creditosParaCartera);
  contenedor.innerHTML = `
    <p style="font-size:1.4rem; margin:0.3rem 0">${formatearPorcentaje(resultado.porcentaje)}</p>
    <p style="font-size:0.85rem; color:var(--color-texto-suave)">Basado en ${creditos.length} crédito(s) aprobado(s).</p>`;
}

renderizarSolicitudes();
renderizarCarteraEnRiesgo();

inicializarAyuda("Aquí decides las solicitudes pendientes. Al aprobar, el crédito pasa a la cartera real y su riesgo se calcula con datos reales, no de ejemplo.");