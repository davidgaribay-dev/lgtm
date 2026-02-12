"use client";

import { Folder, Layers, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface TestRepoDetailSuiteProps {
  suite: {
    id: string;
    name: string;
    description: string | null;
  };
  sectionCount: number;
  testCaseCount: number;
}

export function TestRepoDetailSuite({
  suite,
  sectionCount,
  testCaseCount,
}: TestRepoDetailSuiteProps) {
  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Folder className="h-3.5 w-3.5" />
        <span>Folder</span>
      </div>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        {suite.name}
      </h1>

      {suite.description && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </h3>
            <p className="text-sm text-foreground">{suite.description}</p>
          </div>
        </>
      )}

      <Separator className="my-4" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Folders
            </span>
          </div>
          <p className="mt-1 text-2xl font-semibold">{sectionCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Test Cases
            </span>
          </div>
          <p className="mt-1 text-2xl font-semibold">{testCaseCount}</p>
        </div>
      </div>
    </div>
  );
}
