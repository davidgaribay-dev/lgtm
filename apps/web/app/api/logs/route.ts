import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { redactSensitiveData } from '@/lib/log-redactor';

const MAX_LOGS_PER_REQUEST = 50;
const MAX_MESSAGE_LENGTH = 1000;

interface ClientLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  correlationId?: string;
  url?: string;
  userAgent?: string;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Require authentication to prevent abuse
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { logs } = body;

    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Invalid payload: logs must be an array' },
        { status: 400 }
      );
    }

    if (logs.length > MAX_LOGS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many logs: maximum ${MAX_LOGS_PER_REQUEST} per request` },
        { status: 400 }
      );
    }

    // Validate and sanitize each log entry
    const validatedLogs = logs
      .filter((log): log is ClientLog => {
        return (
          typeof log === 'object' &&
          log !== null &&
          typeof log.id === 'string' &&
          typeof log.level === 'string' &&
          typeof log.message === 'string' &&
          ['debug', 'info', 'warn', 'error'].includes(log.level)
        );
      })
      .map((log) => ({
        ...log,
        message: log.message.substring(0, MAX_MESSAGE_LENGTH),
        context: log.context ? redactSensitiveData(log.context) : undefined,
        userId: session?.user.id,
        source: 'client',
      }));

    if (validatedLogs.length === 0) {
      return NextResponse.json(
        { error: 'No valid logs in request' },
        { status: 400 }
      );
    }

    // Log each entry to server logger with appropriate level
    validatedLogs.forEach((log) => {
      const logContext = {
        correlationId: log.correlationId,
        userId: log.userId,
        url: log.url,
        userAgent: log.userAgent,
        clientTimestamp: log.timestamp,
        source: 'client',
        ...log.context,
      };

      switch (log.level) {
        case 'error':
          logger.error(logContext, `[CLIENT] ${log.message}`);
          break;
        case 'warn':
          logger.warn(logContext, `[CLIENT] ${log.message}`);
          break;
        case 'info':
          logger.info(logContext, `[CLIENT] ${log.message}`);
          break;
        case 'debug':
          logger.debug(logContext, `[CLIENT] ${log.message}`);
          break;
      }
    });

    return NextResponse.json(
      { success: true, received: validatedLogs.length },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      {
        err: error,
        userId: session?.user.id,
      },
      'Failed to process client logs'
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
