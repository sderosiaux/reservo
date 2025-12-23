/**
 * Unit tests for Reservation entity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createReservation,
  cancelReservation,
  isActive,
  isCancelled,
  type Reservation,
  type CreateReservationParams
} from '../../../../src/domain/entities/Reservation';
import { generateReservationId } from '../../../../src/domain/value-objects/ReservationId';
import { createResourceId } from '../../../../src/domain/value-objects/ResourceId';
import { createClientId } from '../../../../src/domain/value-objects/ClientId';

describe('Entity: Reservation', () => {
  let baseParams: CreateReservationParams;

  beforeEach(() => {
    baseParams = {
      id: generateReservationId(),
      resourceId: createResourceId('room-101'),
      clientId: createClientId('client-123'),
      quantity: 5,
      serverTimestamp: Date.now()
    };
  });

  describe('createReservation', () => {
    it('creates valid reservation with CONFIRMED status', () => {
      const reservation = createReservation(baseParams);

      expect(reservation.id).toBe(baseParams.id);
      expect(reservation.resourceId).toBe(baseParams.resourceId);
      expect(reservation.clientId).toBe(baseParams.clientId);
      expect(reservation.quantity).toBe(5);
      expect(reservation.status).toBe('CONFIRMED');
      expect(reservation.serverTimestamp).toBe(baseParams.serverTimestamp);
      expect(reservation.createdAt).toBeTypeOf('number');
    });

    it('creates reservation with quantity of 1', () => {
      const reservation = createReservation({ ...baseParams, quantity: 1 });
      expect(reservation.quantity).toBe(1);
      expect(reservation.status).toBe('CONFIRMED');
    });

    it('creates reservation with large quantity', () => {
      const reservation = createReservation({ ...baseParams, quantity: 1000 });
      expect(reservation.quantity).toBe(1000);
    });

    it('preserves serverTimestamp correctly', () => {
      const timestamp = 1704067200000;
      const reservation = createReservation({ ...baseParams, serverTimestamp: timestamp });
      expect(reservation.serverTimestamp).toBe(timestamp);
    });

    it('creates multiple reservations with different IDs', () => {
      const reservation1 = createReservation(baseParams);
      const reservation2 = createReservation({
        ...baseParams,
        id: generateReservationId()
      });

      expect(reservation1.id).not.toBe(reservation2.id);
      expect(reservation1.status).toBe('CONFIRMED');
      expect(reservation2.status).toBe('CONFIRMED');
    });

    it('throws error for quantity less than 1', () => {
      expect(() =>
        createReservation({ ...baseParams, quantity: 0 })
      ).toThrow('Reservation quantity must be at least 1');
    });

    it('throws error for negative quantity', () => {
      expect(() =>
        createReservation({ ...baseParams, quantity: -1 })
      ).toThrow('Reservation quantity must be at least 1');

      expect(() =>
        createReservation({ ...baseParams, quantity: -100 })
      ).toThrow('Reservation quantity must be at least 1');
    });

    it('creates reservation with different resource IDs', () => {
      const reservation1 = createReservation({
        ...baseParams,
        resourceId: createResourceId('room-101')
      });
      const reservation2 = createReservation({
        ...baseParams,
        id: generateReservationId(),
        resourceId: createResourceId('room-202')
      });

      expect(reservation1.resourceId).not.toBe(reservation2.resourceId);
    });

    it('creates reservation with different client IDs', () => {
      const reservation1 = createReservation({
        ...baseParams,
        clientId: createClientId('client-123')
      });
      const reservation2 = createReservation({
        ...baseParams,
        id: generateReservationId(),
        clientId: createClientId('client-456')
      });

      expect(reservation1.clientId).not.toBe(reservation2.clientId);
    });
  });

  describe('cancelReservation', () => {
    let reservation: Reservation;

    beforeEach(() => {
      reservation = createReservation(baseParams);
    });

    it('returns new immutable instance with CANCELLED status', () => {
      const cancelled = cancelReservation(reservation);

      expect(cancelled).not.toBe(reservation);
      expect(cancelled.status).toBe('CANCELLED');
      expect(reservation.status).toBe('CONFIRMED');
    });

    it('preserves other properties', () => {
      const cancelled = cancelReservation(reservation);

      expect(cancelled.id).toBe(reservation.id);
      expect(cancelled.resourceId).toBe(reservation.resourceId);
      expect(cancelled.clientId).toBe(reservation.clientId);
      expect(cancelled.quantity).toBe(reservation.quantity);
      expect(cancelled.serverTimestamp).toBe(reservation.serverTimestamp);
      expect(cancelled.createdAt).toBe(reservation.createdAt);
    });

    it('throws error when cancelling already cancelled reservation', () => {
      const cancelled = cancelReservation(reservation);

      expect(() => cancelReservation(cancelled)).toThrow(
        'Reservation is already cancelled'
      );
    });

    it('original reservation remains unchanged', () => {
      const originalStatus = reservation.status;
      const originalSnapshot = { ...reservation };

      cancelReservation(reservation);

      expect(reservation).toEqual(originalSnapshot);
      expect(reservation.status).toBe(originalStatus);
    });

    it('can cancel reservation with quantity 1', () => {
      const smallReservation = createReservation({ ...baseParams, quantity: 1 });
      const cancelled = cancelReservation(smallReservation);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.quantity).toBe(1);
    });

    it('can cancel reservation with large quantity', () => {
      const largeReservation = createReservation({ ...baseParams, quantity: 1000 });
      const cancelled = cancelReservation(largeReservation);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.quantity).toBe(1000);
    });
  });

  describe('isActive', () => {
    it('returns true for CONFIRMED reservation', () => {
      const reservation = createReservation(baseParams);
      expect(isActive(reservation)).toBe(true);
    });

    it('returns false for CANCELLED reservation', () => {
      const reservation = createReservation(baseParams);
      const cancelled = cancelReservation(reservation);
      expect(isActive(cancelled)).toBe(false);
    });

    it('returns true for newly created reservation', () => {
      const reservation = createReservation(baseParams);
      expect(isActive(reservation)).toBe(true);
    });

    it('returns false immediately after cancellation', () => {
      const reservation = createReservation(baseParams);
      const cancelled = cancelReservation(reservation);
      expect(isActive(cancelled)).toBe(false);
    });
  });

  describe('isCancelled', () => {
    it('returns false for CONFIRMED reservation', () => {
      const reservation = createReservation(baseParams);
      expect(isCancelled(reservation)).toBe(false);
    });

    it('returns true for CANCELLED reservation', () => {
      const reservation = createReservation(baseParams);
      const cancelled = cancelReservation(reservation);
      expect(isCancelled(cancelled)).toBe(true);
    });

    it('returns false for newly created reservation', () => {
      const reservation = createReservation(baseParams);
      expect(isCancelled(reservation)).toBe(false);
    });

    it('returns true immediately after cancellation', () => {
      const reservation = createReservation(baseParams);
      const cancelled = cancelReservation(reservation);
      expect(isCancelled(cancelled)).toBe(true);
    });
  });

  describe('status predicates consistency', () => {
    it('isActive and isCancelled are mutually exclusive for CONFIRMED', () => {
      const reservation = createReservation(baseParams);
      expect(isActive(reservation)).toBe(true);
      expect(isCancelled(reservation)).toBe(false);
    });

    it('isActive and isCancelled are mutually exclusive for CANCELLED', () => {
      const reservation = createReservation(baseParams);
      const cancelled = cancelReservation(reservation);
      expect(isActive(cancelled)).toBe(false);
      expect(isCancelled(cancelled)).toBe(true);
    });

    it('exactly one predicate returns true at any time', () => {
      const reservation = createReservation(baseParams);
      expect(isActive(reservation) !== isCancelled(reservation)).toBe(true);

      const cancelled = cancelReservation(reservation);
      expect(isActive(cancelled) !== isCancelled(cancelled)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('original reservation remains unchanged after cancellation', () => {
      const original = createReservation(baseParams);
      const originalSnapshot = { ...original };

      cancelReservation(original);

      expect(original).toEqual(originalSnapshot);
    });

    it('multiple cancellation attempts do not modify original', () => {
      const original = createReservation(baseParams);
      const originalSnapshot = { ...original };

      const cancelled1 = cancelReservation(original);
      expect(original).toEqual(originalSnapshot);

      // Second attempt should throw, but original should still be unchanged
      try {
        cancelReservation(cancelled1);
      } catch {
        // Expected error
      }

      expect(original).toEqual(originalSnapshot);
    });
  });

  describe('edge cases', () => {
    it('handles reservation with minimum valid quantity', () => {
      const reservation = createReservation({ ...baseParams, quantity: 1 });
      expect(reservation.quantity).toBe(1);
      expect(isActive(reservation)).toBe(true);

      const cancelled = cancelReservation(reservation);
      expect(cancelled.quantity).toBe(1);
      expect(isCancelled(cancelled)).toBe(true);
    });

    it('handles reservation with very old serverTimestamp', () => {
      const oldTimestamp = 0; // Unix epoch
      const reservation = createReservation({
        ...baseParams,
        serverTimestamp: oldTimestamp
      });
      expect(reservation.serverTimestamp).toBe(oldTimestamp);
    });

    it('handles reservation with future serverTimestamp', () => {
      const futureTimestamp = Date.now() + 1000000000;
      const reservation = createReservation({
        ...baseParams,
        serverTimestamp: futureTimestamp
      });
      expect(reservation.serverTimestamp).toBe(futureTimestamp);
    });

    it('createdAt is independent of serverTimestamp', () => {
      const serverTimestamp = 1000000000;
      const reservation = createReservation({
        ...baseParams,
        serverTimestamp
      });

      expect(reservation.serverTimestamp).toBe(serverTimestamp);
      expect(reservation.createdAt).toBeGreaterThan(serverTimestamp);
    });
  });
});
