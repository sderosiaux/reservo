/**
 * Mappers - Convert between domain entities and database rows
 */

import {
  Resource as DomainResource,
  ResourceState as DomainResourceState,
} from '../../../domain/entities/Resource.js';
import {
  Reservation as DomainReservation,
  ReservationStatus as DomainReservationStatus,
} from '../../../domain/entities/Reservation.js';
import {
  createResourceId,
  createClientId,
  createReservationId,
} from '../../../domain/value-objects/index.js';
import type { Resource as DbResource } from '../schema/resources.js';
import type { Reservation as DbReservation } from '../schema/reservations.js';

/**
 * Map DB resource state to domain resource state
 * Note: DB and domain use the same values ('OPEN' | 'CLOSED')
 */
function mapDbStateToDomain(dbState: 'OPEN' | 'CLOSED'): DomainResourceState {
  return dbState;
}

/**
 * Map domain resource state to DB resource state
 * Note: DB and domain use the same values ('OPEN' | 'CLOSED')
 */
function mapDomainStateToDb(domainState: DomainResourceState): 'OPEN' | 'CLOSED' {
  return domainState;
}

/**
 * Map DB reservation status to domain reservation status
 */
function mapDbStatusToDomain(dbStatus: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'rejected'): DomainReservationStatus {
  if (dbStatus === 'rejected') return 'REJECTED';
  if (dbStatus === 'confirmed' || dbStatus === 'pending') return 'CONFIRMED';
  return 'CANCELLED';
}

/**
 * Map domain reservation status to DB reservation status
 */
function mapDomainStatusToDb(domainStatus: DomainReservationStatus): 'confirmed' | 'cancelled' | 'rejected' {
  if (domainStatus === 'REJECTED') return 'rejected';
  return domainStatus === 'CONFIRMED' ? 'confirmed' : 'cancelled';
}

/**
 * Convert DB resource row to domain Resource entity
 */
export function resourceToDomain(dbResource: DbResource): DomainResource {
  return {
    id: createResourceId(dbResource.id),
    type: dbResource.type,
    capacity: dbResource.capacity,
    currentBookings: dbResource.currentBookings,
    version: dbResource.version,
    state: mapDbStateToDomain(dbResource.state),
    createdAt: dbResource.createdAt,
    updatedAt: dbResource.updatedAt,
  };
}

/**
 * Convert domain Resource entity to DB insert shape
 */
export function resourceToDbInsert(resource: DomainResource): DbResource {
  return {
    id: resource.id,
    type: resource.type,
    capacity: resource.capacity,
    currentBookings: resource.currentBookings,
    version: resource.version,
    state: mapDomainStateToDb(resource.state),
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

/**
 * Convert domain Resource entity to DB update shape
 */
export function resourceToDbUpdate(resource: DomainResource): Partial<DbResource> {
  return {
    type: resource.type,
    capacity: resource.capacity,
    currentBookings: resource.currentBookings,
    version: resource.version,
    state: mapDomainStateToDb(resource.state),
    updatedAt: resource.updatedAt,
  };
}

/**
 * Convert DB reservation row to domain Reservation entity
 */
export function reservationToDomain(dbReservation: DbReservation): DomainReservation {
  return {
    id: createReservationId(dbReservation.id),
    resourceId: createResourceId(dbReservation.resourceId),
    clientId: createClientId(dbReservation.clientId),
    quantity: dbReservation.quantity,
    status: mapDbStatusToDomain(dbReservation.status),
    rejectionReason: dbReservation.rejectionReason ?? undefined,
    serverTimestamp: dbReservation.serverTimestamp,
    createdAt: dbReservation.createdAt,
  };
}

/**
 * Convert domain Reservation entity to DB insert shape
 */
export function reservationToDbInsert(reservation: DomainReservation): Omit<DbReservation, 'id'> & { id?: string } {
  return {
    id: reservation.id,
    resourceId: reservation.resourceId,
    clientId: reservation.clientId,
    quantity: reservation.quantity,
    status: mapDomainStatusToDb(reservation.status),
    rejectionReason: reservation.rejectionReason ?? null,
    serverTimestamp: reservation.serverTimestamp,
    createdAt: reservation.createdAt,
  };
}

/**
 * Convert domain Reservation entity to DB update shape
 */
export function reservationToDbUpdate(reservation: DomainReservation): Partial<DbReservation> {
  return {
    resourceId: reservation.resourceId,
    clientId: reservation.clientId,
    quantity: reservation.quantity,
    status: mapDomainStatusToDb(reservation.status),
    serverTimestamp: reservation.serverTimestamp,
  };
}
