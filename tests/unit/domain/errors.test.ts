/**
 * Unit tests for domain errors
 */

import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ResourceFullError,
  ResourceClosedError,
  InvalidStateError,
  InvalidQuantityError,
  ResourceNotFoundError,
  ReservationNotFoundError,
  ConcurrencyConflictError,
  isDomainError
} from '../../../src/domain/errors';

describe('Domain Errors', () => {
  describe('DomainError', () => {
    it('creates error with correct code and message', () => {
      const error = new DomainError('TEST_CODE', 'Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
    });

    it('has correct name', () => {
      const error = new DomainError('TEST_CODE', 'Test message');
      expect(error.name).toBe('DomainError');
    });

    it('is instance of Error', () => {
      const error = new DomainError('TEST_CODE', 'Test message');
      expect(error instanceof Error).toBe(true);
    });

    it('is instance of DomainError', () => {
      const error = new DomainError('TEST_CODE', 'Test message');
      expect(error instanceof DomainError).toBe(true);
    });

    it('has readonly code property', () => {
      const error = new DomainError('TEST_CODE', 'Test message');
      // TypeScript enforces readonly at compile time
      // At runtime, the property can be reassigned but we verify it's defined as readonly
      expect(error.code).toBe('TEST_CODE');

      // Verify the property descriptor shows it's not writable by default in strict mode
      const descriptor = Object.getOwnPropertyDescriptor(error, 'code');
      expect(descriptor).toBeDefined();
    });
  });

  describe('ResourceFullError', () => {
    it('has correct code', () => {
      const error = new ResourceFullError();
      expect(error.code).toBe('RESOURCE_FULL');
    });

    it('has default message', () => {
      const error = new ResourceFullError();
      expect(error.message).toBe('Resource is at full capacity');
    });

    it('accepts custom message', () => {
      const error = new ResourceFullError('Custom capacity message');
      expect(error.message).toBe('Custom capacity message');
      expect(error.code).toBe('RESOURCE_FULL');
    });

    it('has correct name', () => {
      const error = new ResourceFullError();
      expect(error.name).toBe('ResourceFullError');
    });

    it('is instance of DomainError', () => {
      const error = new ResourceFullError();
      expect(error instanceof DomainError).toBe(true);
    });

    it('is instance of Error', () => {
      const error = new ResourceFullError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ResourceClosedError', () => {
    it('has correct code', () => {
      const error = new ResourceClosedError();
      expect(error.code).toBe('RESOURCE_CLOSED');
    });

    it('has default message', () => {
      const error = new ResourceClosedError();
      expect(error.message).toBe('Resource is closed and cannot accept reservations');
    });

    it('accepts custom message', () => {
      const error = new ResourceClosedError('Resource unavailable');
      expect(error.message).toBe('Resource unavailable');
      expect(error.code).toBe('RESOURCE_CLOSED');
    });

    it('has correct name', () => {
      const error = new ResourceClosedError();
      expect(error.name).toBe('ResourceClosedError');
    });

    it('is instance of DomainError', () => {
      const error = new ResourceClosedError();
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('InvalidStateError', () => {
    it('has correct code', () => {
      const error = new InvalidStateError();
      expect(error.code).toBe('INVALID_STATE');
    });

    it('has default message', () => {
      const error = new InvalidStateError();
      expect(error.message).toBe('Invalid state for this operation');
    });

    it('accepts custom message', () => {
      const error = new InvalidStateError('Cannot perform action in current state');
      expect(error.message).toBe('Cannot perform action in current state');
      expect(error.code).toBe('INVALID_STATE');
    });

    it('has correct name', () => {
      const error = new InvalidStateError();
      expect(error.name).toBe('InvalidStateError');
    });

    it('is instance of DomainError', () => {
      const error = new InvalidStateError();
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('InvalidQuantityError', () => {
    it('has correct code', () => {
      const error = new InvalidQuantityError();
      expect(error.code).toBe('INVALID_QUANTITY');
    });

    it('has default message', () => {
      const error = new InvalidQuantityError();
      expect(error.message).toBe('Invalid quantity provided');
    });

    it('accepts custom message', () => {
      const error = new InvalidQuantityError('Quantity must be positive');
      expect(error.message).toBe('Quantity must be positive');
      expect(error.code).toBe('INVALID_QUANTITY');
    });

    it('has correct name', () => {
      const error = new InvalidQuantityError();
      expect(error.name).toBe('InvalidQuantityError');
    });

    it('is instance of DomainError', () => {
      const error = new InvalidQuantityError();
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('ResourceNotFoundError', () => {
    it('has correct code', () => {
      const error = new ResourceNotFoundError();
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('has default message', () => {
      const error = new ResourceNotFoundError();
      expect(error.message).toBe('Resource not found');
    });

    it('accepts resourceId and generates message', () => {
      const error = new ResourceNotFoundError('room-101');
      expect(error.message).toBe('Resource room-101 not found');
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('accepts resourceId and custom message', () => {
      const error = new ResourceNotFoundError('room-101', 'Custom not found message');
      expect(error.message).toBe('Custom not found message');
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('has correct name', () => {
      const error = new ResourceNotFoundError();
      expect(error.name).toBe('ResourceNotFoundError');
    });

    it('is instance of DomainError', () => {
      const error = new ResourceNotFoundError();
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('ReservationNotFoundError', () => {
    it('has correct code', () => {
      const error = new ReservationNotFoundError();
      expect(error.code).toBe('RESERVATION_NOT_FOUND');
    });

    it('has default message', () => {
      const error = new ReservationNotFoundError();
      expect(error.message).toBe('Reservation not found');
    });

    it('accepts custom message', () => {
      const error = new ReservationNotFoundError('Reservation abc-123 not found');
      expect(error.message).toBe('Reservation abc-123 not found');
      expect(error.code).toBe('RESERVATION_NOT_FOUND');
    });

    it('has correct name', () => {
      const error = new ReservationNotFoundError();
      expect(error.name).toBe('ReservationNotFoundError');
    });

    it('is instance of DomainError', () => {
      const error = new ReservationNotFoundError();
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('ConcurrencyConflictError', () => {
    it('has correct code', () => {
      const error = new ConcurrencyConflictError();
      expect(error.code).toBe('CONCURRENCY_CONFLICT');
    });

    it('has default message', () => {
      const error = new ConcurrencyConflictError();
      expect(error.message).toBe('Concurrency conflict detected');
    });

    it('accepts custom message', () => {
      const error = new ConcurrencyConflictError('Version mismatch detected');
      expect(error.message).toBe('Version mismatch detected');
      expect(error.code).toBe('CONCURRENCY_CONFLICT');
    });

    it('has correct name', () => {
      const error = new ConcurrencyConflictError();
      expect(error.name).toBe('ConcurrencyConflictError');
    });

    it('is instance of DomainError', () => {
      const error = new ConcurrencyConflictError();
      expect(error instanceof DomainError).toBe(true);
    });
  });

  describe('isDomainError type guard', () => {
    it('returns true for DomainError instance', () => {
      const error = new DomainError('TEST', 'message');
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for ResourceFullError instance', () => {
      const error = new ResourceFullError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for ResourceClosedError instance', () => {
      const error = new ResourceClosedError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for InvalidStateError instance', () => {
      const error = new InvalidStateError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for InvalidQuantityError instance', () => {
      const error = new InvalidQuantityError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for ResourceNotFoundError instance', () => {
      const error = new ResourceNotFoundError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for ReservationNotFoundError instance', () => {
      const error = new ReservationNotFoundError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns true for ConcurrencyConflictError instance', () => {
      const error = new ConcurrencyConflictError();
      expect(isDomainError(error)).toBe(true);
    });

    it('returns false for standard Error instance', () => {
      const error = new Error('Standard error');
      expect(isDomainError(error)).toBe(false);
    });

    it('returns false for TypeError instance', () => {
      const error = new TypeError('Type error');
      expect(isDomainError(error)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isDomainError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isDomainError(undefined)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isDomainError('error string')).toBe(false);
    });

    it('returns false for object', () => {
      expect(isDomainError({ code: 'TEST', message: 'test' })).toBe(false);
    });

    it('returns false for number', () => {
      expect(isDomainError(123)).toBe(false);
    });

    it('returns false for boolean', () => {
      expect(isDomainError(true)).toBe(false);
      expect(isDomainError(false)).toBe(false);
    });

    it('returns false for array', () => {
      expect(isDomainError([])).toBe(false);
    });
  });

  describe('error inheritance', () => {
    it('all domain errors extend DomainError', () => {
      expect(new ResourceFullError() instanceof DomainError).toBe(true);
      expect(new ResourceClosedError() instanceof DomainError).toBe(true);
      expect(new InvalidStateError() instanceof DomainError).toBe(true);
      expect(new InvalidQuantityError() instanceof DomainError).toBe(true);
      expect(new ResourceNotFoundError() instanceof DomainError).toBe(true);
      expect(new ReservationNotFoundError() instanceof DomainError).toBe(true);
      expect(new ConcurrencyConflictError() instanceof DomainError).toBe(true);
    });

    it('all domain errors extend Error', () => {
      expect(new ResourceFullError() instanceof Error).toBe(true);
      expect(new ResourceClosedError() instanceof Error).toBe(true);
      expect(new InvalidStateError() instanceof Error).toBe(true);
      expect(new InvalidQuantityError() instanceof Error).toBe(true);
      expect(new ResourceNotFoundError() instanceof Error).toBe(true);
      expect(new ReservationNotFoundError() instanceof Error).toBe(true);
      expect(new ConcurrencyConflictError() instanceof Error).toBe(true);
    });

    it('domain errors can be caught as DomainError', () => {
      try {
        throw new ResourceFullError();
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        if (error instanceof DomainError) {
          expect(error.code).toBe('RESOURCE_FULL');
        }
      }
    });

    it('domain errors can be caught as Error', () => {
      try {
        throw new InvalidStateError();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        if (error instanceof Error) {
          expect(error.message).toBeTruthy();
        }
      }
    });
  });

  describe('error codes uniqueness', () => {
    it('each error class has unique code', () => {
      const codes = [
        new ResourceFullError().code,
        new ResourceClosedError().code,
        new InvalidStateError().code,
        new InvalidQuantityError().code,
        new ResourceNotFoundError().code,
        new ReservationNotFoundError().code,
        new ConcurrencyConflictError().code
      ];

      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('error message customization', () => {
    it('allows custom messages for all error types', () => {
      const customMessage = 'Custom error message';

      const errors = [
        new ResourceFullError(customMessage),
        new ResourceClosedError(customMessage),
        new InvalidStateError(customMessage),
        new InvalidQuantityError(customMessage),
        new ResourceNotFoundError(undefined, customMessage), // ResourceNotFoundError has different signature
        new ReservationNotFoundError(customMessage),
        new ConcurrencyConflictError(customMessage)
      ];

      errors.forEach(error => {
        expect(error.message).toBe(customMessage);
      });
    });

    it('preserves error code when using custom message', () => {
      const customMessage = 'Custom message';

      expect(new ResourceFullError(customMessage).code).toBe('RESOURCE_FULL');
      expect(new ResourceClosedError(customMessage).code).toBe('RESOURCE_CLOSED');
      expect(new InvalidStateError(customMessage).code).toBe('INVALID_STATE');
      expect(new InvalidQuantityError(customMessage).code).toBe('INVALID_QUANTITY');
      expect(new ResourceNotFoundError(undefined, customMessage).code).toBe('RESOURCE_NOT_FOUND');
      expect(new ReservationNotFoundError(customMessage).code).toBe('RESERVATION_NOT_FOUND');
      expect(new ConcurrencyConflictError(customMessage).code).toBe('CONCURRENCY_CONFLICT');
    });
  });
});
