import { Dinero } from "../dominio/dinero.js";
import { clasificarTramoMora, calcularInteresMoratorio } from "../dominio/calculadora-mora.js";
const parametros = new URLSearchParams(window.location.search);
const idCredito = parametros.get("id") ?? "CV-2026-0410";
const CAPITAL_EN_MORA = Dinero.deQuetzales(725.76);
const DIAS_DE_ATRASO = 45;
const POLITICA = {
    tnaMoratoria: 0.36,
    baseDeConteo: 360,
    autor: "Reglamento de Crédito Vecino",
    fechaVigenciaDesde: "2026-01-01",
};
document.getElementById("idCredito").textContent = idCredito;
const tramo = clasificarTramoMora(DIAS_DE_ATRASO);
const interesMoratorio = calcularInteresMoratorio(CAPITAL_EN_MORA, DIAS_DE_ATRASO, POLITICA);
document.getElementById("etiquetaTramo").textContent =
    tramo === "AL_DIA" ? "Al día" : `${DIAS_DE_ATRASO} días de atraso (${tramo})`;
document.getElementById("capitalEnMora").textContent = CAPITAL_EN_MORA.toString();
document.getElementById("diasAtraso").textContent = String(DIAS_DE_ATRASO);
document.getElementById("interesMoratorio").textContent = interesMoratorio.toString();
const linkPago = document.getElementById("linkRegistrarPago");
linkPago.href = `/paginas/registrar-pago.html?id=${encodeURIComponent(idCredito)}`;
