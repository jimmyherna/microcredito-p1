import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alerta from "../../componentes/Alerta";
import { Esqueleto } from "../../componentes/Esqueleto";
import GraficaBarras from "../../componentes/GraficaBarras";
import GraficaColumnas from "../../componentes/GraficaColumnas";
import GraficaDoble from "../../componentes/GraficaDoble";
import GraficaDona from "../../componentes/GraficaDona";
import Icono from "../../componentes/Icono";
import TablaDatos, { type Columna } from "../../componentes/TablaDatos";
import TarjetaKpi from "../../componentes/TarjetaKpi";
import { useFechaOperacion } from "../../contexto/FechaOperacionContext";
import { api } from "../../lib/api";
import { COLOR_TRAMO, ETIQUETA_SOLICITUD, ETIQUETA_TRAMO_CORTA, formatearDinero, formatearFecha, formatearPorcentaje } from "../../lib/dinero";
import { fechaLarga } from "../../lib/fecha";
import type { CarteraEnRiesgo, ResumenGerencial } from "../../lib/tipos";
import { useCarga } from "../../lib/useCarga";

const COLOR_ESTADO: Record<string, string> = { SOLICITADO: "#15304D", APROBADO: "#2E9E5B", RECHAZADO: "#C23B32", ANULADO: "#9AA3AD" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaMes(mes: string): string {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? m} ${String(a).slice(2)}`;
}

function Panel({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <section className="tarjeta">
      <h2 className="font-display text-base font-semibold">{titulo}</h2>
      {subtitulo && <p className="mb-3 text-xs text-tinta/55">{subtitulo}</p>}
      {!subtitulo && <div className="mb-3" />}
      {children}
    </section>
  );
}

type Reciente = ResumenGerencial["pagosRecientes"][number];

/** Tablero de gerencia: KPIs y gráficas (SVG propio) a la fecha de corte. Todo viene de /gerencia/resumen y /cartera/en-riesgo. */
export default function TableroGerencial() {
  const { fecha, conFecha } = useFechaOperacion();
  const navegar = useNavigate();
  const { datos, error, cargando, recargar } = useCarga(async () => {
    const [resumen, cartera] = await Promise.all([api.get<ResumenGerencial>(conFecha("/gerencia/resumen")), api.get<CarteraEnRiesgo>(conFecha("/cartera/en-riesgo"))]);
    return { resumen, cartera };
  }, [fecha]);

  const columnasPagos: Columna<Reciente>[] = [
    { clave: "fecha", titulo: "Fecha", render: (f) => formatearFecha(f.fecha), valor: (f) => f.fecha },
    { clave: "cliente", titulo: "Cliente", render: (f) => f.clienteNombre, valor: (f) => f.clienteNombre },
    { clave: "credito", titulo: "Crédito", render: (f) => <span className="cifra">{f.creditoId}</span>, valor: (f) => f.creditoId },
    { clave: "monto", titulo: "Monto", alinear: "der", render: (f) => <span className="cifra font-medium">{formatearDinero(f.monto)}</span>, valor: (f) => f.monto.centavos },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Tablero gerencial</h1>
        <p className="text-sm text-tinta/60">Situación de la cartera al {fechaLarga(fecha)}.</p>
      </div>

      {error && <Alerta onReintentar={recargar}>{error}</Alerta>}

      {cargando && !datos && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="tarjeta flex flex-col gap-2"><Esqueleto className="h-3 w-1/2" /><Esqueleto className="h-7 w-3/4" /></div>
          ))}
        </div>
      )}

      {datos && (() => {
        const { resumen: r, cartera: c } = datos;
        const totalSolicitudes = r.solicitudesPorEstado.reduce((a, s) => a + s.cantidad, 0);
        const sinCartera = c.filasPorTramo.every((f) => f.saldoCapital.centavos === 0);
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <TarjetaKpi etiqueta="Cartera activa" valor={formatearDinero(c.carteraActiva)} acento="navy" icono={<Icono nombre="credito" />} />
              <TarjetaKpi etiqueta="Cartera en riesgo" valor={formatearDinero(c.carteraEnRiesgo)} detalle={`${formatearPorcentaje(c.porcentaje)} de la cartera`} acento="mora" icono={<Icono nombre="riesgo" />} />
              <TarjetaKpi etiqueta="Créditos activos" valor={String(r.conteos.creditosActivos)} detalle={`${r.conteos.clientes} clientes`} acento="verde" />
              <TarjetaKpi etiqueta="Créditos en mora" valor={String(r.conteos.creditosEnMora)} detalle={`Cartera en mora ${formatearDinero(c.carteraEnMora)}`} acento="ambar" />
              <TarjetaKpi etiqueta="Solicitudes pendientes" valor={String(r.conteos.solicitudesPendientes)} acento="navy" />
              <TarjetaKpi etiqueta={`Vencen en ${r.vencimientosProximos.dias} días`} valor={formatearDinero(r.vencimientosProximos.total)} detalle={`${r.vencimientosProximos.cantidad} cuotas`} acento="verde" />
            </div>

            {r.conteos.solicitudesPendientes > 0 && (
              <Alerta tono="aviso" titulo={`${r.conteos.solicitudesPendientes} ${r.conteos.solicitudesPendientes === 1 ? "solicitud espera" : "solicitudes esperan"} tu decisión`}>
                <Link to="/gerencia/solicitudes" className="font-semibold underline">Ir a la bandeja de solicitudes</Link>
              </Alerta>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel titulo="Cartera por tramo de atraso" subtitulo="Saldo de capital en cada tramo">
                {sinCartera ? (
                  <p className="text-sm text-tinta/55">Aún no hay cartera a esta fecha.</p>
                ) : (
                  <GraficaBarras
                    descripcion="Cartera por tramo"
                    datos={c.filasPorTramo.map((f) => ({
                      etiqueta: `${ETIQUETA_TRAMO_CORTA[f.tramo] ?? f.tramo} · ${f.creditos.length} ${f.creditos.length === 1 ? "crédito" : "créditos"}`,
                      valor: f.saldoCapital.centavos,
                      texto: formatearDinero(f.saldoCapital),
                      color: COLOR_TRAMO[f.tramo],
                    }))}
                  />
                )}
              </Panel>

              <Panel titulo="Composición de la cartera" subtitulo="Proporción del saldo por tramo">
                {sinCartera ? (
                  <p className="text-sm text-tinta/55">Sin datos para mostrar.</p>
                ) : (
                  <GraficaDona
                    descripcion="Composición de la cartera"
                    centro={{ valor: formatearPorcentaje(c.porcentaje), etiqueta: "en riesgo" }}
                    segmentos={c.filasPorTramo.map((f) => ({ etiqueta: ETIQUETA_TRAMO_CORTA[f.tramo] ?? f.tramo, valor: f.saldoCapital.centavos, color: COLOR_TRAMO[f.tramo] ?? "#15304D", texto: formatearDinero(f.saldoCapital) }))}
                  />
                )}
              </Panel>

              <Panel titulo="Cobros por mes" subtitulo="Últimos 6 meses hasta la fecha de corte">
                <GraficaColumnas descripcion="Cobros por mes" datos={r.cobrosPorMes.map((m) => ({ etiqueta: etiquetaMes(m.mes), valor: m.total.centavos, texto: formatearDinero(m.total) }))} />
              </Panel>

              <Panel titulo="Solicitudes por estado" subtitulo="Todas las solicitudes registradas">
                {totalSolicitudes === 0 ? (
                  <p className="text-sm text-tinta/55">Todavía no hay solicitudes.</p>
                ) : (
                  <GraficaDona
                    descripcion="Solicitudes por estado"
                    centro={{ valor: String(totalSolicitudes), etiqueta: "solicitudes" }}
                    segmentos={r.solicitudesPorEstado.map((s) => ({ etiqueta: ETIQUETA_SOLICITUD[s.estado] ?? s.estado, valor: s.cantidad, color: COLOR_ESTADO[s.estado] ?? "#15304D", texto: String(s.cantidad) }))}
                  />
                )}
              </Panel>
            </div>

            <Panel titulo="Cartera y riesgo por asesor" subtitulo="Cartera activa de cada asesor y la parte en riesgo">
              {r.porAsesor.length === 0 ? (
                <p className="text-sm text-tinta/55">No hay asesores registrados.</p>
              ) : (
                <GraficaDoble
                  filas={r.porAsesor.map((a) => ({
                    etiqueta: a.nombre,
                    total: a.carteraActiva.centavos,
                    parte: a.carteraEnRiesgo.centavos,
                    textoTotal: formatearDinero(a.carteraActiva),
                    textoParte: formatearDinero(a.carteraEnRiesgo),
                    textoPorcentaje: formatearPorcentaje(a.porcentajeRiesgo),
                  }))}
                />
              )}
            </Panel>

            <div>
              <h2 className="mb-3 font-display text-base font-semibold">Últimos cobros</h2>
              <TablaDatos
                filas={r.pagosRecientes}
                columnas={columnasPagos}
                idFila={(f) => `${f.creditoId}-${f.fecha}-${f.monto.centavos}`}
                onFila={(f) => navegar(`/gerencia/credito/${f.creditoId}`)}
                vacio="Aún no se han registrado cobros."
              />
            </div>
          </>
        );
      })()}
    </div>
  );
}
