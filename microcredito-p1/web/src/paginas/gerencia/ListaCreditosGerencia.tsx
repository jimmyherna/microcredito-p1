import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alerta from "../../componentes/Alerta";
import { EsqueletoLista } from "../../componentes/Esqueleto";
import Insignia from "../../componentes/Insignia";
import TablaDatos, { type Columna } from "../../componentes/TablaDatos";
import { useFechaOperacion } from "../../contexto/FechaOperacionContext";
import { api } from "../../lib/api";
import { ETIQUETA_ESTADO, ETIQUETA_TRAMO_CORTA, formatearDinero } from "../../lib/dinero";
import { fechaLarga } from "../../lib/fecha";
import type { FilaCredito } from "../../lib/tipos";
import { useCarga } from "../../lib/useCarga";

type Filtro = "todos" | "atraso" | "aldia";

/** Vista de créditos para gerencia: todos los créditos, con orden por columna, búsqueda y filtro. */
export default function ListaCreditosGerencia() {
  const { fecha, conFecha } = useFechaOperacion();
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const { datos, error, cargando, recargar } = useCarga(() => api.get<FilaCredito[]>(conFecha("/creditos")), [fecha]);

  const todas = datos ?? [];
  const filas = useMemo(
    () => todas.filter((c) => (filtro === "atraso" ? c.diasDeAtraso > 0 : filtro === "aldia" ? c.diasDeAtraso <= 0 : true)),
    [todas, filtro]
  );

  const columnas: Columna<FilaCredito>[] = [
    { clave: "id", titulo: "Crédito", render: (c) => <span className="cifra font-medium">{c.id}</span>, valor: (c) => c.id },
    { clave: "cliente", titulo: "Cliente", render: (c) => c.clienteNombre, valor: (c) => c.clienteNombre },
    { clave: "asesor", titulo: "Asesor", render: (c) => c.asesorNombre ?? <span className="text-tinta/45">Sin asignar</span>, valor: (c) => c.asesorNombre ?? "" },
    { clave: "estado", titulo: "Estado", render: (c) => <Insignia valor={c.estado}>{ETIQUETA_ESTADO[c.estado] ?? c.estado}</Insignia>, valor: (c) => c.estado },
    { clave: "tramo", titulo: "Tramo", render: (c) => <Insignia valor={c.tramo}>{ETIQUETA_TRAMO_CORTA[c.tramo] ?? c.tramo}</Insignia>, valor: (c) => c.diasDeAtraso },
    { clave: "dias", titulo: "Días de atraso", alinear: "der", render: (c) => <span className="cifra">{c.diasDeAtraso}</span>, valor: (c) => c.diasDeAtraso },
    { clave: "saldo", titulo: "Saldo", alinear: "der", render: (c) => <span className="cifra font-medium">{formatearDinero(c.saldoCapital)}</span>, valor: (c) => c.saldoCapital.centavos },
  ];

  const chips: [Filtro, string][] = [["todos", "Todos"], ["atraso", "Con atraso"], ["aldia", "Al día"]];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Créditos</h1>
        <p className="text-sm text-tinta/60">Estado de cada crédito al {fechaLarga(fecha)}. Toca una fila para ver su detalle.</p>
      </div>
      {error && <Alerta onReintentar={recargar}>{error}</Alerta>}
      {cargando && !datos && <EsqueletoLista filas={3} />}
      {datos && (
        <TablaDatos
          filas={filas}
          columnas={columnas}
          idFila={(c) => c.id}
          onFila={(c) => navegar(`/gerencia/credito/${c.id}`)}
          textoBusqueda={(c) => `${c.id} ${c.clienteNombre} ${c.asesorNombre ?? ""}`}
          placeholderBusqueda="Buscar por crédito, cliente o asesor"
          vacio="No hay créditos con este filtro."
          filtros={
            <div className="flex gap-2" role="group" aria-label="Filtrar créditos">
              {chips.map(([v, t]) => (
                <button key={v} type="button" className="chip !min-h-[40px]" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                  {t}
                </button>
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}
