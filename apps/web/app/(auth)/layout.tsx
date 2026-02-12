export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-4 dark:bg-background">
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl bg-card px-8 py-10 shadow-lg sm:px-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight">LGTM</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Test Case Management
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
