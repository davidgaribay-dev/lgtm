"use client";

import { useRef, useEffect } from "react";

export function DemoBanner() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      document.documentElement.style.setProperty(
        "--demo-banner-h",
        `${el.offsetHeight}px`,
      );
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();

    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--demo-banner-h");
    };
  }, []);

  if (process.env.NEXT_PUBLIC_IS_DEMO !== "true") {
    return null;
  }

  return (
    <div
      ref={ref}
      data-demo-banner
      className="relative z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      This is a demo instance — data resets every 30 minutes. Login:{" "}
      <code className="rounded bg-amber-600/20 px-1.5 py-0.5 font-mono text-xs">
        demo@lgtm.dev
      </code>{" "}
      /{" "}
      <code className="rounded bg-amber-600/20 px-1.5 py-0.5 font-mono text-xs">
        demodemo1234
      </code>
    </div>
  );
}
