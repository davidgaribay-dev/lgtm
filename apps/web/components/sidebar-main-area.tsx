"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSidebarStore, useSidebarReady } from "@/lib/stores/sidebar-store";
import { cn } from "@/lib/utils";

export function SidebarMainArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const expanded = useSidebarStore((s) => s.expanded);
  const ready = useSidebarReady();
  const [enableTransition, setEnableTransition] = useState(false);

  // Settings pages are at /{workspaceSlug}/settings
  const segments = pathname.split("/").filter(Boolean);
  const isSettings = segments.length >= 2 && segments[1] === "settings";
  const isExpanded = isSettings ? true : expanded;

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
        isExpanded ? "ml-64" : "ml-16",
      )}
    >
      {children}
    </div>
  );
}
