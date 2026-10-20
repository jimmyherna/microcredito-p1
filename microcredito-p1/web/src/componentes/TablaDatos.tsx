import { useMemo, useState, type ReactNode } from "react";
import Icono from "./Icono";

export interface Columna<T> {
  clave: string;
  titulo: string;
  render: (fila: T) => ReactNode;
  /** Si existe, la columna se puede ordenar por este valor. */
  valor?: (fila: T) => string | number;
  alinear?: "izq" | "der";
}

/** Tabla con orden por columna y búsqueda local. Pensada para escritorio (gerencia). */
export default function TablaDatos<T>({
  filas,
  columnas,
  idFila,
  onFila,
  textoBusqueda,
  placeholderBusqueda = "Buscar…",
  vacio,
  filtros,
  filaActiva,
}: {
  filas: T[];
  columnas: Columna<T>[];
  idFila: (fila: T) => string;
  onFila?: (fila: T) => void;
  textoBusqueda?: (fila: T) => string;
  placeholderBusqueda?: string;
  vacio?: ReactNode;
  filtros?: ReactNode;
  filaActiva?: string | null;
}) {
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    let r = filas;
    const q = busqueda.trim().toLowerCase();
    if (q && textoBusqueda) r = r.filter((f) => textoBusqueda(f).toLowerCase().includes(q));
    if (orden) {
      const col = columnas.find((c) => c.clave === orden.clave);
      if (col?.valor) {
        const v = col.valor;
        r = [...r].sort((a, b) => {
          const x = v(a);
          const y = v(b);
          const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
          return orden.asc ? c : -c;
        });
      }
    }
    return r;
  }, [filas, columnas, orden, busqueda, textoBusqueda]);

  function alternar(clave: string) {
    setOrden((o) => (o && o.clave === clave ? (o.asc ? { clave, asc: false } : null) : { clave, asc: true }));
  }

  return (
    <div className="tarjeta !p-0 overflow-hidden">
      {(textoBusqueda || filtros) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-linea px-4 py-3">
          {textoBusqueda && (
            <label className="relative flex-1 min-w-[200px]">
              <span className="sr-only">Buscar</span>
              <Icono nombre="buscar" tamano={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta/40" />
              <input className="campo !pl-10" placeholder={placeholderBusqueda} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </label>
          )}
          {filtros}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="tabla-datos w-full text-sm">
          <thead className="bg-papel-hueso text-left text-xs uppercase tracking-wide text-tinta/60">
            <tr>
              {columnas.map((c) => {
                const activa = orden?.clave === c.clave;
                return (
                  <th key={c.clave} scope="col" className={c.alinear === "der" ? "text-right" : ""} aria-sort={activa ? (orden!.asc ? "ascending" : "descending") : undefined}>
                    {c.valor ? (
                      <button type="button" onClick={() => alternar(c.clave)} className="inline-flex min-h-[32px] items-center gap-1 font-semibold uppercase tracking-wide hover:text-navy">
                        {c.titulo}
                        <span className={activa ? "text-navy" : "text-tinta/30"}>{activa ? (orden!.asc ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.titulo
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={columnas.length} className="!py-8 text-center text-tinta/55">
                  {vacio ?? "No hay resultados."}
                </td>
              </tr>
            )}
            {visibles.map((f) => {
              const id = idFila(f);
              return (
                <tr
                  key={id}
                  onClick={onFila ? () => onFila(f) : undefined}
                  onKeyDown={onFila ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onFila(f)) : undefined}
                  tabIndex={onFila ? 0 : undefined}
                  className={`border-t border-linea ${onFila ? "cursor-pointer hover:bg-navy-claro/50" : ""} ${filaActiva === id ? "bg-navy-claro/60" : ""}`}
                >
                  {columnas.map((c) => (
                    <td key={c.clave} className={c.alinear === "der" ? "text-right" : ""}>
                      {c.render(f)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-linea px-4 py-2 text-xs text-tinta/50">
        {visibles.length} {visibles.length === 1 ? "registro" : "registros"}
      </p>
    </div>
  );
}
