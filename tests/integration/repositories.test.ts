/**
 * Repository Integration Tests
 *
 * Tests the persistence layer with real PostgreSQL database.
 * Verifies that repositories correctly handle:
 * - CRUD operations
 * - Row-level locking (FOR UPDATE)
 * - Optimistic locking (version conflicts)
 * - Transaction support
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase, type TestDatabase } from './setup.js';
import { ResourceRepository } from '../../src/infrastructure/persistence/repositories/ResourceRepository.js';
import { ReservationRepository } from '../../src/infrastructure/persistence/repositories/ReservationRepository.js';
import { createResource, updateBookings } from '../../src/domain/entities/Resource.js';
import { createReservation } from '../../src/domain/entities/Reservation.js';
import {
  createResourceId,
  createClientId,
  generateReservationId,
  createQuantity,
} from '../../src/domain/value-objects/index.js';

describe('Repository Integration', () => {
  let db: TestDatabase;
  let resourceRepo: ResourceRepository;
  let reservationRepo: ReservationRepository;

  beforeAll(async () => {
    db = await setupTestDatabase();
    resourceRepo = new ResourceRepository();
    reservationRepo = new ReservationRepository();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(db);
  });

  describe('ResourceRepository', () => {
    describe('Basic CRUD operations', () => {
      it('saves and retrieves a resource', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('test-resource-1'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });

        // Save it
        const savedResource = await resourceRepo.save(resource);
        expect(savedResource.id).toBe(resource.id);
        expect(savedResource.type).toBe('meeting-room');
        expect(savedResource.capacity).toBe(10);
        expect(savedResource.currentBookings).toBe(0);
        expect(savedResource.version).toBe(1);
        expect(savedResource.state).toBe('OPEN');

        // Retrieve it
        const retrievedResource = await resourceRepo.findById(resource.id);
        expect(retrievedResource).toBeDefined();
        expect(retrievedResource?.id).toBe(resource.id);
        expect(retrievedResource?.type).toBe('meeting-room');
        expect(retrievedResource?.capacity).toBe(10);
        expect(retrievedResource?.currentBookings).toBe(0);
        expect(retrievedResource?.version).toBe(1);
        expect(retrievedResource?.state).toBe('OPEN');
      });

      it('returns null for non-existent resource', async () => {
        const resource = await resourceRepo.findById(createResourceId('non-existent'));
        expect(resource).toBeNull();
      });

      it('updates existing resource on save', async () => {
        // Create and save initial resource
        const resource = createResource({
          id: createResourceId('test-resource-2'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Update and save again
        const updatedResource = updateBookings(resource, 5);
        const savedResource = await resourceRepo.save(updatedResource);

        expect(savedResource.currentBookings).toBe(5);
        expect(savedResource.version).toBe(2);

        // Verify in database
        const retrievedResource = await resourceRepo.findById(resource.id);
        expect(retrievedResource?.currentBookings).toBe(5);
        expect(retrievedResource?.version).toBe(2);
      });
    });

    describe('Row-level locking (FOR UPDATE)', () => {
      it('findByIdForUpdate acquires row lock', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('lock-test-1'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Start a transaction and acquire lock
        await db.transaction(async (tx) => {
          const lockedResource = await resourceRepo.findByIdForUpdate(resource.id, tx);
          expect(lockedResource).toBeDefined();
          expect(lockedResource?.id).toBe(resource.id);

          // In a real concurrent scenario, another transaction would block here
          // We can't easily test that in a single-threaded test,
          // but we can verify the query completes successfully
        });
      });

      it('returns null for non-existent resource', async () => {
        await db.transaction(async (tx) => {
          const resource = await resourceRepo.findByIdForUpdate(
            createResourceId('non-existent'),
            tx
          );
          expect(resource).toBeNull();
        });
      });
    });

    describe('Optimistic locking', () => {
      it('updateWithOptimisticLock succeeds with correct version', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('optimistic-test-1'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Update with correct version
        await db.transaction(async (tx) => {
          const lockedResource = await resourceRepo.findByIdForUpdate(resource.id, tx);
          const updatedResource = updateBookings(lockedResource!, 5);

          const result = await resourceRepo.updateWithOptimisticLock(updatedResource, tx);
          expect(result.currentBookings).toBe(5);
          expect(result.version).toBe(2);
        });

        // Verify in database
        const finalResource = await resourceRepo.findById(resource.id);
        expect(finalResource?.currentBookings).toBe(5);
        expect(finalResource?.version).toBe(2);
      });

      it('updateWithOptimisticLock fails on version mismatch', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('optimistic-test-2'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Simulate version conflict by manually setting wrong version
        const staleResource = { ...resource, version: 99 };
        const updatedStaleResource = updateBookings(staleResource, 5);

        // Should throw ConcurrencyConflictError
        await expect(
          db.transaction(async (tx) => {
            await resourceRepo.updateWithOptimisticLock(updatedStaleResource, tx);
          })
        ).rejects.toThrow('Version conflict');
      });

      it('throws ResourceNotFoundError for non-existent resource', async () => {
        const nonExistentResource = createResource({
          id: createResourceId('non-existent'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });

        await expect(
          db.transaction(async (tx) => {
            await resourceRepo.updateWithOptimisticLock(nonExistentResource, tx);
          })
        ).rejects.toThrow('Resource');
      });
    });
  });

  describe('ReservationRepository', () => {
    describe('Basic CRUD operations', () => {
      it('saves and retrieves a reservation', async () => {
        // Create a resource first
        const resource = createResource({
          id: createResourceId('test-resource-3'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Create a reservation
        const reservation = createReservation({
          id: generateReservationId(),
          resourceId: resource.id,
          clientId: createClientId('client-1'),
          quantity: 5,
          serverTimestamp: Date.now(),
          status: 'CONFIRMED'
        });

        // Save it
        const savedReservation = await reservationRepo.save(reservation);
        expect(savedReservation.id).toBe(reservation.id);
        expect(savedReservation.resourceId).toBe(resource.id);
        expect(savedReservation.clientId).toBe(createClientId('client-1'));
        expect(savedReservation.quantity).toBe(5);
        expect(savedReservation.status).toBe('CONFIRMED');

        // Retrieve it
        const retrievedReservation = await reservationRepo.findById(reservation.id);
        expect(retrievedReservation).toBeDefined();
        expect(retrievedReservation?.id).toBe(reservation.id);
        expect(retrievedReservation?.resourceId).toBe(resource.id);
        expect(retrievedReservation?.clientId).toBe(createClientId('client-1'));
        expect(retrievedReservation?.quantity).toBe(5);
        expect(retrievedReservation?.status).toBe('CONFIRMED');
      });

      it('returns null for non-existent reservation', async () => {
        const reservation = await reservationRepo.findById(generateReservationId());
        expect(reservation).toBeNull();
      });

      it('saves reservation within transaction', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('test-resource-4'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Save reservation in transaction
        await db.transaction(async (tx) => {
          const reservation = createReservation({
            id: generateReservationId(),
            resourceId: resource.id,
            clientId: createClientId('client-1'),
            quantity: 3,
            serverTimestamp: Date.now(),
            status: 'CONFIRMED'
          });

          const savedReservation = await reservationRepo.save(reservation, tx);
          expect(savedReservation.id).toBe(reservation.id);
        });
      });
    });

    describe('Query operations', () => {
      it('findByResourceId returns all reservations for resource', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('test-resource-5'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Create multiple reservations
        const baseTimestamp = Date.now();
        for (let i = 0; i < 5; i++) {
          const reservation = createReservation({
            id: generateReservationId(),
            resourceId: resource.id,
            clientId: createClientId(`client-${i}`),
            quantity: 1,
            serverTimestamp: baseTimestamp + i,
            status: 'CONFIRMED'
          });
          await reservationRepo.save(reservation);
        }

        // Fetch all reservations
        const reservations = await reservationRepo.findByResourceId(resource.id);
        expect(reservations).toHaveLength(5);

        // Verify they're ordered by server timestamp
        for (let i = 1; i < reservations.length; i++) {
          expect(reservations[i].serverTimestamp).toBeGreaterThanOrEqual(
            reservations[i - 1].serverTimestamp
          );
        }
      });

      it('findByResourceId returns empty array for resource with no reservations', async () => {
        const resource = createResource({
          id: createResourceId('test-resource-6'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        const reservations = await reservationRepo.findByResourceId(resource.id);
        expect(reservations).toHaveLength(0);
      });

      it('countActiveByResourceId counts only CONFIRMED reservations', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('test-resource-7'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Create confirmed reservations
        for (let i = 0; i < 3; i++) {
          const reservation = createReservation({
            id: generateReservationId(),
            resourceId: resource.id,
            clientId: createClientId(`client-confirmed-${i}`),
            quantity: 1,
            serverTimestamp: Date.now(),
            status: 'CONFIRMED'
          });
          await reservationRepo.save(reservation);
        }

        // Create cancelled reservations
        for (let i = 0; i < 2; i++) {
          const reservation = createReservation({
            id: generateReservationId(),
            resourceId: resource.id,
            clientId: createClientId(`client-cancelled-${i}`),
            quantity: 1,
            serverTimestamp: Date.now(),
            status: 'CANCELLED'
          });
          await reservationRepo.save(reservation);
        }

        // Count should only include confirmed
        const count = await reservationRepo.countActiveByResourceId(resource.id);
        expect(count).toBe(3);
      });

      it('countActiveByResourceId works within transaction', async () => {
        // Create a resource
        const resource = createResource({
          id: createResourceId('test-resource-8'),
          type: 'meeting-room',
          capacity: 10,
          state: 'OPEN'
        });
        await resourceRepo.save(resource);

        // Add reservations in transaction
        await db.transaction(async (tx) => {
          for (let i = 0; i < 4; i++) {
            const reservation = createReservation({
              id: generateReservationId(),
              resourceId: resource.id,
              clientId: createClientId(`client-${i}`),
              quantity: 1,
              serverTimestamp: Date.now(),
              status: 'CONFIRMED'
            });
            await reservationRepo.save(reservation, tx);
          }

          // Count within same transaction
          const count = await reservationRepo.countActiveByResourceId(resource.id, tx);
          expect(count).toBe(4);
        });
      });
    });

    describe('Foreign key constraints', () => {
      it('prevents creating reservation for non-existent resource', async () => {
        const reservation = createReservation({
          id: generateReservationId(),
          resourceId: createResourceId('non-existent'),
          clientId: createClientId('client-1'),
          quantity: 1,
          serverTimestamp: Date.now(),
          status: 'CONFIRMED'
        });

        // Should fail due to foreign key constraint
        await expect(reservationRepo.save(reservation)).rejects.toThrow();
      });
    });
  });

  describe('Cross-repository operations', () => {
    it('atomic transaction with both repositories', async () => {
      // Create a resource
      const resource = createResource({
        id: createResourceId('atomic-test-1'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Perform atomic operation
      await db.transaction(async (tx) => {
        // Lock resource
        const lockedResource = await resourceRepo.findByIdForUpdate(resource.id, tx);
        expect(lockedResource).toBeDefined();

        // Create reservation
        const reservation = createReservation({
          id: generateReservationId(),
          resourceId: resource.id,
          clientId: createClientId('client-1'),
          quantity: 5,
          serverTimestamp: Date.now(),
          status: 'CONFIRMED'
        });
        await reservationRepo.save(reservation, tx);

        // Update resource bookings
        const updatedResource = updateBookings(lockedResource!, 5);
        await resourceRepo.updateWithOptimisticLock(updatedResource, tx);
      });

      // Verify both changes persisted
      const finalResource = await resourceRepo.findById(resource.id);
      expect(finalResource?.currentBookings).toBe(5);

      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(1);
      expect(reservations[0].quantity).toBe(5);
    });

    it('rolls back transaction on error', async () => {
      // Create a resource
      const resource = createResource({
        id: createResourceId('rollback-test-1'),
        type: 'meeting-room',
        capacity: 10,
        state: 'OPEN'
      });
      await resourceRepo.save(resource);

      // Attempt transaction that will fail
      await expect(
        db.transaction(async (tx) => {
          // Create reservation
          const reservation = createReservation({
            id: generateReservationId(),
            resourceId: resource.id,
            clientId: createClientId('client-1'),
            quantity: 5,
            serverTimestamp: Date.now(),
            status: 'CONFIRMED'
          });
          await reservationRepo.save(reservation, tx);

          // Intentionally cause error with invalid version
          const staleResource = { ...resource, version: 99 };
          const updatedResource = updateBookings(staleResource, 5);
          await resourceRepo.updateWithOptimisticLock(updatedResource, tx);
        })
      ).rejects.toThrow();

      // Verify rollback - no reservation should exist
      const reservations = await reservationRepo.findByResourceId(resource.id);
      expect(reservations).toHaveLength(0);

      // Resource should be unchanged
      const finalResource = await resourceRepo.findById(resource.id);
      expect(finalResource?.currentBookings).toBe(0);
      expect(finalResource?.version).toBe(1);
    });
  });
});
