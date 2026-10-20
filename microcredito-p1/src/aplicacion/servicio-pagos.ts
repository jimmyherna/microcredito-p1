import type { RepositorioPuerto } from "./repositorio-puerto.js";
import { ErrorAplicacion } from "./tipos.js";
import { cargarEstadoDeCuenta } from "./servicio-creditos.js";
import { sincronizarEstadoCredito } from "./motor-cobranza.js";
import { aplicarPagoAPrelacion } from "../dominio/prelacion-pago.js";
import { Dinero } from "../dominio/dinero.js";
import { exigirFechaValida } from "./reloj.js";
import { validarYConsumirToken } from "./aprobaciones-pago.js";

export interface DatosNuevoPago {
  creditoId: string;
  montoCentavos: number;
  claveIdempotencia: string;
  fecha: string; // fecha de operación (ej. 31/10/2026 en el video, sección 7.3)
  /**
   * Token de un solo uso emitido por POST /api/pagos/solicitar-aprobacion —
   * la prueba de que un humano vio el desglose y tocó "Aprobar" (ver
   * src/aplicacion/aprobaciones-pago.ts). Ningún cliente MCP ni el chat
   * pueden generarlo por su cuenta; es el reemplazo del booleano
   * `confirmado` auto-afirmable que tenía la primera versión de este
   * sistema — ese booleano lo podía poner el propio modelo de lenguaje
   * si una instrucción escondida (ej. OP-7, NOTA-CAMPO-07.md) lo
   * convencía de que "ya había aprobación". Un token que solo el backend
   * de la app emite, cuando el click realmente ocurrió, no tiene ese
   * problema.
   */
  tokenAprobacion?: string;
}

export interface ResultadoRegistrarPago {
  detalle: { rubro: string; adeudado: { centavos: number; moneda: string }; aplicado: { centavos: number; moneda: string }; pendiente: { centavos: number; moneda: string } }[];
  excedente: { centavos: number; moneda: string };
  cuotaSaldada: boolean;
  nuevoEstado: string;
  tramo: string;
  yaAplicado: boolean; // true si la clave de idempotencia ya existía (OP-4)
}

/**
 * Capacidad "Registrar un pago" (sensible — sección 6.3). Antes de llamar
 * esta función, la interfaz (E1) y el servidor MCP (E3) DEBEN haber
 * mostrado el desglose de la prelación y obtenido la aprobación humana
 * explícita (esto se hace en la capa de arriba — API/MCP — no aquí, para
 * que la función siga siendo pura y testeable).
 *
 * Rechaza (ErrorAplicacion):
 *  - CREDITO_INEXISTENTE
 *  - CREDITO_INCOBRABLE          -> OP-6
 *  - MONTO_NO_EXACTO             -> OP-5 (incluye el monto correcto en `detalles`)
 *  - CUOTA_YA_PAGADA             -> si no hay cuotas pendientes
 * Es idempotente por `claveIdempotencia` (invariante 6.10) -> OP-4: reintentar
 * la misma clave regresa el resultado ya aplicado, sin cobrar dos veces.
 */
export async function registrarPago(repo: RepositorioPuerto, datos: DatosNuevoPago): Promise<ResultadoRegistrarPago> {
  exigirFechaValida(datos.fecha);
  const yaExistia = await repo.existePago(datos.claveIdempotencia);

  const credito = await repo.obtenerCredito(datos.creditoId);
  if (!credito) throw new ErrorAplicacion("CREDITO_INEXISTENTE", `No existe el crédito ${datos.creditoId}`);

  // Incobrable = estado guardado O derivado (> 120 días de atraso a la fecha de operación, regla del paquete de datos).
  {
    const previo = await cargarEstadoDeCuenta(repo, datos.creditoId, datos.fecha);
    const derivado = sincronizarEstadoCredito(credito.estado, previo.diasDeAtraso, previo.saldoCapitalPendiente.centavos);
    if (credito.estado === "INCOBRABLE" || derivado === "INCOBRABLE") {
      throw new ErrorAplicacion("CREDITO_INCOBRABLE", `El crédito ${datos.creditoId} es incobrable (${previo.diasDeAtraso} días de atraso, más de 120) y no admite pagos`);
    }
  }

  // Estado de cuenta ANTES de aplicar este pago (para validar monto exacto
  // y mostrar el desglose de prelación antes de confirmar, E1/OP-1).
  const estadoAntes = await cargarEstadoDeCuenta(repo, datos.creditoId, datos.fecha);

  if (!yaExistia && estadoAntes.indiceCuotaExigible === null) {
    throw new ErrorAplicacion("CUOTA_YA_PAGADA", `El crédito ${datos.creditoId} no tiene cuotas pendientes`);
  }

  const totalExigibleCentavos =
    estadoAntes.deudaExigibleActual.gastos.centavos +
    estadoAntes.deudaExigibleActual.interesMoratorio.centavos +
    estadoAntes.deudaExigibleActual.interesCorriente.centavos +
    estadoAntes.deudaExigibleActual.capital.centavos;

  if (!yaExistia && datos.montoCentavos !== totalExigibleCentavos) {
    throw new ErrorAplicacion("MONTO_NO_EXACTO", `El monto no coincide con la cuota exigible`, {
      montoRecibidoCentavos: datos.montoCentavos,
      montoCorrectoCentavos: totalExigibleCentavos,
    });
  }

  // Aprobación humana (E3, sección 6.3): obligatoria para un pago NUEVO.
  // Un reintento idempotente (OP-4, misma clave ya registrada) no la
  // vuelve a pedir — ya se aprobó la primera vez; es retry-safe, no una
  // segunda autorización.
  if (!yaExistia) {
    const validacion = validarYConsumirToken(datos.tokenAprobacion, {
      creditoId: datos.creditoId,
      montoCentavos: datos.montoCentavos,
      claveIdempotencia: datos.claveIdempotencia,
    });
    if (!validacion.valido) {
      throw new ErrorAplicacion("VALIDACION", `Aprobación humana requerida: ${validacion.motivo}`, { campo: "tokenAprobacion" });
    }
  }

  // OP-4: si la clave ya existía, se devuelve el resultado ya aplicado sin insertar de nuevo.
  if (!yaExistia) {
    await repo.registrarPago({
      claveIdempotencia: datos.claveIdempotencia,
      creditoId: datos.creditoId,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      canal: "interfaz",
    });
  }

  // Recalcula el estado de cuenta DESPUÉS del pago (incluye el pago recién
  // insertado porque vuelve a leer de repo — así queda 100% consistente
  // con lo que verá cualquier otra pantalla o el chat).
  const estadoDespues = await cargarEstadoDeCuenta(repo, datos.creditoId, datos.fecha);
  const nuevoEstado = sincronizarEstadoCredito(credito.estado, estadoDespues.diasDeAtraso, estadoDespues.saldoCapitalPendiente.centavos);
  if (nuevoEstado !== credito.estado) {
    await repo.actualizarEstadoCredito(datos.creditoId, nuevoEstado);
  }

  if (yaExistia) {
    // OP-4: la clave ya existía. NO se recalcula un desglose de prelación
    // "de este pago" — la cuota exigible actual puede ya ser otra (si el
    // pago original ya la saldó), y recalcular contra la cuota de HOY
    // produciría un desglose que no corresponde al pago original. Se
    // informa el estado actual del crédito sin inventar un desglose.
    return {
      detalle: [],
      excedente: { centavos: 0, moneda: credito.moneda },
      cuotaSaldada: estadoDespues.indiceCuotaExigible === null || estadoDespues.diasDeAtraso === 0,
      nuevoEstado,
      tramo: estadoDespues.tramo,
      yaAplicado: true,
    };
  }

  const resultadoAplicacion = aplicarPagoAPrelacion(
    Dinero.deCentavos(datos.montoCentavos, credito.moneda),
    estadoAntes.deudaExigibleActual
  );

  return {
    detalle: resultadoAplicacion.detalle.map((f) => ({
      rubro: f.rubro,
      adeudado: { centavos: f.adeudado.centavos, moneda: credito.moneda },
      aplicado: { centavos: f.aplicado.centavos, moneda: credito.moneda },
      pendiente: { centavos: f.pendiente.centavos, moneda: credito.moneda },
    })),
    excedente: { centavos: resultadoAplicacion.excedente.centavos, moneda: credito.moneda },
    cuotaSaldada: resultadoAplicacion.cuotaSaldada,
    nuevoEstado,
    tramo: estadoDespues.tramo,
    yaAplicado: yaExistia,
  };
}

/** Vista previa del desglose de prelación ANTES de confirmar (lo que E1/E3 deben mostrar antes de pedir aprobación). */
export async function previsualizarPago(repo: RepositorioPuerto, creditoId: string, fechaCorte: string) {
  const estado = await cargarEstadoDeCuenta(repo, creditoId, fechaCorte);
  if (estado.indiceCuotaExigible === null) {
    throw new ErrorAplicacion("CUOTA_YA_PAGADA", `El crédito ${creditoId} no tiene cuotas pendientes`);
  }
  const d = estado.deudaExigibleActual;
  const totalCentavos = d.gastos.centavos + d.interesMoratorio.centavos + d.interesCorriente.centavos + d.capital.centavos;
  return {
    creditoId,
    fechaCorte,
    desglose: {
      gastos: { centavos: d.gastos.centavos, moneda: estado.credito.moneda },
      interesMoratorio: { centavos: d.interesMoratorio.centavos, moneda: estado.credito.moneda },
      interesCorriente: { centavos: d.interesCorriente.centavos, moneda: estado.credito.moneda },
      capital: { centavos: d.capital.centavos, moneda: estado.credito.moneda },
    },
    montoExigibleCentavos: totalCentavos,
  };
}

/**
 * Validaciones previas de un pago NUEVO (crédito existe, no incobrable, hay cuota
 * pendiente, monto exacto). La API las ejecuta ANTES de emitir el token de aprobación
 * humana: así OP-5/OP-6 se rechazan con el monto correcto sin llegar a pedir firma.
 * Si la clave ya existe (reintento idempotente, OP-4) no se valida: no se vuelve a cobrar.
 */
export async function validarPagoAntesDeAprobar(
  repo: RepositorioPuerto,
  datos: { creditoId: string; montoCentavos: number; claveIdempotencia: string; fecha: string }
): Promise<{ yaAplicado: boolean }> {
  if (await repo.existePago(datos.claveIdempotencia)) return { yaAplicado: true };
  const credito = await repo.obtenerCredito(datos.creditoId);
  if (!credito) throw new ErrorAplicacion("CREDITO_INEXISTENTE", `No existe el crédito ${datos.creditoId}`);
  const e = await cargarEstadoDeCuenta(repo, datos.creditoId, datos.fecha);
  const derivado = sincronizarEstadoCredito(credito.estado, e.diasDeAtraso, e.saldoCapitalPendiente.centavos);
  if (credito.estado === "INCOBRABLE" || derivado === "INCOBRABLE") {
    throw new ErrorAplicacion("CREDITO_INCOBRABLE", `El crédito ${datos.creditoId} es incobrable (${e.diasDeAtraso} días de atraso, más de 120) y no admite pagos`);
  }
  if (e.indiceCuotaExigible === null) throw new ErrorAplicacion("CUOTA_YA_PAGADA", `El crédito ${datos.creditoId} no tiene cuotas pendientes`);
  const correcto = e.totalExigible.centavos;
  if (datos.montoCentavos !== correcto) {
    throw new ErrorAplicacion("MONTO_NO_EXACTO", "El monto no coincide con la cuota exigible", { montoRecibidoCentavos: datos.montoCentavos, montoCorrectoCentavos: correcto });
  }
  return { yaAplicado: false };
}
