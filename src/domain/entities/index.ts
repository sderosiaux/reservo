/**
 * Domain Entities - Core business objects with identity
 */

export {
  type Resource,
  type ResourceState,
  type CreateResourceParams,
  createResource,
  canAccommodate,
  getRemainingCapacity,
  updateBookings,
  closeResource,
  openResource
} from './Resource.js';

export {
  type Reservation,
  type ReservationStatus,
  type CreateReservationParams,
  createReservation,
  cancelReservation,
  isActive,
  isCancelled
} from './Reservation.js';
