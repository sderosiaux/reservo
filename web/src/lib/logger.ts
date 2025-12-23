/**
 * Logger utility for frontend
 * Replaces console.* with structured logging
 * In production, these could be sent to a monitoring service
 */

interface LogContext {
  [key: string]: unknown;
}

function formatMessage(level: string, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  if (process.env.NODE_ENV === 'development') {
    switch (level) {
      case 'error':
        console.error(`[${timestamp}] ERROR: ${message}`, context);
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN: ${message}`, context);
        break;
      case 'info':
        console.info(`[${timestamp}] INFO: ${message}`, context);
        break;
      case 'debug':
        console.debug(`[${timestamp}] DEBUG: ${message}`, context);
        break;
    }
  } else {
    // In production, send to monitoring service (Sentry, DataDog, etc.)
    // For now, suppress console output
    // TODO: Integrate with monitoring service
    // sendToMonitoringService(logEntry);
  }
}

export const logger = {
  error: (message: string, context?: LogContext) => {
    formatMessage('error', message, context);
    // In production, you'd also report to Sentry/DataDog here
  },

  warn: (message: string, context?: LogContext) => {
    formatMessage('warn', message, context);
  },

  info: (message: string, context?: LogContext) => {
    formatMessage('info', message, context);
  },

  debug: (message: string, context?: LogContext) => {
    formatMessage('debug', message, context);
  },
};
