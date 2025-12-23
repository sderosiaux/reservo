import { FastifyInstance } from 'fastify';
import { ReservationRepository } from '../../persistence/repositories/index.js';

export async function clientRoutes(server: FastifyInstance) {
  const reservationRepo = new ReservationRepository();

  // GET /clients - List all clients with their reservation stats
  server.get('/', async () => {
    const clients = await reservationRepo.getClientAggregates();

    return {
      data: clients.map((client) => ({
        id: client.clientId,
        email: client.clientId, // clientId is often an email
        totalReservations: client.totalReservations,
        activeReservations: client.confirmedReservations,
        cancelledReservations: client.cancelledReservations,
        totalQuantity: client.totalQuantity,
        lastActivity: client.lastReservationAt,
        status: isClientActive(client.lastReservationAt) ? 'active' : 'inactive',
      })),
      total: clients.length,
    };
  });
}

function isClientActive(lastReservationAt: number): boolean {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return lastReservationAt > sevenDaysAgo;
}
