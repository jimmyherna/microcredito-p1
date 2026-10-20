/** Bloque de carga (skeleton). */
export function Esqueleto({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`esqueleto ${className}`} aria-hidden="true" />;
}

/** Varias tarjetas esqueleto para listas. */
export function EsqueletoLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="tarjeta flex flex-col gap-3">
          <Esqueleto className="h-4 w-1/3" />
          <Esqueleto className="h-7 w-2/3" />
          <Esqueleto className="h-3 w-1/2" />
        </div>
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
