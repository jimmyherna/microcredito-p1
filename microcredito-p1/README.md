# Sistema de Gestión de Microcrédito — Crédito Vecino, S.A.

Proyecto 1 · Arquitectura y diseño de componentes · Análisis de Sistemas II (037) · UMG · Segundo semestre 2026

## Qué es esto

Núcleo de cálculo ejecutable (walking skeleton) del dominio financiero de una fintech de microcrédito, más el
diseño de arquitectura y componentes que lo sustenta. Ver `docs/` para el resto de entregables (E1–E6).

## Ejecutar las pruebas oficiales

```bash
npm install
npm test
```

No requiere base de datos, servidor ni interfaz gráfica (alcance del Proyecto 1, sección 5). Esto ejecuta todas
las pruebas automatizadas en `tests/` (incluidos los casos de referencia obligatorios del enunciado: la tabla de
amortización de la sección 6.4.1, la mora de Q7.26 de la sección 6.5, la cartera en riesgo de 7.00%/6.06% de la
sección 6.8.1, y la reversibilidad del ciclo de vida de la sección 6.7).

## Probar con datos propios (script libre)

Además de las pruebas automáticas, el repositorio incluye un script para experimentar con montos, tasas y plazos
distintos a los del enunciado, sin modificar ni afectar las pruebas oficiales.

Primero, instala `tsx` una sola vez (permite ejecutar TypeScript directamente sin compilarlo):

```bash
npm install -D tsx
```

Luego ejecútalo de cualquiera de estas dos formas:

**Modo interactivo** (te pregunta los datos uno por uno):

```bash
npx tsx scripts/pruebas_credito.ts
```

**Modo directo** (pasas los valores en la misma línea: monto, tasa nominal anual en %, número de cuotas):

```bash
npx tsx scripts/pruebas_credito.ts 15000 30 18
```

El script imprime la tabla de amortización completa, verifica que cuadre a Q0.00, y muestra un ejemplo de cálculo
de mora y de cartera en riesgo con esos mismos datos. Usa el mismo motor de cálculo de `src/dominio/`, así que los
resultados son tan confiables como los de `npm test` — la diferencia es que este script no valida nada
automáticamente, solo sirve para explorar libremente.

## Estructura

```
microcredito-p1/
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json          (strict: true, obligatorio)
├── src/dominio/           núcleo puro — sin infraestructura
│   ├── dinero.ts              Objeto de Valor Dinero (6.2)
│   ├── plan-amortizacion.ts   Strategy francés + ajuste de última cuota (6.4)
│   ├── calculadora-mora.ts    interés moratorio y tramos (6.5)
│   ├── prelacion-pago.ts      Chain of Responsibility (6.6)
│   ├── cartera.ts             cartera en riesgo (6.8)
│   └── credito-estado.ts      State — ciclo de vida del crédito (6.7)
├── tests/                 pruebas unitarias (Vitest), incluidos los casos de referencia obligatorios
├── scripts/
│   └── pruebas_credito.ts     script libre para probar montos/tasas/plazos propios (ver arriba)
└── docs/
    ├── arquitectura.docx   documento consolidado E1–E5 (el que se sube a Canvas, convertido a PDF)
    ├── trazabilidad.md     matriz requisito → caso de uso → clase (Anexo B)
    ├── diagramas/          UML y C4 en Mermaid (.mmd), editables — ver instrucciones abajo
    ├── adr/                ADR-001, ADR-002
    └── api/openapi.yaml    contrato de la API (E5)
```

## Diagramas — cómo editarlos

Todos los diagramas están en `docs/diagramas/*.mmd` como código Mermaid (texto plano, versionable en git).
Para verlos o editarlos:

1. Abra **https://mermaid.live**
2. Pegue el contenido del archivo `.mmd` en el panel izquierdo.
3. Edite y exporte como SVG/PNG desde el mismo sitio, o mantenga el `.mmd` como fuente editable en el repo.

También puede previsualizarlos directamente en GitHub/GitLab (ambos renderizan bloques ` ```mermaid ` de forma
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

## Entrega del proyecto

- **Canvas**: se sube `docs/arquitectura.docx` convertido a PDF y renombrado como `P1_Arquitectura_<sección/grupo>.pdf`,
  con la portada completa (nombres, carné, sección, y el enlace a este repositorio). Es un único documento que
  consolida E1 a E5.
- **GitHub (este repositorio)**: contiene todos los archivos de respaldo de ese documento — código fuente,
  pruebas, diagramas editables, ADR y contrato de la API — organizados en las carpetas de arriba.

## Herramientas de IA utilizadas

Se utilizó **Claude (Anthropic)** como apoyo en: la redacción inicial de los ADR, la generación del esqueleto de
pruebas unitarias y el script de prueba libre (`scripts/pruebas_credito.ts`), y la elaboración de los diagramas
Mermaid a partir del enunciado. El diseño de arquitectura, la comprensión de cada regla de negocio y el código
del núcleo de dominio fueron revisados por el equipo y son defendibles ante el catedrático.
Se utilizó **Grok SpaceXAI** igualmente como apoyo en validación del entregable final.

## Marco de referencia citado

- Decreto 25-2016, Ley de Entidades de Microfinanzas y de Entes de Microfinanzas sin Fines de Lucro.
- Resolución JM-47-2022, Reglamento para la Administración del Riesgo de Crédito.
- Decreto 19-2002, Ley de Bancos y Grupos Financieros (art. 42, libre pactación).
- Decreto-Ley 106, Código Civil (prohibición de anatocismo).
- Código Penal, artículo 276 (usura).