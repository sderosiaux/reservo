import { FastifyRequest, FastifyReply, FastifyInstance, preHandlerHookHandler } from 'fastify';

/**
 * Authentication middleware for protected routes.
 *
 * Supports two authentication methods:
 * 1. API Key authentication (X-API-Key header) - for service-to-service calls
 * 2. Bearer token authentication - for admin dashboard and clients
 *
 * Configuration:
 * - API_KEY: Environment variable for API key authentication
 * - JWT_SECRET: Environment variable for JWT token verification (future implementation)
 */

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    role: 'admin' | 'client' | 'service';
  };
}

// API key from environment (for service-to-service authentication)
const API_KEY = process.env.API_KEY;

// Admin key for admin routes (separate from regular API key)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * API Key authentication middleware.
 * Validates the X-API-Key header against the configured API_KEY.
 */
export const apiKeyAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  // Skip auth in development if no API_KEY is configured
  if (!API_KEY && process.env.NODE_ENV === 'development') {
    (request as AuthenticatedRequest).user = {
      id: 'dev-user',
      role: 'admin',
    };
    return;
  }

  if (!API_KEY) {
    request.log.warn('API_KEY not configured but authentication required');
    return reply.status(500).send({
      error: 'AUTH_NOT_CONFIGURED',
      message: 'Authentication is not properly configured',
    });
  }

  if (!apiKey) {
    return reply.status(401).send({
      error: 'MISSING_API_KEY',
      message: 'X-API-Key header is required',
    });
  }

  if (apiKey !== API_KEY) {
    request.log.warn({ providedKeyPrefix: apiKey.substring(0, 8) }, 'Invalid API key attempt');
    return reply.status(403).send({
      error: 'INVALID_API_KEY',
      message: 'Invalid API key',
    });
  }

  (request as AuthenticatedRequest).user = {
    id: 'api-client',
    role: 'service',
  };
};

/**
 * Admin-only authentication middleware.
 * Requires ADMIN_API_KEY for access to admin routes.
 */
export const adminAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  // Skip auth in development if no ADMIN_API_KEY is configured
  if (!ADMIN_API_KEY && process.env.NODE_ENV === 'development') {
    (request as AuthenticatedRequest).user = {
      id: 'dev-admin',
      role: 'admin',
    };
    return;
  }

  if (!ADMIN_API_KEY) {
    request.log.warn('ADMIN_API_KEY not configured but admin authentication required');
    return reply.status(500).send({
      error: 'AUTH_NOT_CONFIGURED',
      message: 'Admin authentication is not properly configured',
    });
  }

  if (!apiKey) {
    return reply.status(401).send({
      error: 'MISSING_API_KEY',
      message: 'X-API-Key header is required for admin access',
    });
  }

  if (apiKey !== ADMIN_API_KEY) {
    request.log.warn({ providedKeyPrefix: apiKey.substring(0, 8) }, 'Invalid admin API key attempt');
    return reply.status(403).send({
      error: 'INVALID_API_KEY',
      message: 'Invalid admin API key',
    });
  }

  (request as AuthenticatedRequest).user = {
    id: 'admin',
    role: 'admin',
  };
};

/**
 * Optional authentication middleware.
 * Attempts to authenticate but doesn't reject if no credentials provided.
 */
export const optionalAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply
) => {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    // No auth provided, continue as anonymous
    return;
  }

  // Check against admin key first
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    (request as AuthenticatedRequest).user = {
      id: 'admin',
      role: 'admin',
    };
    return;
  }

  // Check against regular API key
  if (API_KEY && apiKey === API_KEY) {
    (request as AuthenticatedRequest).user = {
      id: 'api-client',
      role: 'service',
    };
    return;
  }

  // Invalid key provided, but since it's optional, continue as anonymous
  request.log.debug('Invalid API key provided for optional auth, continuing as anonymous');
};

/**
 * Register authentication decorators and hooks on a Fastify instance.
 */
export function registerAuthMiddleware(server: FastifyInstance): void {
  // Decorate request with user property (use undefined as default for optional property)
  server.decorateRequest('user', undefined);

  // Add authentication hooks as decorators for use in routes
  server.decorate('apiKeyAuth', apiKeyAuth);
  server.decorate('adminAuth', adminAuth);
  server.decorate('optionalAuth', optionalAuth);
}

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    apiKeyAuth: preHandlerHookHandler;
    adminAuth: preHandlerHookHandler;
    optionalAuth: preHandlerHookHandler;
  }
  interface FastifyRequest {
    user?: {
      id: string;
      role: 'admin' | 'client' | 'service';
    };
  }
}
