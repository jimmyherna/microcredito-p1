import { Dinero } from "../dominio/dinero.js";
import { aplicarPagoAPrelacion, type DeudaCuota } from "../dominio/prelacion-pago.js";
import { guardarPagoPendiente, generarClaveIdempotencia } from "../almacen/cola-offline.js";
import { clasificarTramoMora, calcularInteresMoratorio, type PoliticaMora } from "../dominio/calculadora-mora.js";
import { generarPlanAmortizacionFrances } from "../dominio/plan-amortizacion.js";
import { obtenerCreditoPorId, calcularDiasDeAtraso, registrarCuotaPagada } from "../almacen/creditos.js";
import { obtenerSesion } from "../almacen/cuentas.js";
import { mostrarAccionesSiguientes } from "../navegacion.js";
import { mostrarFormularioResena } from "../resena.js";
import { inicializarAyuda } from "../ayuda.js";

const parametros = new URLSearchParams(window.location.search);
const idCredito = parametros.get("id") ?? "";
const credito = obtenerCreditoPorId(idCredito);
const sesion = obtenerSesion();

const inputMonto = document.getElementById("monto") as HTMLInputElement;
const divDesglose = document.getElementById("desglose") as HTMLDivElement;
const btnConfirmar = document.getElementById("btnConfirmar") as HTMLButtonElement;
const parrafoEstado = document.getElementById("estado") as HTMLParagraphElement;

if (!credito) {
  parrafoEstado.textContent = "No se encontró este crédito.";
  btnConfirmar.disabled = true;
} else {
  const diasDeAtraso = calcularDiasDeAtraso(credito);
  const tramo = clasificarTramoMora(diasDeAtraso);
  const plan = generarPlanAmortizacionFrances(
    Dinero.deQuetzales(credito.montoQuetzales),
    credito.tasaMensual,
    credito.plazoMeses
  );
  const filaCuota = plan.filas[credito.cuotasPagadas];
  const capitalCuota = filaCuota ? filaCuota.amortizacion : Dinero.deQuetzales(0);
  const interesCorriente = filaCuota ? filaCuota.interes : Dinero.deQuetzales(0);

  const POLITICA: PoliticaMora = {
    tnaMoratoria: 0.36,
    baseDeConteo: 360,
    autor: "Reglamento de Crédito Vecino",
    fechaVigenciaDesde: "2026-01-01",
  };
  const interesMoratorio =
    tramo === "AL_DIA" ? Dinero.deQuetzales(0) : calcularInteresMoratorio(capitalCuota, diasDeAtraso, POLITICA);
  const gastosGestion = diasDeAtraso > 30 ? Dinero.deQuetzales(25.0) : Dinero.deQuetzales(0);

  const deudaActual: DeudaCuota = { gastos: gastosGestion, interesMoratorio, interesCorriente, capital: capitalCuota };

  function mostrarDesglose(): void {
    const valor = parseFloat(inputMonto.value || "0");
    if (valor <= 0) { divDesglose.innerHTML = ""; return; }
    const monto = Dinero.deQuetzales(valor);
    const resultado = aplicarPagoAPrelacion(monto, deudaActual);
    divDesglose.innerHTML = resultado.detalle
      .map((fila, i) => `<p>${i + 1}. ${fila.rubro} — ${fila.aplicado.toString()}</p>`)
      .join("");
  }

  btnConfirmar.addEventListener("click", async () => {
    const valor = parseFloat(inputMonto.value || "0");
    if (valor <= 0) { parrafoEstado.textContent = "Ingresa un monto válido."; return; }

    await guardarPagoPendiente({
      claveIdempotencia: generarClaveIdempotencia(),
      creditoId: credito.id,
      montoQuetzales: valor,
      fechaCaptura: new Date().toISOString(),
      sincronizado: false,
    });

    registrarCuotaPagada(credito.id);

    parrafoEstado.textContent = navigator.onLine
      ? "Pago registrado. Sincronizando..."
      : "Sin señal: el pago quedó guardado y se sincronizará cuando vuelva la conexión.";
    btnConfirmar.disabled = true;

    if (sesion?.rol === "ASESOR") {
      mostrarAccionesSiguientes("siguientesAcciones", [
        { texto: "Volver a mi cartera", href: "/paginas/menu.html" },
        { texto: "Ver detalle del crédito", href: `/paginas/detalle-mora.html?id=${encodeURIComponent(credito.id)}`, estilo: "secundario" },
      ]);
    } else {
      mostrarAccionesSiguientes("siguientesAcciones", [
        { texto: "Ver plan de amortización", href: `/paginas/plan-amortizacion.html?id=${encodeURIComponent(credito.id)}` },
        { texto: "Volver a mis créditos", href: "/paginas/mi-credito.html", estilo: "secundario" },
      ]);
      mostrarFormularioResena("resenaContenedor");
    }
  });

  inputMonto.addEventListener("input", mostrarDesglose);
}

inicializarAyuda("Ingresa el monto recibido. El sistema calcula automáticamente gastos, interés moratorio, interés corriente y capital según el estado real de este crédito.");