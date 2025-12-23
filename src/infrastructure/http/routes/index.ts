import { FastifyInstance } from 'fastify';
import { resourceRoutes } from './resources.js';
import { reservationRoutes } from './reservations.js';
import { availabilityRoutes } from './availability.js';
import { settingsRoutes } from './settings.js';
import { clientRoutes } from './clients.js';
import { analyticsRoutes } from './analytics.js';
import { metricsRoutes } from './metrics.js';

export async function registerRoutes(server: FastifyInstance) {
  // API v1
  server.register(async (api) => {
    api.register(resourceRoutes, { prefix: '/resources' });
    api.register(reservationRoutes, { prefix: '/reservations' });
    api.register(availabilityRoutes, { prefix: '/availability' });
    api.register(settingsRoutes, { prefix: '/settings' });
    api.register(clientRoutes, { prefix: '/clients' });
    api.register(analyticsRoutes, { prefix: '/analytics' });
  }, { prefix: '/api/v1' });

  // Prometheus metrics endpoint (outside API prefix for standard /metrics path)
  server.register(metricsRoutes, { prefix: '/metrics' });
}
