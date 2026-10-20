export interface FilaDoble {
  etiqueta: string;
  /** Total (cartera activa) y la parte en riesgo, ya calculadas por la API. */
  total: number;
  parte: number;
  textoTotal: string;
  textoParte: string;
  /** Texto del porcentaje (p. ej. "12.5 %"), ya formateado. */
  textoPorcentaje: string;
}

/** Barras: cartera activa (navy) con la parte en riesgo superpuesta (rojo), una fila por asesor. */
export default function GraficaDoble({ filas }: { filas: FilaDoble[] }) {
  const ancho = 460;
  const altoFila = 58;
  const alto = filas.length * altoFila + 4;
  const maximo = Math.max(1, ...filas.map((f) => f.total));
  const resumen = `Cartera y riesgo por asesor: ${filas.map((f) => `${f.etiqueta} cartera ${f.textoTotal}, en riesgo ${f.textoParte} (${f.textoPorcentaje})`).join("; ")}`;

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" aria-label={resumen} className="block max-w-full">
        {filas.map((f, i) => {
          const y = i * altoFila;
          const largoTotal = f.total > 0 ? Math.max(6, (f.total / maximo) * ancho) : 0;
          const largoParte = f.parte > 0 ? Math.max(4, (f.parte / maximo) * ancho) : 0;
          return (
            <g key={f.etiqueta}>
              <title>{`${f.etiqueta}: cartera ${f.textoTotal}, en riesgo ${f.textoParte} (${f.textoPorcentaje})`}</title>
              <text x="0" y={y + 14} fontSize="13" fontWeight="500" fill="#15181D" fontFamily="IBM Plex Sans, sans-serif">
                {f.etiqueta.length > 28 ? `${f.etiqueta.slice(0, 27)}…` : f.etiqueta}
              </text>
              <text x={ancho} y={y + 14} fontSize="12" fill="#15181D" fontFamily="IBM Plex Mono, monospace" textAnchor="end">
                {f.textoTotal} · riesgo {f.textoPorcentaje}
              </text>
              <rect x="0" y={y + 22} width={ancho} height="14" rx="7" fill="#EEF1F5" />
              {largoTotal > 0 && <rect x="0" y={y + 22} width={largoTotal} height="14" rx="7" fill="#15304D" />}
              {largoParte > 0 && <rect x="0" y={y + 22} width={Math.min(largoParte, largoTotal || largoParte)} height="14" rx="7" fill="#C23B32" />}
              <text x="0" y={y + 51} fontSize="11" fill="#15181D99" fontFamily="IBM Plex Sans, sans-serif">
                En riesgo: {f.textoParte}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-tinta/70">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-navy" aria-hidden="true" /> Cartera activa</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mora" aria-hidden="true" /> En riesgo</span>
      </div>
    </div>
  );
}
