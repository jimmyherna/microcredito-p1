import { Link, useParams } from "react-router-dom";
import Alerta from "../componentes/Alerta";
import EncabezadoPantalla from "../componentes/EncabezadoPantalla";
import { Esqueleto } from "../componentes/Esqueleto";
import Icono from "../componentes/Icono";
import Insignia from "../componentes/Insignia";
import { useFechaOperacion } from "../contexto/FechaOperacionContext";
import { useSesion } from "../contexto/SesionContext";
import { api } from "../lib/api";
import { ETIQUETA_ESTADO, ETIQUETA_TRAMO, estadoEnPalabras, formatearDinero, formatearFecha } from "../lib/dinero";
import type { CreditoDetalle } from "../lib/tipos";
import { useBase } from "../lib/rutas";
import { useCarga } from "../lib/useCarga";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-tinta/55">{etiqueta}</p>
      <p className="cifra font-medium">{valor}</p>
    </div>
  );
}

export default function DetalleCredito() {
  const base = useBase();
  const { id = "" } = useParams<{ id: string }>();
  const { usuario } = useSesion();
  const { fecha, conFecha } = useFechaOperacion();
  const esCliente = usuario?.rol === "cliente";
  const puedeCobrar = usuario?.rol === "asesor" || usuario?.rol === "gerencia";
  const { datos: credito, error, cargando, recargar } = useCarga(() => api.get<CreditoDetalle>(conFecha(`/creditos/${id}`)), [id, fecha]);
  const volverA = `${base}/creditos`;

  if (!credito) {
    return (
      <div>
        <EncabezadoPantalla titulo="Crédito" conRegreso volverA={volverA} />
        <div className="flex flex-col gap-4 px-4 py-4">
          {error ? <Alerta onReintentar={recargar}>{error}</Alerta> : cargando && (
            <div className="tarjeta flex flex-col gap-3"><Esqueleto className="h-5 w-1/3" /><Esqueleto className="h-9 w-2/3" /><Esqueleto className="h-4 w-full" /></div>
          )}
        </div>
      </div>
    );
  }

  const enMora = credito.diasDeAtraso > 0;
  const saldado = credito.estado === "CANCELADO";

  return (
    <div>
      <EncabezadoPantalla titulo={`Crédito ${credito.id}`} conRegreso volverA={volverA} />
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className={`rounded-tarjeta px-4 py-3 text-sm font-semibold ${enMora ? "bg-mora-claro text-mora-oscuro" : "bg-verde-claro text-verde-oscuro"}`} role="status">
          {estadoEnPalabras(credito.estado, credito.diasDeAtraso)}
          {enMora && !esCliente && <span className="font-normal"> · {ETIQUETA_TRAMO[credito.tramo] ?? credito.tramo}</span>}
        </div>

        <div className="tarjeta flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Insignia valor={credito.estado}>{ETIQUETA_ESTADO[credito.estado] ?? credito.estado}</Insignia>
            {enMora && !esCliente && <Insignia valor={credito.tramo}>{ETIQUETA_TRAMO[credito.tramo] ?? credito.tramo}</Insignia>}
          </div>
          <div>
            <p className="etiqueta">Lo que falta pagar del préstamo</p>
            <p className="cifra text-3xl font-semibold">{formatearDinero(credito.saldoCapital)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-linea pt-3 text-sm">
            <Dato etiqueta="Monto prestado" valor={formatearDinero(credito.capitalDesembolsado)} />
            <Dato etiqueta="Cuotas pagadas" valor={`${credito.cuotasPagadas} de ${credito.numeroCuotas}`} />
            {credito.proximaCuota && !saldado && (
              <>
                <Dato etiqueta={enMora ? "Cuota pendiente" : "Próxima cuota"} valor={formatearDinero(credito.proximaCuota.monto)} />
                <Dato etiqueta={enMora ? "Venció el" : "Vence el"} valor={formatearFecha(credito.proximaCuota.fechaVencimiento)} />
              </>
            )}
            {!esCliente && <Dato etiqueta="Cuotas vencidas sin pagar" valor={String(credito.cuotasVencidas)} />}
          </div>
        </div>

        {saldado && <Alerta tono="exito" titulo="Crédito pagado por completo">No tienes nada pendiente en este crédito.</Alerta>}

        <div className="flex flex-col gap-2">
          {puedeCobrar && !saldado && (
            <Link to={`${base}/pago/${credito.id}`} className="boton-cta">
              <Icono nombre="pago" tamano={20} /> Registrar pago
            </Link>
          )}
          <Link to={`${base}/plan/${credito.id}`} className="boton-secundario">
            <Icono nombre="plan" tamano={20} /> {esCliente ? "Ver mi plan de pagos" : "Ver plan de pagos"}
          </Link>
          {enMora && (
            <Link to={`${base}/mora/${credito.id}`} className="boton-secundario">
              <Icono nombre="alerta" tamano={20} /> {esCliente ? "¿Por qué debo más? Ver mi atraso" : "Ver detalle de la mora"}
            </Link>
          )}
          <Link to="/ayuda#saldo" className="boton-texto">
            No entiendo mi saldo
          </Link>
        </div>
      </div>
    </div>
  );
}
