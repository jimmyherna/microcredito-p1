export interface ColumnaDato {
  etiqueta: string;
  valor: number;
  texto: string;
  color?: string;
}

/** Columnas verticales en SVG puro (p. ej. cobros por mes). Sin librerías. */
export default function GraficaColumnas({ datos, color = "#2E9E5B", descripcion = "Gráfica de columnas" }: { datos: ColumnaDato[]; color?: string; descripcion?: string }) {
  const ancho = 480;
  const alto = 230;
  const margenSup = 28;
  const margenInf = 30;
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const area = alto - margenSup - margenInf;
  const paso = ancho / Math.max(1, datos.length);
  const anchoCol = Math.min(52, paso * 0.6);
  const resumen = `${descripcion}: ${datos.map((d) => `${d.etiqueta} ${d.texto}`).join("; ")}`;

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" role="img" aria-label={resumen} className="block max-w-full">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1="0" x2={ancho} y1={margenSup + area * (1 - f)} y2={margenSup + area * (1 - f)} stroke="#E1E5EA" strokeDasharray={f === 0 ? undefined : "3 4"} />
      ))}
      {datos.map((d, i) => {
        const h = d.valor > 0 ? Math.max(3, (d.valor / maximo) * area) : 0;
        const x = i * paso + (paso - anchoCol) / 2;
        const y = margenSup + area - h;
        return (
          <g key={d.etiqueta}>
            <title>{`${d.etiqueta}: ${d.texto}`}</title>
            <rect x={x} y={y} width={anchoCol} height={h} rx="5" fill={d.color ?? color} />
            <text x={x + anchoCol / 2} y={Math.max(12, y - 6)} fontSize="10.5" fontWeight="600" textAnchor="middle" fill="#15181D" fontFamily="IBM Plex Mono, monospace">
              {d.texto}
            </text>
            <text x={x + anchoCol / 2} y={alto - 10} fontSize="12" textAnchor="middle" fill="#15181D99" fontFamily="IBM Plex Sans, sans-serif">
              {d.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
