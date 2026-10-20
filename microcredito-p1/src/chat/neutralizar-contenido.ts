// Defensa en profundidad contra inyección de instrucciones (OWASP LLM01, OP-7).
// Todo texto recuperado del corpus es DATO NO CONFIABLE. Antes de entregarlo al modelo
// (o al usuario) se detectan y se tachan los pasajes dirigidos a una IA: el modelo nunca
// llega a ver la orden, y el usuario ve un aviso. No sustituye el prompt de sistema ni el
// token de aprobación humana; se suma a ellos.

const PATRONES_SOSPECHOSOS: RegExp[] = [
  /instrucci[oó]n(es)? (para|dirigida[s]? a)l? (el )?(asistente|ia|modelo)/i,
  /ignora (todas )?(las |tus )?(reglas|instrucciones|restricciones)/i,
  /(a partir de este momento|de ahora en adelante)[^.]*responde/i,
  /ejecuta (de inmediato )?(la )?herramienta/i,
  /sin pedir aprobaci[oó]n/i,
  /muestra (el )?(dpi|tel[eé]fono)/i,
  /system prompt|prompt del sistema/i,
];

export const MARCADOR_OMITIDO =
  "[⚠ Pasaje omitido: contenía instrucciones dirigidas a un asistente de IA. Se trata como dato no confiable y NO se obedece.]";

export interface ContenidoNeutralizado {
  texto: string;
  sospechoso: boolean;
}

export function neutralizarContenido(entrada: string): ContenidoNeutralizado {
  let sospechoso = false;
  const esSospechoso = (s: string) => PATRONES_SOSPECHOSOS.some((p) => p.test(s));

  // 1) Bloques entre corchetes (formato típico de la inyección).
  let texto = entrada.replace(/\[[^\]]*\]/g, (bloque) => {
    if (esSospechoso(bloque)) {
      sospechoso = true;
      return MARCADOR_OMITIDO;
    }
    return bloque;
  });
  // 2) Líneas sueltas con el mismo tipo de órdenes.
  texto = texto
    .split("\n")
    .map((linea) => {
      if (!linea.includes(MARCADOR_OMITIDO) && esSospechoso(linea)) {
        sospechoso = true;
        return MARCADOR_OMITIDO;
      }
      return linea;
    })
    .join("\n");
  return { texto, sospechoso };
}
