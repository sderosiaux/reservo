import { createServer } from './infrastructure/http/server.js';
import { closeDb } from './infrastructure/persistence/db.js';

let isShuttingDown = false;

async function main() {
  const server = await createServer();

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      server.log.warn(`${signal} received during shutdown, forcing exit`);
      process.exit(1);
    }

    isShuttingDown = true;
    server.log.info(`${signal} received, starting graceful shutdown...`);

    try {
      // 1. Stop accepting new connections
      await server.close();
      server.log.info('HTTP server closed');

      // 2. Close database connections (with timeout)
      await closeDb({ timeout: 5000 });
      server.log.info('Database connections closed');

      server.log.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      server.log.error(err, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    server.log.error({ reason, promise }, 'Unhandled Promise Rejection');
    // Don't exit - log and continue (let the service stay up)
    // In production, this should trigger alerting
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    server.log.fatal(error, 'Uncaught Exception - shutting down');
    // Uncaught exceptions are fatal - we must exit
    gracefulShutdown('uncaughtException');
  });

  try {
    await server.listen({ port, host });
    server.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
