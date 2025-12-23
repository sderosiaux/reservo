import { FastifyInstance } from 'fastify';
import { createResourceId, createClientId, createQuantity, createReservationId } from '../../../domain/value-objects/index.js';
import { container } from '../../di/container.js';
import { Reservation } from '../../../domain/entities/Reservation.js';
import { ReservationNotFoundError, InvalidStateError } from '../../../domain/errors.js';

const createReservationSchema = {
  body: {
    type: 'object',
    required: ['resourceId', 'clientId', 'quantity'],
    properties: {
      resourceId: { type: 'string', minLength: 1 },
      clientId: { type: 'string', minLength: 1 },
      quantity: { type: 'integer', minimum: 1 }
    }
  }
};

const reservationParamsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  }
};

const listReservationsSchema = {
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'expired', 'rejected'] },
      resourceId: { type: 'string' },
      clientId: { type: 'string' },
      fromTimestamp: { type: 'integer' },
      toTimestamp: { type: 'integer' }
    }
  }
};

export async function reservationRoutes(server: FastifyInstance) {
  // Use singleton services from container
  const { reservationRepo, settingsRepo, commitService, cancellationService } = container;

  // GET /reservations - List all reservations
  server.get('/', { schema: listReservationsSchema }, async (request) => {
    const { limit, offset, status, resourceId, clientId, fromTimestamp, toTimestamp } = request.query as any;

    const result = await reservationRepo.findAll({
      limit: limit ?? 100,
      offset: offset ?? 0,
      status,
      resourceId,
      clientId,
      fromTimestamp,
      toTimestamp,
    });

    return {
      data: result.reservations.map(mapReservationToResponse),
      pagination: {
        limit: limit ?? 100,
        offset: offset ?? 0,
        total: result.total,
        hasMore: (offset ?? 0) + result.reservations.length < result.total,
      },
    };
  });

  // POST /reservations - Commit reservation (THE CRITICAL ENDPOINT)
  server.post('/', { schema: createReservationSchema }, async (request, reply) => {
    // Check maintenance mode
    const maintenanceStatus = await settingsRepo.getMaintenanceStatus();
    if (maintenanceStatus.enabled) {
      request.log.info({ maintenanceMode: true }, 'Reservation rejected: maintenance mode');
      return reply.status(503).send({
        status: 'REJECTED',
        reason: 'MAINTENANCE_MODE',
        message: maintenanceStatus.message || 'Le système est en maintenance. Veuillez réessayer plus tard.',
        serverTimestamp: Date.now(),
      });
    }

    const { resourceId, clientId, quantity } = request.body as {
      resourceId: string;
      clientId: string;
      quantity: number;
    };

    // Wrap value object creation in try-catch to handle validation errors
    let validatedResourceId, validatedClientId, validatedQuantity;
    try {
      validatedResourceId = createResourceId(resourceId);
      validatedClientId = createClientId(clientId);
      validatedQuantity = createQuantity(quantity);
    } catch (validationError) {
      return reply.status(400).send({
        error: 'INVALID_INPUT',
        message: validationError instanceof Error ? validationError.message : 'Invalid input'
      });
    }

    const result = await commitService.commit({
      resourceId: validatedResourceId,
      clientId: validatedClientId,
      quantity: validatedQuantity
    });

    if (result.success) {
      request.log.info({
        event: result.event.type,
        reservationId: result.reservation?.id,
        serverTimestamp: result.serverTimestamp
      }, 'Reservation confirmed');

      return reply.status(201).send({
        status: 'CONFIRMED',
        reservationId: result.reservation?.id,
        serverTimestamp: result.serverTimestamp
      });
    } else {
      request.log.info({
        event: result.event.type,
        reason: (result.event as any).reason,
        serverTimestamp: result.serverTimestamp
      }, 'Reservation rejected');

      return reply.status(409).send({
        status: 'REJECTED',
        reason: (result.event as any).reason,
        serverTimestamp: result.serverTimestamp
      });
    }
    // Let centralized error handler deal with unexpected errors
  });

  // GET /reservations/:id - Get reservation
  server.get('/:id', { schema: reservationParamsSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };

    let validatedId;
    try {
      validatedId = createReservationId(id);
    } catch (validationError) {
      return reply.status(400).send({
        error: 'INVALID_INPUT',
        message: validationError instanceof Error ? validationError.message : 'Invalid reservation ID'
      });
    }

    const reservation = await reservationRepo.findById(validatedId);

    if (!reservation) {
      return reply.status(404).send({ error: 'RESERVATION_NOT_FOUND' });
    }

    return mapReservationToResponse(reservation);
    // Let centralized error handler deal with unexpected errors
  });

  // POST /reservations/:id/cancel - Cancel reservation
  server.post('/:id/cancel', { schema: reservationParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const result = await cancellationService.cancel({
        reservationId: createReservationId(id)
      });

      request.log.info({
        reservationId: id,
        releasedQuantity: result.capacityReleased
      }, 'Reservation cancelled');

      return mapReservationToResponse(result.reservation!);
    } catch (error) {
      if (error instanceof ReservationNotFoundError) {
        return reply.status(404).send({ error: 'RESERVATION_NOT_FOUND' });
      }
      if (error instanceof InvalidStateError) {
        return reply.status(409).send({
          error: 'INVALID_STATE',
          message: 'Reservation cannot be cancelled'
        });
      }
      throw error;
    }
  });
}

function mapReservationToResponse(reservation: Reservation) {
  return {
    id: reservation.id,
    resourceId: reservation.resourceId,
    clientId: reservation.clientId,
    quantity: reservation.quantity,
    status: reservation.status,
    rejectionReason: reservation.rejectionReason,
    serverTimestamp: reservation.serverTimestamp,
    createdAt: reservation.createdAt
  };
}
