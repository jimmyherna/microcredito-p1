export interface BarraDato {
  etiqueta: string;
  /** Valor numérico ya entregado por la API (sólo sirve para el largo de la barra). */
  valor: number;
  /** Texto ya formateado para mostrar. */
  texto: string;
  color?: string;
}

/** Barras horizontales en SVG puro. Escala uniforme (el texto no se deforma). */
export default function GraficaBarras({ datos, colorPorDefecto = "#15304D", descripcion = "Gráfica de barras" }: { datos: BarraDato[]; colorPorDefecto?: string; descripcion?: string }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const ancho = 420;
  const altoFila = 46;
  const alto = datos.length * altoFila + 4;
  const resumen = `${descripcion}: ${datos.map((d) => `${d.etiqueta} ${d.texto}`).join("; ")}`;

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" aria-label={resumen} className="block max-w-full">
      {datos.map((d, i) => {
        const y = i * altoFila;
        const largo = d.valor > 0 ? Math.max(6, (d.valor / maximo) * ancho) : 0;
        return (
          <g key={d.etiqueta}>
            <title>{`${d.etiqueta}: ${d.texto}`}</title>
            <text x="0" y={y + 14} fontSize="13" fill="#15181D" fontFamily="IBM Plex Sans, sans-serif">
              {d.etiqueta}
            </text>
            <text x={ancho} y={y + 14} fontSize="13" fontWeight="600" fill="#15181D" fontFamily="IBM Plex Mono, monospace" textAnchor="end">
              {d.texto}
            </text>
            <rect x="0" y={y + 22} width={ancho} height="12" rx="6" fill="#EEF1F5" />
            {largo > 0 && <rect x="0" y={y + 22} width={largo} height="12" rx="6" fill={d.color ?? colorPorDefecto} />}
          </g>
        );
      })}
    </svg>
  );
}
