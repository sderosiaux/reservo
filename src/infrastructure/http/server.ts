import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import { registerRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerAuthMiddleware } from './middleware/auth.js';
import { getDb, getPoolStats } from '../persistence/db.js';
import { sql } from 'drizzle-orm';

// CORS whitelist for production
const CORS_WHITELIST = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [];

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: process.env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty'
          },
          level: process.env.LOG_LEVEL || 'info'
        }
      : {
          level: process.env.LOG_LEVEL || 'info'
        },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId'
  });

  // Enable HTTP compression (Priority 2: Performance)
  await server.register(compress, {
    global: true,
    encodings: ['gzip', 'deflate'],
  });

  // Enable CORS with proper production configuration (Priority 2: Security)
  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? CORS_WHITELIST.length > 0 ? CORS_WHITELIST : false
      : true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
    credentials: true,
  });

  // Add request ID to response headers for correlation
  server.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Register authentication middleware
  registerAuthMiddleware(server);

  // Register error handler
  server.setErrorHandler(errorHandler);

  // Register routes
  await registerRoutes(server);

  // Health check - basic liveness
  server.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // Readiness check - verifies database connectivity (Priority 2: Fix health check)
  server.get('/ready', async (request, reply) => {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      return { status: 'ready', timestamp: Date.now() };
    } catch (error) {
      request.log.error({ error }, 'Readiness check failed: database unavailable');
      return reply.status(503).send({
        status: 'not_ready',
        error: 'database_unavailable',
        timestamp: Date.now()
      });
    }
  });

  // Connection pool monitoring endpoint (Priority 3: Nice to have)
  server.get('/metrics/pool', async () => {
    const poolStats = getPoolStats();
    return {
      pool: poolStats,
      timestamp: Date.now(),
    };
  });

  return server;
}
