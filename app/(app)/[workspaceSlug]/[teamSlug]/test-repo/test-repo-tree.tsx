"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tree, type NodeRendererProps, type NodeApi } from "react-arborist";
import {
  ChevronRight,
  Folder,
  FileText,
  FolderPlus,
  FilePlus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import { useTestRepoStore } from "@/lib/stores/test-repo-store";
import type { TreeNode } from "@/lib/tree-utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TreeDialogs, type DialogState } from "./tree-dialogs";

interface TestRepoTreeProps {
  data: TreeNode[];
  projectId: string;
}

export function TestRepoTree({ data, projectId }: TestRepoTreeProps) {
  const selectNode = useTestRepoStore((s) => s.selectNode);
  const selectedNode = useTestRepoStore((s) => s.selectedNode);
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 280, height: 600 });
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSelect = useCallback(
    (nodes: { id: string; data: TreeNode }[]) => {
      const node = nodes[0];
      if (node) {
        selectNode({ id: node.id, type: node.data.type });
      } else {
        selectNode(null);
      }
    },
    [selectNode],
  );

  // Drag-and-drop: constraints
  const disableDropCheck = useCallback(
    ({
      parentNode,
      dragNodes,
    }: {
      parentNode: NodeApi<TreeNode>;
      dragNodes: NodeApi<TreeNode>[];
      index: number;
    }) => {
      const dragNode = dragNodes[0];
      if (!dragNode) return true;

      const dragType = dragNode.data.type;
      const parentType = parentNode.data?.type;

      // Cannot drop INTO a testCase (leaves only)
      if (parentType === "testCase") return true;

      // Suites must stay at root level
      if (dragType === "suite" && !parentNode.isRoot) return true;

      // Non-suites cannot be dropped at root (must be inside a suite or section)
      // Actually allow it — orphan sections/cases are valid in the schema

      // Cannot drop a node into its own descendants
      if (!parentNode.isRoot && dragNode.isAncestorOf(parentNode)) return true;

      return false;
    },
    [],
  );

  // Drag-and-drop: move handler
  const handleMove = useCallback(
    async ({
      dragNodes,
      parentId,
      parentNode,
      index,
    }: {
      dragIds: string[];
      dragNodes: NodeApi<TreeNode>[];
      parentId: string | null;
      parentNode: NodeApi<TreeNode> | null;
      index: number;
    }) => {
      const dragNode = dragNodes[0];
      if (!dragNode) return;

      const dragType = dragNode.data.type;

      // Collect siblings at the target parent (after the drop)
      const siblings = parentNode?.isRoot
        ? data
        : (parentNode?.children?.map((c) => c.data) ?? []);

      // Build the new order: remove dragged item, insert at index
      const siblingIds = siblings
        .map((s) => s.id)
        .filter((id) => id !== dragNode.id);
      siblingIds.splice(index, 0, dragNode.id);

      // Build reorder items
      const items: Array<{
        id: string;
        type: "suite" | "section" | "testCase";
        displayOrder: number;
        parentId?: string | null;
        suiteId?: string | null;
        sectionId?: string | null;
      }> = [];

      if (dragType === "suite") {
        // Reorder suites at root
        siblingIds.forEach((id, i) => {
          items.push({ id, type: "suite", displayOrder: i });
        });
      } else if (dragType === "section") {
        // Determine new parent references
        const parentType = parentNode?.data?.type;
        const newSuiteId = parentType === "suite" ? parentId : null;
        const newParentId = parentType === "section" ? parentId : null;

        // The moved section
        items.push({
          id: dragNode.id,
          type: "section",
          displayOrder: index,
          suiteId: newSuiteId,
          parentId: newParentId,
        });

        // Re-index all siblings
        siblingIds.forEach((id, i) => {
          if (id !== dragNode.id) {
            items.push({ id, type: "section", displayOrder: i });
          } else {
            // Update the moved item's displayOrder to match position
            const existing = items.find((it) => it.id === dragNode.id);
            if (existing) existing.displayOrder = i;
          }
        });
      } else if (dragType === "testCase") {
        // Determine new sectionId
        const parentType = parentNode?.data?.type;
        const newSectionId = parentType === "section" ? parentId : null;

        // The moved test case
        items.push({
          id: dragNode.id,
          type: "testCase",
          displayOrder: index,
          sectionId: newSectionId,
        });

        // Re-index all siblings
        siblingIds.forEach((id, i) => {
          if (id !== dragNode.id) {
            items.push({ id, type: "testCase", displayOrder: i });
          } else {
            const existing = items.find((it) => it.id === dragNode.id);
            if (existing) existing.displayOrder = i;
          }
        });
      }

      if (items.length > 0) {
        await fetch("/api/test-repo/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, items }),
        });
        router.refresh();
      }
    },
    [data, projectId, router],
  );

  // Clone handler (no dialog needed)
  const handleClone = useCallback(
    async (nodeId: string) => {
      await fetch(`/api/test-cases/${nodeId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      router.refresh();
    },
    [projectId, router],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header with VS Code-style toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <h2 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Test Repo
        </h2>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setDialogState({
                    type: "createFile",
                    parentId: null,
                    parentType: "root",
                  })
                }
              >
                <FilePlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New Test Case</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  setDialogState({
                    type: "createFolder",
                    parentId: null,
                    parentType: "root",
                  })
                }
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New Folder</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tree */}
      <div ref={containerRef} className="min-h-0 flex-1">
        {data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              No items yet. Use the toolbar above to get started.
            </p>
          </div>
        ) : (
          <Tree<TreeNode>
            data={data}
            width={dimensions.width}
            height={dimensions.height}
            rowHeight={32}
            indent={16}
            openByDefault={false}
            selection={selectedNode?.id}
            onSelect={handleSelect}
            onMove={handleMove}
            disableDrop={disableDropCheck}
            padding={8}
          >
            {(props) => (
              <TreeNodeRenderer
                {...props}
                projectId={projectId}
                setDialogState={setDialogState}
                onClone={handleClone}
              />
            )}
          </Tree>
        )}
      </div>

      {/* Dialogs */}
      <TreeDialogs
        dialogState={dialogState}
        setDialogState={setDialogState}
        projectId={projectId}
      />
    </div>
  );
}

interface TreeNodeRendererExtendedProps extends NodeRendererProps<TreeNode> {
  projectId: string;
  setDialogState: (state: DialogState | null) => void;
  onClone: (nodeId: string) => void;
}

function TreeNodeRenderer({
  node,
  style,
  setDialogState,
  onClone,
  dragHandle,
}: TreeNodeRendererExtendedProps) {
  const isSelected = node.isSelected;
  const nodeType = node.data.type;
  const isFolder = nodeType === "suite" || nodeType === "section";

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "group flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm",
        isSelected
          ? "bg-foreground text-background"
          : "text-foreground hover:bg-muted",
      )}
      onClick={() => (node.isInternal ? node.toggle() : node.select())}
    >
      {/* Expand/collapse arrow */}
      {node.isInternal ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            node.toggle();
          }}
          className="flex h-4 w-4 shrink-0 items-center justify-center"
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-150",
              node.isOpen && "rotate-90",
            )}
          />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {/* Icon */}
      {isFolder && (
        <Folder
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isSelected ? "text-background/70" : "text-muted-foreground",
          )}
        />
      )}
      {nodeType === "testCase" && (
        <FileText
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isSelected ? "text-background/70" : "text-muted-foreground",
          )}
        />
      )}

      {/* Name */}
      <span className="min-w-0 flex-1 truncate">{node.data.name}</span>

      {/* Three-dot context menu */}
      <div className="ml-auto shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded",
                isSelected
                  ? "hover:bg-background/20"
                  : "hover:bg-foreground/10",
              )}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            {/* Folder actions: New Folder / New Test Case */}
            {isFolder && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDialogState({
                      type: "createFolder",
                      parentId: node.id,
                      parentType: nodeType,
                    });
                  }}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDialogState({
                      type: "createFile",
                      parentId: node.id,
                      parentType: nodeType,
                    });
                  }}
                >
                  <FilePlus className="mr-2 h-4 w-4" />
                  New Test Case
                </DropdownMenuItem>
              </>
            )}

            {/* Rename */}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setDialogState({
                  type: "rename",
                  id: node.id,
                  nodeType,
                  currentName: node.data.name,
                });
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>

            {/* Clone (test cases only) */}
            {nodeType === "testCase" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onClone(node.id);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Delete */}
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDialogState({
                  type: "delete",
                  id: node.id,
                  nodeType,
                  name: node.data.name,
                  hasChildren: node.isInternal && (node.children?.length ?? 0) > 0,
                });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
