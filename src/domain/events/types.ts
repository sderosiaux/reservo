/**
 * Domain Events - Events that occur in the domain
 */

import { ReservationId } from '../value-objects/ReservationId.js';
import { ResourceId } from '../value-objects/ResourceId.js';
import { ClientId } from '../value-objects/ClientId.js';

export interface ReservationConfirmed {
  readonly type: 'RESERVATION_CONFIRMED';
  readonly reservationId: ReservationId;
  readonly resourceId: ResourceId;
  readonly clientId: ClientId;
  readonly quantity: number;
  readonly serverTimestamp: number;
}

export type RejectionReason = 'RESOURCE_FULL' | 'RESOURCE_CLOSED' | 'INVALID_STATE';

export interface ReservationRejected {
  readonly type: 'RESERVATION_REJECTED';
  readonly resourceId: ResourceId;
  readonly clientId: ClientId;
  readonly quantity: number;
  readonly reason: RejectionReason;
  readonly serverTimestamp: number;
}

export interface ReservationCancelled {
  readonly type: 'RESERVATION_CANCELLED';
  readonly reservationId: ReservationId;
  readonly resourceId: ResourceId;
  readonly clientId: ClientId;
  readonly quantity: number;
  readonly serverTimestamp: number;
}

export interface ResourceCreated {
  readonly type: 'RESOURCE_CREATED';
  readonly resourceId: ResourceId;
  readonly resourceType: string;
  readonly capacity: number;
  readonly serverTimestamp: number;
}

export interface ResourceClosed {
  readonly type: 'RESOURCE_CLOSED';
  readonly resourceId: ResourceId;
  readonly serverTimestamp: number;
}

export interface ResourceOpened {
  readonly type: 'RESOURCE_OPENED';
  readonly resourceId: ResourceId;
  readonly serverTimestamp: number;
}

export type DomainEvent =
  | ReservationConfirmed
  | ReservationRejected
  | ReservationCancelled
  | ResourceCreated
  | ResourceClosed
  | ResourceOpened;

/**
 * Type guards for domain events
 */

export function isReservationConfirmed(event: DomainEvent): event is ReservationConfirmed {
  return event.type === 'RESERVATION_CONFIRMED';
}

export function isReservationRejected(event: DomainEvent): event is ReservationRejected {
  return event.type === 'RESERVATION_REJECTED';
}

export function isReservationCancelled(event: DomainEvent): event is ReservationCancelled {
  return event.type === 'RESERVATION_CANCELLED';
}

export function isResourceCreated(event: DomainEvent): event is ResourceCreated {
  return event.type === 'RESOURCE_CREATED';
}

export function isResourceClosed(event: DomainEvent): event is ResourceClosed {
  return event.type === 'RESOURCE_CLOSED';
}

export function isResourceOpened(event: DomainEvent): event is ResourceOpened {
  return event.type === 'RESOURCE_OPENED';
}

/**
 * Factory functions for creating domain events
 */

export interface CreateReservationConfirmedParams {
  reservationId: ReservationId;
  resourceId: ResourceId;
  clientId: ClientId;
  quantity: number;
  serverTimestamp: number;
}

export function createReservationConfirmedEvent(
  params: CreateReservationConfirmedParams
): ReservationConfirmed {
  return {
    type: 'RESERVATION_CONFIRMED',
    reservationId: params.reservationId,
    resourceId: params.resourceId,
    clientId: params.clientId,
    quantity: params.quantity,
    serverTimestamp: params.serverTimestamp,
  };
}

export interface CreateReservationRejectedParams {
  resourceId: ResourceId;
  clientId: ClientId;
  quantity: number;
  reason: RejectionReason;
  serverTimestamp: number;
}

export function createReservationRejectedEvent(
  params: CreateReservationRejectedParams
): ReservationRejected {
  return {
    type: 'RESERVATION_REJECTED',
    resourceId: params.resourceId,
    clientId: params.clientId,
    quantity: params.quantity,
    reason: params.reason,
    serverTimestamp: params.serverTimestamp,
  };
}

export interface CreateReservationCancelledParams {
  reservationId: ReservationId;
  resourceId: ResourceId;
  clientId: ClientId;
  quantity: number;
  serverTimestamp: number;
}

export function createReservationCancelledEvent(
  params: CreateReservationCancelledParams
): ReservationCancelled {
  return {
    type: 'RESERVATION_CANCELLED',
    reservationId: params.reservationId,
    resourceId: params.resourceId,
    clientId: params.clientId,
    quantity: params.quantity,
    serverTimestamp: params.serverTimestamp,
  };
}

export interface CreateResourceCreatedParams {
  resourceId: ResourceId;
  resourceType: string;
  capacity: number;
  serverTimestamp: number;
}

export function createResourceCreatedEvent(
  params: CreateResourceCreatedParams
): ResourceCreated {
  return {
    type: 'RESOURCE_CREATED',
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    capacity: params.capacity,
    serverTimestamp: params.serverTimestamp,
  };
}

export interface CreateResourceClosedParams {
  resourceId: ResourceId;
  serverTimestamp: number;
}

export function createResourceClosedEvent(
  params: CreateResourceClosedParams
): ResourceClosed {
  return {
    type: 'RESOURCE_CLOSED',
    resourceId: params.resourceId,
    serverTimestamp: params.serverTimestamp,
  };
}

export interface CreateResourceOpenedParams {
  resourceId: ResourceId;
  serverTimestamp: number;
}

export function createResourceOpenedEvent(
  params: CreateResourceOpenedParams
): ResourceOpened {
  return {
    type: 'RESOURCE_OPENED',
    resourceId: params.resourceId,
    serverTimestamp: params.serverTimestamp,
  };
}
