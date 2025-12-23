/**
 * ReservationCommitService - THE CRITICAL COMPONENT
 *
 * This service implements the atomic commit logic that ensures NO OVERBOOKING.
 * Every reservation request goes through this single point of control.
 *
 * GUARANTEES:
 * - Single winner for the last slot (row-level locking)
 * - No overbooking EVER (capacity check inside transaction)
 * - Server timestamp is authoritative (never trust client time)
 * - Deterministic ordering within same millisecond (database enforced)
 * - All or nothing (transactional consistency)
 */

import { Database } from '../../infrastructure/persistence/db.js';
import { ResourceRepository } from '../../infrastructure/persistence/repositories/ResourceRepository.js';
import { ReservationRepository } from '../../infrastructure/persistence/repositories/ReservationRepository.js';
import { updateBookings } from '../../domain/entities/Resource.js';
import { Reservation, createReservation } from '../../domain/entities/Reservation.js';
import { Quantity, ResourceId, ClientId, generateReservationId } from '../../domain/value-objects/index.js';
import { ResourceNotFoundError } from '../../domain/errors.js';
import {
  DomainEvent,
  createReservationConfirmedEvent,
  createReservationRejectedEvent,
  RejectionReason
} from '../../domain/events/index.js';
import { AvailabilityViewService } from './AvailabilityViewService.js';

export interface CommitRequest {
  resourceId: ResourceId;
  clientId: ClientId;
  quantity: Quantity;
}

export interface CommitResult {
  success: boolean;
  reservation?: Reservation;
  event: DomainEvent;
  serverTimestamp: number;
}

export class ReservationCommitService {
  constructor(
    private db: Database,
    private resourceRepo: ResourceRepository,
    private reservationRepo: ReservationRepository,
    private availabilityService?: AvailabilityViewService
  ) {}

  /**
   * Atomic reservation commit.
   *
   * CRITICAL FLOW:
   * 1. Begin transaction
   * 2. SELECT resource FOR UPDATE (row lock) - THIS IS THE KEY
   * 3. Check resource state (OPEN?)
   * 4. Check remaining capacity
   * 5. If OK: INSERT reservation + UPDATE resource
   * 6. Commit transaction
   * 7. Return result with event
   *
   * The FOR UPDATE lock ensures that concurrent requests for the same resource
   * are SERIALIZED. Only one transaction can proceed at a time.
   *
   * All others WAIT at step 2 until the lock is released.
   *
   * Guarantees:
   * - Single winner for last slot
   * - No overbooking EVER
   * - Server timestamp is authoritative
   * - Deterministic ordering within same millisecond
   */
  async commit(request: CommitRequest): Promise<CommitResult> {
    const serverTimestamp = Date.now();

    // Transaction with row-level lock
    return await this.db.transaction(async (tx) => {
      // 1. CRITICAL: Lock the resource row
      //    This prevents ALL concurrent modifications until we commit/rollback
      const resource = await this.resourceRepo.findByIdForUpdate(request.resourceId, tx);

      if (!resource) {
        throw new ResourceNotFoundError(request.resourceId);
      }

      // 2. Counter validation: verify currentBookings matches actual confirmed reservations
      //    This detects drift from transaction failures or bugs
      const actualBookedQuantity = await this.reservationRepo.sumActiveQuantityByResourceId(
        request.resourceId,
        tx
      );

      if (resource.currentBookings !== actualBookedQuantity) {
        // Log warning for monitoring/alerting - counter has drifted!
        console.warn(
          `[COUNTER_DRIFT] Resource ${request.resourceId}: ` +
          `counter=${resource.currentBookings}, actual=${actualBookedQuantity}`
        );
        // Use actual value for capacity check to prevent overbooking
      }

      // Use the safer value (higher of counter or actual) for capacity check
      const effectiveBookings = Math.max(resource.currentBookings, actualBookedQuantity);

      // 3. Check state - must be OPEN
      if (resource.state !== 'OPEN') {
        return await this.reject(request, 'RESOURCE_CLOSED', serverTimestamp, tx);
      }

      // 4. Check capacity using effective bookings (prevents overbooking even with drift)
      const remainingCapacity = resource.capacity - effectiveBookings;
      if ((request.quantity as number) > remainingCapacity) {
        return await this.reject(request, 'RESOURCE_FULL', serverTimestamp, tx);
      }

      // 5. Create reservation - server timestamp is authoritative
      const reservation = createReservation({
        id: generateReservationId(),
        resourceId: request.resourceId,
        clientId: request.clientId,
        quantity: request.quantity as number, // Quantity is a branded number
        status: 'CONFIRMED',
        serverTimestamp,
        createdAt: serverTimestamp
      });

      // 6. Update resource bookings - increment the counter
      const updatedResource = updateBookings(
        resource,
        resource.currentBookings + (request.quantity as number)
      );

      // 7. Persist BOTH changes atomically (within transaction)
      //    If either fails, the entire transaction rolls back
      await this.reservationRepo.save(reservation, tx);
      await this.resourceRepo.updateWithOptimisticLock(updatedResource, tx);

      // 8. Transaction commits automatically when this function returns
      //    The lock is released and the next waiting request can proceed
      const result = {
        success: true,
        reservation,
        event: createReservationConfirmedEvent({
          reservationId: reservation.id,
          resourceId: request.resourceId,
          clientId: request.clientId,
          quantity: request.quantity as number,
          serverTimestamp
        }),
        serverTimestamp
      };

      // 9. Invalidate availability cache after successful commit
      // This ensures the next read fetches fresh data
      this.availabilityService?.invalidate(request.resourceId);

      return result;
    });
  }

  /**
   * Create a rejection result and persist the rejected reservation.
   *
   * This is NOT an error - it's a valid business outcome.
   * The system is working correctly by rejecting invalid requests.
   *
   * We now save rejected requests to maintain a complete history
   * of all reservation attempts (successful and failed).
   */
  private async reject(
    request: CommitRequest,
    reason: RejectionReason,
    serverTimestamp: number,
    tx?: any
  ): Promise<CommitResult> {
    // Create a rejected reservation record for history tracking
    const rejectedReservation = createReservation({
      id: generateReservationId(),
      resourceId: request.resourceId,
      clientId: request.clientId,
      quantity: request.quantity as number,
      status: 'REJECTED',
      rejectionReason: reason,
      serverTimestamp,
      createdAt: serverTimestamp
    });

    // Save the rejected reservation to maintain complete history
    await this.reservationRepo.save(rejectedReservation, tx);

    return {
      success: false,
      reservation: rejectedReservation,
      event: createReservationRejectedEvent({
        resourceId: request.resourceId,
        clientId: request.clientId,
        quantity: request.quantity as number,
        reason,
        serverTimestamp
      }),
      serverTimestamp
    };
  }
}

/**
 * Factory function to create ReservationCommitService
 */
export function createReservationCommitService(
  db: Database,
  resourceRepo: ResourceRepository,
  reservationRepo: ReservationRepository,
  availabilityService?: AvailabilityViewService
): ReservationCommitService {
  return new ReservationCommitService(db, resourceRepo, reservationRepo, availabilityService);
}
