export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
