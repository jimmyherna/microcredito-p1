import { Link, useParams } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import { EsqueletoLista } from "../componentes/Esqueleto";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { api } from "../lib/api";
import { ETIQUETA_TRAMO, formatearDinero, formatearFecha, formatearPorcentaje, rangoDeTramoMora } from "../lib/dinero";
import type { CreditoDetalle, DeudaExigible, DetalleMora as DetalleMoraTipo } from "../lib/tipos";
import { useBase } from "../lib/rutas";
import { useCarga } from "../lib/useCarga";

function Fila({ etiqueta, ayuda, valor, fuerte }: { etiqueta: string; ayuda?: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div>
        <p className={`text-sm ${fuerte ? "font-semibold" : "text-tinta/75"}`}>{etiqueta}</p>
        {ayuda && <p className="text-xs text-tinta/50">{ayuda}</p>}
      </div>
      <p className={`cifra shrink-0 text-sm ${fuerte ? "text-base font-semibold text-mora" : "font-medium"}`}>{valor}</p>
    </div>
  );
}

/**
 * Mora de un crédito, todo desde la API. Cliente: lenguaje simple (cuánto debe hoy, desde cuándo y
 * de dónde sale). Asesor y gerencia: además el detalle técnico (tramo, tasa, capital en mora).
 */
export default function DetalleMora() {
  const base = useBase();
  const { id = "" } = useParams<{ id: string }>();
  const { usuario } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const esCliente = usuario?.rol === "cliente";

  const { datos, error, cargando, recargar } = useCarga(async () => {
    const [mora, credito, deuda] = await Promise.all([
      api.get<DetalleMoraTipo>(conFecha(`/creditos/${id}/mora`)),
      api.get<CreditoDetalle>(conFecha(`/creditos/${id}`)),
      api.get<DeudaExigible>(conFecha(`/creditos/${id}/deuda-exigible`)),
    ]);
    return { mora, credito, deuda };
  }, [id, fecha]);

  const encabezado = <EncabezadoPantalla titulo={esCliente ? "Mi atraso" : "Detalle de la mora"} subtitulo={`Crédito ${id}`} conRegreso volverA={`${base}/credito/${id}`} />;

  if (!datos) {
    return (
      <div>
        {encabezado}
        <div className="px-4 py-4">{error ? <Alerta onReintentar={recargar}>{error}</Alerta> : cargando && <EsqueletoLista filas={2} />}</div>
      </div>
    );
  }

  const { mora, credito, deuda } = datos;
  const alDia = mora.diasDeAtraso <= 0;
  const dias = mora.diasDeAtraso;
  const cuota = deuda.cuotaExigible;

  return (
    <div>
      {encabezado}
      <div className="flex flex-col gap-4 px-4 py-4">
        {alDia ? (
          <>
            <div className="rounded-tarjeta bg-verde-claro px-5 py-6 text-center text-verde-oscuro" role="status">
              <p className="font-display text-2xl font-semibold">Estás al día</p>
              <p className="mt-1 text-sm">No tienes atraso en este crédito{!esCliente ? " a la fecha de operación" : ""}.</p>
            </div>
            {credito.proximaCuota && credito.estado !== "CANCELADO" && (
              <div className="tarjeta flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Tu próxima cuota</p>
                  <p className="text-xs text-tinta/55">Vence el {formatearFecha(credito.proximaCuota.fechaVencimiento)}</p>
                </div>
                <p className="cifra text-lg font-semibold">{formatearDinero(credito.proximaCuota.monto)}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-tarjeta bg-mora-claro px-5 py-5 text-mora-oscuro" role="status">
              <p className="text-sm">Hoy debes</p>
              <p className="cifra text-3xl font-semibold">{formatearDinero(deuda.totalExigible)}</p>
              <p className="mt-2 text-sm">
                Llevas {dias} {dias === 1 ? "día" : "días"} de atraso
                {cuota ? `: tu cuota #${cuota.numeroCuota} venció el ${formatearFecha(cuota.fechaVencimiento)}.` : "."}
              </p>
            </div>

            <section>
              <h2 className="mb-2 font-display text-base font-semibold">¿De dónde sale ese monto?</h2>
              <div className="tarjeta divide-y divide-linea !p-0">
                <Fila etiqueta="Parte de lo prestado" ayuda="La cuota que no se pagó a tiempo" valor={formatearDinero(deuda.capital)} />
                <Fila etiqueta="Interés de la cuota" ayuda="El costo normal del préstamo" valor={formatearDinero(deuda.interesCorriente)} />
                <Fila etiqueta="Costo por pagar tarde" ayuda="Se cobra por cada día de atraso" valor={formatearDinero(deuda.interesMoratorio)} />
                <Fila etiqueta="Gastos de cobranza" valor={formatearDinero(deuda.gastos)} />
                <Fila etiqueta="Total que debes hoy" valor={formatearDinero(deuda.totalExigible)} fuerte />
              </div>
            </section>

            {mora.desglosePorTramo.length > 0 && (
              <section>
                <h2 className="mb-1 font-display text-base font-semibold">Cómo creció el costo por atraso</h2>
                <p className="mb-2 text-sm text-tinta/60">Mientras más días pasan sin pagar, cada día cuesta un poco más.</p>
                <div className="tarjeta divide-y divide-linea !p-0">
                  {mora.desglosePorTramo.map((t) => (
                    <Fila
                      key={t.tramo}
                      etiqueta={`${t.dias} ${t.dias === 1 ? "día" : "días"} en la etapa de ${rangoDeTramoMora(t.tramo)}`}
                      ayuda={esCliente ? undefined : `Tasa anual ${formatearPorcentaje(t.tasaAnual)}`}
                      valor={formatearDinero(t.monto)}
                    />
                  ))}
                  <Fila etiqueta="Total del costo por atraso" valor={formatearDinero(mora.totalInteresMoratorio)} fuerte />
                </div>
              </section>
            )}

            {!esCliente && (
              <section>
                <h2 className="mb-2 font-display text-base font-semibold">Detalle técnico</h2>
                <div className="tarjeta divide-y divide-linea !p-0">
                  <Fila etiqueta="Tramo actual" valor={ETIQUETA_TRAMO[mora.tramoActual] ?? mora.tramoActual} />
                  <Fila etiqueta="Días de atraso" valor={String(mora.diasDeAtraso)} />
                  <Fila etiqueta="Capital en mora" valor={formatearDinero(mora.capitalEnMora)} />
                  <Fila etiqueta="Saldo de capital del crédito" valor={formatearDinero(credito.saldoCapital)} />
                  <Fila etiqueta="Cuotas vencidas sin pagar" valor={String(credito.cuotasVencidas)} />
                </div>
              </section>
            )}
          </>
        )}

        <div className="flex flex-col gap-2">
          {!esCliente && (
            <Link to={`${base}/pago/${id}`} className="boton-cta">
              Registrar pago
            </Link>
          )}
          <Link to="/ayuda#mora" className="boton-secundario">
            ¿Qué es la mora?
          </Link>
          {esCliente && !alDia && (
            <Link to="/ayuda#pago" className="boton-texto">
              ¿Cómo pago mi cuota?
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
