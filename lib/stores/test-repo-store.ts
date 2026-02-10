import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TreeNodeType = "suite" | "section" | "testCase";

export interface SelectedNode {
  id: string;
  type: TreeNodeType;
}

interface TestRepoState {
  selectedNode: SelectedNode | null;
  selectNode: (node: SelectedNode | null) => void;
  treePanelWidth: number;
  setTreePanelWidth: (width: number) => void;
}

export const useTestRepoStore = create<TestRepoState>()(
  persist(
    (set) => ({
      selectedNode: null,
      selectNode: (node) => set({ selectedNode: node }),
      treePanelWidth: 280,
      setTreePanelWidth: (width) => set({ treePanelWidth: width }),
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
