import { FastifyInstance } from 'fastify';
import { createResourceId } from '../../../domain/value-objects/index.js';
import { createResource, closeResource, openResource, Resource } from '../../../domain/entities/Resource.js';
import { ResourceRepository } from '../../persistence/repositories/index.js';
import { AvailabilityViewService } from '../../../application/services/index.js';

// JSON Schemas for validation
const createResourceSchema = {
  body: {
    type: 'object',
    required: ['id', 'type', 'capacity'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 100 },
      type: { type: 'string', minLength: 1 },
      capacity: { type: 'integer', minimum: 1 }
    }
  }
};

const resourceParamsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  }
};

const listResourcesSchema = {
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 100 },
      offset: { type: 'integer', minimum: 0, default: 0 },
      state: { type: 'string', enum: ['OPEN', 'CLOSED'] },
      type: { type: 'string' }
    }
  }
};

export async function resourceRoutes(server: FastifyInstance) {
  const resourceRepo = new ResourceRepository();
  const availabilityService = new AvailabilityViewService(resourceRepo, {
    cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '5000'),
    maxCacheSize: parseInt(process.env.CACHE_MAX_SIZE || '10000')
  });

  // GET /resources - List all resources
  server.get('/', { schema: listResourcesSchema }, async (request) => {
    const { limit, offset, state, type } = request.query as any;

    const result = await resourceRepo.findAll({
      limit: limit ?? 100,
      offset: offset ?? 0,
      state,
      type,
    });

    return {
      data: result.resources.map(mapResourceToResponse),
      pagination: {
        limit: limit ?? 100,
        offset: offset ?? 0,
        total: result.total,
        hasMore: (offset ?? 0) + result.resources.length < result.total,
      },
    };
  });

  // POST /resources - Create resource
  server.post('/', { schema: createResourceSchema }, async (request, reply) => {
    const { id, type, capacity } = request.body as any;

    // Check if resource already exists
    const existingResource = await resourceRepo.findById(createResourceId(id));
    if (existingResource) {
      return reply.status(409).send({
        error: 'RESOURCE_ALREADY_EXISTS',
        message: `Resource with id '${id}' already exists`
      });
    }

    const resource = createResource({
      id: createResourceId(id),
      type,
      capacity
    });

    const saved = await resourceRepo.save(resource);

    reply.status(201).send(mapResourceToResponse(saved));
  });

  // GET /resources/:id - Get resource
  server.get('/:id', { schema: resourceParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;
    const resource = await resourceRepo.findById(createResourceId(id));

    if (!resource) {
      return reply.status(404).send({ error: 'RESOURCE_NOT_FOUND' });
    }

    return mapResourceToResponse(resource);
  });

  // POST /resources/:id/close - Close resource
  server.post('/:id/close', { schema: resourceParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;
    const resource = await resourceRepo.findById(createResourceId(id));

    if (!resource) {
      return reply.status(404).send({ error: 'RESOURCE_NOT_FOUND' });
    }

    const closedResource = closeResource(resource);
    await resourceRepo.save(closedResource);

    return mapResourceToResponse(closedResource);
  });

  // POST /resources/:id/open - Open resource
  server.post('/:id/open', { schema: resourceParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;
    const resource = await resourceRepo.findById(createResourceId(id));

    if (!resource) {
      return reply.status(404).send({ error: 'RESOURCE_NOT_FOUND' });
    }

    const openedResource = openResource(resource);
    await resourceRepo.save(openedResource);

    return mapResourceToResponse(openedResource);
  });

  // GET /resources/:id/availability - Get availability for a resource
  server.get('/:id/availability', { schema: resourceParamsSchema }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const availability = await availabilityService.getAvailability(createResourceId(id));

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
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundError') {
        return reply.status(404).send({
          error: 'RESOURCE_NOT_FOUND',
          message: `Resource ${id} not found`
        });
      }
      throw error;
    }
  });
}

function mapResourceToResponse(resource: Resource) {
  return {
    id: resource.id,
    type: resource.type,
    capacity: resource.capacity,
    currentBookings: resource.currentBookings,
    remainingCapacity: resource.capacity - resource.currentBookings,
    state: resource.state,
    version: resource.version
  };
}
