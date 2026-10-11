import { describe, it, expect, vi } from 'vitest';
import { runMigration, sanitizeLog, REQUIRED_TABLES } from '../server/db/migrate.js';

describe('Database Migration Script (server/db/migrate.ts)', () => {
  it('throws an error if DATABASE_URL is missing or empty', async () => {
    await expect(runMigration({ databaseUrl: '' })).rejects.toThrow(
      'MIGRATION_FAILED: DATABASE_URL is required to run migration.'
    );
    await expect(runMigration({ databaseUrl: '   ' })).rejects.toThrow(
      'MIGRATION_FAILED: DATABASE_URL is required to run migration.'
    );
  });

  it('sanitizes credentials from logs to prevent leaking passwords', () => {
    const rawUrl = 'postgresql://postgres:mySuperSecretPass123@db.supabase.co:5432/postgres';
    const sanitized = sanitizeLog(`Connecting to ${rawUrl}`);
    expect(sanitized).not.toContain('mySuperSecretPass123');
    expect(sanitized).toBe('Connecting to postgresql://postgres:***@db.supabase.co:5432/postgres');
  });

  it('fails gracefully when database is unreachable and does not execute seed', async () => {
    const unreachableUrl = 'postgresql://postgres:dummy@127.0.0.1:54398/non_existent_db?sslmode=disable';

    const logs: string[] = [];
    const mockLogger = {
      info: (msg: string) => logs.push(msg),
      warn: (msg: string) => logs.push(msg),
      error: (msg: string) => logs.push(msg),
    };

    await expect(
      runMigration({
        databaseUrl: unreachableUrl,
        logger: mockLogger,
      })
    ).rejects.toThrow();

    // Verify logger never prints the password
    for (const log of logs) {
      expect(log).not.toContain('dummy');
    }
  });

  it('lists all 14 required core business tables without assumption', () => {
    expect(REQUIRED_TABLES.length).toBe(14);
    expect(REQUIRED_TABLES).toContain('users');
    expect(REQUIRED_TABLES).toContain('employees');
    expect(REQUIRED_TABLES).toContain('schedule_weeks');
    expect(REQUIRED_TABLES).toContain('operational_shift_assignments');
    expect(REQUIRED_TABLES).toContain('debt_transactions');
  });

  it('runs migration smoothly on a clean database (0 business tables)', async () => {
    const queriesExecuted: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        queriesExecuted.push(sql);
        // Pre-flight check: returns 0 business tables
        if (sql.includes('information_schema.tables') && queriesExecuted.length === 1) {
          return { rows: [] };
        }
        // Post-flight verification: returns all 14 tables created
        if (sql.includes('information_schema.tables')) {
          return { rows: REQUIRED_TABLES.map((t) => ({ table_name: t })) };
        }
        return { rows: [] };
      }),
    };

    const res = await runMigration({
      databaseUrl: 'postgresql://postgres:pass@localhost:5432/db',
      client: mockClient,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    expect(res.success).toBe(true);
    expect(res.alreadyInitialized).toBe(false);
    expect(res.tablesVerified.length).toBe(14);

    // Verify atomic transaction sequence
    expect(queriesExecuted).toContain('BEGIN');
    expect(queriesExecuted).toContain('COMMIT');
  });

  it('skips DDL execution safely when all 14 required tables already exist', async () => {
    const queriesExecuted: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        queriesExecuted.push(sql);
        return { rows: REQUIRED_TABLES.map((t) => ({ table_name: t })) };
      }),
    };

    const res = await runMigration({
      databaseUrl: 'postgresql://postgres:pass@localhost:5432/db',
      client: mockClient,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    expect(res.success).toBe(true);
    expect(res.alreadyInitialized).toBe(true);
    expect(res.tablesVerified.length).toBe(14);

    // DDL transaction must NOT be executed!
    expect(queriesExecuted).not.toContain('BEGIN');
    expect(queriesExecuted).not.toContain('COMMIT');
  });

  it('aborts safely with error when database has a partial schema (1 to 13 tables)', async () => {
    const queriesExecuted: string[] = [];
    const logs: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        queriesExecuted.push(sql);
        // Returns only 3 tables out of 14
        return { rows: [{ table_name: 'users' }, { table_name: 'employees' }, { table_name: 'shifts' }] };
      }),
    };

    await expect(
      runMigration({
        databaseUrl: 'postgresql://postgres:pass@localhost:5432/db',
        client: mockClient,
        logger: {
          info: (msg) => logs.push(msg),
          warn: (msg) => logs.push(msg),
          error: (msg) => logs.push(msg),
        },
      })
    ).rejects.toThrow('MIGRATION_ABORTED_PARTIAL_SCHEMA');

    // DDL must NEVER run when partial schema is detected
    expect(queriesExecuted).not.toContain('BEGIN');
    expect(queriesExecuted).not.toContain('COMMIT');

    // Error log must clearly enumerate existing and missing tables
    const errorLog = logs.find((l) => l.includes('MIGRATION_ABORTED_PARTIAL_SCHEMA'));
    expect(errorLog).toBeDefined();
    expect(errorLog).toContain('users, employees, shifts');
    expect(errorLog).toContain('schedule_weeks');
  });

  it('triggers ROLLBACK when schema execution encounters an SQL error', async () => {
    const queriesExecuted: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        queriesExecuted.push(sql);
        // Pre-flight check: clean db
        if (sql.includes('information_schema.tables')) {
          return { rows: [] };
        }
        if (sql === 'BEGIN') {
          return { rows: [] };
        }
        // Simulate SQL failure during schema execution
        if (sql.includes('CREATE TABLE')) {
          throw new Error('syntax error at or near INVALID');
        }
        if (sql === 'ROLLBACK') {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };

    await expect(
      runMigration({
        databaseUrl: 'postgresql://postgres:pass@localhost:5432/db',
        client: mockClient,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      })
    ).rejects.toThrow('MIGRATION_SQL_ERROR: syntax error at or near INVALID');

    // Verify ROLLBACK was explicitly called after failure
    expect(queriesExecuted).toContain('BEGIN');
    expect(queriesExecuted).toContain('ROLLBACK');
    expect(queriesExecuted).not.toContain('COMMIT');
  });
});
