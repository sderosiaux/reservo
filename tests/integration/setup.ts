/**
 * Integration Test Setup
 *
 * This module provides test database lifecycle management:
 * - Start/stop PostgreSQL test container
 * - Apply migrations
 * - Cleanup utilities between tests
 * - Database connection management
 */

import { execSync } from 'child_process';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/infrastructure/persistence/schema/index';

const TEST_DATABASE_URL = 'postgres://reservo:reservo@localhost:5433/reservo_test';

// Set DATABASE_URL for repositories that use the global db singleton
process.env.DATABASE_URL = TEST_DATABASE_URL;

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

let globalDbConnection: postgres.Sql | null = null;
let globalDb: TestDatabase | null = null;

/**
 * Wait for PostgreSQL to be ready
 */
function waitForPostgres(maxAttempts = 30): void {
  console.log('Waiting for PostgreSQL to be ready...');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      execSync(
        'docker exec reservo-test-db pg_isready -U reservo -d reservo_test',
        { stdio: 'pipe' }
      );
      console.log('PostgreSQL is ready!');
      return;
    } catch {
      if (i === maxAttempts - 1) {
        throw new Error('PostgreSQL failed to become ready in time');
      }
      // Wait 1 second before retrying
      execSync('sleep 1', { stdio: 'pipe' });
    }
  }
}

/**
 * Apply Drizzle migrations to test database
 */
function runMigrations(): void {
  console.log('Running migrations...');

  try {
    // Generate migrations if needed
    execSync('npm run db:generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    });
  } catch (error) {
    // Ignore if no changes
    console.log('No new migrations to generate');
  }

  try {
    // Apply migrations
    execSync('npm run db:push', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    });
    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Failed to apply migrations:', error);
    throw error;
  }
}

/**
 * Setup test database
 * - Start Docker container
 * - Wait for PostgreSQL
 * - Run migrations
 * - Return database connection
 */
export async function setupTestDatabase(): Promise<TestDatabase> {
  // Start docker-compose.test.yml
  console.log('Starting test database container...');

  try {
    execSync('docker-compose -f docker-compose.test.yml up -d', {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Failed to start Docker container:', error);
    throw error;
  }

  // Wait for PostgreSQL to be ready
  waitForPostgres();

  // Run migrations
  runMigrations();

  // Create database connection
  console.log('Creating database connection...');
  const queryClient = postgres(TEST_DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(queryClient, { schema });

  // Store globally for cleanup
  globalDbConnection = queryClient;
  globalDb = db;

  console.log('Test database setup complete!');
  return db;
}

/**
 * Clean test database between tests
 * CRITICAL: This ensures test isolation by truncating all tables
 */
export async function cleanupTestDatabase(db: TestDatabase): Promise<void> {
  // Truncate in correct order (respecting foreign keys)
  await db.execute(sql`TRUNCATE TABLE reservations CASCADE`);
  await db.execute(sql`TRUNCATE TABLE resources CASCADE`);
}

/**
 * Teardown test database
 * - Close database connections
 * - Stop Docker container
 */
export async function teardownTestDatabase(): Promise<void> {
  console.log('Tearing down test database...');

  // Close database connection
  if (globalDbConnection) {
    await globalDbConnection.end();
    globalDbConnection = null;
    globalDb = null;
  }

  // Stop Docker container
  try {
    execSync('docker-compose -f docker-compose.test.yml down', {
      stdio: 'inherit'
    });
    console.log('Test database teardown complete!');
  } catch (error) {
    console.error('Failed to stop Docker container:', error);
    throw error;
  }
}

/**
 * Get the global database connection
 * This is used by tests that were already provided a db instance
 */
export function getTestDatabase(): TestDatabase {
  if (!globalDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return globalDb;
}
