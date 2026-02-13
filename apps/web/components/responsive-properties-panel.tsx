"use client";

import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface ResponsivePropertiesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function ResponsivePropertiesPanel({
  open,
  onOpenChange,
  children,
  title = "Properties",
}: ResponsivePropertiesPanelProps) {
  const isMobile = useIsMobile();

  // On mobile, close the panel if it was default-open (prevents auto-opening Sheet)
  const closedInitialRef = useRef(false);
  useEffect(() => {
    if (isMobile && open && !closedInitialRef.current) {
      closedInitialRef.current = true;
      onOpenChange(false);
    }
  }, [isMobile, open, onOpenChange]);

  // Mobile: Sheet from right
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80 p-0 overflow-y-auto">
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <div className="flex h-11 shrink-0 items-center border-b px-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </h3>
          </div>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: inline sidebar
  if (!open) return null;

  return (
    <div className="w-80 shrink-0 overflow-y-auto border-l bg-card">
      <div className="flex h-11 shrink-0 items-center border-b px-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
