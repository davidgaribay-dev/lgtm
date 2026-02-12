import pino, { Logger } from 'pino';
import { SENSITIVE_FIELDS } from './log-redactor';

// Determine log level from environment
const LOG_LEVEL =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/app.log';

// Mask email helper
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '[INVALID_EMAIL]';
  return `${local.substring(0, 2)}***@${domain}`;
}

// Base configuration
const baseConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,
  // Redact sensitive fields
  redact: {
    paths: SENSITIVE_FIELDS,
    censor: '[REDACTED]',
  },
  // Add hostname and PID for debugging
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
  },
  // Custom serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    user: (user: any) => ({
      id: user?.id,
      email: user?.email ? maskEmail(user.email) : undefined,
      name: user?.name,
      // Never log sensitive user fields
    }),
  },
  // Format timestamps in ISO 8601
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Create logger based on environment
function createLogger(): Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    // Pretty print for development
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    });
  }

  // Production: JSON to stdout (for serverless/container) OR file
  if (LOG_TO_FILE) {
    // For VPS/dedicated servers with pino-roll
    // Note: pino-roll needs to be installed separately
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-roll',
        options: {
          file: LOG_FILE_PATH,
          frequency: 'daily',
          size: '10m',
          mkdir: true,
          extension: '.json',
        },
      },
    });
  }

  // Default: stdout JSON (works with Docker, K8s, Vercel, etc.)
  return pino(baseConfig);
}

export const logger = createLogger();

// Convenience methods with context
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context);
}

// API route logger with request context
export function createApiLogger(req: Request, correlationId?: string) {
  return logger.child({
    correlationId,
    method: req.method,
    url: new URL(req.url).pathname,
  });
}

// Type-safe log methods
export type LogContext = {
  correlationId?: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  [key: string]: any;
};

export function logInfo(message: string, context?: LogContext) {
  logger.info(context || {}, message);
}

export function logError(
  message: string,
  error?: Error,
  context?: LogContext
) {
  logger.error({ ...context, err: error }, message);
}

export function logWarn(message: string, context?: LogContext) {
  logger.warn(context || {}, message);
}

export function logDebug(message: string, context?: LogContext) {
  logger.debug(context || {}, message);
}
