"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  Tree,
  type NodeRendererProps,
  type NodeApi,
  type TreeApi,
} from "react-arborist";
import { useDragDropManager } from "react-dnd";
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
import { moveNodeInTree, type TreeNode } from "@/lib/tree-utils";
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

const CREATING_NODE_ID = "__creating__";

interface TestRepoTreeProps {
  data: TreeNode[];
  projectId: string;
}

// ─── Helper: inject a temporary "creating" node into the tree ───

function injectTempNode(
  data: TreeNode[],
  target: { parentId: string | null; parentType: string },
): TreeNode[] {
  const tempNode: TreeNode = {
    id: CREATING_NODE_ID,
    name: "",
    type:
      target.parentType === "root" && target.parentId === null
        ? "suite"
        : "section",
  };

  // Root-level creation
  if (!target.parentId) {
    return [tempNode, ...data];
  }

  // Nested creation: find parent and prepend to its children
  function inject(nodes: TreeNode[]): TreeNode[] {
    return nodes.map((n) => {
      if (n.id === target.parentId) {
        return {
          ...n,
          children: [tempNode, ...(n.children ?? [])],
        };
      }
      if (n.children) {
        return { ...n, children: inject(n.children) };
      }
      return n;
    });
  }

  return inject(data);
}

export function TestRepoTree({ data, projectId }: TestRepoTreeProps) {
  const dndManager = useDragDropManager();
  const selectNode = useTestRepoStore((s) => s.selectNode);
  const selectedNode = useTestRepoStore((s) => s.selectedNode);
  const setCreatingTestCase = useTestRepoStore((s) => s.setCreatingTestCase);
  const toggleNode = useTestRepoStore((s) => s.toggleNode);
  const setNodeOpen = useTestRepoStore((s) => s.setNodeOpen);
  const router = useRouter();

  // Capture initial open state once on mount — must be stable to avoid
  // react-arborist's useMemo(...Object.values(treeProps)) re-firing on every toggle.
  const initialOpenStateRef = useRef(
    useTestRepoStore.getState().openNodes[projectId] ?? {},
  );

  const treeRef = useRef<TreeApi<TreeNode> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 280, height: 600 });
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  // Local tree state for optimistic drag-and-drop updates.
  const [localTree, setLocalTree] = useState<TreeNode[]>(data);

  // Sync local state when server data changes (after router.refresh()).
  useEffect(() => {
    setLocalTree(data);
  }, [data]);

  // Inline folder creation state
  const [creatingFolder, setCreatingFolder] = useState<{
    parentId: string | null;
    parentType: "suite" | "section" | "root";
  } | null>(null);

  // Inline rename state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Derive tree data with temp node when creating
  const treeData = useMemo(() => {
    if (!creatingFolder) return localTree;
    return injectTempNode(localTree, creatingFolder);
  }, [localTree, creatingFolder]);

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

  // Auto-expand parent when creating inside it
  useEffect(() => {
    if (creatingFolder?.parentId && treeRef.current) {
      const parentNode = treeRef.current.get(creatingFolder.parentId);
      if (parentNode && !parentNode.isOpen) {
        parentNode.open();
        setNodeOpen(projectId, creatingFolder.parentId, true);
      }
    }
  }, [creatingFolder, projectId, setNodeOpen]);

  // Track tree node toggle in Zustand for persistence
  const handleToggle = useCallback(
    (id: string) => {
      toggleNode(projectId, id);
    },
    [projectId, toggleNode],
  );

  const handleSelect = useCallback(
    (nodes: { id: string; data: TreeNode }[]) => {
      const node = nodes[0];
      if (node && node.id !== CREATING_NODE_ID) {
        selectNode({ id: node.id, type: node.data.type });
      } else if (!node) {
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

      // Never drag the temp creating node
      if (dragNode.id === CREATING_NODE_ID) return true;

      const dragType = dragNode.data.type;
      const parentType = parentNode.data?.type;

      if (parentType === "testCase") return true;
      if (dragType === "suite" && !parentNode.isRoot) return true;
      if (!parentNode.isRoot && dragNode.isAncestorOf(parentNode)) return true;

      return false;
    },
    [],
  );

  // Drag-and-drop: move handler (optimistic — updates UI instantly)
  const handleMove = useCallback(
    ({
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
      if (!dragNode || dragNode.id === CREATING_NODE_ID) return;

      // Optimistic update: move node in local tree state immediately
      setLocalTree((prev) => moveNodeInTree(prev, dragNode.id, parentId, index));

      // Auto-expand the target folder so the user sees the dropped item
      if (parentId && parentNode && !parentNode.isOpen) {
        parentNode.open();
        setNodeOpen(projectId, parentId, true);
      }

      // Build the reorder API payload
      const dragType = dragNode.data.type;

      const siblings = parentNode?.isRoot
        ? localTree
        : (parentNode?.children?.map((c) => c.data) ?? []);

      const siblingIds = siblings
        .map((s) => s.id)
        .filter((id) => id !== dragNode.id && id !== CREATING_NODE_ID);
      siblingIds.splice(index, 0, dragNode.id);

      const items: Array<{
        id: string;
        type: "suite" | "section" | "testCase";
        displayOrder: number;
        parentId?: string | null;
        suiteId?: string | null;
        sectionId?: string | null;
      }> = [];

      if (dragType === "suite") {
        siblingIds.forEach((id, i) => {
          items.push({ id, type: "suite", displayOrder: i });
        });
      } else if (dragType === "section") {
        const pType = parentNode?.data?.type;
        const newSuiteId = pType === "suite" ? parentId : null;
        const newParentId = pType === "section" ? parentId : null;

        items.push({
          id: dragNode.id,
          type: "section",
          displayOrder: index,
          suiteId: newSuiteId,
          parentId: newParentId,
        });

        siblingIds.forEach((id, i) => {
          if (id !== dragNode.id) {
            items.push({ id, type: "section", displayOrder: i });
          } else {
            const existing = items.find((it) => it.id === dragNode.id);
            if (existing) existing.displayOrder = i;
          }
        });
      } else if (dragType === "testCase") {
        const pType = parentNode?.data?.type;
        const newSectionId = pType === "section" ? parentId : null;
        const newSuiteId = pType === "suite" ? parentId : null;

        items.push({
          id: dragNode.id,
          type: "testCase",
          displayOrder: index,
          sectionId: newSectionId,
          suiteId: newSuiteId,
        });

        siblingIds.forEach((id, i) => {
          if (id !== dragNode.id) {
            items.push({ id, type: "testCase", displayOrder: i });
          } else {
            const existing = items.find((it) => it.id === dragNode.id);
            if (existing) existing.displayOrder = i;
          }
        });
      }

      // Fire API call in background, then sync canonical server data
      if (items.length > 0) {
        fetch("/api/test-repo/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, items }),
        })
          .then(() => {
            router.refresh();
          })
          .catch(() => {
            router.refresh();
          });
      }
    },
    [localTree, projectId, router, setNodeOpen],
  );

  // Clone handler
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

  // Inline folder creation submit
  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!creatingFolder) return;
      const trimmed = name.trim();
      if (!trimmed) {
        setCreatingFolder(null);
        return;
      }

      try {
        if (
          creatingFolder.parentType === "root" &&
          !creatingFolder.parentId
        ) {
          // Create a test suite
          const res = await fetch("/api/test-suites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed, projectId }),
          });
          if (!res.ok) throw new Error("Failed to create folder");
        } else {
          // Create a section
          const body: Record<string, unknown> = {
            name: trimmed,
            projectId,
          };
          if (creatingFolder.parentType === "suite") {
            body.suiteId = creatingFolder.parentId;
          } else if (creatingFolder.parentType === "section") {
            body.parentId = creatingFolder.parentId;
          }
          const res = await fetch("/api/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error("Failed to create folder");
        }
        router.refresh();
      } finally {
        setCreatingFolder(null);
      }
    },
    [creatingFolder, projectId, router],
  );

  // Inline rename submit
  const handleRename = useCallback(
    async (nodeId: string, nodeType: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        setEditingNodeId(null);
        return;
      }

      const urlMap: Record<string, string> = {
        suite: `/api/test-suites/${nodeId}`,
        section: `/api/sections/${nodeId}`,
        testCase: `/api/test-cases/${nodeId}`,
      };
      const bodyKey = nodeType === "testCase" ? "title" : "name";

      try {
        const res = await fetch(urlMap[nodeType], {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [bodyKey]: trimmed, projectId }),
        });
        if (!res.ok) throw new Error("Failed to rename");
        router.refresh();
      } finally {
        setEditingNodeId(null);
      }
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
                  setCreatingTestCase({
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
                  setCreatingFolder({
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
        {treeData.length === 0 && !creatingFolder ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              No items yet. Use the toolbar above to get started.
            </p>
          </div>
        ) : (
          <Tree<TreeNode>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={treeRef as any}
            data={treeData}
            dndManager={dndManager}
            width={dimensions.width}
            height={dimensions.height}
            rowHeight={32}
            indent={16}
            openByDefault={false}
            initialOpenState={initialOpenStateRef.current}
            onToggle={handleToggle}
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
                onCreateFolder={handleCreateFolder}
                onRename={handleRename}
                editingNodeId={editingNodeId}
                setEditingNodeId={setEditingNodeId}
                setCreatingFolder={setCreatingFolder}
                setCreatingTestCase={setCreatingTestCase}
              />
            )}
          </Tree>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <TreeDialogs
        dialogState={dialogState}
        setDialogState={setDialogState}
        projectId={projectId}
      />
    </div>
  );
}

// ─── Tree Node Renderer ───

interface TreeNodeRendererExtendedProps extends NodeRendererProps<TreeNode> {
  projectId: string;
  setDialogState: (state: DialogState | null) => void;
  onClone: (nodeId: string) => void;
  onCreateFolder: (name: string) => void;
  onRename: (nodeId: string, nodeType: string, newName: string) => void;
  editingNodeId: string | null;
  setEditingNodeId: (id: string | null) => void;
  setCreatingFolder: (
    val: {
      parentId: string | null;
      parentType: "suite" | "section" | "root";
    } | null,
  ) => void;
  setCreatingTestCase: (
    val: {
      parentId: string | null;
      parentType: "suite" | "section" | "root";
    } | null,
  ) => void;
}

function TreeNodeRenderer({
  node,
  style,
  setDialogState,
  onClone,
  onCreateFolder,
  onRename,
  editingNodeId,
  setEditingNodeId,
  setCreatingFolder,
  setCreatingTestCase,
  dragHandle,
}: TreeNodeRendererExtendedProps) {
  const isSelected = node.isSelected;
  const nodeType = node.data.type;
  const isFolder = nodeType === "suite" || nodeType === "section";
  const isCreating = node.id === CREATING_NODE_ID;
  const isEditing = node.id === editingNodeId;

  // --- Inline creation input ---
  if (isCreating) {
    return (
      <div style={style} className="flex h-8 items-center gap-1.5 px-2">
        <span className="w-4 shrink-0" />
        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <InlineInput
          defaultValue=""
          placeholder="Folder name"
          onSubmit={(val) => onCreateFolder(val)}
          onCancel={() => onCreateFolder("")}
        />
      </div>
    );
  }

  // --- Inline rename input ---
  if (isEditing) {
    return (
      <div
        ref={dragHandle}
        style={style}
        className={cn(
          "group flex h-8 items-center gap-1.5 rounded-md px-2 text-sm",
          isSelected
            ? "bg-muted/50 font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {node.isInternal ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                node.isOpen && "rotate-90",
              )}
            />
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isFolder && (
          <Folder
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isSelected ? "text-foreground/70" : "text-muted-foreground",
            )}
          />
        )}
        {nodeType === "testCase" && (
          <FileText
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isSelected ? "text-foreground/70" : "text-muted-foreground",
            )}
          />
        )}
        <InlineInput
          defaultValue={node.data.name}
          onSubmit={(val) => {
            if (val.trim() && val.trim() !== node.data.name) {
              onRename(node.id, nodeType, val);
            } else {
              setEditingNodeId(null);
            }
          }}
          onCancel={() => setEditingNodeId(null)}
        />
      </div>
    );
  }

  // --- Normal node ---
  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        "group flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm",
        isSelected
          ? "bg-muted/50 font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
            isSelected ? "text-foreground/70" : "text-muted-foreground",
          )}
        />
      )}
      {nodeType === "testCase" && (
        <FileText
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isSelected ? "text-foreground/70" : "text-muted-foreground",
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
                "hover:bg-foreground/10",
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
                    setCreatingFolder({
                      parentId: node.id,
                      parentType: nodeType as "suite" | "section",
                    });
                  }}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatingTestCase({
                      parentId: node.id,
                      parentType: nodeType as "suite" | "section",
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
                setEditingNodeId(node.id);
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
                  hasChildren:
                    node.isInternal && (node.children?.length ?? 0) > 0,
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

// ─── Inline Input Component ───

function InlineInput({
  defaultValue,
  placeholder,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const submittedRef = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (defaultValue) {
          inputRef.current.select();
        }
      }
    });
  }, [defaultValue]);

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(value);
  }

  return (
    <input
      ref={inputRef}
      className="min-w-0 flex-1 rounded border border-ring bg-background px-1.5 py-0.5 text-sm text-foreground outline-none"
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        if (!submittedRef.current) {
          if (value.trim() && value.trim() !== defaultValue) {
            handleSubmit();
          } else {
            onCancel();
          }
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
