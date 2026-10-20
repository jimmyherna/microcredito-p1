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
## Proyecto Final — cómo levantar el sistema completo

Esta sección documenta lo agregado para el Proyecto Final (037): API real, base de datos,
interfaz React (PWA), servidor MCP, RAG y chat gerencial. El núcleo de `src/dominio/` no cambió.

### 1. Backend (API)

```bash
npm install                      # instala express, pg, @modelcontextprotocol/sdk, etc.
cp .env.example .env             # y ajustar DATABASE_URL / CV_DATA_DIR
```

Con PostgreSQL (con la extensión `pgvector` disponible) ya levantado y accesible por `DATABASE_URL`:

```bash
npm run cargar                   # aplica el esquema y carga el paquete canónico (verifica SHA-256)
npm run dev:api                  # levanta la API en http://localhost:3000
```

Para desarrollar la interfaz sin tener Postgres a mano todavía (NO usar para grabar el video):

```bash
npm run dev:api:memoria          # arranca VACÍO: sin clientes, créditos ni solicitudes de ejemplo
CV_DATA_DIR=./datos/datos-proyecto-final npm run dev:api:memoria   # ...o con el paquete canónico verificado
```

### Autenticación y roles

La API ya no muestra datos a cualquiera: cada persona crea su cuenta y ve sólo lo suyo.

| Rol | Qué ve / puede hacer |
|---|---|
| `cliente` | Sólo sus créditos (`creditos.cliente_id` = su cliente) y sus solicitudes; plan, mora, detalle y pagos de SUS créditos. Crea su ficha (`POST /api/clientes`, queda vinculada a su cuenta) y solicita créditos para sí. No ve cartera, mora global, cierres, chat, asesores ni datos ajenos; no registra pagos ni evalúa solicitudes. Una cuenta nueva recibe listas vacías. |
| `asesor` | Créditos donde es el asesor, clientes que dio de alta (se guardan con su `asesor_id`) o que atiende, y sus solicitudes. Crea clientes/solicitudes, desembolsa a su nombre, valida/aprueba/registra pagos de SUS créditos. Cartera en riesgo, mora y vencimientos calculados sobre su cartera. |
| `gerencia` | Todo: evalúa solicitudes, cierres, chat, cartera global (mismos números canónicos) y analítica (`/api/gerencia/*`). |

- **Registro** `POST /api/auth/registro` `{nombre, identificador, contrasena (≥8), rol, dpi?, asesorId?, codigoComite?}` → `{token, usuario}`.
  El identificador es un correo (se guarda en minúsculas) o un teléfono (sólo dígitos) y es único.
  - `cliente` con `dpi` que coincide con un cliente existente sin cuenta → se vincula (ve sus créditos reales); si no, queda sin
    ficha ni créditos hasta que la cree.
  - `asesor` con `asesorId` de `GET /api/auth/asesores-disponibles` → se vincula; sin `asesorId` se crea un asesor nuevo (`ASE-xxxxxxxx`).
  - `gerencia` exige `codigoComite` igual a la variable `CV_CODIGO_GERENCIA` (403 si no coincide). En desarrollo, si no está
    definida, vale `comite-dev-2026` (con advertencia en consola); con `NODE_ENV=production` no hay valor por defecto.
- **Login** `POST /api/auth/login` `{identificador, contrasena}` → `{token, usuario}`. El rol sale de la cuenta. Credenciales
  malas → 401 con mensaje genérico. `GET /api/auth/yo` devuelve la sesión actual; `GET /api/mi-perfil` → `{usuario, cliente}`.
- **Token**: HMAC-SHA256 firmado y sin estado, expira en 12 h; se envía como `Authorization: Bearer <token>` a todo `/api/*`
  excepto `/api/salud` y `/api/auth/{registro,login,asesores-disponibles}`. Sin token o inválido → 401 `NO_AUTENTICADO`;
  rol o alcance indebido → 403 `SIN_PERMISO`. El secreto sale de `CV_SECRETO_SESION` (hay uno de desarrollo, con advertencia).
- **Contraseñas**: `scrypt` de `node:crypto` con sal aleatoria por cuenta (nunca se guardan en claro). Sin dependencias nuevas.
- **Bitácora** (`bitacora`): login/registro, alta de cliente, solicitud, evaluación, desembolso, pago y cierre. Sólo gerencia la
  consulta: `GET /api/gerencia/bitacora?limite=50`, `GET /api/gerencia/usuarios`, `GET /api/gerencia/resumen?fechaCorte=`.
- **Fecha de operación**: `?fechaCorte=AAAA-MM-DD` si viene; si no, `CV_FECHA_OPERACION` (opcional) y, a falta de ambas, la fecha de
  HOY en Guatemala (UTC-6). Ya no hay fecha quemada.
- **Base de datos**: `npm run cargar` aplica `src/persistencia/schema.sql` (idempotente) que añade `usuarios`, `bitacora` y
  `clientes.asesor_id`. Ver `docs/diagramas/12-modelo-entidad-relacion.mmd` y `docs/api/openapi.yaml`.

### 2. Frontend (React + Vite + Tailwind, PWA)

```bash
cd web
npm install
npm run dev                      # http://localhost:5173 — /api se reenvía a localhost:3000
```

- Rutas `/solicitud`, `/creditos`, `/credito/:id`, `/pago/:id`, `/plan/:id`, `/mora/:id`, `/chat`:
  cascarón móvil (`ShellMovil`), pensado para una sola mano en teléfono (asesor/cliente).
- Rutas `/gerencia/tablero`, `/gerencia/cierre`: cascarón de escritorio (`ShellEscritorio`), con
  barra lateral y el chat gerencial acoplado a la derecha.
- Es instalable (PWA): manifest + service worker vía `vite-plugin-pwa` (`npm run build` genera la
  versión de producción instalable).

### 3. Servidor MCP (E3)

```bash
npm run mcp                      # servidor MCP por stdio, mismas 8 capacidades que expone la API
```

Conéctenlo desde su cliente MCP de preferencia (Claude Desktop, el inspector oficial de MCP, o
directamente desde el orquestador del chat una vez lo migren de reglas a LLM — ver el comentario al
inicio de `src/chat/orquestador.ts`).

### 4. RAG (E4)

Requiere Ollama corriendo en local (`ollama serve`) con el modelo de embeddings descargado:

```bash
ollama pull nomic-embed-text
npm run ingesta:rag
```

### 5. Pruebas

```bash
npm test                         # suite completa: dominio (P1/P2) + aplicación (Proyecto Final)
```

### Estado real de cada pieza (léanlo antes de grabar el video)

| Pieza | Estado |
|---|---|
| Núcleo (`src/dominio/`) | Sin cambios — el original de P1/P2 |
| Motor de cobranza (`src/aplicacion/motor-cobranza.ts`) | Implementado, con 4 supuestos de negocio marcados `[SUPUESTO]` en el propio archivo — **el equipo debe validarlos contra su enunciado de P1/P2** (gasto de gestión de cobro, suspensión de interés, excedente, mora en tramos simultáneos) |
| API REST (`src/api/`) | Implementada, con autenticación por rol y alcance de datos en servidor (ver `tests/auth.test.ts` y `tests/aplicacion.test.ts`) |
| Persistencia + cargador (`src/persistencia/`) | Implementado; falta correrlo contra un Postgres real del equipo |
| Interfaz React/PWA (`web/`) | Implementada: las 7 pantallas, responsive móvil/escritorio, aprobación humana del pago |
| Servidor MCP (`src/mcp/`) | Implementado con las 8 capacidades; falta probarlo con un cliente MCP real tras `npm install` |
| RAG (`src/rag/`) | Implementado (ingesta + recuperación por pgvector); el chat todavía usa una versión ligera por palabras clave — ver siguiente fila |
| Chat gerencial (`src/chat/orquestador.ts`) | MVP por reglas, ya conectado de punta a punta; **falta reemplazarlo por un LLM real (Ollama/Gemini/Groq) con function-calling** para cumplir el enunciado al 100% — el comentario al inicio del archivo explica exactamente qué cambiar |
| Pruebas nuevas (`tests/aplicacion.test.ts`) | Escritas y verificadas manualmente con Node; no se pudieron correr con `vitest`/`tsx` en el entorno donde se generaron por un problema de binario nativo de esbuild ajeno al código — deberían correr normalmente en las máquinas del equipo tras `npm install` |

## Instalar Ollama (chat con IA real, local)

El chat gerencial (E5) usa un modelo de lenguaje que corre **en su propia
computadora**, sin internet y sin costo — eso es Ollama. El sistema ya está
programado para usarlo con *function calling* real: el modelo decide qué
herramienta llamar (consultar un crédito, la cartera, etc.) y el núcleo
pone siempre la cifra, nunca el modelo (sección 4 del enunciado).

**Si Ollama no está corriendo, el chat sigue funcionando igual** (cae
automáticamente a un modo por reglas, ver `src/chat/orquestador.ts`), pero
el video de defensa debe grabarse CON Ollama corriendo — ahí es donde se
demuestra el function calling real que pide la rúbrica.

### 1. Instalar Ollama

- **Windows / Mac**: descargar el instalador desde https://ollama.com/download y ejecutarlo (es como instalar cualquier programa).
- **Linux**: `curl -fsSL https://ollama.com/install.sh | sh`

Confirmar que quedó instalado:

```bash
ollama --version
```

### 2. Descargar los dos modelos que usa el sistema

```bash
ollama pull qwen2.5:7b          # el modelo de CHAT (responde y decide qué herramienta usar)
ollama pull nomic-embed-text    # el modelo de EMBEDDINGS (para el RAG, E4)
```

`qwen2.5:7b` pesa ~4.7 GB y necesita unos 8 GB de RAM libres para correr
decente en CPU. Si la laptop es más limitada, usar en su lugar:

```bash
ollama pull llama3.2:3b
```

y poner `OLLAMA_MODELO_CHAT=llama3.2:3b` en el `.env` (ver más abajo).

### 3. Dejarlo corriendo

En Windows y Mac, Ollama arranca solo como servicio al instalarlo (ícono en
la barra de tareas). En Linux, o si quieren verlo en una terminal:

```bash
ollama serve
```

Probar que responde:

```bash
curl http://localhost:11434/api/tags
```

Si eso regresa una lista de modelos (JSON), ya está listo.

### 4. Configurar el proyecto

En `.env` (copiado de `.env.example`):

```
OLLAMA_URL=http://localhost:11434
OLLAMA_MODELO_CHAT=qwen2.5:7b
OLLAMA_MODELO_EMBEDDING=nomic-embed-text
```

### 5. Indexar el corpus para el RAG (una sola vez)

```bash
npm run ingesta:rag
```

### 6. Probar el chat

Con la API corriendo (`npm run dev:api` o `npm run dev:api:memoria`) y el
frontend (`cd web && npm run dev`), abrir el chat y preguntar algo como
*"¿cómo está la cartera al 31 de octubre de 2026?"*. Si Ollama está
corriendo, la respuesta llega por function calling real; si no, por el
modo de respaldo — ambos caminos existen a propósito en
`src/chat/orquestador.ts`, documentado ahí mismo.

### Qué se armó para esto (por si lo preguntan en la defensa)

| Archivo | Qué hace |
|---|---|
| `src/chat/cliente-ollama.ts` | Llama a `POST /api/chat` de Ollama con `tools` (function calling) |
| `src/chat/herramientas.ts` | Define las 9 herramientas que el modelo puede usar — **`registrar_pago` NO está entre ellas a propósito** (ver más abajo) |
| `src/chat/busqueda-corpus.ts` | RAG real (pgvector) con respaldo por palabras clave si la base vectorial no está lista |
| `src/chat/orquestador.ts` | El ciclo de function calling (pide herramienta → ejecuta → vuelve a preguntar) + el prompt del sistema con las reglas de seguridad |

### Por qué `registrar_pago` no es una herramienta del chat (seguridad, OP-7)

El modelo solo puede **previsualizar** un pago (`previsualizar_pago`, de
solo lectura). Cuando alguien pide pagar algo, el código (no el modelo)
detecta que se llamó esa herramienta y agrega la tarjeta de aprobación a
la respuesta. El pago real solo se registra cuando una persona toca
"Aprobar" en la interfaz, lo que pide un **token de un solo uso**
(`src/aplicacion/aprobaciones-pago.ts`) que ningún modelo de lenguaje
puede generar por su cuenta — así, ninguna instrucción escondida en un
documento (como `NOTA-CAMPO-07.md`, el caso de prueba OP-7) puede lograr
que el asistente mueva dinero, sin importar qué tan convincente sea el
texto.

## Cambios de la ronda "validación contra el paquete canónico"

- `src/persistencia/cargador-memoria.ts`: mismo cargador (huella SHA-256, `seq`, claves repetidas ignoradas) sobre el repositorio en memoria. `REPO_MODO=memoria CV_DATA_DIR=<ruta> npm run dev:api` ensaya con los 75 créditos sin Postgres (el video va con `pg`).
- Validado: los 226 pagos únicos históricos coinciden al centavo con la deuda exigible que calcula el motor ese día.
- Gasto de gestión Q25 solo para POL-2026-10 (RP-08); créditos con mora plana no lo generan.
- Incobrable derivado (>120 días) también rechaza pagos (OP-6); validaciones previas (monto exacto, incobrable) ocurren **antes** de pedir la aprobación humana.
- `explicar_mora` acepta `numeroCuota` (G-5 cuota 3, G-7 cuota 2).
- Fecha de operación: selector global en la interfaz (por defecto 2026-10-31); la API nunca usa el reloj.
- Originación completa: solicitud → bandeja del comité (gerencia) → desembolso con plan simulado (asesor). Rutas `GET /api/solicitudes/:id`, `POST /api/solicitudes/:id/desembolsar`, `GET /api/asesores`.
- Núcleo del P1 (`src/dominio` original): sin reescribir; solo adiciones.
- Pruebas con datos reales: `CV_DATA_DIR=<ruta> npm test` (`carga.test.ts`, `operaciones-anexo-a.test.ts`).

## Correspondencia pantalla ↔ caso de uso (E1, P2 §6.1)

| Puerto primario (P1) | Pantalla implementada (`web/src`) | Rol | Ruta |
|---|---|---|---|
| RegistrarCliente | Alta de cliente = **paso 1** de Solicitud de crédito (`paginas/SolicitudCredito.tsx`) | Asesor | `/solicitud` |
| SolicitarCredito | Solicitud de crédito (monto, plazo, tasa dentro del rango de política, plan simulado + TEA) | Asesor | `/solicitud` |
| EvaluarSolicitud | Bandeja del comité (`paginas/BandejaSolicitudes.tsx`) | Gerencia | `/gerencia/solicitudes` |
| DesembolsarCredito | Confirmación de desembolso con plan simulado (`componentes/PanelSolicitud.tsx`) | Asesor | `/solicitud/:id` |
| ConsultarCredito | Detalle del crédito · Plan de amortización · Detalle de la mora | Asesor, cliente, gerencia | `/credito/:id`, `/plan/:id`, `/mora/:id` (gerencia: `/gerencia/...`) |
| RegistrarPago | Registro de pago en campo (monto exacto, rechazos, aprobación humana, reintento idempotente) | Asesor | `/pago/:id` |
| ConsultarCarteraEnRiesgo | Tablero gerencial (activa, en mora, en riesgo por tramo, incobrable del mes, drill-down) | Gerencia | `/gerencia/tablero` |
| GenerarCierre | Cierre diario / mensual (recuperaciones por concepto) | Gerencia | `/gerencia/cierre` |
| (Proyecto Final) | Chat gerencial acoplado al escritorio / asistente móvil | Gerencia, asesor | panel derecho · `/chat` |

La **fecha de operación** es un parámetro visible en toda pantalla (por defecto 31/10/2026); nada usa el reloj del equipo.

### Ronda de revisión contra el enunciado final (cambios)

- **Incobrable "del mes"**: el tablero y el cierre reportan solo lo que cruzó los 120 días *dentro del mes* de la fecha de corte (antes sumaba todo incobrable acumulado).
- **Cierre**: se recalcula siempre (UPSERT por fecha+tipo), por lo que no queda desactualizado si se registran pagos después de consultarlo.
- **Registro de pago**: el monto es editable (para intentar OP-5 con Q500.00); la validación (`POST /api/pagos/validar`) rechaza monto no exacto / incobrable *antes* de mostrar la hoja de aprobación humana; botón "Reintentar con la misma clave" (OP-4).
- **Gerencia** puede abrir Detalle del crédito, Detalle de la mora, Plan y Registro de pago (`/gerencia/credito/:id`, …) desde el drill-down del tablero (G-4 → G-5).
- **Chat (respaldo por reglas)**: entiende fechas en español ("24 de enero de 2027", "octubre de 2026"), varias ventanas en una pregunta ("7 días… ¿y 30?"), memoria de sesión para preguntas encadenadas, y combina estado + mora (G-5).
- **Conteo de carga**: 228 eventos de pago leídos = 226 aplicados + 2 reintentos con clave repetida (P1 6.10); el cargador imprime ambos.

## Base de datos (PostgreSQL + pgvector) — crear y conectar

**Motor que pide el enunciado (§4):** PostgreSQL con la extensión **pgvector** (una sola base guarda la cartera y los vectores del RAG). Acceso con `pg` (ya instalado). Node 22 LTS.

### Opción A — con Docker (recomendada: ya trae pgvector)

```bash
cp .env.example .env        # DATABASE_URL ya apunta a esta BD
npm install
npm run bd:subir            # docker compose up -d: PostgreSQL 16 + pgvector en localhost:5432
export CV_DATA_DIR=./datos/datos-proyecto-final   # (o dejarlo en .env) carpeta descomprimida del zip del docente
npm run cargar              # crea tablas/relaciones/restricciones, verifica SHA-256 y carga 60/75/228
npm run ingesta:rag         # (opcional hasta tener Ollama) vectoriza el corpus
npm run dev:api             # API en http://localhost:3000 conectada a la BD
```

Repetir el Bloque 1 del video con base vacía: `npm run bd:borrar && npm run bd:subir && npm run cargar`.

### Opción B — PostgreSQL instalado en el equipo

1. Instalar PostgreSQL 16 y pgvector (en Windows: instalador de PostgreSQL + binarios de pgvector, o usar Docker).
2. `psql -U postgres -f scripts/crear-bd.sql` (crea el rol `credito_vecino`, la base `credito_vecino` y la extensión `vector`).
3. Seguir desde `npm run cargar` como en la opción A.

### Cómo se conecta el proyecto

- La conexión sale **solo** de la variable de entorno `DATABASE_URL` (`src/persistencia/db.ts`), p. ej. `postgres://credito_vecino:credito_vecino@localhost:5432/credito_vecino`. Los scripts `npm run …` leen `.env` automáticamente (Node ≥ 22.9).
- `REPO_MODO=pg` (por defecto) usa `repositorio-pg.ts`; `REPO_MODO=memoria` es solo para desarrollo. **El video siempre con `pg`.**
- El esquema vive en `src/persistencia/schema.sql` (idempotente: `CREATE … IF NOT EXISTS`); lo aplica `npm run cargar`. Diagrama entidad-relación: `docs/diagramas/12-modelo-entidad-relacion.mmd`.
- Revisar con `psql postgres://credito_vecino:credito_vecino@localhost:5432/credito_vecino -c "select (select count(*) from clientes) c,(select count(*) from creditos) cr,(select count(*) from eventos_carga where tipo='PAGO') pagos_leidos,(select count(*) from pagos) pagos_aplicados"`.
- Tablas: `clientes`, `solicitudes_credito`, `creditos`, `pagos` (solo inserción), `asesores`, `politicas_mora`, `politicas_credito`, `parametros_globales`, `cierres`, `eventos_carga`, `carga_meta`, `rag_fragmentos`.
