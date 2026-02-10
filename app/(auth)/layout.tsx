export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">LGTM</h1>
          <p className="text-sm text-muted-foreground">
            Test Case Management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
