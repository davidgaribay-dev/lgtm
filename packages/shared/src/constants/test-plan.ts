export const TEST_PLAN_STATUSES = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;
export type TestPlanStatus = (typeof TEST_PLAN_STATUSES)[number];
