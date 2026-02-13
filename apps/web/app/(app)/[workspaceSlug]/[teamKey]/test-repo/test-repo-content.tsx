"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  useTestRepoStore,
  useTestRepoReady,
} from "@/lib/stores/test-repo-store";
import type { TreeNode } from "@/lib/tree-utils";
import { TestRepoTree } from "./test-repo-tree";
import { TestRepoDetail } from "./test-repo-detail";
import { TestRepoEmpty } from "./test-repo-empty";
import { cn } from "@/lib/utils";

interface Suite {
  id: string;
  name: string;
  description: string | null;
}

interface Section {
  id: string;
  name: string;
  description: string | null;
  suiteId: string | null;
  parentId: string | null;
  displayOrder: number;
}

interface TestCase {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  postconditions: string | null;
  type: string;
  priority: string;
  severity: string;
  automationStatus: string;
  status: string;
  behavior: string;
  layer: string;
  isFlaky: boolean;
  assigneeId: string | null;
  templateType: string;
  sectionId: string | null;
  caseKey: string | null;
}

export interface TestRepoContentProps {
  projectId: string;
  treeData: TreeNode[];
  suites: Suite[];
  sections: Section[];
  testCases: TestCase[];
  initialCaseKey: string | null;
  initialSuiteId: string | null;
  initialSectionId: string | null;
}

const MIN_TREE_WIDTH = 200;
const MAX_TREE_WIDTH = 500;

export function TestRepoContent({
  projectId,
  treeData,
  suites,
  sections,
  testCases,
  initialCaseKey,
  initialSuiteId,
  initialSectionId,
}: TestRepoContentProps) {
  const treePanelWidth = useTestRepoStore((s) => s.treePanelWidth);
  const setTreePanelWidth = useTestRepoStore((s) => s.setTreePanelWidth);
  const selectedNode = useTestRepoStore((s) => s.selectedNode);
  const selectNode = useTestRepoStore((s) => s.selectNode);
  const creatingTestCase = useTestRepoStore((s) => s.creatingTestCase);
  const setCreatingTestCase = useTestRepoStore((s) => s.setCreatingTestCase);
  const ready = useTestRepoReady();
  const isMobile = useIsMobile();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);

  // Track a just-created test case that is waiting for server data refresh
  const [pendingTestCaseId, setPendingTestCaseId] = useState<string | null>(null);

  // On mount: resolve initial selection from URL search params
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (initialCaseKey) {
      const tc = testCases.find((t) => t.caseKey === initialCaseKey);
      if (tc) {
        selectNode({ id: tc.id, type: "testCase" });
        return;
      }
    }
    if (initialSuiteId) {
      const s = suites.find((s) => s.id === initialSuiteId);
      if (s) {
        selectNode({ id: s.id, type: "suite" });
        return;
      }
    }
    if (initialSectionId) {
      const sec = sections.find((s) => s.id === initialSectionId);
      if (sec) {
        selectNode({ id: sec.id, type: "section" });
        return;
      }
    }
  }, [initialCaseKey, initialSuiteId, initialSectionId, testCases, suites, sections, selectNode]);

  // Auto-create test case immediately when entering create mode
  useEffect(() => {
    if (!creatingTestCase) return;

    let cancelled = false;
    const { parentId, parentType } = creatingTestCase;

    (async () => {
      try {
        const sectionId = parentType === "section" ? parentId : null;

        const res = await fetch("/api/test-cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Untitled",
            sectionId,
            projectId,
          }),
        });

        if (!res.ok || cancelled) return;
        const created = await res.json();

        setPendingTestCaseId(created.id);
        setCreatingTestCase(null);
        router.refresh();
      } catch {
        if (!cancelled) setCreatingTestCase(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [creatingTestCase, projectId, setCreatingTestCase, router]);

  // Once the newly created test case appears in server data, select it
  useEffect(() => {
    if (!pendingTestCaseId) return;

    const tc = testCases.find((t) => t.id === pendingTestCaseId);
    if (tc) {
      selectNode({ id: tc.id, type: "testCase" });
      setPendingTestCaseId(null);
    }
  }, [pendingTestCaseId, testCases, selectNode]);

  // Sync selection → URL
  useEffect(() => {
    if (!ready) return;

    const params = new URLSearchParams(searchParams.toString());
    // Clear old params
    params.delete("case");
    params.delete("suite");
    params.delete("section");

    if (selectedNode) {
      if (selectedNode.type === "testCase") {
        const tc = testCases.find((t) => t.id === selectedNode.id);
        if (tc?.caseKey) {
          params.set("case", tc.caseKey);
        }
      } else if (selectedNode.type === "suite") {
        params.set("suite", selectedNode.id);
      } else if (selectedNode.type === "section") {
        params.set("section", selectedNode.id);
      }
    }

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      router.replace(`${pathname}${newSearch ? `?${newSearch}` : ""}`, { scroll: false });
    }
  }, [selectedNode, ready, testCases, pathname, searchParams, router]);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = treePanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = e.clientX - startX.current;
        const newWidth = Math.min(
          MAX_TREE_WIDTH,
          Math.max(MIN_TREE_WIDTH, startWidth.current + delta),
        );
        setTreePanelWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [treePanelWidth, setTreePanelWidth],
  );

  const hasData = treeData.length > 0;
  const isCreating = !!creatingTestCase || !!pendingTestCaseId;

  // Mobile: show tree OR detail, never both
  if (isMobile) {
    const showDetail = selectedNode && hasData;

    return (
      <div className={cn("flex h-svh flex-col", !ready && "invisible")}>
        {showDetail ? (
          <>
            <div className="flex shrink-0 items-center border-b bg-card px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => selectNode(null)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to tree
              </Button>
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto bg-card">
              {isCreating ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <TestRepoDetail
                  projectId={projectId}
                  selectedNode={selectedNode}
                  suites={suites}
                  sections={sections}
                  testCases={testCases}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden bg-card">
            {isCreating ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : ready ? (
              <TestRepoTree data={treeData} projectId={projectId} />
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Desktop: split pane with resize handle
  return (
    <div
      className={cn("flex h-svh", !ready && "invisible")}
    >
      {/* Tree sidebar */}
      <div
        style={{ width: ready ? treePanelWidth : 280 }}
        className="shrink-0 overflow-hidden border-r bg-card"
      >
        {ready && (
          <TestRepoTree
            data={treeData}
            projectId={projectId}
          />
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-border active:bg-border"
      />

      {/* Detail pane */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-card">
        {isCreating ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : selectedNode && hasData ? (
          <TestRepoDetail
            projectId={projectId}
            selectedNode={selectedNode}
            suites={suites}
            sections={sections}
            testCases={testCases}
          />
        ) : (
          <TestRepoEmpty hasData={hasData} />
        )}
      </div>
    </div>
  );
}
