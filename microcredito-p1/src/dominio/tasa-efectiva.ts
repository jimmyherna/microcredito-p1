// Transparencia (P1 6.3.1): el costo del crédito debe poder expresarse como tasa
// efectiva anual. TEA = (1 + TNA/12)^12 − 1. Adición al dominio; no altera el cálculo
// de cuotas (que sigue usando la tasa mensual = TNA/12).
export function tasaEfectivaAnual(tnaBps: number): number {
  const mensual = tnaBps / 10000 / 12;
  return Math.pow(1 + mensual, 12) - 1;
}
