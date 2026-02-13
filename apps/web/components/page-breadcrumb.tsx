"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight, Menu } from "lucide-react";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  children?: React.ReactNode;
}

export function PageBreadcrumb({ items, children }: PageBreadcrumbProps) {
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2">
      <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              {isLast ? (
                <span className="truncate font-medium text-foreground">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link href={item.href} className="truncate hover:text-foreground">
                  {item.label}
                </Link>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="truncate hover:text-foreground"
                >
                  {item.label}
                </button>
              ) : (
                <span className="truncate">{item.label}</span>
              )}
            </Fragment>
          );
        })}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-1">{children}</div>
      )}
    </div>
  );
}
