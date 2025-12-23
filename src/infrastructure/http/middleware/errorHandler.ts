import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { DomainError, isDomainError } from '../../../domain/errors.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error({ err: error }, 'Request error');

  // Handle domain errors
  if (isDomainError(error)) {
    const statusCode = mapDomainErrorToStatus(error);
    return reply.status(statusCode).send({
      error: error.code,
      message: error.message
    });
  }

  // Handle validation errors
  if ('validation' in error && (error as any).validation) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: (error as any).validation
    });
  }

  // Generic server error (no internal details exposed)
  return reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
}

function mapDomainErrorToStatus(error: DomainError): number {
  switch (error.code) {
    case 'RESOURCE_NOT_FOUND':
    case 'RESERVATION_NOT_FOUND':
      return 404;
    case 'RESOURCE_FULL':
    case 'RESOURCE_CLOSED':
    case 'INVALID_STATE':
      return 409; // Conflict
    case 'INVALID_QUANTITY':
      return 400;
    case 'CONCURRENCY_CONFLICT':
      return 409;
    default:
      return 500;
  }
}
