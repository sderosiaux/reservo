import { Database } from '../../infrastructure/persistence/db.js';
import { ResourceRepository, ReservationRepository } from '../../infrastructure/persistence/repositories/index.js';
import { updateBookings } from '../../domain/entities/Resource.js';
import { Reservation, cancelReservation, isActive } from '../../domain/entities/Reservation.js';
import { ReservationId } from '../../domain/value-objects/index.js';
import {
  ReservationNotFoundError,
  InvalidStateError
} from '../../domain/errors.js';
import {
  DomainEvent,
  createReservationCancelledEvent
} from '../../domain/events/index.js';
import { AvailabilityViewService } from './AvailabilityViewService.js';

export interface CancellationRequest {
  reservationId: ReservationId;
}

export interface CancellationResult {
  success: boolean;
  reservation?: Reservation;
  event: DomainEvent;
  serverTimestamp: number;
  capacityReleased: number;
}

export class ReservationCancellationService {
  constructor(
    private db: Database,
    private resourceRepo: ResourceRepository,
    private reservationRepo: ReservationRepository,
    private availabilityService?: AvailabilityViewService
  ) {}

  /**
   * Atomic cancellation.
   *
   * CRITICAL FLOW:
   * 1. Begin transaction
   * 2. Find reservation
   * 3. Lock resource FOR UPDATE
   * 4. Cancel reservation
   * 5. Decrement resource currentBookings
   * 6. Persist both
   * 7. Commit
   *
   * Guarantees:
   * - Capacity is correctly released
   * - No double cancellation
   * - Atomic operation
   */
  async cancel(request: CancellationRequest): Promise<CancellationResult> {
    const serverTimestamp = Date.now();

    return await this.db.transaction(async (tx) => {
      // 1. Find reservation WITH LOCK (need to get resourceId)
      // CRITICAL: Use findByIdForUpdate to prevent TOCTOU race condition
      // This ensures the reservation state is locked during our check
      const reservation = await this.reservationRepo.findByIdForUpdate(request.reservationId, tx);

      if (!reservation) {
        throw new ReservationNotFoundError(request.reservationId as string);
      }

      // 2. Check if already cancelled
      if (!isActive(reservation)) {
        throw new InvalidStateError('Reservation is already cancelled');
      }

      // 3. Lock the resource
      const resource = await this.resourceRepo.findByIdForUpdate(reservation.resourceId, tx);

      if (!resource) {
        throw new Error('Resource not found - data integrity issue');
      }

      // 4. Cancel reservation
      const cancelledReservation = cancelReservation(reservation);

      // 5. Decrement bookings
      const newBookings = Math.max(0, resource.currentBookings - reservation.quantity);
      const updatedResource = updateBookings(resource, newBookings);

      // 6. Persist
      await this.reservationRepo.save(cancelledReservation, tx);
      await this.resourceRepo.updateWithOptimisticLock(updatedResource, tx);

      // 7. Build result
      const result = {
        success: true,
        reservation: cancelledReservation,
        event: createReservationCancelledEvent({
          reservationId: reservation.id,
          resourceId: reservation.resourceId,
          clientId: reservation.clientId,
          quantity: reservation.quantity,
          serverTimestamp
        }),
        serverTimestamp,
        capacityReleased: reservation.quantity
      };

      // 8. Invalidate availability cache after successful cancellation
      this.availabilityService?.invalidate(reservation.resourceId);

      return result;
    });
  }
}

export function createReservationCancellationService(
  db: Database,
  resourceRepo: ResourceRepository,
  reservationRepo: ReservationRepository,
  availabilityService?: AvailabilityViewService
): ReservationCancellationService {
  return new ReservationCancellationService(db, resourceRepo, reservationRepo, availabilityService);
}
