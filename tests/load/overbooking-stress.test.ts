/**
 * Load Test: No-Overbooking Stress Test
 *
 * This test verifies the CRITICAL invariant:
 * Under heavy concurrent load, the system MUST NEVER allow overbooking.
 *
 * Test scenarios:
 * 1. Capacity 1, 500 concurrent requests → exactly 1 success
 * 2. Capacity 10, 500 concurrent requests → exactly 10 successes
 * 3. Capacity 100, 1000 concurrent requests → exactly 100 successes
 * 4. Mixed quantities under load
 * 5. Cancel + rebook race conditions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createServer } from '../../src/infrastructure/http/server.js';
import { createDb, closeDb, getDb } from '../../src/infrastructure/persistence/db.js';
import { resources, reservations } from '../../src/infrastructure/persistence/schema/index.js';
import type { FastifyInstance } from 'fastify';

describe('Load Test: No-Overbooking Stress Test', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://reservo:reservo@localhost:5433/reservo_test';
    createDb(testDbUrl);
    app = await createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  beforeEach(async () => {
    const db = getDb();
    await db.delete(reservations);
    await db.delete(resources);
  });

  /**
   * Helper to send N concurrent reservation requests
   */
  async function sendConcurrentReservations(
    resourceId: string,
    count: number,
    quantity: number = 1
  ): Promise<{ successes: number; rejections: number; errors: number; timings: number[] }> {
    const startTime = Date.now();

    const requests = Array.from({ length: count }, (_, i) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/reservations',
        payload: {
          resourceId,
          clientId: `load-client-${i}`,
          quantity
        }
      })
    );

    const responses = await Promise.all(requests);
    const endTime = Date.now();

    let successes = 0;
    let rejections = 0;
    let errors = 0;
    const timings: number[] = [];

    for (const response of responses) {
      try {
        const body = JSON.parse(response.body);
        if (body.status === 'CONFIRMED') {
          successes++;
        } else if (body.status === 'REJECTED') {
          rejections++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    console.log(`  Batch completed in ${endTime - startTime}ms`);
    console.log(`  Successes: ${successes}, Rejections: ${rejections}, Errors: ${errors}`);

    return { successes, rejections, errors, timings };
  }

  /**
   * Verify resource state matches expected bookings
   */
  async function verifyResourceState(resourceId: string, expectedBookings: number) {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/resources/${resourceId}`
    });
    const resource = JSON.parse(response.body);
    return {
      currentBookings: resource.currentBookings,
      capacity: resource.capacity,
      isValid: resource.currentBookings === expectedBookings && resource.currentBookings <= resource.capacity
    };
  }

  describe('Single-Seat Stress Test', () => {
    it('capacity=1, 200 concurrent requests → exactly 1 success, NO OVERBOOKING', async () => {
      console.log('\n=== STRESS TEST: Capacity 1, 200 concurrent ===');

      // Create resource
      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-single', type: 'seat', capacity: 1 }
      });

      // Blast with 200 concurrent requests
      const result = await sendConcurrentReservations('stress-single', 200);

      // CRITICAL ASSERTIONS
      expect(result.successes).toBe(1);
      expect(result.rejections).toBe(199);
      expect(result.errors).toBe(0);

      // Verify database state
      const state = await verifyResourceState('stress-single', 1);
      console.log(`  Final state: ${state.currentBookings}/${state.capacity} booked`);

      expect(state.currentBookings).toBe(1);
      expect(state.isValid).toBe(true);
    });

    it('capacity=1, 500 concurrent requests → exactly 1 success, NO OVERBOOKING', async () => {
      console.log('\n=== STRESS TEST: Capacity 1, 500 concurrent ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-single-500', type: 'seat', capacity: 1 }
      });

      const result = await sendConcurrentReservations('stress-single-500', 500);

      expect(result.successes).toBe(1);
      expect(result.rejections).toBe(499);
      expect(result.errors).toBe(0);

      const state = await verifyResourceState('stress-single-500', 1);
      expect(state.currentBookings).toBe(1);
      expect(state.isValid).toBe(true);
    });
  });

  describe('Multi-Seat Stress Test', () => {
    it('capacity=10, 500 concurrent requests → exactly 10 successes, NO OVERBOOKING', async () => {
      console.log('\n=== STRESS TEST: Capacity 10, 500 concurrent ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-10', type: 'room', capacity: 10 }
      });

      const result = await sendConcurrentReservations('stress-10', 500);

      expect(result.successes).toBe(10);
      expect(result.rejections).toBe(490);
      expect(result.errors).toBe(0);

      const state = await verifyResourceState('stress-10', 10);
      console.log(`  Final state: ${state.currentBookings}/${state.capacity} booked`);

      expect(state.currentBookings).toBe(10);
      expect(state.isValid).toBe(true);
    });

    it('capacity=100, 1000 concurrent requests → exactly 100 successes, NO OVERBOOKING', async () => {
      console.log('\n=== STRESS TEST: Capacity 100, 1000 concurrent ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-100', type: 'venue', capacity: 100 }
      });

      const result = await sendConcurrentReservations('stress-100', 1000);

      expect(result.successes).toBe(100);
      expect(result.rejections).toBe(900);
      expect(result.errors).toBe(0);

      const state = await verifyResourceState('stress-100', 100);
      console.log(`  Final state: ${state.currentBookings}/${state.capacity} booked`);

      expect(state.currentBookings).toBe(100);
      expect(state.isValid).toBe(true);
    });
  });

  describe('Multi-Quantity Stress Test', () => {
    it('capacity=10, 100 requests for quantity=2 → exactly 5 successes (10/2)', async () => {
      console.log('\n=== STRESS TEST: Capacity 10, 100 concurrent, quantity=2 ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-multi-qty', type: 'table', capacity: 10 }
      });

      const result = await sendConcurrentReservations('stress-multi-qty', 100, 2);

      expect(result.successes).toBe(5); // 10 capacity / 2 quantity = 5 reservations
      expect(result.rejections).toBe(95);
      expect(result.errors).toBe(0);

      const state = await verifyResourceState('stress-multi-qty', 10);
      console.log(`  Final state: ${state.currentBookings}/${state.capacity} booked`);

      expect(state.currentBookings).toBe(10);
      expect(state.isValid).toBe(true);
    });

    it('capacity=15, 200 requests for quantity=3 → exactly 5 successes (15/3)', async () => {
      console.log('\n=== STRESS TEST: Capacity 15, 200 concurrent, quantity=3 ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-qty-3', type: 'table', capacity: 15 }
      });

      const result = await sendConcurrentReservations('stress-qty-3', 200, 3);

      expect(result.successes).toBe(5);
      expect(result.rejections).toBe(195);
      expect(result.errors).toBe(0);

      const state = await verifyResourceState('stress-qty-3', 15);
      expect(state.currentBookings).toBe(15);
      expect(state.isValid).toBe(true);
    });
  });

  describe('Repeated Wave Stress Test', () => {
    it('3 waves of 100 requests each, capacity=5 → each wave gets 5 successes max', async () => {
      console.log('\n=== STRESS TEST: 3 waves of 100 requests, capacity=5 ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-waves', type: 'room', capacity: 5 }
      });

      // Wave 1 - should get 5 successes
      console.log('  Wave 1:');
      const wave1 = await sendConcurrentReservations('stress-waves', 100);
      expect(wave1.successes).toBe(5);
      expect(wave1.rejections).toBe(95);

      // Wave 2 - resource is full, should get 0 successes
      console.log('  Wave 2 (resource full):');
      const wave2 = await sendConcurrentReservations('stress-waves', 100);
      expect(wave2.successes).toBe(0);
      expect(wave2.rejections).toBe(100);

      // Wave 3 - still full
      console.log('  Wave 3 (still full):');
      const wave3 = await sendConcurrentReservations('stress-waves', 100);
      expect(wave3.successes).toBe(0);
      expect(wave3.rejections).toBe(100);

      // Verify final state
      const state = await verifyResourceState('stress-waves', 5);
      console.log(`  Final state: ${state.currentBookings}/${state.capacity} booked`);

      expect(state.currentBookings).toBe(5);
      expect(state.isValid).toBe(true);
    });
  });

  describe('Cancel and Rebook Race Condition Test', () => {
    it('rapid cancel + rebook cycles maintain consistency', async () => {
      console.log('\n=== STRESS TEST: Cancel + Rebook Race Conditions ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'stress-cancel', type: 'seat', capacity: 1 }
      });

      // Initial booking
      const initialBook = await app.inject({
        method: 'POST',
        url: '/api/v1/reservations',
        payload: { resourceId: 'stress-cancel', clientId: 'initial', quantity: 1 }
      });
      const { reservationId } = JSON.parse(initialBook.body);
      console.log(`  Initial booking: ${reservationId}`);

      // Now run 10 cycles of: cancel + 50 concurrent rebook attempts
      for (let cycle = 0; cycle < 5; cycle++) {
        console.log(`  Cycle ${cycle + 1}:`);

        // Get current reservation to cancel
        const resourceState = await app.inject({
          method: 'GET',
          url: '/api/v1/resources/stress-cancel'
        });
        const resource = JSON.parse(resourceState.body);

        if (resource.currentBookings === 0) {
          console.log('    Resource empty, booking first...');
          await app.inject({
            method: 'POST',
            url: '/api/v1/reservations',
            payload: { resourceId: 'stress-cancel', clientId: `cycle-${cycle}-pre`, quantity: 1 }
          });
        }

        // Get reservation to cancel
        const db = getDb();
        const activeReservations = await db
          .select()
          .from(reservations)
          .where(eq(reservations.status, 'confirmed'))
          .limit(1);

        if (activeReservations.length > 0) {
          // Cancel and immediately blast with rebook attempts
          const cancelPromise = app.inject({
            method: 'POST',
            url: `/api/v1/reservations/${activeReservations[0].id}/cancel`
          });

          const rebookPromises = Array.from({ length: 50 }, (_, i) =>
            app.inject({
              method: 'POST',
              url: '/api/v1/reservations',
              payload: { resourceId: 'stress-cancel', clientId: `cycle-${cycle}-rebook-${i}`, quantity: 1 }
            })
          );

          await Promise.all([cancelPromise, ...rebookPromises]);
        }

        // Verify state after each cycle
        const stateAfterCycle = await verifyResourceState('stress-cancel', -1);
        console.log(`    After cycle: ${stateAfterCycle.currentBookings}/${stateAfterCycle.capacity}`);

        // CRITICAL: Must never exceed capacity
        expect(stateAfterCycle.currentBookings).toBeLessThanOrEqual(stateAfterCycle.capacity);
      }

      // Final verification
      const finalState = await verifyResourceState('stress-cancel', -1);
      console.log(`  Final state: ${finalState.currentBookings}/${finalState.capacity} booked`);

      expect(finalState.currentBookings).toBeLessThanOrEqual(finalState.capacity);
      expect(finalState.currentBookings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Consistency Verification', () => {
    it('reservation count matches resource currentBookings after load', async () => {
      console.log('\n=== CONSISTENCY CHECK: Reservation count vs Resource state ===');

      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'consistency-check', type: 'room', capacity: 20 }
      });

      // Send 200 concurrent requests
      await sendConcurrentReservations('consistency-check', 200);

      // Get resource state
      const resourceRes = await app.inject({
        method: 'GET',
        url: '/api/v1/resources/consistency-check'
      });
      const resource = JSON.parse(resourceRes.body);

      // Count confirmed reservations in DB
      const db = getDb();
      const confirmedReservations = await db
        .select()
        .from(reservations)
        .where(eq(reservations.resourceId, 'consistency-check'));

      const confirmedCount = confirmedReservations.filter(r => r.status === 'confirmed').length;
      const totalQuantity = confirmedReservations
        .filter(r => r.status === 'confirmed')
        .reduce((sum, r) => sum + r.quantity, 0);

      console.log(`  Resource currentBookings: ${resource.currentBookings}`);
      console.log(`  Confirmed reservations: ${confirmedCount}`);
      console.log(`  Total quantity booked: ${totalQuantity}`);

      // CRITICAL: These must match
      expect(resource.currentBookings).toBe(totalQuantity);
      expect(resource.currentBookings).toBe(20); // capacity
      expect(resource.currentBookings).toBeLessThanOrEqual(resource.capacity);
    });
  });
});
