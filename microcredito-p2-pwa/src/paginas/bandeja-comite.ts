import { Dinero } from "../dominio/dinero.js";
import { aplicarEvento } from "../dominio/credito-estado.js";
import type { EventoCredito } from "../dominio/credito-estado.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { calcularCarteraEnRiesgo, formatearPorcentaje } from "../dominio/cartera.js";
import { obtenerSolicitudes, actualizarEstadoSolicitud } from "../almacen/solicitudes.js";
import type { Solicitud } from "../almacen/solicitudes.js";
import { obtenerCreditos, guardarCredito, calcularDiasDeAtraso } from "../almacen/creditos.js";
import { obtenerResenas, type Resena } from "../almacen/resenas.js";
import { escaparHtml, protegerPagina } from "../seguridad.js";
import { inicializarAyuda } from "../ayuda.js";
import { obtenerPoliticaMoraPorFecha } from "../dominio/calculadora-mora.js";

if (protegerPagina(["GERENCIA"])) {
  function cumplePoliticaCredito(solicitud: {
    montoQuetzales: number;
    plazoMeses: number;
  }): boolean {
    return solicitud.montoQuetzales >= 1000 &&
      solicitud.montoQuetzales <= 25000 &&
      solicitud.plazoMeses >= 3 &&
      solicitud.plazoMeses <= 24;
  }

  function renderizarSolicitudes(): void {
    const contenedor = document.getElementById("listaSolicitudes");
    if (!contenedor) return;

    const pendientes = obtenerSolicitudes().filter((s) => s.estado === "SOLICITADO");

    contenedor.innerHTML = pendientes.length === 0
      ? "<p>No hay solicitudes pendientes.</p>"
      : pendientes.map((s) => {
          const cumple = cumplePoliticaCredito(s);
          const plan = generarPlanAmortizacionFrances(
            Dinero.deQuetzales(s.montoQuetzales),
            s.tasaMensual,
            s.plazoMeses
          );
          const cuota = plan.filas[0]?.cuota.toString() ?? "—";

          return `
            <div class="tarjeta" data-id="${escaparHtml(s.id)}">
              <strong>${escaparHtml(s.id)}</strong> — ${escaparHtml(s.clienteNombre)}<br />
              Monto: Q${s.montoQuetzales.toFixed(2)} · Plazo: ${s.plazoMeses} meses · Cuota estimada: ${cuota}<br />
              <span class="etiqueta-mora ${cumple ? "al-dia" : "en-mora"}">
                ${cumple ? "Cumple política de crédito" : "No cumple política de crédito"}
              </span>
              <div style="margin-top:0.6rem">
                <button class="primario btn-aprobar" data-id="${escaparHtml(s.id)}" ${cumple ? "" : "disabled"}>Aprobar</button>
                <button class="secundario btn-rechazar" data-id="${escaparHtml(s.id)}">Rechazar</button>
              </div>
            </div>`;
        }).join("");

    contenedor.querySelectorAll<HTMLButtonElement>(".btn-aprobar").forEach((boton) => {
      boton.addEventListener("click", () => decidir(boton.dataset.id ?? "", "COMITE_APRUEBA"));
    });

    contenedor.querySelectorAll<HTMLButtonElement>(".btn-rechazar").forEach((boton) => {
      boton.addEventListener("click", () => decidir(boton.dataset.id ?? "", "COMITE_RECHAZA"));
    });

    renderizarHistorial();
  }

  function renderizarHistorial(): void {
    const contenedor = document.getElementById("historial");
    if (!contenedor) return;

    const decididas = obtenerSolicitudes().filter((s) => s.estado !== "SOLICITADO");
    contenedor.innerHTML = decididas.length === 0
      ? "<p>Todavía no se ha decidido ninguna solicitud.</p>"
      : decididas.map((s) => `
          <div class="tarjeta">
            <strong>${escaparHtml(s.id)}</strong> — ${escaparHtml(s.clienteNombre)} —
            <span class="etiqueta-mora ${s.estado === "APROBADO" ? "al-dia" : "en-mora"}">${escaparHtml(s.estado)}</span>
          </div>`).join("");
  }

  function decidir(id: string, evento: EventoCredito): void {
    const solicitud = obtenerSolicitudes().find((s) => s.id === id);
    if (!solicitud || solicitud.estado !== "SOLICITADO") {
      alert("La solicitud ya no está disponible para decisión.");
      renderizarSolicitudes();
      return;
    }

    if (evento === "COMITE_APRUEBA" && !cumplePoliticaCredito(solicitud)) {
      alert("La solicitud no cumple la política de monto/plazo y no puede aprobarse.");
      return;
    }

    const accion = evento === "COMITE_APRUEBA" ? "aprobar" : "rechazar";
    if (!window.confirm(`¿Confirmas que deseas ${accion} la solicitud ${solicitud.id}?`)) return;

    try {
      const nuevoEstado = aplicarEvento(solicitud.estado, evento, {
        cumplePoliticaCredito: cumplePoliticaCredito(solicitud),
      });

      if (!actualizarEstadoSolicitud(id, nuevoEstado as Solicitud["estado"])) {
        throw new Error("No se pudo actualizar el estado de la solicitud.");
      }

      if (nuevoEstado === "APROBADO") {
        // En esta PWA el desembolso se simula inmediatamente después de la aprobación.
        // Se conserva la transición del dominio: SOLICITADO -> APROBADO -> VIGENTE.
        const estadoVigente = aplicarEvento("APROBADO", "SE_DESEMBOLSA") as "VIGENTE";

        const guardado = guardarCredito({
          id: solicitud.id,
          clienteNombre: solicitud.clienteNombre,
          montoQuetzales: solicitud.montoQuetzales,
          plazoMeses: solicitud.plazoMeses,
          tasaMensual: solicitud.tasaMensual,
          politicaMoraVersion: obtenerPoliticaMoraPorFecha(new Date().toISOString()).version,
          fechaAprobacion: new Date().toISOString(),
          cuotasPagadas: 0,
          estado: estadoVigente,
        });

        if (!guardado) {
          throw new Error("La solicitud ya tenía un crédito creado.");
        }
      }

      renderizarSolicitudes();
      renderizarCarteraEnRiesgo();
      renderizarOpiniones();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo procesar la decisión.");
    }
  }

  function renderizarCarteraEnRiesgo(): void {
    const contenedor = document.getElementById("carteraRiesgo");
    if (!contenedor) return;

    const creditos = obtenerCreditos();
    if (creditos.length === 0) {
      contenedor.innerHTML = "<p style=\"margin-top:0.4rem\">Todavía no hay créditos aprobados para calcular la cartera.</p>";
      return;
    }

    const creditosParaCartera = creditos
      .filter((c) => c.estado !== "CANCELADO")
      .map((c) => ({
        id: c.id,
        saldoCapital: Dinero.deQuetzales(c.montoQuetzales),
        diasDeAtraso: calcularDiasDeAtraso(c),
        reestructurado: c.estado === "REESTRUCTURADO",
        incobrable: false,
      }));

    const resultado = calcularCarteraEnRiesgo(creditosParaCartera);
    contenedor.innerHTML = `
      <p style="font-size:1.4rem; margin:0.3rem 0">${formatearPorcentaje(resultado.porcentaje)}</p>
      <p style="font-size:0.85rem; color:var(--color-texto-suave)">Basado en ${creditosParaCartera.length} crédito(s) activo(s).</p>`;
  }

  function renderizarOpiniones(): void {
    const contenedor = document.getElementById("opiniones");
    if (!contenedor) return;

    const resenas = obtenerResenas();
    if (resenas.length === 0) {
      contenedor.innerHTML = "<p>No hay opiniones registradas.</p>";
      return;
    }

    contenedor.innerHTML = resenas.map((r: Resena) => `
      <div class="tarjeta">
        <strong>${"★".repeat(r.estrellas)}${"☆".repeat(5 - r.estrellas)}</strong>
        <p style="margin-bottom:0.2rem">${escaparHtml(r.comentario || "Sin comentario.")}</p>
        <small>${escaparHtml(r.nombre)} · ${new Date(r.fecha).toLocaleDateString("es-GT")}</small>
      </div>`).join("");
  }

  renderizarSolicitudes();
  renderizarCarteraEnRiesgo();
  renderizarOpiniones();
  inicializarAyuda("Aquí la gerencia revisa las solicitudes pendientes. Solo se pueden aprobar solicitudes que cumplen los límites definidos por el sistema.");
}
