import type { ReactNode } from "react";
import Icono, { type NombreIcono } from "./Icono";

/** Estado vacío con ícono, explicación y (opcional) llamada a la acción. */
export default function EstadoVacio({ icono = "credito", titulo, texto, children }: { icono?: NombreIcono; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-tarjeta border border-dashed border-linea bg-papel-hueso px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-claro text-navy">
        <Icono nombre={icono} tamano={26} />
      </span>
      <p className="font-display text-lg font-semibold">{titulo}</p>
      {texto && <p className="max-w-xs text-sm text-tinta/60">{texto}</p>}
      {children && <div className="mt-2 flex w-full max-w-xs flex-col gap-2">{children}</div>}
    </div>
  );
}
