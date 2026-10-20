-- Alternativa SIN Docker: PostgreSQL instalado en el equipo (con pgvector instalado).
-- Ejecutar UNA vez como superusuario:   psql -U postgres -f scripts/crear-bd.sql
-- Después, el esquema (tablas, relaciones, restricciones) lo aplica `npm run cargar`
-- a partir de src/persistencia/schema.sql.

CREATE ROLE credito_vecino LOGIN PASSWORD 'credito_vecino';
CREATE DATABASE credito_vecino OWNER credito_vecino ENCODING 'UTF8';
\connect credito_vecino
CREATE EXTENSION IF NOT EXISTS vector;   -- requiere superusuario; por eso se hace aquí
GRANT ALL ON SCHEMA public TO credito_vecino;
