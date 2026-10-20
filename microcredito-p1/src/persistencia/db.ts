// Cliente de conexión a PostgreSQL (E2).
//
// Se usa `pg` directo (sin ORM) a propósito: el equipo ya tiene los
// esquemas Zod de src/contratos/ como fuente de verdad de forma; un ORM
// solo añadiría una segunda fuente de verdad de estructura. Si el equipo
// prefiere Prisma o Drizzle (ambos permitidos por el enunciado, sección 4),
// este archivo es el único punto que habría que reemplazar — el resto del
// código llama siempre a través de src/aplicacion/repositorio.ts, nunca a
// `pg` directamente.
//
// Requiere la dependencia "pg" (agregada en package.json) y la variable de
// entorno DATABASE_URL (ver .env.example).

import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function obtenerPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "Falta la variable de entorno DATABASE_URL (ver .env.example). " +
          "Ejemplo: postgres://usuario:clave@localhost:5432/credito_vecino"
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/** Ejecuta una consulta y regresa las filas. Uso: await consultar<Fila>(sql, params). */
export async function consultar<T extends pg.QueryResultRow = pg.QueryResultRow>(
  texto: string,
  parametros: unknown[] = []
): Promise<T[]> {
  const resultado = await obtenerPool().query<T>(texto, parametros);
  return resultado.rows;
}

/** Ejecuta varias sentencias dentro de una sola transacción. */
export async function transaccion<T>(fn: (cliente: pg.PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await fn(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function cerrarPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
