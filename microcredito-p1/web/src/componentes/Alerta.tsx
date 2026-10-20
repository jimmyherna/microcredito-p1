import type { ReactNode } from "react";
import Icono from "./Icono";

type Tono = "error" | "exito" | "aviso" | "info";

const ESTILO: Record<Tono, string> = {
  error: "bg-mora-claro text-mora-oscuro border-mora/20",
  exito: "bg-verde-claro text-verde-oscuro border-verde/20",
  aviso: "bg-ambar-claro text-ambar-oscuro border-ambar/30",
  info: "bg-navy-claro text-navy border-navy/10",
};

/** Mensaje en línea (errores entendibles, avisos). `onReintentar` agrega el botón de reintento. */
export default function Alerta({ tono = "error", titulo, children, onReintentar }: { tono?: Tono; titulo?: string; children?: ReactNode; onReintentar?: () => void }) {
  return (
    <div role={tono === "error" ? "alert" : "status"} className={`flex gap-3 rounded-tarjeta border px-4 py-3 text-sm ${ESTILO[tono]}`}>
      <Icono nombre={tono === "exito" ? "check" : "alerta"} tamano={20} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div>{children}</div>}
        {onReintentar && (
          <button type="button" onClick={onReintentar} className="mt-2 min-h-[44px] font-semibold underline underline-offset-4">
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
