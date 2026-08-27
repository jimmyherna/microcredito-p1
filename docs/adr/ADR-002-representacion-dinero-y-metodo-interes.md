# ADR-002: Representacion del dinero como enteros en centavos y metodo de amortizacion frances

| Campo | Contenido |
|---|---|
| **Estado** | Aceptada |
| **Fecha** | 25/08/2026 |

## Contexto

El enunciado (seccion 6.2) prohibe representar dinero con `Number` en punto flotante y exige un Objeto de Valor
inmutable. Ademas (seccion 6.4) exige reproducir exactamente la tabla de amortizacion de referencia, incluido el
ajuste de la ultima cuota, y (seccion 6.3) exige declarar explicitamente si la tasa es nominal o efectiva y la base
de conteo de mora.

## Decision

1. **Dinero se representa como entero en centavos** (opcion permitida por el enunciado junto con una biblioteca
   decimal). Se prefirio el entero de centavos sobre `decimal.js` porque:
   - Los montos del dominio (Q1,000–Q25,000, plazos de 3–24 meses) estan muy por debajo del limite de entero seguro
     de JavaScript (`Number.MAX_SAFE_INTEGER`), por lo que no hay riesgo de perdida de precision.
   - Evita una dependencia externa adicional en el nucleo de dominio, manteniendolo con cero dependencias de
     produccion.
   - El redondeo (medio hacia arriba, aplicado por cuota) se implementa como una funcion pura y explicita
     (`redondearCentavos`), auditable en una linea de codigo.
2. **Tasa nominal anual (TNA)**, con tasa mensual proporcional `i = TNA / 12`. Se declara explicitamente en cada
   politica de credito (`PoliticaCredito.tnaVigente`), nunca implicita.
3. **Base de conteo de mora: Actual/360** (sugerida por el enunciado), declarada en `PoliticaMora.baseDeConteo`.
4. **Metodo de amortizacion: sistema frances de cuota fija**, implementado como Strategy (`EstrategiaAmortizacion`)
   para permitir sustituirlo (saldos insolutos, cuota fija de capital) sin tocar el motor que arma el plan.
5. Las tasas y politicas **nunca son constantes literales** en el codigo de calculo: viajan como parametros
   versionados (`PoliticaCredito`, `PoliticaMora`) con autor y fecha de vigencia, y un credito se calcula siempre
   con la politica vigente en su fecha de otorgamiento.

### Alternativas consideradas

| Alternativa | Por que se descarta |
|---|---|
| `Number` en punto flotante para montos | Prohibido por el enunciado (6.2); ademas produce errores de redondeo acumulados que rompen el invariante `Σamortizacion = capital`. |
| `decimal.js` / `big.js` | Valida y permitida, pero introduce una dependencia externa sin beneficio adicional dado el rango acotado de montos del dominio; se documenta como alternativa aceptable si el dominio creciera a montos que exijan precision arbitraria (p. ej. multiplicacion de tasas compuestas en cadenas largas). |
| Tasa efectiva anual (TEA) como base | El enunciado permite TEA como alternativa, pero exige declararlo; se opto por TNA por ser la convencion mas comun en contratos de microcredito en Guatemala y por simplificar la conversion a tasa mensual proporcional. |

## Consecuencias

**Positivas**

- El nucleo reproduce exactamente, celda por celda, la tabla de 12 filas del caso de referencia 6.4.1 (verificado
  con prueba unitaria).
- El invariante `Σamortizacion_k = capital` y `saldoFinal = 0.00` se cumple siempre por construccion (la ultima
  cuota absorbe el remanente), no por casualidad del redondeo.
- Cambiar la tasa vigente o el metodo de interes no requiere tocar `plan-amortizacion.ts`: solo se registra una
  nueva version de `PoliticaCredito` o se inyecta una nueva `EstrategiaAmortizacion`.

**Negativas / trade-offs**

- Toda entrada de datos "humana" (formularios, imports) debe pasar por `Dinero.deQuetzales()` en el borde del
  sistema para convertir a centavos; un desarrollador que omita este paso y multiplique `number * number`
  directamente reintroduce el riesgo que esta decision busca eliminar (mitigado con revision de codigo y con que
  el tipo `Dinero` no expone su constructor publico).
