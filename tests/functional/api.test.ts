/**
 * Functional API Tests
 *
 * These tests hit the actual HTTP API endpoints end-to-end.
 * They verify the full request/response cycle including:
 * - HTTP status codes
 * - Response body structure
 * - Error handling
 * - Business logic through the API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from '../../src/infrastructure/http/server.js';
import { createDb, closeDb, getDb } from '../../src/infrastructure/persistence/db.js';
import { resources, reservations, systemSettings } from '../../src/infrastructure/persistence/schema/index.js';
import type { FastifyInstance } from 'fastify';

describe('Functional API Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Initialize with test database URL
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
    // Clean database before each test
    const db = getDb();
    await db.delete(reservations);
    await db.delete(resources);
    await db.delete(systemSettings);
  });

  describe('Resource Endpoints', () => {
    describe('GET /api/v1/resources', () => {
      it('returns empty array when no resources exist', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/resources'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.data).toEqual([]);
        expect(body.pagination).toEqual({
          limit: 100,
          offset: 0,
          total: 0,
          hasMore: false
        });
      });

      it('returns all resources with pagination', async () => {
        // Create multiple resources
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-1', type: 'meeting-room', capacity: 10 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-2', type: 'conference-room', capacity: 20 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'desk-1', type: 'desk', capacity: 1 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/resources'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.data.length).toBe(3);
        expect(body.pagination.total).toBe(3);
        expect(body.pagination.hasMore).toBe(false);
      });

      it('supports limit and offset for pagination', async () => {
        // Create 5 resources
        for (let i = 1; i <= 5; i++) {
          await app.inject({
            method: 'POST',
            url: '/api/v1/resources',
            payload: { id: `room-${i}`, type: 'room', capacity: i }
          });
        }

        // Get first page with limit 2
        const page1 = await app.inject({
          method: 'GET',
          url: '/api/v1/resources?limit=2&offset=0'
        });

        expect(page1.statusCode).toBe(200);
        const body1 = JSON.parse(page1.body);
        expect(body1.data.length).toBe(2);
        expect(body1.pagination.hasMore).toBe(true);

        // Get second page
        const page2 = await app.inject({
          method: 'GET',
          url: '/api/v1/resources?limit=2&offset=2'
        });

        const body2 = JSON.parse(page2.body);
        expect(body2.data.length).toBe(2);
        expect(body2.pagination.hasMore).toBe(true);

        // Get third page
        const page3 = await app.inject({
          method: 'GET',
          url: '/api/v1/resources?limit=2&offset=4'
        });

        const body3 = JSON.parse(page3.body);
        expect(body3.data.length).toBe(1);
        expect(body3.pagination.hasMore).toBe(false);
      });

      it('filters by state', async () => {
        // Create open and closed resources
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'open-room', type: 'room', capacity: 5 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'closed-room', type: 'room', capacity: 5 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources/closed-room/close'
        });

        // Filter by OPEN state
        const openResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/resources?state=OPEN'
        });

        const openBody = JSON.parse(openResponse.body);
        expect(openBody.data.length).toBe(1);
        expect(openBody.data[0].id).toBe('open-room');

        // Filter by CLOSED state
        const closedResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/resources?state=CLOSED'
        });

        const closedBody = JSON.parse(closedResponse.body);
        expect(closedBody.data.length).toBe(1);
        expect(closedBody.data[0].id).toBe('closed-room');
      });

      it('filters by type', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-1', type: 'meeting-room', capacity: 10 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'desk-1', type: 'desk', capacity: 1 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'desk-2', type: 'desk', capacity: 1 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/resources?type=desk'
        });

        const body = JSON.parse(response.body);
        expect(body.data.length).toBe(2);
        expect(body.data.every((r: any) => r.type === 'desk')).toBe(true);
      });

      it('returns remainingCapacity in response', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'cap-room', type: 'room', capacity: 10 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'cap-room', clientId: 'client-1', quantity: 3 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/resources'
        });

        const body = JSON.parse(response.body);
        expect(body.data[0].remainingCapacity).toBe(7);
        expect(body.data[0].currentBookings).toBe(3);
      });
    });

    describe('POST /api/v1/resources', () => {
      it('creates a resource and returns 201', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: {
            id: 'room-101',
            type: 'meeting-room',
            capacity: 10
          }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.id).toBe('room-101');
        expect(body.type).toBe('meeting-room');
        expect(body.capacity).toBe(10);
        expect(body.currentBookings).toBe(0);
        expect(body.state).toBe('OPEN');
        expect(body.version).toBe(1);
      });

      it('returns 400 for invalid payload', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: {
            // Missing required fields
            type: 'meeting-room'
          }
        });

        expect(response.statusCode).toBe(400);
      });

      it('returns 409 for duplicate resource id', async () => {
        // Create first resource
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-dup', type: 'room', capacity: 5 }
        });

        // Try to create duplicate
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-dup', type: 'room', capacity: 5 }
        });

        expect(response.statusCode).toBe(409);
      });
    });

    describe('GET /api/v1/resources/:id', () => {
      it('returns the resource', async () => {
        // Create resource first
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-get', type: 'room', capacity: 5 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/resources/room-get'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.id).toBe('room-get');
      });

      it('returns 404 for non-existent resource', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/resources/non-existent'
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('POST /api/v1/resources/:id/close', () => {
      it('closes the resource', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-close', type: 'room', capacity: 5 }
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/resources/room-close/close'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.state).toBe('CLOSED');
      });
    });

    describe('POST /api/v1/resources/:id/open', () => {
      it('reopens a closed resource', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'room-reopen', type: 'room', capacity: 5 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources/room-reopen/close'
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/resources/room-reopen/open'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.state).toBe('OPEN');
      });
    });
  });

  describe('Reservation Endpoints', () => {
    beforeEach(async () => {
      // Create a resource for reservation tests
      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'res-room', type: 'room', capacity: 5 }
      });
    });

    describe('GET /api/v1/reservations', () => {
      it('returns empty array when no reservations exist', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.data).toEqual([]);
        expect(body.pagination).toEqual({
          limit: 100,
          offset: 0,
          total: 0,
          hasMore: false
        });
      });

      it('returns all reservations with pagination', async () => {
        // Create multiple reservations
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 1 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-2', quantity: 1 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-3', quantity: 1 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.data.length).toBe(3);
        expect(body.pagination.total).toBe(3);
        expect(body.pagination.hasMore).toBe(false);
      });

      it('supports limit and offset for pagination', async () => {
        // Create 5 reservations
        for (let i = 1; i <= 5; i++) {
          await app.inject({
            method: 'POST',
            url: '/api/v1/reservations',
            payload: { resourceId: 'res-room', clientId: `client-${i}`, quantity: 1 }
          });
        }

        // Get first page with limit 2
        const page1 = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations?limit=2&offset=0'
        });

        expect(page1.statusCode).toBe(200);
        const body1 = JSON.parse(page1.body);
        expect(body1.data.length).toBe(2);
        expect(body1.pagination.hasMore).toBe(true);

        // Get second page
        const page2 = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations?limit=2&offset=2'
        });

        const body2 = JSON.parse(page2.body);
        expect(body2.data.length).toBe(2);
        expect(body2.pagination.hasMore).toBe(true);
      });

      it('filters by status', async () => {
        // Create and cancel a reservation
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 1 }
        });
        const { reservationId } = JSON.parse(createRes.body);

        await app.inject({
          method: 'POST',
          url: `/api/v1/reservations/${reservationId}/cancel`
        });

        // Create another confirmed reservation
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-2', quantity: 1 }
        });

        // Filter by confirmed
        const confirmedResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations?status=confirmed'
        });

        const confirmedBody = JSON.parse(confirmedResponse.body);
        expect(confirmedBody.data.length).toBe(1);
        expect(confirmedBody.data[0].status).toBe('CONFIRMED');

        // Filter by cancelled
        const cancelledResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations?status=cancelled'
        });

        const cancelledBody = JSON.parse(cancelledResponse.body);
        expect(cancelledBody.data.length).toBe(1);
        expect(cancelledBody.data[0].status).toBe('CANCELLED');
      });

      it('filters by resourceId', async () => {
        // Create another resource
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'res-room-2', type: 'room', capacity: 5 }
        });

        // Create reservations for different resources
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 1 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room-2', clientId: 'client-2', quantity: 1 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations?resourceId=res-room'
        });

        const body = JSON.parse(response.body);
        expect(body.data.length).toBe(1);
        expect(body.data[0].resourceId).toBe('res-room');
      });

      it('filters by clientId', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'alice@example.com', quantity: 1 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'bob@example.com', quantity: 1 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations?clientId=alice@example.com'
        });

        const body = JSON.parse(response.body);
        expect(body.data.length).toBe(1);
        expect(body.data[0].clientId).toBe('alice@example.com');
      });

      it('returns reservation details in response', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 2 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations'
        });

        const body = JSON.parse(response.body);
        expect(body.data[0]).toHaveProperty('id');
        expect(body.data[0]).toHaveProperty('resourceId', 'res-room');
        expect(body.data[0]).toHaveProperty('clientId', 'client-1');
        expect(body.data[0]).toHaveProperty('quantity', 2);
        expect(body.data[0]).toHaveProperty('status', 'CONFIRMED');
        expect(body.data[0]).toHaveProperty('serverTimestamp');
        expect(body.data[0]).toHaveProperty('createdAt');
      });
    });

    describe('POST /api/v1/reservations', () => {
      it('creates a reservation and returns 201 with CONFIRMED', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: {
            resourceId: 'res-room',
            clientId: 'client-1',
            quantity: 2
          }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('CONFIRMED');
        expect(body.reservationId).toBeDefined();
        expect(body.serverTimestamp).toBeDefined();
      });

      it('returns 409 with REJECTED when resource is full', async () => {
        // Fill up the resource
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 5 }
        });

        // Try to book more
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-2', quantity: 1 }
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('REJECTED');
        expect(body.reason).toBe('RESOURCE_FULL');
      });

      it('returns 409 with REJECTED when resource is closed', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources/res-room/close'
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 1 }
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('REJECTED');
        expect(body.reason).toBe('RESOURCE_CLOSED');
      });

      it('returns 404 for non-existent resource', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'non-existent', clientId: 'client-1', quantity: 1 }
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('GET /api/v1/reservations/:id', () => {
      it('returns the reservation', async () => {
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 1 }
        });
        const { reservationId } = JSON.parse(createRes.body);

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/reservations/${reservationId}`
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.id).toBe(reservationId);
      });

      it('returns 404 for non-existent reservation', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/reservations/00000000-0000-0000-0000-000000000000'
        });

        expect(response.statusCode).toBe(404);
      });
    });

    describe('POST /api/v1/reservations/:id/cancel', () => {
      it('cancels the reservation and releases capacity', async () => {
        // Create reservation
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'res-room', clientId: 'client-1', quantity: 3 }
        });
        const { reservationId } = JSON.parse(createRes.body);

        // Verify resource has bookings
        let resourceRes = await app.inject({
          method: 'GET',
          url: '/api/v1/resources/res-room'
        });
        expect(JSON.parse(resourceRes.body).currentBookings).toBe(3);

        // Cancel
        const cancelRes = await app.inject({
          method: 'POST',
          url: `/api/v1/reservations/${reservationId}/cancel`
        });

        expect(cancelRes.statusCode).toBe(200);
        const body = JSON.parse(cancelRes.body);
        expect(body.status).toBe('CANCELLED');

        // Verify capacity released
        resourceRes = await app.inject({
          method: 'GET',
          url: '/api/v1/resources/res-room'
        });
        expect(JSON.parse(resourceRes.body).currentBookings).toBe(0);
      });
    });
  });

  describe('Availability Endpoints', () => {
    beforeEach(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'avail-room', type: 'room', capacity: 10 }
      });
    });

    describe('GET /api/v1/availability/:resourceId', () => {
      it('returns availability info', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/availability/avail-room'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.resourceId).toBe('avail-room');
        expect(body.remainingCapacity).toBe(10);
        expect(body.capacity).toBe(10);
        expect(body.state).toBe('OPEN');
      });

      it('reflects bookings in availability', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'avail-room', clientId: 'client-1', quantity: 3 }
        });

        // Invalidate cache to get fresh data
        await app.inject({
          method: 'DELETE',
          url: '/api/v1/availability/cache/avail-room'
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/availability/avail-room'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.remainingCapacity).toBe(7);
        expect(body.capacity).toBe(10);
      });

      it('returns 404 for non-existent resource', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/availability/non-existent'
        });

        expect(response.statusCode).toBe(404);
      });
    });
  });

  describe('Concurrency - CRITICAL FUNCTIONAL TEST', () => {
    it('with capacity=1 and 50 concurrent API requests, exactly 1 succeeds', async () => {
      // Create resource with capacity 1
      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'single-seat', type: 'seat', capacity: 1 }
      });

      // Send 50 concurrent requests
      const requests = Array.from({ length: 50 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: {
            resourceId: 'single-seat',
            clientId: `client-${i}`,
            quantity: 1
          }
        })
      );

      const responses = await Promise.all(requests);

      const successes = responses.filter(r => {
        const body = JSON.parse(r.body);
        return body.status === 'CONFIRMED';
      });

      const failures = responses.filter(r => {
        const body = JSON.parse(r.body);
        return body.status === 'REJECTED' && body.reason === 'RESOURCE_FULL';
      });

      // CRITICAL: Exactly 1 success, 49 rejections, NO overbooking
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(49);

      // Verify resource state
      const resourceRes = await app.inject({
        method: 'GET',
        url: '/api/v1/resources/single-seat'
      });
      const resource = JSON.parse(resourceRes.body);
      expect(resource.currentBookings).toBe(1);
      expect(resource.capacity).toBe(1);
    });

    it('with capacity=5 and 50 concurrent API requests, exactly 5 succeed', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'five-seats', type: 'seat', capacity: 5 }
      });

      const requests = Array.from({ length: 50 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: {
            resourceId: 'five-seats',
            clientId: `client-${i}`,
            quantity: 1
          }
        })
      );

      const responses = await Promise.all(requests);

      const successes = responses.filter(r => {
        const body = JSON.parse(r.body);
        return body.status === 'CONFIRMED';
      });

      expect(successes.length).toBe(5);

      // Verify no overbooking
      const resourceRes = await app.inject({
        method: 'GET',
        url: '/api/v1/resources/five-seats'
      });
      const resource = JSON.parse(resourceRes.body);
      expect(resource.currentBookings).toBe(5);
    });
  });

  describe('Full User Journey', () => {
    it('complete reservation lifecycle: create resource -> book -> verify -> cancel -> rebook', async () => {
      // 1. Admin creates a resource
      const createResourceRes = await app.inject({
        method: 'POST',
        url: '/api/v1/resources',
        payload: { id: 'journey-room', type: 'conference-room', capacity: 2 }
      });
      expect(createResourceRes.statusCode).toBe(201);

      // 2. Client checks availability
      let availRes = await app.inject({
        method: 'GET',
        url: '/api/v1/availability/journey-room'
      });
      expect(JSON.parse(availRes.body).remainingCapacity).toBe(2);

      // 3. Client books a spot
      const bookRes = await app.inject({
        method: 'POST',
        url: '/api/v1/reservations',
        payload: { resourceId: 'journey-room', clientId: 'user-A', quantity: 1 }
      });
      expect(bookRes.statusCode).toBe(201);
      const { reservationId } = JSON.parse(bookRes.body);

      // 4. Another client books remaining spot
      const book2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/reservations',
        payload: { resourceId: 'journey-room', clientId: 'user-B', quantity: 1 }
      });
      expect(book2Res.statusCode).toBe(201);

      // 5. Third client tries to book - should fail
      const book3Res = await app.inject({
        method: 'POST',
        url: '/api/v1/reservations',
        payload: { resourceId: 'journey-room', clientId: 'user-C', quantity: 1 }
      });
      expect(JSON.parse(book3Res.body).status).toBe('REJECTED');
      expect(JSON.parse(book3Res.body).reason).toBe('RESOURCE_FULL');

      // 6. First client cancels
      const cancelRes = await app.inject({
        method: 'POST',
        url: `/api/v1/reservations/${reservationId}/cancel`
      });
      expect(cancelRes.statusCode).toBe(200);

      // 7. Third client can now book
      const book4Res = await app.inject({
        method: 'POST',
        url: '/api/v1/reservations',
        payload: { resourceId: 'journey-room', clientId: 'user-C', quantity: 1 }
      });
      expect(book4Res.statusCode).toBe(201);
      expect(JSON.parse(book4Res.body).status).toBe('CONFIRMED');

      // 8. Verify final state
      const finalRes = await app.inject({
        method: 'GET',
        url: '/api/v1/resources/journey-room'
      });
      const finalResource = JSON.parse(finalRes.body);
      expect(finalResource.currentBookings).toBe(2);
    });
  });

  describe('Client Endpoints', () => {
    describe('GET /api/v1/clients', () => {
      it('returns empty array when no reservations exist', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/clients'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.data).toEqual([]);
        expect(body.total).toBe(0);
      });

      it('returns client aggregates with reservation stats', async () => {
        // Create resource
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'client-test-room', type: 'room', capacity: 10 }
        });

        // Create reservations for different clients
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'client-test-room', clientId: 'alice@example.com', quantity: 2 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'client-test-room', clientId: 'alice@example.com', quantity: 1 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'client-test-room', clientId: 'bob@example.com', quantity: 3 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/clients'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.total).toBe(2);

        const alice = body.data.find((c: any) => c.id === 'alice@example.com');
        const bob = body.data.find((c: any) => c.id === 'bob@example.com');

        expect(alice).toBeDefined();
        expect(alice.totalReservations).toBe(2);
        expect(alice.totalQuantity).toBe(3);
        expect(alice.activeReservations).toBe(2);
        expect(alice.status).toBe('active');

        expect(bob).toBeDefined();
        expect(bob.totalReservations).toBe(1);
        expect(bob.totalQuantity).toBe(3);
      });

      it('tracks cancelled reservations in client stats', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'cancel-test-room', type: 'room', capacity: 10 }
        });

        // Create and cancel a reservation
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'cancel-test-room', clientId: 'charlie@example.com', quantity: 1 }
        });
        const { reservationId } = JSON.parse(createRes.body);

        await app.inject({
          method: 'POST',
          url: `/api/v1/reservations/${reservationId}/cancel`
        });

        // Create another confirmed reservation
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'cancel-test-room', clientId: 'charlie@example.com', quantity: 2 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/clients'
        });

        const body = JSON.parse(response.body);
        const charlie = body.data.find((c: any) => c.id === 'charlie@example.com');

        expect(charlie.totalReservations).toBe(2);
        expect(charlie.activeReservations).toBe(1);
        expect(charlie.cancelledReservations).toBe(1);
      });
    });
  });

  describe('Analytics Endpoints', () => {
    describe('GET /api/v1/analytics', () => {
      it('returns empty metrics when no data exists', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/analytics'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.metrics).toEqual({
          totalReservations: 0,
          confirmedReservations: 0,
          cancelledReservations: 0,
          totalQuantity: 0,
          uniqueClients: 0,
          totalResources: 0,
          utilizationRate: 0
        });
        expect(body.resourceUsage).toEqual([]);
      });

      it('returns accurate metrics with reservations', async () => {
        // Create resources
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'analytics-room-1', type: 'room', capacity: 10 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'analytics-room-2', type: 'room', capacity: 20 }
        });

        // Create reservations
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'analytics-room-1', clientId: 'user-1', quantity: 5 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'analytics-room-1', clientId: 'user-2', quantity: 3 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'analytics-room-2', clientId: 'user-1', quantity: 10 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/analytics'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);

        expect(body.metrics.totalReservations).toBe(3);
        expect(body.metrics.confirmedReservations).toBe(3);
        expect(body.metrics.cancelledReservations).toBe(0);
        expect(body.metrics.totalQuantity).toBe(18);
        expect(body.metrics.uniqueClients).toBe(2);
        expect(body.metrics.totalResources).toBe(2);
      });

      it('returns resource usage sorted by utilization', async () => {
        // Create resources with different capacities
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'high-usage', type: 'room', capacity: 10 }
        });
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'low-usage', type: 'room', capacity: 100 }
        });

        // Fill high-usage to 80%
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'high-usage', clientId: 'user-1', quantity: 8 }
        });

        // Fill low-usage to 10%
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'low-usage', clientId: 'user-1', quantity: 10 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/analytics'
        });

        const body = JSON.parse(response.body);

        // Should be sorted by usage descending
        expect(body.resourceUsage[0].name).toBe('high-usage');
        expect(body.resourceUsage[0].usage).toBe(80);
        expect(body.resourceUsage[1].name).toBe('low-usage');
        expect(body.resourceUsage[1].usage).toBe(10);
      });

      it('tracks cancelled reservations in metrics', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'metrics-room', type: 'room', capacity: 10 }
        });

        // Create and cancel a reservation
        const createRes = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'metrics-room', clientId: 'user-1', quantity: 2 }
        });
        const { reservationId } = JSON.parse(createRes.body);

        await app.inject({
          method: 'POST',
          url: `/api/v1/reservations/${reservationId}/cancel`
        });

        // Create a confirmed reservation
        await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'metrics-room', clientId: 'user-2', quantity: 3 }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/analytics'
        });

        const body = JSON.parse(response.body);
        expect(body.metrics.totalReservations).toBe(2);
        expect(body.metrics.confirmedReservations).toBe(1);
        expect(body.metrics.cancelledReservations).toBe(1);
      });
    });
  });

  describe('Settings/Maintenance Mode Endpoints', () => {
    describe('GET /api/v1/settings/maintenance', () => {
      it('returns disabled maintenance mode by default', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/settings/maintenance'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.enabled).toBe(false);
        expect(body.message).toBeNull();
      });
    });

    describe('PUT /api/v1/settings/maintenance', () => {
      it('enables maintenance mode with message', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: {
            enabled: true,
            message: 'System upgrade in progress'
          }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.enabled).toBe(true);
        expect(body.message).toBe('System upgrade in progress');

        // Verify it persists
        const getResponse = await app.inject({
          method: 'GET',
          url: '/api/v1/settings/maintenance'
        });
        const getBody = JSON.parse(getResponse.body);
        expect(getBody.enabled).toBe(true);
        expect(getBody.message).toBe('System upgrade in progress');
      });

      it('disables maintenance mode', async () => {
        // First enable it
        await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: { enabled: true, message: 'Maintenance' }
        });

        // Then disable it
        const response = await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: { enabled: false }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.enabled).toBe(false);
      });

      it('returns 400 for invalid payload', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: {
            // Missing required 'enabled' field
            message: 'Test'
          }
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('GET /api/v1/settings/status', () => {
      it('returns operational status when maintenance is disabled', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/settings/status'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.operational).toBe(true);
        expect(body.maintenance.enabled).toBe(false);
      });

      it('returns non-operational status when maintenance is enabled', async () => {
        await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: { enabled: true, message: 'Scheduled maintenance' }
        });

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/settings/status'
        });

        const body = JSON.parse(response.body);
        expect(body.operational).toBe(false);
        expect(body.maintenance.enabled).toBe(true);
        expect(body.maintenance.message).toBe('Scheduled maintenance');
      });
    });

    describe('Maintenance mode blocks reservations', () => {
      it('rejects new reservations when maintenance mode is enabled', async () => {
        // Create a resource
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'maint-room', type: 'room', capacity: 10 }
        });

        // Enable maintenance mode
        await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: { enabled: true, message: 'System maintenance' }
        });

        // Try to create a reservation
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'maint-room', clientId: 'user-1', quantity: 1 }
        });

        expect(response.statusCode).toBe(503);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('REJECTED');
        expect(body.reason).toBe('MAINTENANCE_MODE');
      });

      it('allows reservations after maintenance mode is disabled', async () => {
        // Create a resource
        await app.inject({
          method: 'POST',
          url: '/api/v1/resources',
          payload: { id: 'maint-room-2', type: 'room', capacity: 10 }
        });

        // Enable then disable maintenance mode
        await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: { enabled: true, message: 'System maintenance' }
        });
        await app.inject({
          method: 'PUT',
          url: '/api/v1/settings/maintenance',
          payload: { enabled: false }
        });

        // Now reservation should work
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/reservations',
          payload: { resourceId: 'maint-room-2', clientId: 'user-1', quantity: 1 }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('CONFIRMED');
      });
    });
  });
});
