import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { Sql } from 'postgres';
import * as schema from './schema/index.js';

let queryClient: Sql | null = null;
let dbInstance: PostgresJsDatabase<typeof schema> | null = null;

// Connection pool configuration
const DB_CONFIG = {
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '50', 10), // Increased from 20 to 50
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30', 10),
  connect_timeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10', 10),
  max_lifetime: 60 * 30, // 30 minutes max connection lifetime
};

// Timeout configuration (in milliseconds)
const STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10); // 30s default
const LOCK_TIMEOUT_MS = parseInt(process.env.DB_LOCK_TIMEOUT || '10000', 10); // 10s default

/**
 * Create a database connection with the given URL
 * If no URL provided, uses DATABASE_URL environment variable
 */
export function createDb(connectionUrl?: string): PostgresJsDatabase<typeof schema> {
  const url = connectionUrl || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (queryClient) {
    // Close existing connection if any
    queryClient.end();
  }

  queryClient = postgres(url, {
    ...DB_CONFIG,
    transform: postgres.camel,
    // Set statement and lock timeouts via connection options
    // These prevent slow/blocked queries from holding resources indefinitely
    connection: {
      statement_timeout: STATEMENT_TIMEOUT_MS,
      lock_timeout: LOCK_TIMEOUT_MS,
    },
    onnotice: (notice) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('PostgreSQL Notice:', notice.message);
      }
    },
  });

  dbInstance = drizzle(queryClient, { schema });
  return dbInstance;
}

/**
 * Get the current database instance
 * Creates one if it doesn't exist
 */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!dbInstance) {
    return createDb();
  }
  return dbInstance;
}

/**
 * Get connection pool statistics for monitoring
 */
export function getPoolStats(): {
  maxConnections: number;
  idleTimeout: number;
  connectTimeout: number;
  isConnected: boolean;
} {
  return {
    maxConnections: DB_CONFIG.max,
    idleTimeout: DB_CONFIG.idle_timeout,
    connectTimeout: DB_CONFIG.connect_timeout,
    isConnected: queryClient !== null && dbInstance !== null,
  };
}

/**
 * Close the database connection with graceful shutdown
 */
export async function closeDb(options: { timeout?: number } = {}): Promise<void> {
  const { timeout = 5000 } = options;

  if (queryClient) {
    try {
      await queryClient.end({ timeout: timeout / 1000 });
    } catch (error) {
      console.error('Error closing database connection:', error);
    } finally {
      queryClient = null;
      dbInstance = null;
    }
  }
}

// Legacy export for backward compatibility
// Lazily initialized on first access
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>];
  },
});

export type Database = PostgresJsDatabase<typeof schema>;
