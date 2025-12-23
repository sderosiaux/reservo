/**
 * Domain Events - Export all event types and utilities
 */

export {
  type DomainEvent,
  type ReservationConfirmed,
  type ReservationRejected,
  type ReservationCancelled,
  type ResourceCreated,
  type ResourceClosed,
  type ResourceOpened,
  type RejectionReason,
  isReservationConfirmed,
  isReservationRejected,
  isReservationCancelled,
  isResourceCreated,
  isResourceClosed,
  isResourceOpened,
  // Factory functions
  type CreateReservationConfirmedParams,
  createReservationConfirmedEvent,
  type CreateReservationRejectedParams,
  createReservationRejectedEvent,
  type CreateReservationCancelledParams,
  createReservationCancelledEvent,
  type CreateResourceCreatedParams,
  createResourceCreatedEvent,
  type CreateResourceClosedParams,
  createResourceClosedEvent,
  type CreateResourceOpenedParams,
  createResourceOpenedEvent,
} from './types.js';
