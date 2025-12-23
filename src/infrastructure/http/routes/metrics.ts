import { FastifyInstance } from 'fastify';
import { container } from '../../di/container.js';
import { getPoolStats } from '../../persistence/db.js';

/**
 * Prometheus-compatible metrics endpoint
 *
 * Nice to Have: Exposes application metrics for monitoring
 *
 * Metrics exposed:
 * - reservo_cache_hits_total: Total cache hits
 * - reservo_cache_misses_total: Total cache misses
 * - reservo_cache_hit_rate: Cache hit rate percentage
 * - reservo_cache_size: Current cache size
 * - reservo_db_pool_max: Maximum database connections
 * - reservo_db_pool_connected: Database connection status
 */
export async function metricsRoutes(server: FastifyInstance) {
  server.get('/', async (_request, reply) => {
    const cacheStats = container.availabilityService.getCacheStats();
    const poolStats = getPoolStats();

    // Prometheus text format
    const metrics = [
      '# HELP reservo_cache_hits_total Total number of cache hits',
      '# TYPE reservo_cache_hits_total counter',
      `reservo_cache_hits_total ${cacheStats.hits}`,
      '',
      '# HELP reservo_cache_misses_total Total number of cache misses',
      '# TYPE reservo_cache_misses_total counter',
      `reservo_cache_misses_total ${cacheStats.misses}`,
      '',
      '# HELP reservo_cache_hit_rate Current cache hit rate percentage',
      '# TYPE reservo_cache_hit_rate gauge',
      `reservo_cache_hit_rate ${cacheStats.hitRate}`,
      '',
      '# HELP reservo_cache_size Current number of cached entries',
      '# TYPE reservo_cache_size gauge',
      `reservo_cache_size ${cacheStats.size}`,
      '',
      '# HELP reservo_cache_max_size Maximum cache size',
      '# TYPE reservo_cache_max_size gauge',
      `reservo_cache_max_size ${cacheStats.maxSize}`,
      '',
      '# HELP reservo_cache_ttl_ms Cache TTL in milliseconds',
      '# TYPE reservo_cache_ttl_ms gauge',
      `reservo_cache_ttl_ms ${cacheStats.ttlMs}`,
      '',
      '# HELP reservo_db_pool_max Maximum database pool connections',
      '# TYPE reservo_db_pool_max gauge',
      `reservo_db_pool_max ${poolStats.maxConnections}`,
      '',
      '# HELP reservo_db_pool_connected Database connection status (1=connected, 0=disconnected)',
      '# TYPE reservo_db_pool_connected gauge',
      `reservo_db_pool_connected ${poolStats.isConnected ? 1 : 0}`,
      '',
      '# HELP reservo_db_pool_idle_timeout_seconds Database pool idle timeout',
      '# TYPE reservo_db_pool_idle_timeout_seconds gauge',
      `reservo_db_pool_idle_timeout_seconds ${poolStats.idleTimeout}`,
      '',
      '# HELP reservo_info Application information',
      '# TYPE reservo_info gauge',
      `reservo_info{version="1.0.0",node_env="${process.env.NODE_ENV || 'development'}"} 1`,
      '',
    ].join('\n');

    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return metrics;
  });
}
