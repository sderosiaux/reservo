import { FastifyInstance } from 'fastify';
import { SettingsRepository } from '../../persistence/repositories/index.js';

const updateMaintenanceSchema = {
  body: {
    type: 'object',
    required: ['enabled'],
    properties: {
      enabled: { type: 'boolean' },
      message: { type: 'string' },
    },
  },
};

export async function settingsRoutes(server: FastifyInstance) {
  const settingsRepo = new SettingsRepository();

  // GET /settings/maintenance - Get maintenance status (admin)
  server.get('/maintenance', async (_request, reply) => {
    const status = await settingsRepo.getMaintenanceStatus();
    return reply.send(status);
  });

  // PUT /settings/maintenance - Update maintenance mode (admin)
  server.put('/maintenance', { schema: updateMaintenanceSchema }, async (request, reply) => {
    const { enabled, message } = request.body as { enabled: boolean; message?: string };

    const status = await settingsRepo.setMaintenanceMode(enabled, message);

    request.log.info(
      { maintenanceMode: enabled, message },
      enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
    );

    return reply.send(status);
  });

  // GET /settings/status - Public endpoint for checking system status
  server.get('/status', async (_request, reply) => {
    const maintenance = await settingsRepo.getMaintenanceStatus();

    return reply.send({
      operational: !maintenance.enabled,
      maintenance: {
        enabled: maintenance.enabled,
        message: maintenance.message,
      },
    });
  });
}
