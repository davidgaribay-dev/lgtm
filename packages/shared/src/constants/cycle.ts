export const CYCLE_STATUSES = [
  "planned",
  "active",
  "completed",
] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];
