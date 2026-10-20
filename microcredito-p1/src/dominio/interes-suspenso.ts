// CP-04.2 (Proyecto 2, sección 7.7): la suspensión del devengo de interés
// corriente a los 90 días (P1, 6.5) estaba enunciada pero nunca cuantificada.
// Esta función la hace verificable: a partir del día 91 el interés
// corriente de la cuota exigible deja de reconocerse como ingreso y se
// mueve a una cuenta de orden (interesEnSuspenso) — nunca ingreso. Al
// regularizar (dejar de estar en mora), el devengo se reactiva y lo
// acumulado se reconoce en el período de la regularización.
//
// Importante: esto es una reclasificación CONTABLE, no cambia lo que el
// cliente debe pagar. El total exigible de la cuota (capital + interés
// corriente + interés moratorio + gastos) es el mismo con o sin
// suspensión — lo único que cambia es si ese interés corriente se cuenta
// como "reconocido" o como "en suspenso" en el reporte gerencial.

import { Dinero } from "./dinero.js";
import { debeSuspenderDevengo } from "./calculadora-mora.js";

export interface ClasificacionInteresCorriente {
  reconocido: Dinero;
  enSuspenso: Dinero;
}

export function clasificarInteresCorriente(
  interesCorrienteCuotaPendiente: Dinero,
  diasDeAtraso: number
): ClasificacionInteresCorriente {
  if (!debeSuspenderDevengo(diasDeAtraso)) {
    return { reconocido: interesCorrienteCuotaPendiente, enSuspenso: Dinero.cero(interesCorrienteCuotaPendiente.moneda) };
  }
  return { reconocido: Dinero.cero(interesCorrienteCuotaPendiente.moneda), enSuspenso: interesCorrienteCuotaPendiente };
}
