import { Dinero } from "../dominio/dinero.js";
import { aplicarEvento } from "../dominio/credito-estado.js";
import { calcularCarteraEnRiesgo, formatearPorcentaje, type CreditoParaCartera } from "../dominio/cartera.js";
import { obtenerSolicitudes, actualizarEstadoSolicitud, type SolicitudCredito } from "../almacen/solicitudes.js";

function cumplePoliticaCredito(s: SolicitudCredito): boolean {
  return s.montoQuetzales <= 20000 && s.plazoMeses <= 24;
}

function renderizarSolicitudes(): void {
  const contenedor = document.getElementById("listaSolicitudes") as HTMLDivElement;
  const pendientes = obtenerSolicitudes().filter((s) => s.estado === "SOLICITADO");

  if (pendientes.length === 0) {
    contenedor.innerHTML = "<p>No hay solicitudes pendientes.</p>";
    return;
  }

  contenedor.innerHTML = pendientes
    .map((s) => {
      const cumple = cumplePoliticaCredito(s);
      return `
        <div class="tarjeta" data-id="${s.id}">
          <strong>${s.id}</strong> — ${s.clienteNombre}<br />
          Monto: Q${s.montoQuetzales.toFixed(2)} · Plazo: ${s.plazoMeses} meses<br />
          <span class="etiqueta-mora ${cumple ? "al-dia" : "en-mora"}">
            ${cumple ? "Cumple política de crédito" : "No cumple política de crédito"}
          </span>
          <div style="margin-top:0.5rem">
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
}

function decidir(id: string, evento: "COMITE_APRUEBA" | "COMITE_RECHAZA"): void {
  const solicitud = obtenerSolicitudes().find((s) => s.id === id);
  if (!solicitud) return;

  try {
    const nuevoEstado = aplicarEvento(solicitud.estado, evento, {
      cumplePoliticaCredito: cumplePoliticaCredito(solicitud),
    });
    actualizarEstadoSolicitud(id, nuevoEstado);
  } catch (error) {
    alert((error as Error).message);
  }

  renderizarSolicitudes();
}

function renderizarCarteraEnRiesgo(): void {
  const creditosEjemplo: CreditoParaCartera[] = [
    { id: "CV-2026-0410", saldoCapital: Dinero.deQuetzales(725.76), diasDeAtraso: 45, reestructurado: false, incobrable: false },
    { id: "CV-2026-0177", saldoCapital: Dinero.deQuetzales(4200), diasDeAtraso: 0, reestructurado: false, incobrable: false },
    { id: "CV-2026-0321", saldoCapital: Dinero.deQuetzales(9800), diasDeAtraso: 12, reestructurado: false, incobrable: false },
  ];

  const resultado = calcularCarteraEnRiesgo(creditosEjemplo);
  document.getElementById("porcentajeRiesgo")!.textContent = formatearPorcentaje(resultado.porcentaje);
}

renderizarSolicitudes();
renderizarCarteraEnRiesgo();