import { describe, it, expect } from "vitest";
import {
  DineroSchema,
  ErrorApiSchema,
  NuevoClienteSchema,
  ClienteSchema,
  NuevaSolicitudCreditoSchema,
  SolicitudCreditoSchema,
  DecisionComiteSchema,
  CreditoSchema,
  NuevoPagoSchema,
  ResultadoPagoSchema,
  ComandoCierreSchema,
  CierreSchema,
  CarteraEnRiesgoSchema,
} from "../src/contratos/index.js";

describe("Contratos de la API (esquemas Zod) - seccion E5", () => {
  it("Dinero: acepta centavos enteros y moneda valida", () => {
    const r = DineroSchema.safeParse({ centavos: 100462, moneda: "GTQ" });
    expect(r.success).toBe(true);
  });

  it("Dinero: rechaza centavos no enteros (viola seccion 6.2)", () => {
    const r = DineroSchema.safeParse({ centavos: 1004.5, moneda: "GTQ" });
    expect(r.success).toBe(false);
  });

  it("Dinero: rechaza monedas no soportadas", () => {
    const r = DineroSchema.safeParse({ centavos: 1000, moneda: "EUR" });
    expect(r.success).toBe(false);
  });

  it("Error: valida la forma uniforme de error de la API", () => {
    const r = ErrorApiSchema.safeParse({ codigo: "TRANSICION_INVALIDA", mensaje: "No aplicable" });
    expect(r.success).toBe(true);
  });

  it("Cliente: exige DPI de 13 digitos", () => {
    const valido = NuevoClienteSchema.safeParse({ nombre: "Ana Lopez", dpi: "1234567890123", direccion: "Zona 1" });
    expect(valido.success).toBe(true);
    const invalido = NuevoClienteSchema.safeParse({ nombre: "Ana Lopez", dpi: "123", direccion: "Zona 1" });
    expect(invalido.success).toBe(false);
  });

  it("Cliente completo incluye id", () => {
    const r = ClienteSchema.safeParse({ id: "CLI-001", nombre: "Ana Lopez", dpi: "1234567890123", direccion: "Zona 1" });
    expect(r.success).toBe(true);
  });

  it("SolicitudCredito: respeta el rango de monto y plazo de Credito Vecino (Q1,000-Q25,000; 3-24 meses)", () => {
    const dentroDeRango = NuevaSolicitudCreditoSchema.safeParse({
      clienteId: "CLI-001",
      montoSolicitado: { centavos: 1000000, moneda: "GTQ" }, // Q10,000.00 (caso de referencia 6.4.1)
      plazoMeses: 12,
    });
    expect(dentroDeRango.success).toBe(true);

    const plazoFueraDeRango = NuevaSolicitudCreditoSchema.safeParse({
      clienteId: "CLI-001",
      montoSolicitado: { centavos: 1000000, moneda: "GTQ" },
      plazoMeses: 36, // excede el maximo de 24
    });
    expect(plazoFueraDeRango.success).toBe(false);
  });

  it("SolicitudCredito completa valida estado y fecha", () => {
    const r = SolicitudCreditoSchema.safeParse({
      id: "SOL-001",
      clienteId: "CLI-001",
      montoSolicitado: { centavos: 1000000, moneda: "GTQ" },
      plazoMeses: 12,
      estado: "APROBADO",
      fechaSolicitud: "2026-08-25",
    });
    expect(r.success).toBe(true);
  });

  it("DecisionComite: solo acepta APRUEBA o RECHAZA", () => {
    expect(DecisionComiteSchema.safeParse({ decision: "APRUEBA" }).success).toBe(true);
    expect(DecisionComiteSchema.safeParse({ decision: "TAL_VEZ" }).success).toBe(false);
  });

  it("Credito: valida estado, tramo (opcional) y datos del plan", () => {
    const r = CreditoSchema.safeParse({
      id: "CRED-001",
      estado: "EN_MORA",
      tramo: "MORA_2",
      capitalDesembolsado: { centavos: 1000000, moneda: "GTQ" },
      tasaMensual: 0.03,
      numeroCuotas: 12,
      politicaVersion: "2026-01",
    });
    expect(r.success).toBe(true);
  });

  it("Credito: rechaza un estado que no existe en el ciclo de vida (seccion 6.7)", () => {
    const r = CreditoSchema.safeParse({
      id: "CRED-001",
      estado: "PENDIENTE_DE_QUIEN_SABE_QUE", // no es un EstadoCredito valido
      capitalDesembolsado: { centavos: 1000000, moneda: "GTQ" },
      tasaMensual: 0.03,
      numeroCuotas: 12,
    });
    expect(r.success).toBe(false);
  });

  it("Pago: exige claveIdempotencia (invariante 6.10)", () => {
    const sinClave = NuevoPagoSchema.safeParse({
      creditoId: "CRED-001",
      monto: { centavos: 101188, moneda: "GTQ" },
      claveIdempotencia: "",
    });
    expect(sinClave.success).toBe(false);

    const conClave = NuevoPagoSchema.safeParse({
      creditoId: "CRED-001",
      monto: { centavos: 101188, moneda: "GTQ" }, // Q1,011.88 del ejemplo 6.6.3
      claveIdempotencia: "pago-2026-08-25-cred001-cuota2",
    });
    expect(conClave.success).toBe(true);
  });

  it("ResultadoPago: valida el desglose por rubro (prelacion, seccion 6.6.2)", () => {
    const r = ResultadoPagoSchema.safeParse({
      detalle: [
        { rubro: "gastos", adeudado: { centavos: 0, moneda: "GTQ" }, aplicado: { centavos: 0, moneda: "GTQ" }, pendiente: { centavos: 0, moneda: "GTQ" } },
        { rubro: "interesMoratorio", adeudado: { centavos: 726, moneda: "GTQ" }, aplicado: { centavos: 726, moneda: "GTQ" }, pendiente: { centavos: 0, moneda: "GTQ" } },
        { rubro: "interesCorriente", adeudado: { centavos: 27886, moneda: "GTQ" }, aplicado: { centavos: 27886, moneda: "GTQ" }, pendiente: { centavos: 0, moneda: "GTQ" } },
        { rubro: "capital", adeudado: { centavos: 72576, moneda: "GTQ" }, aplicado: { centavos: 72576, moneda: "GTQ" }, pendiente: { centavos: 0, moneda: "GTQ" } },
      ],
      excedente: { centavos: 0, moneda: "GTQ" },
      cuotaSaldada: true,
    });
    expect(r.success).toBe(true);
  });

  it("ComandoCierre y Cierre: el porcentaje en riesgo debe estar entre 0 y 1", () => {
    const comando = ComandoCierreSchema.safeParse({ tipo: "MENSUAL", fechaCorte: "2026-08-31" });
    expect(comando.success).toBe(true);

    const cierreValido = CierreSchema.safeParse({
      fechaCorte: "2026-08-31",
      tipo: "MENSUAL",
      carteraActiva: { centavos: 80000000, moneda: "GTQ" }, // Q800,000.00 (caso 6.8.1)
      carteraEnRiesgo: { centavos: 5600000, moneda: "GTQ" }, // Q56,000.00
      porcentajeEnRiesgo: 0.07,
      dadoPorIncobrableEnPeriodo: { centavos: 1500000, moneda: "GTQ" },
    });
    expect(cierreValido.success).toBe(true);

    const cierreInvalido = CierreSchema.safeParse({
      fechaCorte: "2026-08-31",
      tipo: "MENSUAL",
      carteraActiva: { centavos: 80000000, moneda: "GTQ" },
      carteraEnRiesgo: { centavos: 5600000, moneda: "GTQ" },
      porcentajeEnRiesgo: 1.5, // fuera de rango [0,1]
      dadoPorIncobrableEnPeriodo: { centavos: 0, moneda: "GTQ" },
    });
    expect(cierreInvalido.success).toBe(false);
  });

  it("CarteraEnRiesgo: reproduce la forma del caso de referencia 6.8.1 (7.00%)", () => {
    const r = CarteraEnRiesgoSchema.safeParse({
      fechaCorte: "2026-08-31",
      carteraActiva: { centavos: 80000000, moneda: "GTQ" },
      carteraEnRiesgo: { centavos: 5600000, moneda: "GTQ" },
      porcentaje: 0.07,
      creditosEnRiesgo: ["C-003", "C-004", "C-005", "C-006"],
    });
    expect(r.success).toBe(true);
  });
});
