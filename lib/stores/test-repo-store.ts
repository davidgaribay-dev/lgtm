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
    }),
    {
      name: "test-repo",
      partialize: (state) => ({
        treePanelWidth: state.treePanelWidth,
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
