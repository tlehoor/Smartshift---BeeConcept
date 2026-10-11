/**
 * SmartShift Database Executor Interface & Types
 * Provides unified interface abstraction for both PGlite and standard PostgreSQL (pg.Pool / pg.Client)
 */

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
  fields?: any[];
  command?: string;
  affectedRows?: number; // Maintained for backward compatibility with PGlite specific usage
}

/**
 * Common executor contract satisfying query execution on both PGlite and pg.Pool/pg.Client
 */
export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  exec?(sql: string): Promise<any>;
}

/**
 * Interface supporting transactional operations with a dedicated connection
 */
export interface TransactionalDbClient extends DbClient {
  transaction<T>(callback: (client: DbClient) => Promise<T>): Promise<T>;
  close?(): Promise<void>;
}
