/**
 * Reservation - Domain entity representing a client's reservation
 */

import { ReservationId } from '../value-objects/ReservationId.js';
import { ResourceId } from '../value-objects/ResourceId.js';
import { ClientId } from '../value-objects/ClientId.js';

export type ReservationStatus = 'CONFIRMED' | 'CANCELLED' | 'REJECTED';

export interface Reservation {
  readonly id: ReservationId;
  readonly resourceId: ResourceId;
  readonly clientId: ClientId;
  readonly quantity: number;
  readonly status: ReservationStatus;
  readonly rejectionReason?: string; // Reason for rejection (if status is REJECTED)
  readonly serverTimestamp: number; // Authoritative timestamp
  readonly createdAt: number;
}

export interface CreateReservationParams {
  id: ReservationId;
  resourceId: ResourceId;
  clientId: ClientId;
  quantity: number;
  serverTimestamp: number;
  status?: ReservationStatus;
  rejectionReason?: string;
  createdAt?: number;
}

/**
 * Factory function to create a new Reservation
 * Validates domain invariants:
 * - Quantity must be positive
 * - rejectionReason is required for REJECTED status
 * - rejectionReason must be null for non-REJECTED status
 */
export function createReservation(params: CreateReservationParams): Reservation {
  if (params.quantity < 1) {
    throw new Error('Reservation quantity must be at least 1');
  }

  const status = params.status ?? 'CONFIRMED';

  // Validate rejection reason invariant
  if (status === 'REJECTED' && !params.rejectionReason) {
    throw new Error('Rejection reason is required for rejected reservations');
  }

  if (status !== 'REJECTED' && params.rejectionReason) {
    throw new Error('Rejection reason can only be set for rejected reservations');
  }

  return {
    id: params.id,
    resourceId: params.resourceId,
    clientId: params.clientId,
    quantity: params.quantity,
    status,
    rejectionReason: params.rejectionReason,
    serverTimestamp: params.serverTimestamp,
    createdAt: params.createdAt ?? Date.now()
  };
}

/**
 * Cancel a reservation (returns a new Reservation instance)
 */
export function cancelReservation(reservation: Reservation): Reservation {
  if (reservation.status === 'CANCELLED') {
    throw new Error('Reservation is already cancelled');
  }

  return {
    ...reservation,
    status: 'CANCELLED'
  };
}

/**
 * Check if a reservation is active
 */
export function isActive(reservation: Reservation): boolean {
  return reservation.status === 'CONFIRMED';
}

/**
 * Check if a reservation is cancelled
 */
export function isCancelled(reservation: Reservation): boolean {
  return reservation.status === 'CANCELLED';
}
