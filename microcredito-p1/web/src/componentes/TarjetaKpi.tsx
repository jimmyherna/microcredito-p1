import type { ReactNode } from "react";

/** Indicador del tablero. El valor llega ya formateado y calculado por la API. */
export default function TarjetaKpi({ etiqueta, valor, detalle, acento = "navy", icono }: { etiqueta: string; valor: string; detalle?: string; acento?: "navy" | "verde" | "ambar" | "mora"; icono?: ReactNode }) {
  const color = { navy: "text-navy", verde: "text-verde-oscuro", ambar: "text-ambar-oscuro", mora: "text-mora" }[acento];
  const barra = { navy: "bg-navy", verde: "bg-verde", ambar: "bg-ambar", mora: "bg-mora" }[acento];
  return (
    <div className="tarjeta relative flex flex-col gap-1 overflow-hidden">
      <span className={`absolute inset-y-0 left-0 w-1 ${barra}`} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 pl-2">
        <p className="etiqueta">{etiqueta}</p>
        {icono && <span className={color}>{icono}</span>}
      </div>
      <p className={`cifra pl-2 text-2xl font-semibold leading-tight ${color}`}>{valor}</p>
      {detalle && <p className="pl-2 text-xs text-tinta/55">{detalle}</p>}
    </div>
  );
}
