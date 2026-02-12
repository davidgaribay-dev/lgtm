import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TreeNodeType = "suite" | "section" | "testCase";

export interface SelectedNode {
  id: string;
  type: TreeNodeType;
}

export interface CreatingTestCase {
  parentId: string | null;
  parentType: "suite" | "section" | "root";
}

interface TestRepoState {
  selectedNode: SelectedNode | null;
  selectNode: (node: SelectedNode | null) => void;
  treePanelWidth: number;
  setTreePanelWidth: (width: number) => void;
  creatingTestCase: CreatingTestCase | null;
  setCreatingTestCase: (val: CreatingTestCase | null) => void;
  /** Per-project open/closed state for tree nodes: { projectId: { nodeId: true } } */
  openNodes: Record<string, Record<string, boolean>>;
  toggleNode: (projectId: string, nodeId: string) => void;
  setNodeOpen: (projectId: string, nodeId: string, isOpen: boolean) => void;
}

export const useTestRepoStore = create<TestRepoState>()(
  persist(
    (set) => ({
      selectedNode: null,
      selectNode: (node) => set({ selectedNode: node }),
      treePanelWidth: 280,
      setTreePanelWidth: (width) => set({ treePanelWidth: width }),
      creatingTestCase: null,
      setCreatingTestCase: (val) => set({ creatingTestCase: val }),
      openNodes: {},
      toggleNode: (projectId, nodeId) =>
        set((state) => {
          const project = state.openNodes[projectId] ?? {};
          const isOpen = project[nodeId];
          const { [nodeId]: _, ...rest } = project;
          return {
            openNodes: {
              ...state.openNodes,
              [projectId]: isOpen ? rest : { ...project, [nodeId]: true },
            },
          };
        }),
      setNodeOpen: (projectId, nodeId, isOpen) =>
        set((state) => {
          const project = state.openNodes[projectId] ?? {};
          if (isOpen) {
            return {
              openNodes: {
                ...state.openNodes,
                [projectId]: { ...project, [nodeId]: true },
              },
            };
          }
          const { [nodeId]: _, ...rest } = project;
          return {
            openNodes: { ...state.openNodes, [projectId]: rest },
          };
        }),
    }),
    {
      name: "test-repo",
      partialize: (state) => ({
        treePanelWidth: state.treePanelWidth,
        openNodes: state.openNodes,
      }),
    },
  ),
);

/**
 * Returns true once Zustand has rehydrated test-repo state from localStorage.
 * Prevents flash of wrong panel width on page load.
 */
export function useTestRepoReady() {
  return useSyncExternalStore(
    (cb) => useTestRepoStore.persist.onFinishHydration(cb),
    () => useTestRepoStore.persist.hasHydrated(),
    () => false,
  );
}
