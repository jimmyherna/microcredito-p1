import { Link, useParams } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import { EsqueletoLista } from "../componentes/Esqueleto";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { api } from "../lib/api";
import { formatearDinero, formatearFecha } from "../lib/dinero";
import type { Dinero } from "../lib/dinero";
import type { FilaPlan, RespuestaPlan } from "../lib/tipos";
import { useBase } from "../lib/rutas";
import { useCarga } from "../lib/useCarga";

type Situacion = "pagada" | "vencida" | "proxima" | "futura";

const ROTULO: Record<Situacion, string> = { pagada: "Pagada", vencida: "Vencida", proxima: "Próxima", futura: "Por venir" };
const ESTILO: Record<Situacion, string> = {
  pagada: "bg-verde-claro/60",
  vencida: "bg-mora-claro/70",
  proxima: "bg-ambar-claro",
  futura: "bg-white",
};
const INSIGNIA: Record<Situacion, string> = {
  pagada: "bg-verde text-white",
  vencida: "bg-mora text-white",
  proxima: "bg-ambar text-tinta",
  futura: "bg-tinta/10 text-tinta/70",
};

/** Tabla limpia del plan de pagos: cuota, capital, interés, saldo y estado con color. */
export default function PlanAmortizacion() {
  const base = useBase();
  const { id = "" } = useParams<{ id: string }>();
  const { usuario } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const { datos, error, cargando, recargar } = useCarga(() => api.get<RespuestaPlan>(conFecha(`/creditos/${id}/plan`)), [id, fecha]);
  const puedeCobrar = usuario?.rol === "asesor" || usuario?.rol === "gerencia";

  const filas = datos?.filas ?? [];
  const primeraPendiente = filas.find((f) => !f.saldada)?.numeroCuota;

  function situacion(f: FilaPlan): Situacion {
    if (f.saldada) return "pagada";
    if (f.fechaVencimiento < fecha) return "vencida";
    if (f.numeroCuota === primeraPendiente) return "proxima";
    return "futura";
  }

  // Saldo del préstamo después de cada cuota: se parte del capital total del plan (suma de la columna
  // "capital" que entrega la API) y se descuenta el capital de cada cuota. La API no trae esta columna.
  const capitalTotalCentavos = filas.reduce((acc, f) => acc + f.capital.centavos, 0);
  let acumulado = 0;
  const saldos = filas.map((f) => {
    acumulado += f.capital.centavos;
    const d: Dinero = { centavos: capitalTotalCentavos - acumulado, moneda: f.capital.moneda };
    return d;
  });

  return (
    <div>
      <EncabezadoPantalla titulo="Plan de pagos" subtitulo={`Crédito ${id}`} conRegreso volverA={`${base}/credito/${id}`} />
      <div className="px-4 py-4">
        {cargando && !datos && <EsqueletoLista filas={4} />}
        {error && <Alerta onReintentar={recargar}>{error}</Alerta>}

        {datos && (
          <>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta/70" aria-label="Leyenda">
              {(["pagada", "proxima", "vencida", "futura"] as Situacion[]).map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${INSIGNIA[s].split(" ")[0]}`} aria-hidden="true" /> {ROTULO[s]}
                </span>
              ))}
            </div>
            <div className="overflow-hidden rounded-tarjeta border border-linea">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-navy text-white">
                    <th scope="col" className="px-2 py-2.5 text-left font-medium">Cuota</th>
                    <th scope="col" className="px-1 py-2.5 text-right font-medium">Monto</th>
                    <th scope="col" className="px-1 py-2.5 text-right font-medium">Capital</th>
                    <th scope="col" className="px-1 py-2.5 text-right font-medium">Interés</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {filas.map((f, i) => {
                    const s = situacion(f);
                    return (
                      <tr key={f.numeroCuota} className={ESTILO[s]}>
                        <td className="px-2 py-2.5">
                          <p className="cifra text-sm font-semibold">#{f.numeroCuota}</p>
                          <p className="cifra text-[11px] text-tinta/60">{formatearFecha(f.fechaVencimiento)}</p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${INSIGNIA[s]}`}>{ROTULO[s]}</span>
                        </td>
                        <td className="cifra px-1 py-2.5 text-right font-medium">{formatearDinero(f.cuota)}</td>
                        <td className="cifra px-1 py-2.5 text-right">{formatearDinero(f.capital)}</td>
                        <td className="cifra px-1 py-2.5 text-right">{formatearDinero(f.interes)}</td>
                        <td className="cifra px-2 py-2.5 text-right">{formatearDinero(saldos[i])}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {puedeCobrar && datos && (
        <div className="sticky bottom-0 border-t border-linea bg-white/95 px-4 py-3 backdrop-blur">
          <Link to={`${base}/pago/${id}`} className="boton-cta">
            Registrar un pago
          </Link>
        </div>
      )}
    </div>
  );
}
