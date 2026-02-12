'use client';

import {
  useLogBufferStore,
  LogLevel,
  ClientLogEntry,
} from './stores/log-buffer-store';
import { redactSensitiveData } from './log-redactor';

// Configuration
const BATCH_SIZE = 10; // Send when buffer reaches this size
const BATCH_INTERVAL = 5000; // Send every 5 seconds
const MAX_BUFFER_SIZE = 100; // Drop old logs if buffer exceeds this

class ClientLogger {
  private flushTimer: NodeJS.Timeout | null = null;
  private correlationId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startBatchInterval();
      this.setupBeforeUnload();
      this.correlationId = crypto.randomUUID();
    }
  }

  private startBatchInterval() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, BATCH_INTERVAL);
  }

  private setupBeforeUnload() {
    // Send remaining logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  private shouldFlush(): boolean {
    return useLogBufferStore.getState().size() >= BATCH_SIZE;
  }

  private async flush(useBeacon = false) {
    const store = useLogBufferStore.getState();
    const logs = store.getAll();

    if (logs.length === 0) return;

    // Redact sensitive data before sending
    const sanitizedLogs = logs.map((log) => ({
      ...log,
      context: log.context ? redactSensitiveData(log.context) : undefined,
      message:
        typeof log.message === 'string'
          ? this.sanitizeMessage(log.message)
          : log.message,
    }));

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use beacon for reliable delivery during page unload
        const blob = new Blob([JSON.stringify({ logs: sanitizedLogs })], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/logs', blob);
      } else {
        // Regular fetch
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs: sanitizedLogs }),
        });
      }

      // Clear buffer after successful send
      store.clear();
    } catch (error) {
      // Failed to send logs - keep in buffer but enforce max size
      if (store.size() > MAX_BUFFER_SIZE) {
        const excess = store.size() - MAX_BUFFER_SIZE;
        const remainingLogs = logs.slice(excess);
        store.clear();
        remainingLogs.forEach((log) => store.add(log));
      }

      console.error('Failed to send logs to server:', error);
    }
  }

  private sanitizeMessage(message: string): string {
    let sanitized = message;
    const patterns = [
      { pattern: /password[=:]\s*\S+/gi, replace: 'password=[REDACTED]' },
      { pattern: /token[=:]\s*\S+/gi, replace: 'token=[REDACTED]' },
      { pattern: /api[_-]?key[=:]\s*\S+/gi, replace: 'apiKey=[REDACTED]' },
    ];

    patterns.forEach(({ pattern, replace }) => {
      sanitized = sanitized.replace(pattern, replace);
    });

    return sanitized;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ) {
    const store = useLogBufferStore.getState();

    store.add({
      level,
      message,
      context,
      correlationId: this.correlationId || undefined,
    });

    // Auto-flush if batch size reached
    if (this.shouldFlush()) {
      this.flush();
    }
  }

  public debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  public error(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ) {
    this.log('error', message, {
      ...context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  public setCorrelationId(id: string) {
    this.correlationId = id;
  }

  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}

// Singleton instance
export const clientLogger =
  typeof window !== 'undefined' ? new ClientLogger() : null;

// Convenience exports
export function logClientInfo(message: string, context?: Record<string, any>) {
  clientLogger?.info(message, context);
}

export function logClientError(
  message: string,
  error?: Error,
  context?: Record<string, any>
) {
  clientLogger?.error(message, error, context);
}

export function logClientWarn(message: string, context?: Record<string, any>) {
  clientLogger?.warn(message, context);
}

export function logClientDebug(
  message: string,
  context?: Record<string, any>
) {
  clientLogger?.debug(message, context);
}
