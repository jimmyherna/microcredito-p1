import { useMemo, useState } from "react";
import Alerta from "../../componentes/Alerta";
import { EsqueletoLista } from "../../componentes/Esqueleto";
import Insignia from "../../componentes/Insignia";
import PanelSolicitud from "../../componentes/PanelSolicitud";
import TablaDatos, { type Columna } from "../../componentes/TablaDatos";
import { api } from "../../lib/api";
import { ETIQUETA_SOLICITUD, formatearDinero, formatearFecha } from "../../lib/dinero";
import type { SolicitudConCliente } from "../../lib/tipos";
import { useCarga } from "../../lib/useCarga";

type Filtro = "SOLICITADO" | "APROBADO" | "RECHAZADO" | "TODAS";

/** Bandeja del comité: solicitudes con orden y filtro; aprobar o rechazar (con motivo) y desembolsar desde el panel. */
export default function BandejaSolicitudes() {
  const { datos, error, cargando, recargar } = useCarga(() => api.get<SolicitudConCliente[]>("/solicitudes"), []);
  const [filtro, setFiltro] = useState<Filtro>("SOLICITADO");
  const [sel, setSel] = useState<string | null>(null);

  const todas = datos ?? [];
  const filas = useMemo(() => (filtro === "TODAS" ? todas : todas.filter((s) => s.estado === filtro)), [todas, filtro]);
  const cuenta = (e: Filtro) => (e === "TODAS" ? todas.length : todas.filter((s) => s.estado === e).length);

  const columnas: Columna<SolicitudConCliente>[] = [
    { clave: "id", titulo: "Solicitud", render: (s) => <span className="cifra font-medium">{s.id}</span>, valor: (s) => s.id },
    { clave: "cliente", titulo: "Cliente", render: (s) => s.clienteNombre, valor: (s) => s.clienteNombre },
    { clave: "monto", titulo: "Monto", alinear: "der", render: (s) => <span className="cifra">{formatearDinero(s.montoSolicitado)}</span>, valor: (s) => s.montoSolicitado.centavos },
    { clave: "plazo", titulo: "Plazo", alinear: "der", render: (s) => `${s.plazoMeses} m`, valor: (s) => s.plazoMeses },
    { clave: "fecha", titulo: "Fecha", render: (s) => formatearFecha(s.fechaSolicitud), valor: (s) => s.fechaSolicitud },
    { clave: "estado", titulo: "Estado", render: (s) => <Insignia valor={s.estado}>{ETIQUETA_SOLICITUD[s.estado]}</Insignia>, valor: (s) => s.estado },
  ];

  const chips: [Filtro, string][] = [["SOLICITADO", "En revisión"], ["APROBADO", "Aprobadas"], ["RECHAZADO", "Rechazadas"], ["TODAS", "Todas"]];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Solicitudes de crédito</h1>
        <p className="text-sm text-tinta/60">Aprueba o rechaza (con motivo) y desembolsa las aprobadas.</p>
      </div>
      {error && <Alerta onReintentar={recargar}>{error}</Alerta>}
      {cargando && !datos && <EsqueletoLista filas={2} />}
      {datos && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <TablaDatos
            filas={filas}
            columnas={columnas}
            idFila={(s) => s.id}
            onFila={(s) => setSel(s.id)}
            filaActiva={sel}
            textoBusqueda={(s) => `${s.id} ${s.clienteNombre}`}
            placeholderBusqueda="Buscar por cliente o código"
            vacio={filtro === "SOLICITADO" ? "No hay solicitudes en revisión. Todo al día." : "No hay solicitudes con este filtro."}
            filtros={
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
                {chips.map(([v, t]) => (
                  <button key={v} type="button" className="chip !min-h-[40px]" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                    {t} ({cuenta(v)})
                  </button>
                ))}
              </div>
            }
          />
          <div>
            {sel ? <PanelSolicitud key={sel} id={sel} onCambio={recargar} /> : <div className="tarjeta text-sm text-tinta/60">Selecciona una solicitud de la tabla para ver su detalle y decidir.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
