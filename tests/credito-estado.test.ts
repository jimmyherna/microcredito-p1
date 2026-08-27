import { describe, it, expect } from "vitest";
import { aplicarEvento, ErrorTransicionInvalida, admitePago } from "../src/dominio/credito-estado.js";

describe("Ciclo de vida del credito (patron State) - seccion 6.7", () => {
  it("originacion: solicitado -> aprobado -> vigente (desembolso)", () => {
    let estado = aplicarEvento("SOLICITADO", "COMITE_APRUEBA", { cumplePoliticaCredito: true });
    expect(estado).toBe("APROBADO");
    estado = aplicarEvento(estado, "SE_DESEMBOLSA");
    expect(estado).toBe("VIGENTE");
  });

  it("un credito 'solicitado' no puede recibir un pago (invariante 6.10) - transicion invalida rechazada por diseño", () => {
    expect(admitePago("SOLICITADO")).toBe(false);
    expect(() => aplicarEvento("SOLICITADO", "PAGA_TODO_LO_VENCIDO")).toThrow(ErrorTransicionInvalida);
  });

  it("un credito 'cancelado' no puede entrar en mora", () => {
    // CANCELADO no tiene ninguna transicion definida en la tabla: cualquier evento debe rechazarse.
    expect(() => aplicarEvento("CANCELADO", "VENCE_CUOTA_IMPAGADA", { diasDeAtraso: 5 })).toThrow(
      ErrorTransicionInvalida
    );
  });

  it("deterioro: vigente entra en mora al vencer una cuota impagada", () => {
    const estado = aplicarEvento("VIGENTE", "VENCE_CUOTA_IMPAGADA", { diasDeAtraso: 1 });
    expect(estado).toBe("EN_MORA");
  });

  it("reversibilidad: en_mora regulariza a vigente cuando paga TODO lo vencido (dias de atraso = 0)", () => {
    const estado = aplicarEvento("EN_MORA", "PAGA_TODO_LO_VENCIDO", { diasDeAtraso: 0 });
    expect(estado).toBe("VIGENTE");
  });

  it("no regulariza si aun quedan dias de atraso (pago parcial)", () => {
    expect(() => aplicarEvento("EN_MORA", "PAGA_TODO_LO_VENCIDO", { diasDeAtraso: 5 })).toThrow(
      ErrorTransicionInvalida
    );
    // pero si puede bajar de tramo permaneciendo en_mora
    const estado = aplicarEvento("EN_MORA", "PAGA_PARTE_DE_LO_VENCIDO", { diasDeAtraso: 5 });
    expect(estado).toBe("EN_MORA");
  });

  it("un credito vencido (91-120 dias, en_mora) tambien puede regularizar a vigente", () => {
    const estado = aplicarEvento("EN_MORA", "PAGA_TODO_LO_VENCIDO", { diasDeAtraso: 0 });
    expect(estado).toBe("VIGENTE");
  });

  it("reestructuracion: en_mora -> reestructurado por acuerdo del comite", () => {
    const estado = aplicarEvento("EN_MORA", "ACUERDA_NUEVAS_CONDICIONES", { comiteAutoriza: true });
    expect(estado).toBe("REESTRUCTURADO");
  });

  it("reestructurado que se atrasa vuelve a en_mora; si cumple, puede cancelar", () => {
    const atrasado = aplicarEvento("REESTRUCTURADO", "VENCE_CUOTA_IMPAGADA", { diasDeAtraso: 3 });
    expect(atrasado).toBe("EN_MORA");
    const cancelado = aplicarEvento("REESTRUCTURADO", "PAGA_ULTIMA_CUOTA", { saldoRestante: 0 });
    expect(cancelado).toBe("CANCELADO");
  });

  it("incobrable: supera 120 dias sin arreglo y no regresa a la cartera aunque pague despues", () => {
    const incobrable = aplicarEvento("EN_MORA", "SUPERA_120_DIAS_SIN_ARREGLO", { diasDeAtraso: 121 });
    expect(incobrable).toBe("INCOBRABLE");
    const sigueIncobrable = aplicarEvento("INCOBRABLE", "RECUPERACION_VIA_CASA_DE_COBRO");
    expect(sigueIncobrable).toBe("INCOBRABLE"); // el credito no regresa a la cartera (seccion 6.7.1)
  });
});
