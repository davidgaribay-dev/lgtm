"use client";

/** Defect status badge colors (bg + text). */
export function getDefectStatusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "in_progress":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "fixed":
      return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400";
    case "verified":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "closed":
      return "bg-muted text-muted-foreground";
    case "reopened":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
    case "deferred":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400";
    case "rejected":
      return "bg-muted text-muted-foreground";
    case "duplicate":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Human-readable status labels. */
export function getDefectStatusLabel(status: string) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "fixed":
      return "Fixed";
    case "verified":
      return "Verified";
    case "closed":
      return "Closed";
    case "reopened":
      return "Reopened";
    case "deferred":
      return "Deferred";
    case "rejected":
      return "Rejected";
    case "duplicate":
      return "Duplicate";
    default:
      return status;
  }
}

/** Severity badge colors. */
export function getDefectSeverityColor(severity: string) {
  switch (severity) {
    case "blocker":
      return "bg-red-500/15 text-red-700 dark:text-red-400";
    case "critical":
      return "bg-red-400/15 text-red-600 dark:text-red-300";
    case "major":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
    case "normal":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "minor":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "trivial":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Severity label. */
export function getDefectSeverityLabel(severity: string) {
  switch (severity) {
    case "blocker":
      return "Blocker";
    case "critical":
      return "Critical";
    case "major":
      return "Major";
    case "normal":
      return "Normal";
    case "minor":
      return "Minor";
    case "trivial":
      return "Trivial";
    default:
      return severity;
  }
}

/** Priority label. */
export function getDefectPriorityLabel(priority: string) {
  switch (priority) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return priority;
  }
}
