export const TEST_RUN_STATUSES = [
  "pending",
  "in_progress",
  "passed",
  "failed",
  "blocked",
] as const;
export type TestRunStatus = (typeof TEST_RUN_STATUSES)[number];
