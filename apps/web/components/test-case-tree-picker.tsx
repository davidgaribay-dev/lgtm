"use client";

import { useCallback, useState } from "react";
import { ChevronRight, Folder, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/lib/tree-utils";

/** Collect all test case IDs from a tree node and its descendants. */
export function collectCaseIds(node: TreeNode): string[] {
  if (node.type === "testCase") return [node.id];
  const ids: string[] = [];
  for (const child of node.children ?? []) {
    ids.push(...collectCaseIds(child));
  }
  return ids;
}

/** Check if a node or any descendant contains a test case in the selected set. */
function hasSelectedDescendant(
  node: TreeNode,
  selected: Set<string>,
): boolean {
  if (node.type === "testCase") return selected.has(node.id);
  return (node.children ?? []).some((c) => hasSelectedDescendant(c, selected));
}

/** Check if all test case descendants are selected. */
function allDescendantsSelected(
  node: TreeNode,
  selected: Set<string>,
): boolean {
  if (node.type === "testCase") return selected.has(node.id);
  const children = node.children ?? [];
  if (children.length === 0) return false;
  return children.every((c) => allDescendantsSelected(c, selected));
}

function TreeNodeItem({
  node,
  depth,
  selectedIds,
  onToggle,
  expandedIds,
  onToggleExpand,
  searchTerm,
}: {
  node: TreeNode;
  depth: number;
  selectedIds: Set<string>;
  onToggle: (node: TreeNode) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  searchTerm: string;
}) {
  const isCase = node.type === "testCase";
  const children = node.children ?? [];
  const isExpanded = expandedIds.has(node.id);
  const isSelected = isCase
    ? selectedIds.has(node.id)
    : allDescendantsSelected(node, selectedIds);
  const isPartial =
    !isCase &&
    !isSelected &&
    hasSelectedDescendant(node, selectedIds);

  // Filter by search if active
  if (searchTerm && isCase) {
    const nameMatch = node.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (!nameMatch) return null;
  }

  if (searchTerm && !isCase) {
    // Check if any descendant matches
    const hasMatch = (node.children ?? []).some((c) => {
      if (c.type === "testCase") {
        return c.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true; // Keep non-leaf nodes for now
    });
    if (!hasMatch && children.length > 0) return null;
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-muted/50",
          isCase && selectedIds.has(node.id) && "bg-primary/5",
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {/* Expand toggle */}
        {!isCase && children.length > 0 ? (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
            onClick={() => onToggleExpand(node.id)}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          {...(isPartial ? { "data-state": "indeterminate" } : {})}
          onCheckedChange={() => onToggle(node)}
          className="shrink-0"
        />

        {/* Icon */}
        {isCase ? (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        {/* Label */}
        <span className="truncate text-sm">{node.name}</span>

        {/* Count for folders */}
        {!isCase && (
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {collectCaseIds(node).length}
          </span>
        )}
      </div>

      {/* Children */}
      {!isCase && isExpanded &&
        children.map((child) => (
          <TreeNodeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedIds={selectedIds}
            onToggle={onToggle}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            searchTerm={searchTerm}
          />
        ))}
    </>
  );
}

interface TestCaseTreePickerProps {
  treeData: TreeNode[];
  testCases: {
    id: string;
    title: string;
    caseKey: string | null;
    sectionId: string | null;
    suiteId: string | null;
  }[];
  selectedCaseIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  className?: string;
}

export function TestCaseTreePicker({
  treeData,
  testCases,
  selectedCaseIds,
  onSelectionChange,
  className,
}: TestCaseTreePickerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const node of treeData) {
      ids.add(node.id);
    }
    return ids;
  });
  const [searchTerm, setSearchTerm] = useState("");

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleNode = useCallback(
    (node: TreeNode) => {
      const next = new Set(selectedCaseIds);
      const ids = collectCaseIds(node);
      const allSelected = ids.every((id) => next.has(id));

      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      onSelectionChange(next);
    },
    [selectedCaseIds, onSelectionChange],
  );

  const selectAll = useCallback(() => {
    onSelectionChange(new Set(testCases.map((tc) => tc.id)));
  }, [testCases, onSelectionChange]);

  const deselectAll = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 py-2">
        <Checkbox
          checked={
            testCases.length > 0 && selectedCaseIds.size === testCases.length
          }
          {...(selectedCaseIds.size > 0 && selectedCaseIds.size < testCases.length
            ? { "data-state": "indeterminate" }
            : {})}
          onCheckedChange={(checked) => {
            if (checked) selectAll();
            else deselectAll();
          }}
          className="shrink-0"
        />
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test cases..."
            className="h-8 pl-8 text-sm border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          {selectedCaseIds.size} selected
        </span>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {treeData.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No test cases found
            </div>
          ) : (
            treeData.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                selectedIds={selectedCaseIds}
                onToggle={toggleNode}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
                searchTerm={searchTerm}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
