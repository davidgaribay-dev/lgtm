"use client";

import { createContext, useContext } from "react";

export interface TeamSettingsContextValue {
  team: {
    id: string;
    name: string;
    key: string;
    description: string | null;
    organizationId: string;
    orgName: string;
    orgSlug: string;
  };
}

const TeamSettingsContext = createContext<TeamSettingsContextValue | null>(null);

export function TeamSettingsProvider({
  team,
  children,
}: {
  team: TeamSettingsContextValue["team"];
  children: React.ReactNode;
}) {
  return (
    <TeamSettingsContext.Provider value={{ team }}>
      {children}
    </TeamSettingsContext.Provider>
  );
}

export function useTeamSettings() {
  const context = useContext(TeamSettingsContext);
  if (!context) {
    throw new Error(
      "useTeamSettings must be used within TeamSettingsProvider",
    );
  }
  return context;
}
