export const TEAM_ROLES = [
  "team_owner",
  "team_admin",
  "team_member",
  "team_viewer",
] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const ORG_ROLES = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;
export type OrgRole = (typeof ORG_ROLES)[number];
