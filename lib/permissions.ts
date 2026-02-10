import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  // Better Auth built-in org resources
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],

  // Application-specific resources
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  cycle: ["create", "read", "update", "delete"],
  workspaceCycle: ["create", "read", "update", "delete"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],

  // Team-level resources
  projectMember: ["create", "read", "update", "delete"],
  projectSettings: ["read", "update"],
} as const;

export const ac = createAccessControl(statements);

export const ownerRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  cycle: ["create", "read", "update", "delete"],
  workspaceCycle: ["create", "read", "update", "delete"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
});

export const adminRole = ac.newRole({
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  cycle: ["create", "read", "update", "delete"],
  workspaceCycle: ["create", "read", "update", "delete"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
});

export const memberRole = ac.newRole({
  project: ["read"],
  environment: ["read"],
  cycle: ["read"],
  workspaceCycle: ["read"],
  testCase: ["create", "read", "update"],
  testRun: ["create", "read", "execute"],
  testPlan: ["read", "update"],
  shareLink: ["read"],
});

export const viewerRole = ac.newRole({
  project: ["read"],
  environment: ["read"],
  cycle: ["read"],
  workspaceCycle: ["read"],
  testCase: ["read"],
  testRun: ["read"],
  testPlan: ["read"],
  shareLink: ["read"],
});

// ============================================================
// Team-level roles (for per-team permissions)
// ============================================================

export const teamOwnerRole = ac.newRole({
  project: ["read", "update", "delete"],
  projectMember: ["create", "read", "update", "delete"],
  projectSettings: ["read", "update"],
  environment: ["create", "read", "update", "delete"],
  cycle: ["create", "read", "update", "delete"],
  workspaceCycle: ["read"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
});

export const teamAdminRole = ac.newRole({
  project: ["read", "update"],
  projectMember: ["create", "read", "update", "delete"],
  projectSettings: ["read", "update"],
  environment: ["create", "read", "update", "delete"],
  cycle: ["create", "read", "update", "delete"],
  workspaceCycle: ["read"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
});

export const teamMemberRole = ac.newRole({
  project: ["read"],
  projectMember: ["read"],
  projectSettings: ["read"],
  environment: ["read"],
  cycle: ["read"],
  workspaceCycle: ["read"],
  testCase: ["create", "read", "update"],
  testRun: ["create", "read", "execute"],
  testPlan: ["read", "update"],
  shareLink: ["read"],
});

export const teamViewerRole = ac.newRole({
  project: ["read"],
  projectMember: ["read"],
  projectSettings: ["read"],
  environment: ["read"],
  cycle: ["read"],
  workspaceCycle: ["read"],
  testCase: ["read"],
  testRun: ["read"],
  testPlan: ["read"],
  shareLink: ["read"],
});
