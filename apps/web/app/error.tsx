'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { logClientError } from '@/lib/client-logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to client logger (will batch and send to server)
    logClientError('Root error boundary caught error', error, {
      digest: error.digest,
      componentStack: (error as any).componentStack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground">
          An unexpected error occurred. Our team has been notified.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 text-left text-sm bg-muted p-4 rounded-md overflow-auto max-w-2xl">
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
