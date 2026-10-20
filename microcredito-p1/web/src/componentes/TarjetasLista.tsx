import { Link } from "react-router-dom";
import Icono from "./Icono";
import Insignia from "./Insignia";
import { ETIQUETA_SOLICITUD, ETIQUETA_TRAMO, estadoEnPalabras, formatearDinero, formatearFecha } from "../lib/dinero";
import type { FilaCredito, SolicitudConCliente } from "../lib/tipos";

/** Tarjeta de crédito (lista móvil). El objetivo táctil es toda la tarjeta (≥ 44 px). */
export function TarjetaCredito({ credito, a, mostrarCliente }: { credito: FilaCredito; a: string; mostrarCliente?: boolean }) {
  const enMora = credito.diasDeAtraso > 0;
  return (
    <Link to={a} className="tarjeta flex min-h-[64px] items-center gap-3 transition active:scale-[0.99]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-display text-[15px] font-semibold">{mostrarCliente ? credito.clienteNombre : `Crédito ${credito.id}`}</p>
        </div>
        {mostrarCliente && <p className="text-xs text-tinta/55">Crédito {credito.id}</p>}
        <p className={`mt-0.5 text-sm ${enMora ? "font-medium text-mora" : "text-verde-oscuro"}`}>{estadoEnPalabras(credito.estado, credito.diasDeAtraso)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="cifra text-base font-semibold">{formatearDinero(credito.saldoCapital)}</p>
        <p className="text-[11px] text-tinta/50">saldo</p>
        {enMora && <Insignia valor={credito.tramo}>{ETIQUETA_TRAMO[credito.tramo]?.split(" (")[0] ?? credito.tramo}</Insignia>}
      </div>
      <Icono nombre="chevron" tamano={18} className="-rotate-90 text-tinta/30" />
    </Link>
  );
}

/** Tarjeta de solicitud real, rotulada y enlazada a /solicitud/:id. */
export function TarjetaSolicitud({ solicitud, mostrarCliente }: { solicitud: SolicitudConCliente; mostrarCliente?: boolean }) {
  return (
    <Link to={`/solicitud/${solicitud.id}`} className="tarjeta flex min-h-[64px] items-center gap-3 transition active:scale-[0.99]">
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold">{mostrarCliente ? solicitud.clienteNombre : `Solicitud ${solicitud.id}`}</p>
        <p className="text-xs text-tinta/55">
          {mostrarCliente ? `${solicitud.id} · ` : ""}
          {formatearFecha(solicitud.fechaSolicitud)} · {solicitud.plazoMeses} meses
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="cifra text-base font-semibold">{formatearDinero(solicitud.montoSolicitado)}</p>
        <Insignia valor={solicitud.estado}>{ETIQUETA_SOLICITUD[solicitud.estado] ?? solicitud.estado}</Insignia>
      </div>
      <Icono nombre="chevron" tamano={18} className="-rotate-90 text-tinta/30" />
    </Link>
  );
}

/**
 * Una solicitud aprobada ya desembolsada sigue figurando como APROBADA en la API; si existe el crédito
 * con el código que se genera por defecto (SOL-x → CV-x) no se vuelve a ofrecer.
 */
export function yaDesembolsada(s: SolicitudConCliente, _creditos?: FilaCredito[]): boolean {
  return s.estado === "APROBADO" && !!s.creditoId;
}
