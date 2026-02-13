"use client";

import { Menu } from "lucide-react";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { Button } from "@/components/ui/button";

export function PageContainer({ children }: { children: React.ReactNode }) {
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <div className="min-h-svh bg-background">
      <div className="flex h-11 items-center border-b bg-card px-4 md:hidden">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</div>
    </div>
  );
}
