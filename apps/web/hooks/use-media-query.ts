"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook.
 * Returns false during SSR and on the first client render (hydration-safe).
 * After hydration, returns the live match state.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => {
      if (typeof window === "undefined") return false;
      return window.matchMedia(query).matches;
    },
    () => false, // server snapshot — always false
  );
}

/** Convenience: true when viewport is below md (768px) */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
