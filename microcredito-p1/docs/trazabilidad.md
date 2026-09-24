# Matriz de trazabilidad — Requisito → Caso de uso → Clase / módulo

| Req. | Requisito | Caso de uso | Clase / módulo | Patrón asociado |
|---|---|---|---|---|
| R1 | Registrar y consultar clientes | Registrar cliente | `Cliente` · módulo Originación | — |
| R2 | Otorgar créditos con plan de cuotas fijas, cuadrado a centavo exacto | Solicitar / Evaluar / Desembolsar crédito | `Credito` · `PlanAmortizacion` · `Cuota` · `EstrategiaFrancesa` · módulo Cálculo financiero | Strategy, Factory/Builder |
| R3 | Registrar pagos aplicando la prelación legal (gastos → moratorio → corriente → capital) | Registrar pago de cuota | `Pago` · `PrelacionPago` · `Movimiento` · módulo Cartera y cobros | Chain of Responsibility |
| R4 | Calcular mora e interés moratorio exclusivamente sobre capital en mora (sin anatocismo) | Calcular mora | `CalculadoraMora` · `PoliticaMora` · módulo Cálculo financiero | Specification, Strategy |
| R5 | Reportar cierres y cartera en riesgo, sin ocultar lo dado por incobrable | Generar cierre / Consultar cartera en riesgo | `Cierre` · `Cartera` · módulo Cierres | Template Method |
| R6 | Representar el ciclo de vida del crédito con transiciones válidas e inválidas por diseño, incluida la reversibilidad (mora → vigente) | Todos los anteriores (transversal) | `EstadoCredito` · `aplicarEvento` · módulo Originación / Cartera y cobros | State |
| R7 | Prohibir mezclar montos con Number en punto flotante o distinta moneda | Todos los anteriores (transversal) | `Dinero` | Value Object |
| R8 | Exponer los casos de uso de forma consistente hacia la API y el futuro asistente MCP | (todos) | módulo Contratos/API — puertos primarios | Repository (puerto secundario), Hexagonal |
| R9 | Garantizar idempotencia en el registro de pagos y en los cierres | Registrar pago de cuota / Generar cierre | `Movimiento` (mayor append-only) · `Cierre` | — |
| R10 | Versionar las políticas de tasa y mora, aplicando la vigente en la fecha de otorgamiento | Desembolsar crédito / Calcular mora | `PoliticaCredito` · `PoliticaMora` | Strategy |

> Complementar con los requisitos específicos que el estudiante identifique en su propio análisis del enunciado
> (por ejemplo, requisitos no funcionales de auditoría, trazabilidad de estados, o reportería).
