"use client";

import { useRef, useCallback } from "react";
import {
  useTestRepoStore,
  useTestRepoReady,
} from "@/lib/stores/test-repo-store";
import type { TreeNode } from "@/lib/tree-utils";
import { TestRepoTree } from "./test-repo-tree";
import { TestRepoDetail } from "./test-repo-detail";
import { TestRepoEmpty } from "./test-repo-empty";
import { TestRepoCreateCase } from "./test-repo-create-case";
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
  type: string;
  priority: string;
  status: string;
  templateType: string;
  sectionId: string | null;
}

interface TestRepoContentProps {
  projectId: string;
  treeData: TreeNode[];
  suites: Suite[];
  sections: Section[];
  testCases: TestCase[];
}

const MIN_TREE_WIDTH = 200;
const MAX_TREE_WIDTH = 500;

export function TestRepoContent({
  projectId,
  treeData,
  suites,
  sections,
  testCases,
}: TestRepoContentProps) {
  const treePanelWidth = useTestRepoStore((s) => s.treePanelWidth);
  const setTreePanelWidth = useTestRepoStore((s) => s.setTreePanelWidth);
  const selectedNode = useTestRepoStore((s) => s.selectedNode);
  const creatingTestCase = useTestRepoStore((s) => s.creatingTestCase);
  const ready = useTestRepoReady();

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

  return (
    <div
      className={cn("flex h-svh", !ready && "invisible")}
    >
      {/* Tree sidebar */}
      <div
        style={{ width: ready ? treePanelWidth : 280 }}
        className="shrink-0 overflow-hidden border-r bg-card"
      >
        <TestRepoTree
          data={treeData}
          projectId={projectId}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-border active:bg-border"
      />

      {/* Detail pane */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {creatingTestCase ? (
          <TestRepoCreateCase
            projectId={projectId}
            parentId={creatingTestCase.parentId}
            parentType={creatingTestCase.parentType}
            suites={suites}
            sections={sections}
          />
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
