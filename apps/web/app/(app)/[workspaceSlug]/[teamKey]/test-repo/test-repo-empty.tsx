"use client";

import { FileText, FolderPlus } from "lucide-react";

interface TestRepoEmptyProps {
  hasData: boolean;
}

export function TestRepoEmpty({ hasData }: TestRepoEmptyProps) {
  if (!hasData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FolderPlus className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium text-foreground">
            No test cases yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first folder to start organizing test cases.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <FileText className="h-12 w-12 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium text-foreground">
          Select an item to view details
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a folder or test case from the tree.
        </p>
      </div>
    </div>
  );
}
