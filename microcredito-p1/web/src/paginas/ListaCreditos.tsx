import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import EstadoVacio from "../componentes/EstadoVacio";
import { EsqueletoLista } from "../componentes/Esqueleto";
import Icono from "../componentes/Icono";
import { TarjetaCredito, TarjetaSolicitud, yaDesembolsada } from "../componentes/TarjetasLista";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { api } from "../lib/api";
import type { FilaCredito, SolicitudConCliente } from "../lib/tipos";
import { useCarga } from "../lib/useCarga";

type Filtro = "todos" | "atraso" | "aldia";

/**
 * Créditos del propio usuario: cliente = los suyos; asesor = su cartera. Sin datos de ejemplo:
 * si no hay créditos se muestra un estado vacío. Con `?modo=cobro` el asesor toca un crédito y va
 * directo a registrar el pago.
 */
export default function ListaCreditos() {
  const { usuario } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const [params] = useSearchParams();
  const esAsesor = usuario?.rol === "asesor";
  const modoCobro = esAsesor && params.get("modo") === "cobro";
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const { datos, error, cargando, recargar } = useCarga(async () => {
    const [creditos, solicitudes] = await Promise.all([api.get<FilaCredito[]>(conFecha("/creditos")), api.get<SolicitudConCliente[]>("/solicitudes")]);
    return { creditos, solicitudes };
  }, [fecha]);

  const creditos = datos?.creditos ?? [];
  const solicitudes = useMemo(() => (datos?.solicitudes ?? []).filter((s) => !yaDesembolsada(s, creditos)).slice().reverse(), [datos, creditos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return creditos.filter((c) => {
      if (filtro === "atraso" && c.diasDeAtraso <= 0) return false;
      if (filtro === "aldia" && c.diasDeAtraso > 0) return false;
      return !q || c.id.toLowerCase().includes(q) || c.clienteNombre.toLowerCase().includes(q);
    });
  }, [creditos, busqueda, filtro]);

  const titulo = modoCobro ? "¿A quién cobras?" : esAsesor ? "Mi cartera" : "Mis créditos";

  return (
    <div>
      <EncabezadoPantalla titulo={titulo} subtitulo={modoCobro ? "Elige el crédito para registrar el pago" : undefined} conRegreso={modoCobro} volverA="/menu" />
      <div className="flex flex-col gap-4 px-4 py-4">
        {cargando && !datos && <EsqueletoLista />}
        {error && <Alerta onReintentar={recargar}>{error}</Alerta>}

        {datos && creditos.length > 0 && (
          <>
            {(esAsesor || creditos.length > 4) && (
              <label className="relative block">
                <span className="sr-only">Buscar crédito</span>
                <Icono nombre="buscar" tamano={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta/40" />
                <input className="campo min-h-[48px] !pl-10" type="search" placeholder={esAsesor ? "Buscar por cliente o código" : "Buscar por código"} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </label>
            )}
            <div className="flex gap-2" role="group" aria-label="Filtrar créditos">
              {([["todos", "Todos"], ["atraso", "Con atraso"], ["aldia", "Al día"]] as [Filtro, string][]).map(([v, t]) => (
                <button key={v} type="button" className="chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                  {t}
                </button>
              ))}
            </div>
            {visibles.length === 0 ? (
              <EstadoVacio icono="buscar" titulo="Ningún crédito coincide" texto="Cambia el filtro o la búsqueda." />
            ) : (
              <div className="flex flex-col gap-3">
                {visibles.map((c) => (
                  <TarjetaCredito key={c.id} credito={c} a={modoCobro ? `/pago/${c.id}` : `/credito/${c.id}`} mostrarCliente={esAsesor} />
                ))}
              </div>
            )}
          </>
        )}

        {datos && creditos.length === 0 && (
          <EstadoVacio
            icono="credito"
            titulo={esAsesor ? "Aún no tienes créditos en tu cartera" : "Aún no tienes créditos"}
            texto={esAsesor ? "Registra una solicitud para un cliente; cuando gerencia la apruebe y la desembolses, aparecerá aquí." : "Cuando un crédito tuyo sea desembolsado, aparecerá aquí con su saldo y su plan de pagos."}
          >
            <Link to="/solicitud" className="boton-primario">
              {esAsesor ? "Registrar una solicitud" : "Solicitar mi primer crédito"}
            </Link>
          </EstadoVacio>
        )}

        {datos && solicitudes.length > 0 && !modoCobro && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-base font-semibold">{esAsesor ? "Solicitudes de tus clientes" : "Mis solicitudes"}</h2>
            {solicitudes.map((s) => (
              <TarjetaSolicitud key={s.id} solicitud={s} mostrarCliente={esAsesor} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
