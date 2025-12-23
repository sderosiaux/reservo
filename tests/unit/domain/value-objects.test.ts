/**
 * Unit tests for domain value objects
 */

import { describe, it, expect } from 'vitest';
import {
  createResourceId,
  isResourceId,
  type ResourceId
} from '../../../src/domain/value-objects/ResourceId';
import {
  createClientId,
  isClientId,
  type ClientId
} from '../../../src/domain/value-objects/ClientId';
import {
  createReservationId,
  generateReservationId,
  isReservationId,
  type ReservationId
} from '../../../src/domain/value-objects/ReservationId';
import {
  createQuantity,
  isQuantity,
  type Quantity
} from '../../../src/domain/value-objects/Quantity';

describe('Value Object: ResourceId', () => {
  describe('createResourceId', () => {
    it('creates valid ResourceId for non-empty string', () => {
      const id = createResourceId('room-101');
      expect(id).toBe('room-101');
    });

    it('creates valid ResourceId for string with special characters', () => {
      const id = createResourceId('room_101-A');
      expect(id).toBe('room_101-A');
    });

    it('creates valid ResourceId at max length (100 characters)', () => {
      const longId = 'a'.repeat(100);
      const id = createResourceId(longId);
      expect(id).toBe(longId);
    });

    it('throws error for empty string', () => {
      expect(() => createResourceId('')).toThrow('ResourceId cannot be empty');
    });

    it('throws error for whitespace-only string', () => {
      expect(() => createResourceId('   ')).toThrow('ResourceId cannot be empty');
    });

    it('throws error for string exceeding max length', () => {
      const tooLongId = 'a'.repeat(101);
      expect(() => createResourceId(tooLongId)).toThrow(
        'ResourceId cannot exceed 100 characters'
      );
    });
  });

  describe('isResourceId', () => {
    it('returns true for valid ResourceId', () => {
      const id = createResourceId('room-101');
      expect(isResourceId(id)).toBe(true);
    });

    it('returns true for valid string', () => {
      expect(isResourceId('room-101')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isResourceId('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isResourceId('   ')).toBe(false);
    });

    it('returns false for string exceeding max length', () => {
      const tooLongId = 'a'.repeat(101);
      expect(isResourceId(tooLongId)).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isResourceId(123)).toBe(false);
      expect(isResourceId(null)).toBe(false);
      expect(isResourceId(undefined)).toBe(false);
      expect(isResourceId({})).toBe(false);
      expect(isResourceId([])).toBe(false);
    });
  });
});

describe('Value Object: ClientId', () => {
  describe('createClientId', () => {
    it('creates valid ClientId for non-empty string', () => {
      const id = createClientId('client-123');
      expect(id).toBe('client-123');
    });

    it('creates valid ClientId for string with special characters', () => {
      const id = createClientId('client_123-A');
      expect(id).toBe('client_123-A');
    });

    it('creates valid ClientId at max length (100 characters)', () => {
      const longId = 'b'.repeat(100);
      const id = createClientId(longId);
      expect(id).toBe(longId);
    });

    it('throws error for empty string', () => {
      expect(() => createClientId('')).toThrow('ClientId cannot be empty');
    });

    it('throws error for whitespace-only string', () => {
      expect(() => createClientId('   ')).toThrow('ClientId cannot be empty');
    });

    it('throws error for string exceeding max length', () => {
      const tooLongId = 'b'.repeat(101);
      expect(() => createClientId(tooLongId)).toThrow(
        'ClientId cannot exceed 100 characters'
      );
    });
  });

  describe('isClientId', () => {
    it('returns true for valid ClientId', () => {
      const id = createClientId('client-123');
      expect(isClientId(id)).toBe(true);
    });

    it('returns true for valid string', () => {
      expect(isClientId('client-123')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isClientId('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isClientId('   ')).toBe(false);
    });

    it('returns false for string exceeding max length', () => {
      const tooLongId = 'b'.repeat(101);
      expect(isClientId(tooLongId)).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isClientId(123)).toBe(false);
      expect(isClientId(null)).toBe(false);
      expect(isClientId(undefined)).toBe(false);
      expect(isClientId({})).toBe(false);
      expect(isClientId([])).toBe(false);
    });
  });
});

describe('Value Object: ReservationId', () => {
  describe('generateReservationId', () => {
    it('generates valid UUID format', () => {
      const id = generateReservationId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(id)).toBe(true);
    });

    it('generates unique IDs on multiple calls', () => {
      const id1 = generateReservationId();
      const id2 = generateReservationId();
      const id3 = generateReservationId();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('createReservationId', () => {
    it('creates valid ReservationId from valid UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = createReservationId(uuid);
      expect(id).toBe(uuid);
    });

    it('accepts UUID in uppercase', () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      const id = createReservationId(uuid);
      expect(id).toBe(uuid);
    });

    it('accepts UUID in lowercase', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id = createReservationId(uuid);
      expect(id).toBe(uuid);
    });

    it('throws error for invalid UUID format - missing dashes', () => {
      expect(() => createReservationId('550e8400e29b41d4a716446655440000')).toThrow(
        'ReservationId must be a valid UUID'
      );
    });

    it('throws error for invalid UUID format - wrong length', () => {
      expect(() => createReservationId('550e8400-e29b-41d4-a716')).toThrow(
        'ReservationId must be a valid UUID'
      );
    });

    it('throws error for invalid UUID format - invalid characters', () => {
      expect(() => createReservationId('550e8400-e29b-41d4-a716-44665544000g')).toThrow(
        'ReservationId must be a valid UUID'
      );
    });

    it('throws error for empty string', () => {
      expect(() => createReservationId('')).toThrow(
        'ReservationId must be a valid UUID'
      );
    });

    it('throws error for random string', () => {
      expect(() => createReservationId('not-a-uuid')).toThrow(
        'ReservationId must be a valid UUID'
      );
    });
  });

  describe('isReservationId', () => {
    it('returns true for valid ReservationId', () => {
      const id = generateReservationId();
      expect(isReservationId(id)).toBe(true);
    });

    it('returns true for valid UUID string', () => {
      expect(isReservationId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('returns true for uppercase UUID', () => {
      expect(isReservationId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('returns false for invalid UUID format', () => {
      expect(isReservationId('not-a-uuid')).toBe(false);
      expect(isReservationId('550e8400e29b41d4a716446655440000')).toBe(false);
      expect(isReservationId('550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isReservationId('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isReservationId(123)).toBe(false);
      expect(isReservationId(null)).toBe(false);
      expect(isReservationId(undefined)).toBe(false);
      expect(isReservationId({})).toBe(false);
      expect(isReservationId([])).toBe(false);
    });
  });
});

describe('Value Object: Quantity', () => {
  describe('createQuantity', () => {
    it('creates valid Quantity for positive integer', () => {
      const qty = createQuantity(5);
      expect(qty).toBe(5);
    });

    it('creates valid Quantity for 1', () => {
      const qty = createQuantity(1);
      expect(qty).toBe(1);
    });

    it('creates valid Quantity for large positive integer', () => {
      const qty = createQuantity(1000000);
      expect(qty).toBe(1000000);
    });

    it('throws error for zero', () => {
      expect(() => createQuantity(0)).toThrow('Quantity must be at least 1');
    });

    it('throws error for negative integer', () => {
      expect(() => createQuantity(-1)).toThrow('Quantity must be at least 1');
      expect(() => createQuantity(-100)).toThrow('Quantity must be at least 1');
    });

    it('throws error for positive float', () => {
      expect(() => createQuantity(1.5)).toThrow('Quantity must be an integer');
      expect(() => createQuantity(0.1)).toThrow('Quantity must be an integer');
    });

    it('throws error for negative float', () => {
      expect(() => createQuantity(-1.5)).toThrow('Quantity must be an integer');
    });

    it('throws error for NaN', () => {
      expect(() => createQuantity(NaN)).toThrow('Quantity must be an integer');
    });

    it('throws error for Infinity', () => {
      expect(() => createQuantity(Infinity)).toThrow('Quantity must be an integer');
    });

    it('throws error for negative Infinity', () => {
      expect(() => createQuantity(-Infinity)).toThrow('Quantity must be an integer');
    });
  });

  describe('isQuantity', () => {
    it('returns true for valid Quantity', () => {
      const qty = createQuantity(5);
      expect(isQuantity(qty)).toBe(true);
    });

    it('returns true for positive integer', () => {
      expect(isQuantity(1)).toBe(true);
      expect(isQuantity(100)).toBe(true);
      expect(isQuantity(1000000)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(isQuantity(0)).toBe(false);
    });

    it('returns false for negative integer', () => {
      expect(isQuantity(-1)).toBe(false);
      expect(isQuantity(-100)).toBe(false);
    });

    it('returns false for float', () => {
      expect(isQuantity(1.5)).toBe(false);
      expect(isQuantity(0.1)).toBe(false);
      expect(isQuantity(-1.5)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isQuantity(NaN)).toBe(false);
    });

    it('returns false for Infinity', () => {
      expect(isQuantity(Infinity)).toBe(false);
      expect(isQuantity(-Infinity)).toBe(false);
    });

    it('returns false for non-number values', () => {
      expect(isQuantity('5')).toBe(false);
      expect(isQuantity(null)).toBe(false);
      expect(isQuantity(undefined)).toBe(false);
      expect(isQuantity({})).toBe(false);
      expect(isQuantity([])).toBe(false);
    });
  });
});
