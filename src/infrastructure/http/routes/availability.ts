import { FastifyInstance } from 'fastify';
import { createResourceId } from '../../../domain/value-objects/index.js';
import { AvailabilityView } from '../../../application/services/index.js';
import { container } from '../../di/container.js';
import { ResourceNotFoundError } from '../../../domain/errors.js';

// Cache control configuration for availability endpoints
// These are eventually-consistent views, so short cache is appropriate
const CACHE_TTL_SECONDS = 5; // Match the AvailabilityViewService cache TTL
const CACHE_CONTROL_HEADER = `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`;

const availabilityParamsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  }
};

const multipleAvailabilitySchema = {
  querystring: {
    type: 'object',
    properties: {
      ids: { type: 'string' } // Comma-separated resource IDs
    }
  }
};

export async function availabilityRoutes(server: FastifyInstance) {
  // Use singleton service from container (critical for shared cache)
  const availabilityService = container.availabilityService;

  // GET /availability/:id - Get availability for a single resource
  server.get('/:id', { schema: availabilityParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const availability = await availabilityService.getAvailability(createResourceId(id));

      request.log.info({
        resourceId: id,
        isCached: availability.isCached,
        remainingCapacity: availability.remainingCapacity
      }, 'Availability view fetched');

      // Add cache headers for CDN/browser caching
      reply.header('Cache-Control', CACHE_CONTROL_HEADER);
      reply.header('ETag', `"${availability.resourceId}-${availability.cachedAt}"`);

      return mapAvailabilityToResponse(availability);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return reply.status(404).send({
          error: 'RESOURCE_NOT_FOUND',
          message: `Resource ${id} not found`
        });
      }
      throw error;
    }
  });

  // GET /availability - Get availability for multiple resources
  server.get('/', { schema: multipleAvailabilitySchema }, async (request, reply) => {
    const { ids } = request.query as any;

    if (!ids) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Query parameter "ids" is required (comma-separated resource IDs)'
      });
    }

    const resourceIds = ids.split(',').map((id: string) => createResourceId(id.trim()));
    const availabilities = await availabilityService.getMultipleAvailability(resourceIds);

    request.log.info({
      requestedCount: resourceIds.length,
      foundCount: availabilities.length
    }, 'Multiple availability views fetched');

    // Add cache headers for CDN/browser caching
    reply.header('Cache-Control', CACHE_CONTROL_HEADER);

    return {
      resources: availabilities.map(mapAvailabilityToResponse),
      count: availabilities.length
    };
  });

  // DELETE /availability/cache/:id - Invalidate cache for a resource (admin/internal use)
  server.delete('/cache/:id', { schema: availabilityParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;

    availabilityService.invalidate(createResourceId(id));

    request.log.info({ resourceId: id }, 'Cache invalidated for resource');

    return reply.status(204).send();
  });

  // DELETE /availability/cache - Invalidate entire cache (admin/internal use)
  server.delete('/cache', async (request, reply) => {
    availabilityService.invalidateAll();

    request.log.info('All availability cache invalidated');

    return reply.status(204).send();
  });

  // GET /availability/cache/stats - Get cache statistics (admin/monitoring)
  server.get('/cache/stats', async () => {
    const stats = availabilityService.getCacheStats();

    return {
      cacheSize: stats.size,
      maxCacheSize: stats.maxSize,
      ttlMs: stats.ttlMs,
      utilizationPercent: Math.round((stats.size / stats.maxSize) * 100)
    };
  });
}

function mapAvailabilityToResponse(availability: AvailabilityView) {
  return {
    resourceId: availability.resourceId,
    type: availability.type,
    state: availability.state,
    capacity: availability.capacity,
    currentBookings: availability.currentBookings,
    remainingCapacity: availability.remainingCapacity,
    isAvailable: availability.isAvailable,
    cachedAt: availability.cachedAt,
    isCached: availability.isCached
  };
}
