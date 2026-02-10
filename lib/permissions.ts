import { createAccessControl } from "better-auth/plugins/access";

const statements = {
  // Better Auth built-in org resources
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],

  // Application-specific resources
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
} as const;

export const ac = createAccessControl(statements);

export const ownerRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "read", "update", "delete"],
  environment: ["create", "read", "update", "delete"],
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
  testCase: ["create", "read", "update", "delete"],
  testRun: ["create", "read", "execute", "delete"],
  testPlan: ["create", "read", "update", "delete"],
  shareLink: ["create", "read", "delete"],
});

export const memberRole = ac.newRole({
  project: ["read"],
  environment: ["read"],
  testCase: ["create", "read", "update"],
  testRun: ["create", "read", "execute"],
  testPlan: ["read", "update"],
  shareLink: ["read"],
});

export const viewerRole = ac.newRole({
  project: ["read"],
  environment: ["read"],
  testCase: ["read"],
  testRun: ["read"],
  testPlan: ["read"],
  shareLink: ["read"],
});
