/**
 * Test Helpers
 *
 * Utility functions to make integration tests easier to write and read.
 */

import { createResource, type Resource } from '../../src/domain/entities/Resource.js';
import { createReservation, type Reservation } from '../../src/domain/entities/Reservation.js';
import {
  createResourceId,
  createClientId,
  createQuantity,
  generateReservationId,
  type ResourceId,
  type ClientId,
} from '../../src/domain/value-objects/index.js';
import { ResourceRepository } from '../../src/infrastructure/persistence/repositories/ResourceRepository.js';
import { ReservationRepository } from '../../src/infrastructure/persistence/repositories/ReservationRepository.js';

/**
 * Factory for creating test resources
 */
export async function createTestResource(
  params: {
    id?: string;
    type?: string;
    capacity?: number;
    state?: 'OPEN' | 'CLOSED';
  } = {},
  repo?: ResourceRepository
): Promise<Resource> {
  const resource = createResource({
    id: createResourceId(params.id || `test-resource-${Date.now()}`),
    type: params.type || 'meeting-room',
    capacity: params.capacity ?? 10,
    state: params.state || 'OPEN',
  });

  if (repo) {
    return await repo.save(resource);
  }

  return resource;
}

/**
 * Factory for creating test reservations
 */
export async function createTestReservation(
  params: {
    resourceId: ResourceId;
    clientId?: ClientId;
    quantity?: number;
    status?: 'CONFIRMED' | 'CANCELLED';
    serverTimestamp?: number;
  },
  repo?: ReservationRepository
): Promise<Reservation> {
  const reservation = createReservation({
    id: generateReservationId(),
    resourceId: params.resourceId,
    clientId: params.clientId || createClientId('test-client'),
    quantity: params.quantity ?? 1,
    status: params.status || 'CONFIRMED',
    serverTimestamp: params.serverTimestamp ?? Date.now(),
  });

  if (repo) {
    return await repo.save(reservation);
  }

  return reservation;
}

/**
 * Generate a unique resource ID for testing
 */
export function testResourceId(suffix?: string): ResourceId {
  const unique = Date.now() + Math.random().toString(36).substring(2, 9);
  return createResourceId(`test-resource-${unique}${suffix ? `-${suffix}` : ''}`);
}

/**
 * Generate a unique client ID for testing
 */
export function testClientId(suffix?: string): ClientId {
  const unique = Date.now() + Math.random().toString(36).substring(2, 9);
  return createClientId(`test-client-${unique}${suffix ? `-${suffix}` : ''}`);
}

/**
 * Sleep for specified milliseconds (useful for timing-sensitive tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that a value is defined (TypeScript type narrowing)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Create multiple concurrent commit requests for testing
 */
export function createConcurrentCommitRequests(
  count: number,
  resourceId: ResourceId,
  baseClientId = 'client'
) {
  return Array.from({ length: count }, (_, i) => ({
    resourceId,
    clientId: createClientId(`${baseClientId}-${i}`),
    quantity: createQuantity(1),
  }));
}

/**
 * Analyze commit results for concurrency tests
 */
export function analyzeCommitResults(results: Array<{ success: boolean }>) {
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  return {
    total: results.length,
    successes: successes.length,
    failures: failures.length,
    successRate: (successes.length / results.length) * 100,
  };
}

/**
 * Wait for a condition to be true (with timeout)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  checkIntervalMs = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await sleep(checkIntervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Execute a function multiple times concurrently
 */
export async function executeConcurrently<T>(
  count: number,
  fn: (index: number) => Promise<T>
): Promise<T[]> {
  const promises = Array.from({ length: count }, (_, i) => fn(i));
  return Promise.all(promises);
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startTime;
  return { result, durationMs };
}
