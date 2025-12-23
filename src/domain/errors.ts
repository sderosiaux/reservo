/**
 * Domain Errors - Errors that can occur in the domain layer
 */

/**
 * Base class for all domain errors
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a resource is at full capacity
 */
export class ResourceFullError extends DomainError {
  constructor(message: string = 'Resource is at full capacity') {
    super('RESOURCE_FULL', message);
  }
}

/**
 * Thrown when attempting to book a closed resource
 */
export class ResourceClosedError extends DomainError {
  constructor(message: string = 'Resource is closed and cannot accept reservations') {
    super('RESOURCE_CLOSED', message);
  }
}

/**
 * Thrown when an operation is attempted on an invalid state
 */
export class InvalidStateError extends DomainError {
  constructor(message: string = 'Invalid state for this operation') {
    super('INVALID_STATE', message);
  }
}

/**
 * Thrown when an invalid quantity is provided
 */
export class InvalidQuantityError extends DomainError {
  constructor(message: string = 'Invalid quantity provided') {
    super('INVALID_QUANTITY', message);
  }
}

/**
 * Thrown when a resource is not found
 */
export class ResourceNotFoundError extends DomainError {
  constructor(resourceId?: string, message?: string) {
    const msg = message ?? (resourceId ? `Resource ${resourceId} not found` : 'Resource not found');
    super('RESOURCE_NOT_FOUND', msg);
  }
}

/**
 * Thrown when a reservation is not found
 */
export class ReservationNotFoundError extends DomainError {
  constructor(message: string = 'Reservation not found') {
    super('RESERVATION_NOT_FOUND', message);
  }
}

/**
 * Thrown when there's a concurrency conflict
 */
export class ConcurrencyConflictError extends DomainError {
  constructor(message: string = 'Concurrency conflict detected') {
    super('CONCURRENCY_CONFLICT', message);
  }
}

/**
 * Type guard to check if an error is a DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
