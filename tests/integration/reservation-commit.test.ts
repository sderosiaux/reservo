/**
 * ReservationCommitService Integration Tests
 *
 * CRITICAL TEST SUITE - This proves the system works correctly under concurrency.
 *
 * The most important tests are in the "Concurrency" section.
 * These tests verify that the row-level locking prevents overbooking.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase, type TestDatabase } from './setup.js';
import { ReservationCommitService } from '../../src/application/services/ReservationCommitService.js';
import { ResourceRepository } from '../../src/infrastructure/persistence/repositories/ResourceRepository.js';
import { ReservationRepository } from '../../src/infrastructure/persistence/repositories/ReservationRepository.js';
import { createResource } from '../../src/domain/entities/Resource.js';
import {
  createResourceId,
  createClientId,
  createQuantity,
} from '../../src/domain/value-objects/index.js';

describe('ReservationCommitService Integration', () => {
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

  describe('Basic commit flow', () => {
    it('successfully reserves when capacity available', async () => {
      // Create a resource with capacity 10
      const resource = createResource({
        id: createResourceId('test-resource-1'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Attempt to reserve 5 slots
      const result = await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-1'),
        quantity: createQuantity(5)
      });

      // Assert success
      expect(result.success).toBe(true);
      expect(result.reservation).toBeDefined();
      expect(result.reservation?.quantity).toBe(5);
      expect(result.serverTimestamp).toBeGreaterThan(0);
      expect(result.event.type).toBe('RESERVATION_CONFIRMED');

      // Verify in database
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.currentBookings).toBe(5);
      expect(updatedResource?.version).toBe(2); // Version incremented

      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(1);
      expect(reservations[0].quantity).toBe(5);
      expect(reservations[0].status).toBe('CONFIRMED');
    });

    it('rejects when resource is full', async () => {
      // Create a resource with capacity 10
      const resource = createResource({
        id: createResourceId('test-resource-2'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Fill the resource
      await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-1'),
        quantity: createQuantity(10)
      });

      // Try to reserve 1 more
      const result = await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-2'),
        quantity: createQuantity(1)
      });

      // Assert rejection
      expect(result.success).toBe(false);
      expect(result.reservation).toBeDefined();
      expect(result.reservation?.status).toBe('REJECTED');
      expect(result.reservation?.rejectionReason).toBe('RESOURCE_FULL');
      expect(result.event.type).toBe('RESERVATION_REJECTED');
      expect(result.event.reason).toBe('RESOURCE_FULL');

      // Verify resource state unchanged
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.currentBookings).toBe(10);

      // 2 reservations exist (1 confirmed + 1 rejected for history)
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(2);
      expect(reservations.filter(r => r.status === 'CONFIRMED')).toHaveLength(1);
      expect(reservations.filter(r => r.status === 'REJECTED')).toHaveLength(1);
    });

    it('rejects when resource is closed', async () => {
      // Create a closed resource
      const resource = createResource({
        id: createResourceId('test-resource-3'),
        type: 'meeting-room',
        capacity: 10,
        state: 'CLOSED'
      });
      await resourceRepo.save(resource);

      // Try to reserve
      const result = await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-1'),
        quantity: createQuantity(1)
      });

      // Assert rejection
      expect(result.success).toBe(false);
      expect(result.reservation).toBeDefined();
      expect(result.reservation?.status).toBe('REJECTED');
      expect(result.reservation?.rejectionReason).toBe('RESOURCE_CLOSED');
      expect(result.event.type).toBe('RESERVATION_REJECTED');
      expect(result.event.reason).toBe('RESOURCE_CLOSED');

      // Verify rejected reservation is saved for history
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(1);
      expect(reservations[0].status).toBe('REJECTED');
    });

    it('returns correct server timestamp', async () => {
      const resource = createResource({
        id: createResourceId('test-resource-4'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      const beforeTimestamp = Date.now();
      const result = await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-1'),
        quantity: createQuantity(1)
      });
      const afterTimestamp = Date.now();

      expect(result.serverTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(result.serverTimestamp).toBeLessThanOrEqual(afterTimestamp);
      expect(result.reservation?.serverTimestamp).toBe(result.serverTimestamp);
    });

    it('persists reservation in database', async () => {
      const resource = createResource({
        id: createResourceId('test-resource-5'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      const result = await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-1'),
        quantity: createQuantity(3)
      });

      // Verify reservation persisted
      const reservation = await reservationRepo.findById(result.reservation!.id);
      expect(reservation).toBeDefined();
      expect(reservation?.resourceId).toBe(resource.id);
      expect(reservation?.clientId).toBe(createClientId('client-1'));
      expect(reservation?.quantity).toBe(3);
      expect(reservation?.status).toBe('CONFIRMED');
    });

    it('updates resource currentBookings', async () => {
      const resource = createResource({
        id: createResourceId('test-resource-6'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Make first reservation
      await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-1'),
        quantity: createQuantity(3)
      });

      // Make second reservation
      await commitService.commit({
        resourceId: resource.id,
        clientId: createClientId('client-2'),
        quantity: createQuantity(4)
      });

      // Verify bookings accumulated
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.currentBookings).toBe(7);
    });
  });

  describe('Concurrency - CRITICAL TESTS', () => {
    /**
     * THE MOST IMPORTANT TEST:
     * 100 concurrent requests for 1 slot = exactly 1 winner
     *
     * This proves that row-level locking prevents overbooking.
     */
    it('with capacity=1 and 100 concurrent requests, exactly 1 succeeds', async () => {
      // Create resource with capacity = 1
      const resource = createResource({
        id: createResourceId('concurrency-test-1'),
        type: 'meeting-room',
        capacity: 1,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Launch 100 concurrent commit() calls
      const promises = Array.from({ length: 100 }, (_, i) =>
        commitService.commit({
          resourceId: resource.id,
          clientId: createClientId(`client-${i}`),
          quantity: createQuantity(1)
        })
      );

      const results = await Promise.all(promises);

      // Assert: exactly 1 success, 99 rejections
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(99);

      // All failures should be RESOURCE_FULL
      failures.forEach(failure => {
        expect(failure.event.type).toBe('RESERVATION_REJECTED');
        expect(failure.event.reason).toBe('RESOURCE_FULL');
      });

      // Assert: resource.currentBookings = 1
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.currentBookings).toBe(1);

      // Assert: All reservations stored in database (1 confirmed + 99 rejected for history)
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(100);
      const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMED');
      expect(confirmedReservations).toHaveLength(1);
    }, 30000); // 30 second timeout for this heavy test

    /**
     * CRITICAL TEST 2:
     * 100 concurrent requests for 10 slots = exactly 10 winners
     */
    it('with capacity=10 and 100 concurrent requests, exactly 10 succeed', async () => {
      // Create resource with capacity = 10
      const resource = createResource({
        id: createResourceId('concurrency-test-2'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Launch 100 concurrent commit() calls
      const promises = Array.from({ length: 100 }, (_, i) =>
        commitService.commit({
          resourceId: resource.id,
          clientId: createClientId(`client-${i}`),
          quantity: createQuantity(1)
        })
      );

      const results = await Promise.all(promises);

      // Assert: exactly 10 successes, 90 rejections
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);

      expect(successes).toHaveLength(10);
      expect(failures).toHaveLength(90);

      // Assert: resource.currentBookings = 10
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.currentBookings).toBe(10);

      // Assert: All reservations stored in database (10 confirmed + 90 rejected for history)
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(100);
      const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMED');
      expect(confirmedReservations).toHaveLength(10);
      confirmedReservations.forEach(reservation => {
        expect(reservation.quantity).toBe(1);
      });
    }, 30000);

    /**
     * CRITICAL TEST 3:
     * Verify data integrity under race conditions
     */
    it('maintains data integrity under race conditions', async () => {
      const resource = createResource({
        id: createResourceId('concurrency-test-3'),
        type: 'meeting-room',
        capacity: 5,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Mix of different quantities
      const promises = [
        ...Array.from({ length: 20 }, (_, i) =>
          commitService.commit({
            resourceId: resource.id,
            clientId: createClientId(`client-1-${i}`),
            quantity: createQuantity(1)
          })
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          commitService.commit({
            resourceId: resource.id,
            clientId: createClientId(`client-2-${i}`),
            quantity: createQuantity(2)
          })
        ),
      ];

      const results = await Promise.all(promises);
      const successes = results.filter(r => r.success);

      // Verify no overbooking occurred
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.currentBookings).toBeLessThanOrEqual(5);

      // Verify all reservations exist (both confirmed and rejected for history)
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(30); // All 30 requests are stored

      // Verify confirmed reservations match successes
      const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMED');
      expect(confirmedReservations.length).toBe(successes.length);

      // Verify total bookings matches confirmed reservations
      const totalBookings = confirmedReservations.reduce((sum, r) => sum + r.quantity, 0);
      expect(totalBookings).toBe(updatedResource?.currentBookings);
      expect(totalBookings).toBeLessThanOrEqual(5);

      // Verify all confirmed reservations have valid server timestamps
      confirmedReservations.forEach(reservation => {
        expect(reservation.serverTimestamp).toBeGreaterThan(0);
        expect(reservation.status).toBe('CONFIRMED');
      });

      // Verify resource version was incremented correctly
      expect(updatedResource?.version).toBe(1 + successes.length);
    }, 30000);

    /**
     * CRITICAL TEST 4:
     * Multiple resources handled independently
     */
    it('handles concurrent requests for different resources independently', async () => {
      // Create 5 resources, each with capacity 3
      const resources = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const resource = createResource({
            id: createResourceId(`concurrency-test-4-resource-${i}`),
            type: 'meeting-room',
            capacity: 3,
            state: 'OPEN'
          });
          await resourceRepo.save(resource);
          return resource;
        })
      );

      // Launch 50 concurrent requests across all resources (10 per resource)
      const promises = resources.flatMap(resource =>
        Array.from({ length: 10 }, (_, i) =>
          commitService.commit({
            resourceId: resource.id,
            clientId: createClientId(`client-${resource.id}-${i}`),
            quantity: createQuantity(1)
          })
        )
      );

      const results = await Promise.all(promises);

      // Each resource should have exactly 3 successes
      for (const resource of resources) {
        const resourceResults = results.filter(r =>
          r.reservation?.resourceId === resource.id || r.event.resourceId === resource.id
        );
        const resourceSuccesses = resourceResults.filter(r => r.success);
        expect(resourceSuccesses).toHaveLength(3);

        // Verify in database
        const updatedResource = await resourceRepo.findById(resource.id);
        expect(updatedResource?.currentBookings).toBe(3);

        // All 10 reservations stored (3 confirmed + 7 rejected for history)
        const reservations = await reservationRepo.findByResourceId(resource.id);
        expect(reservations).toHaveLength(10);
        const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMED');
        expect(confirmedReservations).toHaveLength(3);
      }
    }, 30000);
  });

  describe('Ordering guarantees', () => {
    it('server timestamps are monotonically increasing', async () => {
      const resource = createResource({
        id: createResourceId('ordering-test-1'),
        type: 'meeting-room',
        capacity: 100,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Make 10 sequential reservations
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await commitService.commit({
          resourceId: resource.id,
          clientId: createClientId(`client-${i}`),
          quantity: createQuantity(1)
        });
        results.push(result);
      }

      // Verify timestamps are monotonically increasing
      for (let i = 1; i < results.length; i++) {
        expect(results[i].serverTimestamp).toBeGreaterThanOrEqual(results[i - 1].serverTimestamp);
      }
    });

    it('reservations are ordered by server timestamp', async () => {
      const resource = createResource({
        id: createResourceId('ordering-test-2'),
        type: 'meeting-room',
        capacity: 100,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Make several reservations
      for (let i = 0; i < 5; i++) {
        await commitService.commit({
          resourceId: resource.id,
          clientId: createClientId(`client-${i}`),
          quantity: createQuantity(1)
        });
      }

      // Fetch reservations
      const reservations = await reservationRepo.findByResourceId(resource.id);

      // Verify they're ordered by server timestamp
      for (let i = 1; i < reservations.length; i++) {
        expect(reservations[i].serverTimestamp).toBeGreaterThanOrEqual(
          reservations[i - 1].serverTimestamp
        );
      }
    });
  });

  describe('Error handling', () => {
    it('throws ResourceNotFoundError for non-existent resource', async () => {
      await expect(
        commitService.commit({
          resourceId: createResourceId('non-existent'),
          clientId: createClientId('client-1'),
          quantity: createQuantity(1)
        })
      ).rejects.toThrow(/not found/);
    });

    it('handles concurrent version conflicts gracefully', async () => {
      // This test verifies that optimistic locking works correctly
      const resource = createResource({
        id: createResourceId('version-conflict-test'),
        type: 'meeting-room',
        capacity: 100,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // All concurrent commits should succeed (they're serialized by row lock)
      const promises = Array.from({ length: 10 }, (_, i) =>
        commitService.commit({
          resourceId: resource.id,
          clientId: createClientId(`client-${i}`),
          quantity: createQuantity(1)
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      const successes = results.filter(r => r.success);
      expect(successes).toHaveLength(10);

      // Version should be incremented correctly
      const updatedResource = await resourceRepo.findById(resource.id);
      expect(updatedResource?.version).toBe(11); // 1 + 10 successful commits
    });
  });
});
