import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
  return (
    <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {isLast ? (
                <span className="font-medium text-foreground">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-foreground"
                >
                  {item.label}
                </button>
              ) : (
                <span>{item.label}</span>
              )}
            </Fragment>
          );
        })}
      </div>
      {children && (
        <div className="flex items-center gap-1">{children}</div>
      )}
    </div>
  );
}
