import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDb, getTestDb, closeDb } from '../server/db/index.js';

describe('Database Driver Selection & Multi-Environment Adapter', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(async () => {
    await closeDb();
  });

  afterEach(async () => {
    process.env.DATABASE_URL = originalEnv;
    await closeDb();
  });

  it('selects PGlite when DATABASE_URL is not provided or empty', async () => {
    delete process.env.DATABASE_URL;
    const db = await getDb();

    // Verify it behaves as a valid DbClient with standard query interface
    const res = await db.query<{ count: string }>('SELECT 1 as count');
    expect(res.rows).toBeDefined();
    expect(res.rows.length).toBe(1);
    expect(Number(res.rows[0].count)).toBe(1);
    expect(res.rowCount).toBe(1);
    expect(res.affectedRows).toBe(1);
  });

  it('always provides an isolated in-memory PGlite instance via getTestDb() regardless of DATABASE_URL', async () => {
    // Set a dummy URL that would fail if connected to PostgreSQL
    process.env.DATABASE_URL = 'postgresql://invalid_host_never_connect:5432/test';

    // getTestDb() must NEVER attempt to connect to external PostgreSQL
    const testDb = await getTestDb();
    const res = await testDb.query<{ num: number }>('SELECT 42 as num');
    expect(res.rows[0].num).toBe(42);
    expect(res.rowCount).toBe(1);
  });

  it('fails fast with DATABASE_CONNECTION_FAILED when DATABASE_URL is set but unreachable', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:wrong_password@127.0.0.1:54399/non_existent_db?sslmode=disable';

    // Must NOT silently fallback to PGlite! It must throw a clear error.
    await expect(getDb()).rejects.toThrow('DATABASE_CONNECTION_FAILED');
  });

  describe('Auto-Seed Prevention Safety Logic (shouldAutoSeed)', () => {
    it('disables auto-seeding when NODE_ENV is production, regardless of DATABASE_URL', async () => {
      const { shouldAutoSeed } = await import('../server/index.js');
      expect(shouldAutoSeed({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://localhost:5432/db' })).toBe(false);
      expect(shouldAutoSeed({ NODE_ENV: 'production', DATABASE_URL: '' })).toBe(false);
      expect(shouldAutoSeed({ NODE_ENV: 'production' })).toBe(false);
    });

    it('disables auto-seeding when DATABASE_URL is set, even if NODE_ENV is development or undefined', async () => {
      const { shouldAutoSeed } = await import('../server/index.js');
      expect(shouldAutoSeed({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://supabase.co:5432/db' })).toBe(false);
      expect(shouldAutoSeed({ DATABASE_URL: 'postgresql://localhost:5432/db' })).toBe(false);
    });

    it('disables auto-seeding during automated tests', async () => {
      const { shouldAutoSeed } = await import('../server/index.js');
      expect(shouldAutoSeed({ NODE_ENV: 'test' })).toBe(false);
      expect(shouldAutoSeed({ NODE_ENV: 'test', DATABASE_URL: '' })).toBe(false);
    });

    it('allows auto-seeding strictly in local development with no DATABASE_URL', async () => {
      const { shouldAutoSeed } = await import('../server/index.js');
      expect(shouldAutoSeed({ NODE_ENV: 'development' })).toBe(true);
      expect(shouldAutoSeed({ NODE_ENV: 'development', DATABASE_URL: '' })).toBe(true);
      expect(shouldAutoSeed({})).toBe(true);
    });
  });
});
