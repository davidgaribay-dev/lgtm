export const TEST_RESULT_STATUSES = [
  "untested",
  "passed",
  "failed",
  "blocked",
  "skipped",
] as const;
export type TestResultStatus = (typeof TEST_RESULT_STATUSES)[number];
