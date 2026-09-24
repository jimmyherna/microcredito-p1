# ADR-001: Adopcion de arquitectura hexagonal (puertos y adaptadores) con monolito modular

| Campo | Contenido |
|---|---|
| **Estado** | Aceptada |
| **Fecha** | 25/08/2026 |

## Contexto

El Sistema de Gestion de Microcredito debe (a) producir cifras financieras exactas y auditables desde el Proyecto 1,
(b) evolucionar sin reescritura hacia el Proyecto 2 (interfaz web) y el Proyecto Final (servidor MCP, asistente
conversacional con RAG), y (c) mantener una unica fuente de verdad para el calculo, de modo que la API y el futuro
asistente respondan exactamente lo mismo.

Atributos de calidad priorizados (ISO/IEC 25010), en orden:

1. **Exactitud funcional** — un descuadre de un centavo es un defecto de severidad alta en este dominio.
2. **Comprobabilidad (testability)** — el nucleo debe probarse sin infraestructura, en milisegundos.
3. **Mantenibilidad / modificabilidad** — las tasas y politticas cambian por regulacion; deben ser sustituibles sin
   tocar el motor de calculo.
4. **Portabilidad de adaptadores** — nuevos adaptadores (MCP, chat) deben conectarse sin reescribir el dominio.
5. Rendimiento y escalabilidad son secundarios en esta fase (el volumen de una fintech de microcredito no exige
   procesamiento distribuido).

## Decision

Se adopta **arquitectura hexagonal (puertos y adaptadores)** dentro de un **monolito modular**, con cuatro modulos de
frontera explicita: Originacion, Cartera y Cobros, Cierres, Contratos/API (seccion 7.2 del enunciado).

- El **nucleo de dominio** (`src/dominio`) es TypeScript puro, sin dependencias de infraestructura (sin `express`,
  sin `pg`). Se prueba con Vitest, sin base de datos ni red.
- Los **puertos primarios** (casos de uso: `DesembolsarCredito`, `RegistrarPago`, `GenerarCierre`,
  `ConsultarCarteraEnRiesgo`) son la unica puerta de entrada al dominio.
- Los **puertos secundarios** (`RepositorioCreditos`, `Reloj`, `GeneradorIds`) se implementan con adaptadores
  intercambiables: PostgreSQL en produccion, en memoria y reloj fijo en pruebas.

### Alternativas consideradas

| Alternativa | Por que se descarta |
|---|---|
| Arquitectura en capas tradicional (N-capas) | El dominio termina dependiendo de la capa de persistencia (acoplamiento inverso); dificulta probar el calculo sin base de datos. |
| Microservicios | Repartir un desembolso y su asiento contable entre dos servicios convierte una transaccion local en un problema de consistencia distribuida (sagas, compensaciones) sin necesidad real de escalar de forma independiente en esta fase. El costo operativo (orquestacion, observabilidad distribuida) no se justifica para el volumen de una fintech de microcredito. |
| Arquitectura orientada a eventos pura (event sourcing completo) | Sobre-ingenieria para el alcance actual; se reserva el patron Observer/eventos de dominio solo para desacoplar Cartera de Cierres (seccion 9), no como arquitectura global. |

## Consecuencias

**Positivas**

- El nucleo se prueba con funciones puras en milisegundos (evidencia: 43 pruebas, `npm test`, sin infraestructura).
- El servidor MCP y el chat del Proyecto Final son adaptadores primarios **nuevos** que invocan los mismos puertos:
  no hay reescritura del dominio (ver C4 Nivel 2, contenedor `nucleo`).
- Una sola fuente de verdad: la API REST y el futuro asistente ejecutan el mismo caso de uso, por lo que nunca
  pueden divergir en el resultado de un calculo.

**Negativas / trade-offs**

- Mayor cantidad de interfaces y mapeos (DTO <-> dominio) que en un CRUD directo; se acepta como costo de la
  comprobabilidad.
- Requiere disciplina del equipo para no "filtrar" dependencias de infraestructura hacia `src/dominio` (mitigado
  con reglas de lint/arquitectura en fases futuras).
