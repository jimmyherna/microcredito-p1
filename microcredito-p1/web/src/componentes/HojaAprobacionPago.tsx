import { useEffect, useRef } from "react";
import type { PrevisualizacionPago } from "../lib/tipos";
import { formatearDinero, ETIQUETA_RUBRO } from "../lib/dinero";

/**
 * Hoja de confirmación que se interpone SIEMPRE entre "la persona tocó cobrar" y "el pago se
 * registró" (sección 6.3: registrar un pago requiere aprobación humana). Esc o "Cancelar" la cierran.
 */
export default function HojaAprobacionPago({
  previsualizacion,
  procesando,
  onConfirmar,
  onCancelar,
}: {
  previsualizacion: PrevisualizacionPago;
  procesando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const { desglose, montoExigibleCentavos } = previsualizacion;
  const botonCancelar = useRef<HTMLButtonElement>(null);
  const filas = [
    ["gastos", desglose.gastos],
    ["interesMoratorio", desglose.interesMoratorio],
    ["interesCorriente", desglose.interesCorriente],
    ["capital", desglose.capital],
  ] as const;

  useEffect(() => {
    botonCancelar.current?.focus();
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !procesando) onCancelar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [procesando, onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 md:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-aprobacion" onClick={() => !procesando && onCancelar()}>
      <div
        className="hoja-entra w-full max-w-movil rounded-t-tarjeta bg-papel-alto p-5 md:rounded-tarjeta"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea md:hidden" />
        <h2 id="titulo-aprobacion" className="font-display text-lg font-semibold">
          Confirmar cobro
        </h2>
        <p className="mb-4 text-sm text-tinta/60">Este es el desglose de la cuota que se cobra hoy. Revísalo con el cliente antes de confirmar.</p>

        <div className="tarjeta mb-4 divide-y divide-linea !p-0">
          {filas.map(([rubro, dinero]) => (
            <div key={rubro} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-tinta/70">{ETIQUETA_RUBRO[rubro]}</span>
              <span className="cifra text-sm font-medium">{formatearDinero(dinero)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold">Total a cobrar</span>
            <span className="cifra text-base font-semibold text-verde-oscuro">{formatearDinero({ centavos: montoExigibleCentavos, moneda: "GTQ" })}</span>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-ambar-oscuro/30 bg-ambar-claro px-4 py-3 text-sm text-ambar-oscuro">
          Al confirmar, certificas que recibiste este monto exacto del cliente. El cobro queda registrado y no se puede deshacer desde la aplicación.
        </div>

        <div className="flex flex-col gap-2">
          <button className="boton-cta" disabled={procesando} onClick={onConfirmar}>
            {procesando ? "Registrando…" : `Aprobar y cobrar ${formatearDinero({ centavos: montoExigibleCentavos, moneda: "GTQ" })}`}
          </button>
          <button ref={botonCancelar} className="boton-secundario" disabled={procesando} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
