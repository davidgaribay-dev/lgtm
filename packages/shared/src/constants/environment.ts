export const ENVIRONMENT_TYPES = [
  "development",
  "staging",
  "qa",
  "production",
  "custom",
] as const;
export type EnvironmentType = (typeof ENVIRONMENT_TYPES)[number];
