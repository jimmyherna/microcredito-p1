-- =============================================================================
-- Esquema de base de datos — Proyecto Final (037)
-- Crédito Vecino, S. A.
--
-- Cubre E2 (persistencia + carga canónica) y la parte de datos de E4 (RAG).
-- Se ejecuta una sola vez (o con `CREATE TABLE IF NOT EXISTS`, ver más abajo)
-- antes de correr el cargador (src/persistencia/cargador.ts).
--
-- Decisión de diseño: el dinero se guarda SIEMPRE como entero en centavos
-- (bigint), nunca como numeric/decimal para el monto en sí — igual que
-- src/dominio/dinero.ts. Las tasas se guardan en puntos básicos (integer).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS asesores (
  id      text PRIMARY KEY,
  nombre  text
);

-- Las políticas de mora son datos, no constantes de código (LEEME.md,
-- politicas.json). Se guarda el objeto completo en `datos` para no perder
-- ningún campo (tramos, autor, motivo, etc.) y columnas planas para
-- consultarlas rápido desde el motor de cobranza.
CREATE TABLE IF NOT EXISTS politicas_mora (
  id                  text PRIMARY KEY,        -- 'POL-2024-01', 'POL-2026-10'
  nombre              text NOT NULL,
  tipo                text NOT NULL CHECK (tipo IN ('plana', 'escalonada')),
  tna_bps             integer CHECK (tna_bps IS NULL OR tna_bps > 0),  -- solo si tipo = 'plana'
  vigencia_desde      date,                    -- NULL = sin límite inferior
  vigencia_hasta      date,                    -- NULL = sin límite superior
  base_conteo         integer NOT NULL DEFAULT 360 CHECK (base_conteo IN (360, 365)),
  datos               jsonb NOT NULL,          -- objeto completo de politicas.json (incluye tramos)
  CONSTRAINT ck_pol_plana_tiene_tasa   CHECK (tipo <> 'plana' OR tna_bps IS NOT NULL),
  CONSTRAINT ck_pol_vigencia           CHECK (vigencia_hasta IS NULL OR vigencia_desde IS NULL OR vigencia_hasta >= vigencia_desde)
);

-- Política de CRÉDITO (tasa corriente): versionada, con autor, fecha y rango de
-- razonabilidad (P1 6.3.1: libre pactación pero sin usura; nunca constante en código).
-- La tasa de cada crédito (creditos.tna_bps) se pacta DENTRO del rango vigente a la
-- fecha de otorgamiento. Distinta de politicas_mora (tasa moratoria).
CREATE TABLE IF NOT EXISTS politicas_credito (
  id                text PRIMARY KEY,
  vigencia_desde    date,
  vigencia_hasta    date,
  tna_min_bps       integer NOT NULL CHECK (tna_min_bps > 0),
  tna_max_bps       integer NOT NULL,
  tna_defecto_bps   integer NOT NULL,
  monto_min_centavos bigint NOT NULL CHECK (monto_min_centavos > 0),
  monto_max_centavos bigint NOT NULL,
  plazo_min_meses   integer NOT NULL CHECK (plazo_min_meses > 0),
  plazo_max_meses   integer NOT NULL,
  autor             text NOT NULL,
  motivo            text NOT NULL,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_polc_tna     CHECK (tna_max_bps >= tna_min_bps AND tna_defecto_bps BETWEEN tna_min_bps AND tna_max_bps),
  CONSTRAINT ck_polc_monto   CHECK (monto_max_centavos >= monto_min_centavos),
  CONSTRAINT ck_polc_plazo   CHECK (plazo_max_meses >= plazo_min_meses),
  CONSTRAINT ck_polc_vigencia CHECK (vigencia_hasta IS NULL OR vigencia_desde IS NULL OR vigencia_hasta >= vigencia_desde)
);

-- Valores iniciales (los define el Comité; ajustables como DATO, no como código).
INSERT INTO politicas_credito
  (id, vigencia_desde, vigencia_hasta, tna_min_bps, tna_max_bps, tna_defecto_bps,
   monto_min_centavos, monto_max_centavos, plazo_min_meses, plazo_max_meses, autor, motivo)
VALUES
  ('POLC-2026-01', NULL, NULL, 2400, 4800, 3600, 100000, 2500000, 3, 24,
   'Comité de Crédito', 'Rango de razonabilidad: la cartera canónica usa 30 %, 36 % y 40 % TNA.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS parametros_globales (
  clave  text PRIMARY KEY,
  valor  jsonb NOT NULL
);
-- claves esperadas: 'gasto_gestion_cobro', 'regla_incobrable_dias', 'regla_riesgo_dias'

-- ---------------------------------------------------------------------------
-- Cartera
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS clientes (
  id             text PRIMARY KEY,             -- 'CL-0001'
  nombre         text NOT NULL,
  dpi            text NOT NULL CONSTRAINT uq_clientes_dpi UNIQUE CHECK (dpi ~ '^[A-Za-z0-9-]{8,20}$'),
  telefono       text,
  municipio      text,
  direccion      text,                         -- el paquete canónico no trae dirección; se deriva del municipio
  fecha_alta     date NOT NULL
);

CREATE TABLE IF NOT EXISTS solicitudes_credito (
  id                text PRIMARY KEY,          -- 'SOL-...'
  cliente_id        text NOT NULL REFERENCES clientes(id),
  monto_centavos    bigint NOT NULL CHECK (monto_centavos > 0),
  plazo_meses       integer NOT NULL CHECK (plazo_meses > 0),
  estado            text NOT NULL DEFAULT 'SOLICITADO' CHECK (estado IN ('SOLICITADO','APROBADO','RECHAZADO','ANULADO')),
  fecha_solicitud   date NOT NULL,
  motivo_decision   text
);

CREATE TABLE IF NOT EXISTS creditos (
  id                  text PRIMARY KEY,        -- 'CV-2026-0001'
  cliente_id          text NOT NULL REFERENCES clientes(id),
  asesor_id           text REFERENCES asesores(id),
  solicitud_id        text UNIQUE REFERENCES solicitudes_credito(id),  -- una solicitud se desembolsa una sola vez
  fecha_desembolso    date NOT NULL,
  capital_centavos    bigint NOT NULL CHECK (capital_centavos > 0),
  plazo_meses         integer NOT NULL CHECK (plazo_meses > 0),
  tna_bps             integer NOT NULL CHECK (tna_bps > 0 AND tna_bps <= 10000),  -- TNA pactada del CRÉDITO (no la de mora); rango fino en politicas_credito
  tasa_mensual        numeric NOT NULL CHECK (tasa_mensual > 0),
  politica_credito_id text NOT NULL DEFAULT 'POLC-2026-01' REFERENCES politicas_credito(id),        -- tna_bps/10000/12, ya calculada para no repetir en cada consulta
  politica_id         text NOT NULL REFERENCES politicas_mora(id),  -- política de MORA vigente al otorgamiento
  -- `estado` es el ESTADO del patrón State (credito-estado.ts::EstadoCredito):
  -- un hecho que se persiste cuando ocurre una transición (SE_DESEMBOLSA,
  -- SUPERA_120_DIAS_SIN_ARREGLO, etc.). NO hay una columna "incobrable"
  -- aparte: un crédito es incobrable cuando estado = 'INCOBRABLE'. El TRAMO
  -- de mora (MORA_1..VENCIDO) nunca se persiste — siempre se deriva en el
  -- momento con clasificarTramoMora() a partir de la fecha de corte pedida,
  -- tal como exige la separación estado/tramo del propio comentario de
  -- credito-estado.ts.
  estado              text NOT NULL DEFAULT 'VIGENTE'
                      CHECK (estado IN ('VIGENTE','EN_MORA','REESTRUCTURADO','CANCELADO','INCOBRABLE')),
  reestructurado      boolean NOT NULL DEFAULT false,
  moneda              text NOT NULL DEFAULT 'GTQ' CHECK (moneda IN ('GTQ','USD')),
  -- coherencia: tasa_mensual = tna/12 (tolerancia de coma flotante)
  CONSTRAINT ck_credito_tasa_coherente CHECK (abs(tasa_mensual - tna_bps / 10000.0 / 12) < 1e-9)
);

CREATE INDEX IF NOT EXISTS idx_creditos_cliente ON creditos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_creditos_estado ON creditos(estado);

CREATE TABLE IF NOT EXISTS pagos (
  clave_idempotencia  text PRIMARY KEY,        -- invariante 6.10: repetida => se ignora
  credito_id          text NOT NULL REFERENCES creditos(id),
  fecha               date NOT NULL,
  monto_centavos      bigint NOT NULL CHECK (monto_centavos > 0),
  canal               text,
  creado_en           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_credito ON pagos(credito_id, fecha);

-- Los pagos son una bitácora: no se editan ni se borran (corrección = contra-registro).
CREATE OR REPLACE FUNCTION fn_pagos_inmutables() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla pagos es de solo inserción (no se permite % )', TG_OP;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_pagos_inmutables ON pagos;
CREATE TRIGGER trg_pagos_inmutables BEFORE UPDATE OR DELETE ON pagos
  FOR EACH ROW EXECUTE FUNCTION fn_pagos_inmutables();

-- Cierres: idempotentes por (fecha_corte, tipo) — sección 6.9. Guardamos el
-- desglose por concepto completo en `desglose` para la pantalla de Cierre
-- (E1: "desglosa las recuperaciones por concepto: gastos, interés
-- moratorio, interés corriente y capital").
CREATE TABLE IF NOT EXISTS cierres (
  fecha_corte                    date NOT NULL,
  tipo                           text NOT NULL CHECK (tipo IN ('DIARIO', 'MENSUAL')),
  cartera_activa_centavos        bigint NOT NULL,
  cartera_en_riesgo_centavos     bigint NOT NULL,
  porcentaje_en_riesgo           numeric NOT NULL CHECK (porcentaje_en_riesgo >= 0),
  incobrable_periodo_centavos    bigint NOT NULL,
  desembolsos_centavos           bigint NOT NULL,
  recuperacion_gastos_centavos             bigint NOT NULL,
  recuperacion_interes_moratorio_centavos  bigint NOT NULL,
  recuperacion_interes_corriente_centavos  bigint NOT NULL,
  recuperacion_capital_centavos            bigint NOT NULL,
  creado_en                      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fecha_corte, tipo),
  CONSTRAINT ck_cierre_montos CHECK (cartera_activa_centavos >= 0 AND cartera_en_riesgo_centavos >= 0 AND desembolsos_centavos >= 0
    AND recuperacion_gastos_centavos >= 0 AND recuperacion_interes_moratorio_centavos >= 0
    AND recuperacion_interes_corriente_centavos >= 0 AND recuperacion_capital_centavos >= 0)
);

-- ---------------------------------------------------------------------------
-- Usuarios, sesiones y bitácora de actividad (autenticación real por rol)
-- ---------------------------------------------------------------------------

-- Asesor que dio de alta al cliente (NULL: paquete canónico o autoalta del propio cliente).
-- ADD COLUMN IF NOT EXISTS mantiene idempotente el esquema sobre bases ya creadas.
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS asesor_id text REFERENCES asesores(id);
CREATE INDEX IF NOT EXISTS idx_clientes_asesor ON clientes(asesor_id);
CREATE INDEX IF NOT EXISTS idx_creditos_asesor ON creditos(asesor_id);

-- Cuentas. El identificador (correo en minúsculas o teléfono sólo con dígitos) es único.
-- La contraseña NUNCA se guarda: sólo el hash scrypt con sal (formato scrypt$N$r$p$sal$hash).
-- Un cliente/asesor puede tener a lo sumo una cuenta (UNIQUE; varios NULL permitidos).
CREATE TABLE IF NOT EXISTS usuarios (
  id               text PRIMARY KEY,           -- 'USR-XXXXXXXX'
  nombre           text NOT NULL,
  identificador    text NOT NULL CONSTRAINT uq_usuarios_identificador UNIQUE,
  contrasena_hash  text NOT NULL,
  rol              text NOT NULL CHECK (rol IN ('cliente','asesor','gerencia')),
  cliente_id       text CONSTRAINT uq_usuarios_cliente UNIQUE REFERENCES clientes(id),
  asesor_id        text CONSTRAINT uq_usuarios_asesor UNIQUE REFERENCES asesores(id),
  creado_en        timestamptz NOT NULL DEFAULT now(),
  ultimo_acceso    timestamptz
);

-- Bitácora de actividad de la aplicación (quién hizo qué). Solo inserción lógica.
CREATE TABLE IF NOT EXISTS bitacora (
  id              bigserial PRIMARY KEY,
  fecha           timestamptz NOT NULL DEFAULT now(),
  usuario_id      text REFERENCES usuarios(id),
  usuario_nombre  text NOT NULL,
  rol             text NOT NULL,
  accion          text NOT NULL,
  entidad         text,
  entidad_id      text,
  detalle         text
);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora(fecha DESC, id DESC);

-- ---------------------------------------------------------------------------
-- RAG (E4) — corpus vectorizado
-- ---------------------------------------------------------------------------

-- OJO: la dimensión del vector debe coincidir con el modelo de embeddings
-- elegido. nomic-embed-text (Ollama) = 768. bge-m3 = 1024. Si cambian de
-- modelo, hay que recrear esta columna (o la tabla) con la nueva dimensión.
CREATE TABLE IF NOT EXISTS rag_fragmentos (
  id             bigserial PRIMARY KEY,
  documento      text NOT NULL,        -- 'POL-2026-10.md', 'NOTA-CAMPO-07.md', ...
  indice         integer NOT NULL,     -- orden del fragmento dentro del documento
  contenido      text NOT NULL,
  embedding      vector(768) NOT NULL,
  UNIQUE (documento, indice)
);

-- Índice aproximado de similitud coseno (ivfflat). Con un corpus tan
-- pequeño (7 documentos) no es estrictamente necesario para el rendimiento,
-- pero se documenta como parte de la estrategia de recuperación (E4).
CREATE INDEX IF NOT EXISTS idx_rag_fragmentos_embedding
  ON rag_fragmentos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- ---------------------------------------------------------------------------
-- Bitácora de eventos canónicos: TODO evento leído de eventos.jsonl (363). Es la fuente
-- de verdad; `pagos` contiene los pagos efectivamente aplicados (claves repetidas se
-- ignoran, P1 6.10), por eso 228 eventos PAGO leídos = 226 aplicados + 2 reintentos.
CREATE TABLE IF NOT EXISTS eventos_carga (
  seq        integer PRIMARY KEY,
  tipo       text NOT NULL CHECK (tipo IN ('CLIENTE','DESEMBOLSO','PAGO')),
  payload    jsonb NOT NULL,
  aplicado   boolean NOT NULL DEFAULT true,
  cargado_en timestamptz NOT NULL DEFAULT now()
);

-- Metadatos de la carga canónica (para que el cargador sea idempotente y
-- para mostrar en el video que la huella SHA-256 ya fue verificada)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS carga_meta (
  clave  text PRIMARY KEY,
  valor  text NOT NULL,
  fecha  timestamptz NOT NULL DEFAULT now()
);
