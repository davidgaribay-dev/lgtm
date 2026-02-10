import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  expanded: boolean;
  toggle: () => void;
  setExpanded: (expanded: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      expanded: true,
      toggle: () => set((state) => ({ expanded: !state.expanded })),
      setExpanded: (expanded) => set({ expanded }),
    }),
    {
      name: "sidebar",
    },
  ),
);

/**
 * Returns true once Zustand has rehydrated sidebar state from localStorage.
 * Prevents flash of wrong sidebar state on page load.
 */
export function useSidebarReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useSidebarStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    const unsub = useSidebarStore.persist.onFinishHydration(() =>
      setReady(true),
    );
    return unsub;
  }, []);

  return ready;
}
