import mysql from 'mysql2/promise';

// Ensure these env vars exist at runtime. In production you should set them in your environment
const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_PORT,
  MYSQL_CONNECT_TIMEOUT_MS,
} = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_PASSWORD || !MYSQL_DATABASE) {
  // Don't throw during import in environments where you only need frontend code.
  // But for server code that requires DB, it's better to fail fast.
  // We'll not throw here to avoid breaking builds that don't need DB at build time,
  // but consumers should handle missing envs.
  // throw new Error('Missing required MySQL environment variables.');
}

type PoolType = mysql.Pool;

declare global {
  // allow global caching across module reloads in development
  // eslint-disable-next-line no-var
  var __MYSQL_POOL__: PoolType | undefined;
}

function createPool(): PoolType {
  const port = MYSQL_PORT ? parseInt(MYSQL_PORT, 10) : undefined;
  const connectTimeout = MYSQL_CONNECT_TIMEOUT_MS ? parseInt(MYSQL_CONNECT_TIMEOUT_MS, 10) : 5000; // ms

  return mysql.createPool({
    host: MYSQL_HOST ?? 'localhost',
    user: MYSQL_USER ?? 'root',
    password: MYSQL_PASSWORD ?? '',
    database: MYSQL_DATABASE ?? undefined,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    // How long to wait for initial connection (ms). Defaults can be long; make it explicit so failures are faster.
    connectTimeout,
  });
}

const pool: PoolType = global.__MYSQL_POOL__ ?? createPool();
if (!global.__MYSQL_POOL__) global.__MYSQL_POOL__ = pool;

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    const [rows] = await pool.query(sql, params as any);
    return rows as T[];
  } catch (err: any) {
    // Provide a bit more server-side context in logs for debugging, but rethrow so callers control the response.
    // Avoid returning SQL or params to clients; only log them server-side.
    // eslint-disable-next-line no-console
    console.error('DB query error', { sql, params, message: err?.message, code: err?.code });
    throw err;
  }
}

export { pool };

export default { pool, query };
