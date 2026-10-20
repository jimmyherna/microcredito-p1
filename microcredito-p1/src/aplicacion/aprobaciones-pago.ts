// =============================================================================
// Aprobación humana de pagos — menor privilegio real, no solo una promesa.
//
// Por qué existe este archivo (hallazgo de seguridad, corregido):
// -----------------------------------------------------------------------------
// La primera versión del servidor MCP (src/mcp/servidor.ts) pedía un
// parámetro `confirmado: boolean` para registrar un pago. El problema: ese
// booleano lo PONE quien llama a la herramienta — y quien llama a la
// herramienta, en el chat, es el modelo de lenguaje. Si alguien logra que
// el modelo "decida" por su cuenta que ya hay aprobación (por ejemplo, con
// una instrucción escondida en un documento del RAG — exactamente el caso
// de prueba OP-7, NOTA-CAMPO-07.md), nada en el servidor lo detiene: el
// LLM simplemente manda `confirmado: true` y el servidor le cree.
//
// La corrección: la aprobación deja de ser un booleano que cualquiera
// puede afirmar, y pasa a ser un TOKEN de un solo uso que SOLO se emite
// desde un canal que un modelo de lenguaje no controla — el propio backend
// de la aplicación, cuando una persona de verdad tocó "Aprobar" en la
// interfaz (HojaAprobacionPago.tsx) o en la tarjeta de aprobación del chat
// (ChatGerencial.tsx). Ninguna herramienta MCP puede generar este token:
// solo existe la ruta POST /api/pagos/solicitar-aprobacion, que no está
// expuesta como herramienta del asistente. Así, aunque un documento
// envenenado logre manipular al modelo para que intente llamar
// registrar_pago directamente, no tiene forma de obtener un token válido.
//
// El token es efímero (5 minutos), de un solo uso, y está atado a los
// datos EXACTOS del pago (crédito, monto, clave de idempotencia) — no sirve
// para aprobar un pago distinto al que la persona realmente vio en pantalla.
// =============================================================================

import { randomUUID } from "node:crypto";

interface AprobacionPendiente {
  token: string;
  creditoId: string;
  montoCentavos: number;
  claveIdempotencia: string;
  expiraEn: number; // epoch ms
  usado: boolean;
}

const VIGENCIA_MS = 5 * 60 * 1000; // 5 minutos: suficiente para que la persona confirme, poco para que sirva de nada robado.

const aprobaciones = new Map<string, AprobacionPendiente>();

function limpiarExpiradas() {
  const ahora = Date.now();
  for (const [token, a] of aprobaciones) {
    if (a.expiraEn < ahora) aprobaciones.delete(token);
  }
}

/**
 * Emitida SOLO por el endpoint humano-facing (POST /api/pagos/solicitar-aprobacion),
 * nunca por una herramienta MCP ni por el chat de forma autónoma.
 */
export function emitirTokenAprobacion(datos: { creditoId: string; montoCentavos: number; claveIdempotencia: string }): string {
  limpiarExpiradas();
  const token = randomUUID();
  aprobaciones.set(token, { token, ...datos, expiraEn: Date.now() + VIGENCIA_MS, usado: false });
  return token;
}

/**
 * Consume el token: solo puede usarse una vez, debe coincidir EXACTAMENTE
 * con los datos del pago que se va a registrar (no sirve para "reutilizar"
 * una aprobación vieja en un pago distinto), y no puede estar vencido.
 */
export function validarYConsumirToken(
  token: string | undefined,
  datos: { creditoId: string; montoCentavos: number; claveIdempotencia: string }
): { valido: true } | { valido: false; motivo: string } {
  if (!token) return { valido: false, motivo: "Falta el token de aprobación humana." };

  limpiarExpiradas();
  const aprobacion = aprobaciones.get(token);
  if (!aprobacion) return { valido: false, motivo: "El token de aprobación no existe o ya venció." };
  if (aprobacion.usado) return { valido: false, motivo: "El token de aprobación ya fue usado." };
  if (aprobacion.creditoId !== datos.creditoId || aprobacion.montoCentavos !== datos.montoCentavos) {
    return { valido: false, motivo: "El token no corresponde exactamente a este crédito y monto." };
  }

  aprobacion.usado = true;
  return { valido: true };
}
