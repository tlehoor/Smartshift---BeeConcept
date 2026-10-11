import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REQUIRED_TABLES = [
  'users',
  'employees',
  'schedule_weeks',
  'shifts',
  'schedule_versions',
  'schedule_version_assignments',
  'operational_shift_assignments',
  'employee_availabilities',
  'availability_explanations',
  'cover_requests',
  'cover_invitations',
  'swap_requests',
  'debt_transactions',
  'audit_logs',
] as const;

export interface MigrationOptions {
  databaseUrl?: string;
  schemaPath?: string;
  client?: any; // For testing and mocking pg.Client
  logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    warn: (msg: string) => void;
  };
}

/**
 * Sanitizes connection string or error message to prevent leaking secrets/credentials.
 */
export function sanitizeLog(msg: string): string {
  return msg.replace(/:\/\/([^:]+):([^@]+)@/g, '://$1:***@');
}

/**
 * Executes SmartShift database migration against PostgreSQL.
 * Fully transactional with validation checks and error recovery.
 */
export async function runMigration(options: MigrationOptions = {}): Promise<{
  success: boolean;
  tablesVerified: string[];
  alreadyInitialized: boolean;
}> {
  const logger = options.logger || console;
  const databaseUrl = (options.databaseUrl ?? process.env.DATABASE_URL)?.trim();

  if (!databaseUrl) {
    throw new Error('MIGRATION_FAILED: DATABASE_URL is required to run migration.');
  }

  const schemaFile = options.schemaPath || path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaFile)) {
    throw new Error(`MIGRATION_FAILED: Schema file not found at ${schemaFile}`);
  }

  const schemaSql = fs.readFileSync(schemaFile, 'utf-8');

  const isSupabase = databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com');
  const isSslRequired = databaseUrl.includes('sslmode=require') || isSupabase;

  const client =
    options.client ||
    new Client({
      connectionString: databaseUrl,
      ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
    });

  const shouldCloseClient = !options.client;

  try {
    if (shouldCloseClient) {
      await client.connect();
    }
    logger.info('[Migration] Connected successfully to PostgreSQL.');

    // 1. Pre-flight check: Inspect existing tables in public schema
    const existingTablesRes: any = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const existingTableNames = new Set((existingTablesRes.rows || []).map((r: any) => String(r.table_name)));

    const existingRequiredTables = REQUIRED_TABLES.filter((t) => existingTableNames.has(t));
    const missingRequiredTables = REQUIRED_TABLES.filter((t) => !existingTableNames.has(t));

    // Case A: All 14 required tables already exist -> Skip DDL safely
    if (existingRequiredTables.length === REQUIRED_TABLES.length) {
      logger.info('[Migration] All 14 required tables already exist in public schema. Skipping DDL execution.');
      const verified = Array.from(existingTableNames).filter((t): t is string => REQUIRED_TABLES.includes(t as any));
      return {
        success: true,
        tablesVerified: verified,
        alreadyInitialized: true,
      };
    }

    // Case B: Partial table existence (1 to 13 tables exist) -> Abort safely to avoid data corruption or partial schema
    if (existingRequiredTables.length > 0) {
      const existingList = existingRequiredTables.join(', ');
      const missingList = missingRequiredTables.join(', ');
      const errorMsg =
        `MIGRATION_ABORTED_PARTIAL_SCHEMA: Database is in a partial state with ${existingRequiredTables.length}/${REQUIRED_TABLES.length} tables. ` +
        `Existing tables: [${existingList}]. Missing tables: [${missingList}]. ` +
        `Migration aborted to prevent schema mismatch or accidental data damage.`;
      logger.error(`[Migration] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Case C: Clean database (0 business tables exist) -> Proceed with atomic transaction
    logger.info('[Migration] Clean database detected (0 business tables). Applying schema DDL in an atomic transaction...');
    await client.query('BEGIN');

    try {
      await client.query(schemaSql);
      await client.query('COMMIT');
      logger.info('[Migration] Schema DDL committed successfully.');
    } catch (sqlErr: any) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`MIGRATION_SQL_ERROR: ${sqlErr.message}`);
    }

    // 2. Post-flight verification: Confirm all required tables exist
    const postCheckRes: any = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const postCheckNames = new Set((postCheckRes.rows || []).map((r: any) => String(r.table_name)));
    const missing = REQUIRED_TABLES.filter((t) => !postCheckNames.has(t));

    if (missing.length > 0) {
      throw new Error(`MIGRATION_VERIFICATION_FAILED: Missing tables after migration: ${missing.join(', ')}`);
    }

    logger.info(`[Migration] Verification complete. Verified ${REQUIRED_TABLES.length} tables in PostgreSQL.`);
    return {
      success: true,
      tablesVerified: [...REQUIRED_TABLES],
      alreadyInitialized: false,
    };
  } catch (err: any) {
    logger.error(`[Migration] Error: ${sanitizeLog(err.message)}`);
    throw err;
  } finally {
    if (shouldCloseClient) {
      await client.end().catch(() => {});
    }
  }
}

// Standalone CLI execution
const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  runMigration()
    .then((res) => {
      console.log(`[Migration] Finished. Tables verified: ${res.tablesVerified.length}. Status: SUCCESS.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration] Fatal failure: ${sanitizeLog(err.message)}`);
      process.exit(1);
    });
}
