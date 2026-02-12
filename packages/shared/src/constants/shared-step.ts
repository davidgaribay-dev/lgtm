export const SHARED_STEP_STATUSES = ["active", "draft", "archived"] as const;
export type SharedStepStatus = (typeof SHARED_STEP_STATUSES)[number];
