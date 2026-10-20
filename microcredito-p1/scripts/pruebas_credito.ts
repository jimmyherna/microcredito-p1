// Script INTERACTIVO: te pregunta los datos por teclado antes de calcular.
//   npx tsx scripts/probar-credito-interactivo.ts
//
// Tambien puedes pasar los valores directo por linea de comandos, sin que
// te pregunte nada, asi:
//   npx tsx scripts/probar-credito-interactivo.ts 15000 30 18
//   (monto)                                       ^15000 ^30% ^18 cuotas

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { Dinero } from "../src/dominio/dinero.js";
import { generarPlanAmortizacionFrances, sumaAmortizaciones, saldoFinalDelPlan } from "../src/dominio/plan-amortizacion.js";
import { calcularInteresMoratorio, clasificarTramoMora } from "../src/dominio/calculadora-mora.js";
import { calcularCarteraEnRiesgo } from "../src/dominio/cartera.js";

async function pedirDatos(): Promise<{ monto: number; tnaPorcentaje: number; cuotas: number }> {
  const argumentos = process.argv.slice(2);

  // Si el usuario ya paso los 3 valores por linea de comandos, no preguntamos.
  if (argumentos.length >= 3) {
    return {
      monto: Number(argumentos[0]),
      tnaPorcentaje: Number(argumentos[1]),
      cuotas: Number(argumentos[2]),
    };
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const montoTexto = await rl.question("Monto del desembolso en Q (ej. 15000): ");
    const tasaTexto = await rl.question("Tasa nominal anual en % (ej. 30 para 30%): ");
    const cuotasTexto = await rl.question("Numero de cuotas / plazo en meses (ej. 18): ");
    return {
      monto: Number(montoTexto),
      tnaPorcentaje: Number(tasaTexto),
      cuotas: Number(cuotasTexto),
    };
  } finally {
    rl.close();
  }
}

async function main() {
  const { monto, tnaPorcentaje, cuotas } = await pedirDatos();

  if (!Number.isFinite(monto) || monto <= 0) {
    console.error("\nMonto invalido. Debe ser un numero mayor que 0.");
    process.exit(1);
  }
  if (!Number.isFinite(tnaPorcentaje) || tnaPorcentaje < 0) {
    console.error("\nTasa invalida. Debe ser un numero mayor o igual que 0.");
    process.exit(1);
  }
  if (!Number.isInteger(cuotas) || cuotas <= 0) {
    console.error("\nNumero de cuotas invalido. Debe ser un entero mayor que 0.");
    process.exit(1);
  }

  const tnaAnual = tnaPorcentaje / 100;
  const tasaMensual = tnaAnual / 12;
  const capital = Dinero.deQuetzales(monto);

  console.log(`\n=== Plan de amortizacion ===`);
  console.log(
    `Capital: ${capital.toString()}  |  TNA: ${tnaPorcentaje.toFixed(2)}%  |  ` +
    `Tasa mensual: ${(tasaMensual * 100).toFixed(4)}%  |  Cuotas: ${cuotas}\n`
  );

  const plan = generarPlanAmortizacionFrances(capital, tasaMensual, cuotas);

  console.log("Cuota | Saldo inicial | Cuota      | Interes   | Amortizacion | Saldo final");
  for (const fila of plan.filas) {
    console.log(
      `${String(fila.numeroCuota).padStart(5)} | ${fila.saldoInicial.toString().padStart(13)} | ` +
      `${fila.cuota.toString().padStart(10)} | ${fila.interes.toString().padStart(9)} | ` +
      `${fila.amortizacion.toString().padStart(12)} | ${fila.saldoFinal.toString().padStart(11)}`
    );
  }

  console.log(`\nSuma de amortizaciones: ${sumaAmortizaciones(plan).toString()} (debe ser igual al capital: ${capital.toString()})`);
  console.log(`Saldo final: ${saldoFinalDelPlan(plan).toString()} (debe ser Q0.00)`);

  // ---- Ejemplo de mora sobre la cuota 2 (si existe) ----
  const cuota2 = plan.filas[1];
  if (cuota2) {
    const diasDeAtraso = 20;
    const moratorio = calcularInteresMoratorio(cuota2.amortizacion, diasDeAtraso, {
      tnaMoratoria: 0.24,
      baseDeConteo: 360,
      autor: "prueba-interactiva",
      fechaVigenciaDesde: "2026-01-01",
    });
    console.log(`\n=== Ejemplo de mora (cuota 2, ${diasDeAtraso} dias de atraso) ===`);
    console.log(`Capital en mora: ${cuota2.amortizacion.toString()}`);
    console.log(`Interes moratorio: ${moratorio.toString()}`);
    console.log(`Tramo de mora: ${clasificarTramoMora(diasDeAtraso)}`);

    const cartera = calcularCarteraEnRiesgo([
      { id: "MI-CREDITO", saldoCapital: capital, diasDeAtraso, reestructurado: false, incobrable: false },
    ]);
    console.log(`\n=== Cartera en riesgo (con este credito solo) ===`);
    console.log(`Cartera activa: ${cartera.carteraActiva.toString()}`);
    console.log(`Cartera en riesgo: ${cartera.carteraEnRiesgo.toString()}`);
    console.log(`Porcentaje: ${(cartera.porcentaje * 100).toFixed(2)}%\n`);
  }
}

main();
