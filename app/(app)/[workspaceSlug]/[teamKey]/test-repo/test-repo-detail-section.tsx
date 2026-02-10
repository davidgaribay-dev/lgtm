"use client";

import { Folder, ChevronRight, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTestRepoStore } from "@/lib/stores/test-repo-store";

interface TestRepoDetailSectionProps {
  section: {
    id: string;
    name: string;
    description: string | null;
    suiteId: string | null;
    parentId: string | null;
  };
  parentSuite: { id: string; name: string } | null;
  parentSection: { id: string; name: string } | null;
  childSectionCount: number;
  childCases: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    type: string;
  }>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    high: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    medium: "text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    low: "text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={colors[priority] ?? colors.low}>
      {priority}
    </Badge>
  );
}

export function TestRepoDetailSection({
  section,
  parentSuite,
  parentSection,
  childSectionCount,
  childCases,
}: TestRepoDetailSectionProps) {
  const selectNode = useTestRepoStore((s) => s.selectNode);

  return (
    <div className="px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Folder className="h-3.5 w-3.5" />
        <span>Folder</span>
        {parentSuite && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() =>
                selectNode({ id: parentSuite.id, type: "suite" })
              }
              className="hover:text-foreground"
            >
              {parentSuite.name}
            </button>
          </>
        )}
        {parentSection && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() =>
                selectNode({ id: parentSection.id, type: "section" })
              }
              className="hover:text-foreground"
            >
              {parentSection.name}
            </button>
          </>
        )}
      </div>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        {section.name}
      </h1>

      {section.description && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </h3>
            <p className="text-sm text-foreground">{section.description}</p>
          </div>
        </>
      )}

      <Separator className="my-4" />

      {/* Stats row */}
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          {childSectionCount} subfolder{childSectionCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {childCases.length} test case{childCases.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Test cases list */}
      {childCases.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Test Cases
          </h3>
          <div className="space-y-1">
            {childCases.map((tc) => (
              <button
                key={tc.id}
                onClick={() =>
                  selectNode({ id: tc.id, type: "testCase" })
                }
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{tc.title}</span>
                <PriorityBadge priority={tc.priority} />
                <Badge variant="outline" className="text-[10px]">
                  {tc.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
