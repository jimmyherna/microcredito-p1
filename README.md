# Sistema de Gestión de Microcrédito — Crédito Vecino, S.A.

Proyecto 1 · Arquitectura y diseño de componentes · Análisis de Sistemas II (037) · UMG · Segundo semestre 2026

## Qué es esto

Núcleo de cálculo ejecutable (walking skeleton) del dominio financiero de una fintech de microcrédito, más el
diseño de arquitectura y componentes que lo sustenta. Ver `docs/` para el resto de entregables (E1–E6).

## Ejecutar

```bash
npm install
npm test
```

No requiere base de datos, servidor ni interfaz gráfica (alcance del Proyecto 1, sección 5).

## Estructura

```
microcredito-p1/
├── README.md
├── package.json
├── tsconfig.json          (strict: true, obligatorio)
├── src/dominio/           núcleo puro — sin infraestructura
│   ├── dinero.ts              Objeto de Valor Dinero (6.2)
│   ├── plan-amortizacion.ts   Strategy francés + ajuste de última cuota (6.4)
│   ├── calculadora-mora.ts    interés moratorio y tramos (6.5)
│   ├── prelacion-pago.ts      Chain of Responsibility (6.6)
│   ├── cartera.ts             cartera en riesgo (6.8)
│   └── credito-estado.ts      State — ciclo de vida del crédito (6.7)
├── tests/                 pruebas unitarias (Vitest), incluidos los casos de referencia obligatorios
└── docs/
    ├── diagramas/          UML y C4 en Mermaid (.mmd), editables — ver instrucciones abajo
    ├── adr/                ADR-001, ADR-002
    ├── api/openapi.yaml    contrato de la API (E5)
    └── trazabilidad.md     matriz requisito → caso de uso → clase (Anexo B)
```

## Diagramas — cómo editarlos

Todos los diagramas están en `docs/diagramas/*.mmd` como código Mermaid (texto plano, versionable en git).
Para verlos o editarlos:

1. Abra **https://mermaid.live**
2. Pegue el contenido del archivo `.mmd` en el panel izquierdo.
3. Edite y exporte como SVG/PNG desde el mismo sitio, o mantenga el `.mmd` como fuente editable en el repo.

También puede previsualizarlos directamente en GitHub/GitLab (ambos renderizan bloques ```mermaid``` de forma
nativa) o con la extensión "Markdown Preview Mermaid Support" de VS Code.

| Archivo | Contenido |
|---|---|
| `01-casos-de-uso.mmd` | Diagrama de casos de uso |
| `02-clases-dominio.mmd` | Diagrama de clases del dominio |
| `03-secuencia-registrar-pago.mmd` | Secuencia obligatoria: registrar pago con prelación |
| `04-secuencia-desembolsar-credito.mmd` | Secuencia: desembolsar crédito |
| `05-estados-credito.mmd` | Estados: ciclo de vida completo (tabla 6.7.1) |
| `06-actividad-originacion.mmd` | Actividad: proceso de originación |
| `07-actividad-cierre-mensual.mmd` | Actividad: cierre mensual (Template Method) |
| `08-c4-nivel1-contexto.mmd` | C4 Nivel 1 — Contexto |
| `09-c4-nivel2-contenedores.mmd` | C4 Nivel 2 — Contenedores (muestra dónde se conectan MCP y chat) |
| `10-c4-nivel3-componentes.mmd` | C4 Nivel 3 — Componentes del núcleo de dominio |

## Herramientas de IA utilizadas

Declarar aquí, según la sección 13 del enunciado, qué herramientas de IA se usaron y para qué (p. ej. "Claude —
apoyo en la redacción de ADR y generación inicial del esqueleto de pruebas; el diseño y la comprensión del código
fueron revisados y son defendibles por el autor").

## Marco de referencia citado

- Decreto 25-2016, Ley de Entidades de Microfinanzas y de Entes de Microfinanzas sin Fines de Lucro.
- Resolución JM-47-2022, Reglamento para la Administración del Riesgo de Crédito.
- Decreto 19-2002, Ley de Bancos y Grupos Financieros (art. 42, libre pactación).
- Decreto-Ley 106, Código Civil (prohibición de anatocismo).
- Código Penal, artículo 276 (usura).
