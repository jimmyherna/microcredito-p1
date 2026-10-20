export interface SegmentoDona {
  etiqueta: string;
  valor: number;
  color: string;
  /** Texto del valor para la leyenda (opcional). */
  texto?: string;
}

/** Dona en SVG puro con leyenda. Los valores vienen de la API; aquí sólo se dibujan proporciones. */
export default function GraficaDona({ segmentos, centro, descripcion = "Distribución" }: { segmentos: SegmentoDona[]; centro: { valor: string; etiqueta: string }; descripcion?: string }) {
  const total = segmentos.reduce((acc, s) => acc + s.valor, 0);
  const radio = 15.9155; // circunferencia ≈ 100: se trabaja en porcentaje directo
  let acumulado = 0;
  const resumen = `${descripcion}: ${segmentos.map((s) => `${s.etiqueta} ${s.texto ?? s.valor}`).join("; ")}`;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg viewBox="0 0 36 36" width="170" height="170" role="img" aria-label={resumen} className="shrink-0">
        <circle cx="18" cy="18" r={radio} fill="none" stroke="#EEF1F5" strokeWidth="4.5" />
        {total > 0 &&
          segmentos.map((s) => {
            const pct = (s.valor / total) * 100;
            const desplazamiento = 25 - acumulado;
            acumulado += pct;
            if (pct <= 0) return null;
            return (
              <circle key={s.etiqueta} cx="18" cy="18" r={radio} fill="none" stroke={s.color} strokeWidth="4.5" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={desplazamiento}>
                <title>{`${s.etiqueta}: ${s.texto ?? s.valor}`}</title>
              </circle>
            );
          })}
        <text x="18" y="18.2" textAnchor="middle" fontSize="5" fontWeight="600" fill="#15181D" fontFamily="IBM Plex Mono, monospace">
          {centro.valor}
        </text>
        <text x="18" y="22.6" textAnchor="middle" fontSize="2.6" fill="#15181D99" fontFamily="IBM Plex Sans, sans-serif">
          {centro.etiqueta}
        </text>
      </svg>
      <ul className="flex w-full flex-col gap-1.5">
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-tinta/80">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.etiqueta}
            </span>
            <span className="cifra font-medium">{s.texto ?? s.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
