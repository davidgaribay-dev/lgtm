'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logClientError } from '@/lib/client-logger';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();

  useEffect(() => {
    logClientError('Workspace error boundary caught error', error, {
      digest: error.digest,
      workspaceSlug: params?.workspaceSlug,
      componentStack: (error as any).componentStack,
    });
  }, [error, params]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold">Workspace Error</h2>
        <p className="text-muted-foreground">
          An error occurred in this workspace. Please try again or contact
          support if the problem persists.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-4 text-left text-xs bg-muted p-4 rounded-md overflow-auto">
            {error.message}
          </pre>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
