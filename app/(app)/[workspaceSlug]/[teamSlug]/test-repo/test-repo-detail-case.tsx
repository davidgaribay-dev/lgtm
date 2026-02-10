"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTestRepoStore } from "@/lib/stores/test-repo-store";

interface TestStep {
  id: string;
  stepOrder: number;
  action: string;
  expectedResult: string | null;
}

interface TestRepoDetailCaseProps {
  testCase: {
    id: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    type: string;
    priority: string;
    status: string;
    templateType: string;
    sectionId: string | null;
  };
  section: { id: string; name: string } | null;
  suite: { id: string; name: string } | null;
  projectId: string;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical:
      "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    high: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    medium:
      "text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    low: "text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={colors[priority] ?? colors.low}>
      {priority}
    </Badge>
  );
}

export function TestRepoDetailCase(props: TestRepoDetailCaseProps) {
  // Key resets internal state when test case changes
  return <TestRepoDetailCaseInner key={props.testCase.id} {...props} />;
}

function TestRepoDetailCaseInner({
  testCase,
  section,
  suite,
  projectId,
}: TestRepoDetailCaseProps) {
  const selectNode = useTestRepoStore((s) => s.selectNode);
  // null = loading, TestStep[] = loaded
  const [steps, setSteps] = useState<TestStep[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(
      `/api/test-steps?testCaseId=${encodeURIComponent(testCase.id)}&projectId=${encodeURIComponent(projectId)}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch steps");
        return res.json();
      })
      .then((data: TestStep[]) => {
        if (!cancelled) setSteps(data);
      })
      .catch(() => {
        if (!cancelled) setSteps([]);
      });

    return () => {
      cancelled = true;
    };
  }, [testCase.id, projectId]);

  const loadingSteps = steps === null;

  return (
    <div className="px-8 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>Test Case</span>
        {suite && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() =>
                selectNode({ id: suite.id, type: "suite" })
              }
              className="hover:text-foreground"
            >
              {suite.name}
            </button>
          </>
        )}
        {section && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() =>
                selectNode({ id: section.id, type: "section" })
              }
              className="hover:text-foreground"
            >
              {section.name}
            </button>
          </>
        )}
      </div>

      {/* Title */}
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        {testCase.title}
      </h1>

      {/* Metadata */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{testCase.type}</Badge>
        <PriorityBadge priority={testCase.priority} />
        <Badge variant="outline">{testCase.status}</Badge>
      </div>

      {/* Description */}
      {testCase.description && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </h3>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {testCase.description}
            </p>
          </div>
        </>
      )}

      {/* Preconditions */}
      {testCase.preconditions && (
        <>
          <Separator className="my-4" />
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Preconditions
            </h3>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {testCase.preconditions}
            </p>
          </div>
        </>
      )}

      {/* Test Steps */}
      <Separator className="my-4" />
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Test Steps
        </h3>
        {loadingSteps ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading steps...</span>
          </div>
        ) : steps.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No test steps defined.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Expected Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.map((step) => (
                  <TableRow key={step.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {step.stepOrder}
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap text-sm">
                      {step.action}
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {step.expectedResult ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
