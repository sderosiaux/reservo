import { FastifyInstance } from 'fastify';
import { container } from '../../di/container.js';

export async function analyticsRoutes(server: FastifyInstance) {
  // Use singleton repositories from container
  const { reservationRepo, resourceRepo } = container;

  // GET /analytics - Get dashboard analytics
  server.get('/', async () => {
    const [analytics, resourcesResult] = await Promise.all([
      reservationRepo.getAnalytics(),
      resourceRepo.findAll(),
    ]);

    // FIX: Use Map for O(1) lookup instead of O(n) .find() - fixes N+1 performance issue
    const utilizationMap = new Map(
      analytics.resourceUtilization.map(r => [r.resourceId, r])
    );

    // Calculate resource usage percentages
    const resourceUsage = resourcesResult.resources.map((resource) => {
      const utilization = utilizationMap.get(resource.id); // O(1) lookup
      return {
        name: resource.id,
        type: resource.type,
        capacity: resource.capacity,
        currentBookings: resource.currentBookings,
        usage: resource.capacity > 0
          ? Math.round((resource.currentBookings / resource.capacity) * 100)
          : 0,
        reservationCount: utilization?.reservationCount ?? 0,
      };
    });

    // Sort by usage descending
    resourceUsage.sort((a, b) => b.usage - a.usage);

    return {
      metrics: {
        totalReservations: analytics.totalReservations,
        confirmedReservations: analytics.confirmedReservations,
        cancelledReservations: analytics.cancelledReservations,
        rejectedReservations: analytics.rejectedReservations,
        totalQuantity: analytics.totalQuantity,
        uniqueClients: analytics.uniqueClients,
        totalResources: resourcesResult.total,
        utilizationRate: calculateAverageUtilization(resourceUsage),
      },
      resourceUsage: resourceUsage.slice(0, 10), // Top 10 resources
    };
  });
}

function calculateAverageUtilization(
  resources: Array<{ usage: number }>
): number {
  if (resources.length === 0) return 0;
  const sum = resources.reduce((acc, r) => acc + r.usage, 0);
  return Math.round(sum / resources.length);
}
