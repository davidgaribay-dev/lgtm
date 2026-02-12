"use client";

import { createContext, useContext } from "react";

export interface Team {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: string;
  displayOrder: number;
}

export interface WorkspaceContextValue {
  workspace: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  };
  teams: Team[];
  userRole: string;
  isAdmin: boolean;
}

const WorkspaceCtx = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}) {
  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx)
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
