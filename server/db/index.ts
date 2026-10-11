import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import type { DbClient, QueryResult } from './types.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DbClient | null = null;
let activePool: pg.Pool | null = null;
let activePGlite: PGlite | null = null;

/**
 * Wraps a PGlite instance to conform strictly to DbClient interface,
 * normalizing rows, rowCount and affectedRows.
 */
function createPGliteAdapter(pglite: PGlite): DbClient {
  return {
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const res = await pglite.query<T>(sql, params);
      const rowCount = res.rowCount ?? (res as any).affectedRows ?? res.rows.length;
      return {
        rows: res.rows,
        rowCount,
        affectedRows: rowCount,
        fields: res.fields,
        command: res.command,
      };
    },
    async exec(sql: string): Promise<any> {
      return pglite.exec(sql);
    },
  };
}

/**
 * Wraps a pg.Pool instance to conform strictly to DbClient interface,
 * normalizing rowCount and affectedRows for PostgreSQL.
 */
function createPgPoolAdapter(pool: pg.Pool): DbClient {
  return {
    async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
      const res = await pool.query<any>(sql, params);
      const rowCount = res.rowCount ?? res.rows.length;
      return {
        rows: res.rows as T[],
        rowCount,
        affectedRows: rowCount,
        fields: res.fields,
        command: res.command,
      };
    },
    async exec(sql: string): Promise<any> {
      return pool.query(sql);
    },
  };
}

/**
 * Primary database provider:
 * - When DATABASE_URL is non-empty: initializes and returns a real PostgreSQL connection pool.
 *   Throws an error immediately if connection verification fails (never silently falls back).
 * - When DATABASE_URL is unset or empty: initializes local persistent PGlite database.
 */
export async function getDb(dataDir?: string): Promise<DbClient> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    // 1. External PostgreSQL Connection (Supabase / Render / AWS RDS)
    const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com');
    const isSslRequired = databaseUrl.includes('sslmode=require') || isSupabase;

    const poolConfig: pg.PoolConfig = {
      connectionString: databaseUrl,
      max: Number(process.env.PG_MAX_CONNECTIONS || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (isSslRequired) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(poolConfig);

    // Verify connectivity immediately; throw with clear context if connection fails
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    } catch (err: any) {
      await pool.end().catch(() => {});
      throw new Error(`DATABASE_CONNECTION_FAILED: Không thể kết nối tới PostgreSQL (${err.message})`);
    }

    activePool = pool;
    dbInstance = createPgPoolAdapter(pool);
    return dbInstance;
  }

  // 2. Local PGlite fallback when no DATABASE_URL is set
  const dbPath = dataDir || path.resolve(__dirname, '../../.data/smartshift_pg');

  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const pglite = new PGlite(dbPath);
  await initSchema(pglite);
  activePGlite = pglite;
  dbInstance = createPGliteAdapter(pglite);
  return dbInstance;
}

/**
 * Isolated in-memory database strictly for automated unit and integration tests.
 * ALWAYS returns an isolated PGlite in-memory database instance, regardless of DATABASE_URL.
 */
export async function getTestDb(): Promise<DbClient> {
  const testDb = new PGlite();
  await initSchema(testDb);
  return createPGliteAdapter(testDb);
}

async function initSchema(db: PGlite) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await db.exec(schemaSql);
}

/**
 * Closes the active database connection pool or local PGlite instance.
 */
export async function closeDb(): Promise<void> {
  if (activePool) {
    await activePool.end();
    activePool = null;
  }
  if (activePGlite) {
    await activePGlite.close();
    activePGlite = null;
  }
  dbInstance = null;
}
