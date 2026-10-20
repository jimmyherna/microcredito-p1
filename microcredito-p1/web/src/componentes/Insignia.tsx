import type { ReactNode } from "react";

const COLOR: Record<string, string> = {
  AL_DIA: "bg-verde-claro text-verde-oscuro",
  VIGENTE: "bg-verde-claro text-verde-oscuro",
  APROBADO: "bg-verde-claro text-verde-oscuro",
  MORA_1: "bg-ambar-claro text-ambar-oscuro",
  MORA_2: "bg-ambar-claro text-ambar-oscuro",
  EN_MORA: "bg-ambar-claro text-ambar-oscuro",
  MORA_3: "bg-mora-claro text-mora-oscuro",
  VENCIDO: "bg-mora-claro text-mora-oscuro",
  INCOBRABLE: "bg-mora-claro text-mora-oscuro",
  RECHAZADO: "bg-mora-claro text-mora-oscuro",
  CANCELADO: "bg-tinta/10 text-tinta/70",
  ANULADO: "bg-tinta/10 text-tinta/70",
  SOLICITADO: "bg-navy-claro text-navy",
  REESTRUCTURADO: "bg-ambar-claro text-ambar-oscuro",
  cliente: "bg-navy-claro text-navy",
  asesor: "bg-verde-claro text-verde-oscuro",
  gerencia: "bg-tinta text-white",
};

/** Etiqueta de estado con color (texto SIEMPRE visible: el color nunca es la única señal). */
export default function Insignia({ children, valor }: { children: ReactNode; valor: string }) {
  const clase = COLOR[valor] ?? "bg-tinta/10 text-tinta/70";
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${clase}`}>{children}</span>;
}
