export const TEST_CASE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type TestCasePriority = (typeof TEST_CASE_PRIORITIES)[number];

export const TEST_CASE_TYPES = [
  "functional",
  "smoke",
  "regression",
  "security",
  "usability",
  "performance",
  "acceptance",
  "compatibility",
  "integration",
  "exploratory",
  "other",
] as const;
export type TestCaseType = (typeof TEST_CASE_TYPES)[number];

export const TEST_CASE_SEVERITIES = [
  "not_set",
  "blocker",
  "critical",
  "major",
  "normal",
  "minor",
  "trivial",
] as const;
export type TestCaseSeverity = (typeof TEST_CASE_SEVERITIES)[number];

export const TEST_CASE_AUTOMATION_STATUSES = [
  "not_automated",
  "automated",
  "to_be_automated",
] as const;
export type TestCaseAutomationStatus =
  (typeof TEST_CASE_AUTOMATION_STATUSES)[number];

export const TEST_CASE_STATUSES = [
  "draft",
  "active",
  "deprecated",
] as const;
export type TestCaseStatus = (typeof TEST_CASE_STATUSES)[number];

export const TEST_CASE_BEHAVIORS = [
  "not_set",
  "positive",
  "negative",
  "destructive",
] as const;
export type TestCaseBehavior = (typeof TEST_CASE_BEHAVIORS)[number];

export const TEST_CASE_LAYERS = [
  "not_set",
  "e2e",
  "api",
  "unit",
] as const;
export type TestCaseLayer = (typeof TEST_CASE_LAYERS)[number];
