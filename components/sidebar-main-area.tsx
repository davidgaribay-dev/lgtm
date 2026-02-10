"use client";

import { useEffect, useState } from "react";
import { useSidebarStore, useSidebarReady } from "@/lib/stores/sidebar-store";
import { cn } from "@/lib/utils";

export function SidebarMainArea({ children }: { children: React.ReactNode }) {
  const expanded = useSidebarStore((s) => s.expanded);
  const ready = useSidebarReady();
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    if (ready) {
      requestAnimationFrame(() => setEnableTransition(true));
    }
  }, [ready]);

  return (
    <div
      className={cn(
        "min-h-svh",
        !ready && "invisible",
        enableTransition && "transition-[margin-left] duration-200",
        expanded ? "ml-64" : "ml-16",
      )}
    >
      {children}
    </div>
  );
}
