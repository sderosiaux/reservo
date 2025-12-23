/**
 * Example Integration Test
 *
 * This file demonstrates how to write integration tests using the helpers.
 * Use this as a template for adding new integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase, type TestDatabase } from './setup.js';
import {
  createTestResource,
  createTestReservation,
  testResourceId,
  testClientId,
  analyzeCommitResults,
  executeConcurrently,
  measureTime,
} from './helpers.js';
import { ReservationCommitService } from '../../src/application/services/ReservationCommitService.js';
import { ResourceRepository } from '../../src/infrastructure/persistence/repositories/ResourceRepository.js';
import { ReservationRepository } from '../../src/infrastructure/persistence/repositories/ReservationRepository.js';
import { createQuantity } from '../../src/domain/value-objects/index.js';

describe('Example Integration Test', () => {
  let db: TestDatabase;
  let commitService: ReservationCommitService;
  let resourceRepo: ResourceRepository;
  let reservationRepo: ReservationRepository;

  beforeAll(async () => {
    db = await setupTestDatabase();
    resourceRepo = new ResourceRepository();
    reservationRepo = new ReservationRepository();
    commitService = new ReservationCommitService(db, resourceRepo, reservationRepo);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe('Using test helpers', () => {
    it('creates a test resource easily', async () => {
      // Use helper to create a test resource
      const resource = await createTestResource(
        {
          capacity: 5,
          state: 'OPEN',
        },
        resourceRepo
      );

      expect(resource.capacity).toBe(5);
      expect(resource.state).toBe('OPEN');
      expect(resource.currentBookings).toBe(0);

      // Verify it's in the database
      const found = await resourceRepo.findById(resource.id);
      expect(found).toBeDefined();
    });

    it('creates test reservations easily', async () => {
      // Create a resource first
      const resource = await createTestResource({ capacity: 10 }, resourceRepo);

      // Create a reservation using helper
      const reservation = await createTestReservation(
        {
          resourceId: resource.id,
          quantity: 3,
        },
        reservationRepo
      );

      expect(reservation.quantity).toBe(3);
      expect(reservation.status).toBe('CONFIRMED');

      // Verify it's in the database
      const found = await reservationRepo.findById(reservation.id);
      expect(found).toBeDefined();
    });

    it('generates unique IDs', () => {
      // Helpers generate unique IDs
      const id1 = testResourceId();
      const id2 = testResourceId();

      expect(id1).not.toBe(id2);

      // Can also add suffix for readability
      const idWithSuffix = testResourceId('my-test');
      expect(idWithSuffix).toContain('my-test');
    });

    it('executes concurrent operations', async () => {
      const resource = await createTestResource({ capacity: 50 }, resourceRepo);

      // Execute 20 concurrent reservations
      const results = await executeConcurrently(20, async (i) => {
        return commitService.commit({
          resourceId: resource.id,
          clientId: testClientId(`concurrent-${i}`),
          quantity: createQuantity(1),
        });
      });

      // Analyze results
      const analysis = analyzeCommitResults(results);
      expect(analysis.successes).toBe(20);
      expect(analysis.failures).toBe(0);

      // Verify in database
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(20);
    });

    it('measures execution time', async () => {
      const resource = await createTestResource({ capacity: 10 }, resourceRepo);

      // Measure how long a commit takes
      const { result, durationMs } = await measureTime(async () => {
        return commitService.commit({
          resourceId: resource.id,
          clientId: testClientId(),
          quantity: createQuantity(1),
        });
      });

      expect(result.success).toBe(true);
      expect(durationMs).toBeLessThan(1000); // Should be fast
      console.log(`Commit took ${durationMs}ms`);
    });
  });

  describe('Testing a new feature', () => {
    it('example: testing capacity edge case', async () => {
      // Create resource with exact capacity needed
      const resource = await createTestResource({ capacity: 3 }, resourceRepo);

      // Fill to capacity
      for (let i = 0; i < 3; i++) {
        const result = await commitService.commit({
          resourceId: resource.id,
          clientId: testClientId(`client-${i}`),
          quantity: createQuantity(1),
        });
        expect(result.success).toBe(true);
      }

      // Next one should fail
      const result = await commitService.commit({
        resourceId: resource.id,
        clientId: testClientId('overflow'),
        quantity: createQuantity(1),
      });

      expect(result.success).toBe(false);
      expect(result.event.reason).toBe('RESOURCE_FULL');

      // Verify state
      const finalResource = await resourceRepo.findById(resource.id);
      expect(finalResource?.currentBookings).toBe(3);
    });
  });
});
