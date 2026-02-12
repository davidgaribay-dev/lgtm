export const DEFECT_STATUSES = [
  "open",
  "in_progress",
  "fixed",
  "verified",
  "closed",
  "reopened",
  "deferred",
  "rejected",
  "duplicate",
] as const;
export type DefectStatus = (typeof DEFECT_STATUSES)[number];

export const DEFECT_RESOLUTIONS = [
  "fixed",
  "wont_fix",
  "duplicate",
  "cannot_reproduce",
  "by_design",
  "deferred",
] as const;
export type DefectResolution = (typeof DEFECT_RESOLUTIONS)[number];

export const DEFECT_SEVERITIES = [
  "normal",
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
] as const;
export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];

export const DEFECT_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type DefectPriority = (typeof DEFECT_PRIORITIES)[number];

export const DEFECT_TYPES = [
  "functional",
  "ui",
  "performance",
  "security",
  "crash",
  "data",
  "other",
] as const;
export type DefectType = (typeof DEFECT_TYPES)[number];
