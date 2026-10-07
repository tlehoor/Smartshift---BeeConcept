import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: PGlite | null = null;

export async function getDb(dataDir?: string): Promise<PGlite> {
  if (dbInstance) {
    return dbInstance;
  }

  // Use persistent directory if provided or default to local data folder
  const dbPath = dataDir || path.resolve(__dirname, '../../.data/smartshift_pg');
  
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  dbInstance = new PGlite(dbPath);
  await initSchema(dbInstance);
  return dbInstance;
}

export async function getTestDb(): Promise<PGlite> {
  // Fresh in-memory database for isolated unit/integration tests
  const testDb = new PGlite();
  await initSchema(testDb);
  return testDb;
}

async function initSchema(db: PGlite) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await db.exec(schemaSql);
}

export async function closeDb() {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
