/**
 * ReservationId - Branded type for reservation identifiers using UUID format
 */

import { randomUUID } from 'crypto';

export type ReservationId = string & { readonly __brand: 'ReservationId' };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Factory function to create a ReservationId from an existing UUID
 */
export function createReservationId(uuid: string): ReservationId {
  if (!UUID_REGEX.test(uuid)) {
    throw new Error('ReservationId must be a valid UUID');
  }

  return uuid as ReservationId;
}

/**
 * Generate a new ReservationId
 */
export function generateReservationId(): ReservationId {
  return randomUUID() as ReservationId;
}

/**
 * Type guard to check if a value is a ReservationId
 */
export function isReservationId(value: unknown): value is ReservationId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}
