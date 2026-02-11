import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { auditFields, timestamps } from "./columns";

// ============================================================
// Better Auth tables
// ============================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  description: text("description"),
  onboardingStep: text("onboardingStep"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("activeOrganizationId"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// ============================================================
// Better Auth organization plugin tables
// ============================================================

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt"),
});

export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expiresAt"),
  inviterId: text("inviterId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// ============================================================
// Application tables — Organization-scoped
// ============================================================

export const project = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    key: text("key").notNull(),
    description: text("description"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    displayOrder: integer("display_order").notNull().default(0),
    nextTestCaseNumber: integer("next_test_case_number").notNull().default(1),
    ...auditFields,
  },
  (table) => [
    index("project_organization_id_idx").on(table.organizationId),
    uniqueIndex("project_org_key_active_unique")
      .on(table.organizationId, table.key)
      .where(sql`${table.deletedAt} is null`),
    index("project_key_idx").on(table.key),
  ],
);

// ============================================================
// Application tables — Test Design (project-scoped)
// ============================================================

export const testSuite = pgTable(
  "test_suite",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull().default(0),
    ...auditFields,
  },
  (table) => [index("test_suite_project_id_idx").on(table.projectId)],
);

export const section = pgTable(
  "section",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    suiteId: text("suite_id").references(() => testSuite.id, {
      onDelete: "set null",
    }),
    parentId: text("parent_id"),
    displayOrder: integer("display_order").notNull().default(0),
    ...auditFields,
  },
  (table) => [
    index("section_project_id_idx").on(table.projectId),
    index("section_suite_id_idx").on(table.suiteId),
    index("section_parent_id_idx").on(table.parentId),
  ],
);

export const testCase = pgTable(
  "test_case",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    preconditions: text("preconditions"),
    type: text("type").notNull().default("functional"),
    priority: text("priority").notNull().default("medium"),
    severity: text("severity").notNull().default("normal"),
    automationStatus: text("automation_status").notNull().default("not_automated"),
    status: text("status").notNull().default("draft"),
    behavior: text("behavior").notNull().default("not_set"),
    layer: text("layer").notNull().default("not_set"),
    isFlaky: boolean("is_flaky").notNull().default(false),
    postconditions: text("postconditions"),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    templateType: text("template_type").notNull().default("steps"),
    sectionId: text("section_id").references(() => section.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    cycleId: text("cycle_id").references(() => cycle.id, {
      onDelete: "set null",
    }),
    workspaceCycleId: text("workspace_cycle_id").references(() => workspaceCycle.id, {
      onDelete: "set null",
    }),
    caseNumber: integer("case_number"),
    caseKey: text("case_key"),
    displayOrder: integer("display_order").notNull().default(0),
    ...auditFields,
  },
  (table) => [
    index("test_case_project_id_idx").on(table.projectId),
    index("test_case_section_id_idx").on(table.sectionId),
    index("test_case_cycle_id_idx").on(table.cycleId),
    index("test_case_workspace_cycle_id_idx").on(table.workspaceCycleId),
    uniqueIndex("test_case_project_number_unique")
      .on(table.projectId, table.caseNumber)
      .where(sql`${table.deletedAt} is null`),
    index("test_case_case_key_idx").on(table.caseKey),
  ],
);

export const testStep = pgTable(
  "test_step",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    testCaseId: text("test_case_id")
      .notNull()
      .references(() => testCase.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    action: text("action").notNull(),
    data: text("data"),
    expectedResult: text("expected_result"),
    ...auditFields,
  },
  (table) => [index("test_step_test_case_id_idx").on(table.testCaseId)],
);

export const tag = pgTable(
  "tag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    color: text("color"),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("tag_project_name_active_unique")
      .on(table.projectId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index("tag_project_id_idx").on(table.projectId),
  ],
);

export const testCaseTag = pgTable(
  "test_case_tag",
  {
    testCaseId: text("test_case_id")
      .notNull()
      .references(() => testCase.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("test_case_tag_unique").on(table.testCaseId, table.tagId),
  ],
);

// ============================================================
// Application tables — Environment Configuration (project-scoped)
// ============================================================

export const environment = pgTable(
  "environment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    url: text("url"),
    description: text("description"),
    type: text("type").notNull().default("custom"),
    isDefault: boolean("is_default").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("environment_project_name_active_unique")
      .on(table.projectId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index("environment_project_id_idx").on(table.projectId),
  ],
);

// ============================================================
// Application tables — Cycle Management (project-scoped)
// ============================================================

export const cycle = pgTable(
  "cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: text("status").notNull().default("planned"),
    isCurrent: boolean("is_current").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("cycle_project_name_active_unique")
      .on(table.projectId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index("cycle_project_id_idx").on(table.projectId),
    index("cycle_status_idx").on(table.status),
    index("cycle_start_date_idx").on(table.startDate),
  ],
);

// ============================================================
// Application tables — Workspace Cycle Management (organization-scoped)
// ============================================================

export const workspaceCycle = pgTable(
  "workspace_cycle",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: text("status").notNull().default("planned"),
    isCurrent: boolean("is_current").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("workspace_cycle_org_name_active_unique")
      .on(table.organizationId, table.name)
      .where(sql`${table.deletedAt} is null`),
    index("workspace_cycle_organization_id_idx").on(table.organizationId),
    index("workspace_cycle_status_idx").on(table.status),
    index("workspace_cycle_start_date_idx").on(table.startDate),
  ],
);

// ============================================================
// Application tables — Test Execution (project-scoped)
// ============================================================

export const testPlan = pgTable(
  "test_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    ...auditFields,
  },
  (table) => [index("test_plan_project_id_idx").on(table.projectId)],
);

export const testRun = pgTable(
  "test_run",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    testPlanId: text("test_plan_id").references(() => testPlan.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    environment: text("environment"),
    environmentId: text("environment_id").references(() => environment.id, {
      onDelete: "set null",
    }),
    cycleId: text("cycle_id").references(() => cycle.id, {
      onDelete: "set null",
    }),
    workspaceCycleId: text("workspace_cycle_id").references(() => workspaceCycle.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    executedBy: text("executed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...auditFields,
  },
  (table) => [
    index("test_run_project_id_idx").on(table.projectId),
    index("test_run_test_plan_id_idx").on(table.testPlanId),
    index("test_run_environment_id_idx").on(table.environmentId),
    index("test_run_cycle_id_idx").on(table.cycleId),
    index("test_run_workspace_cycle_id_idx").on(table.workspaceCycleId),
  ],
);

export const testResult = pgTable(
  "test_result",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    testRunId: text("test_run_id")
      .notNull()
      .references(() => testRun.id, { onDelete: "cascade" }),
    testCaseId: text("test_case_id")
      .notNull()
      .references(() => testCase.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("untested"),
    executedBy: text("executed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    duration: integer("duration"),
    comment: text("comment"),
    defectCycleId: text("defect_cycle_id").references(() => cycle.id, {
      onDelete: "set null",
    }),
    defectWorkspaceCycleId: text("defect_workspace_cycle_id").references(() => workspaceCycle.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("test_result_test_run_id_idx").on(table.testRunId),
    index("test_result_test_case_id_idx").on(table.testCaseId),
    index("test_result_defect_cycle_id_idx").on(table.defectCycleId),
    index("test_result_defect_workspace_cycle_id_idx").on(table.defectWorkspaceCycleId),
    uniqueIndex("test_result_run_case_unique").on(
      table.testRunId,
      table.testCaseId,
    ),
  ],
);

export const testStepResult = pgTable(
  "test_step_result",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    testResultId: text("test_result_id")
      .notNull()
      .references(() => testResult.id, { onDelete: "cascade" }),
    testStepId: text("test_step_id")
      .notNull()
      .references(() => testStep.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("untested"),
    actualResult: text("actual_result"),
    comment: text("comment"),
    ...timestamps,
  },
  (table) => [
    index("test_step_result_test_result_id_idx").on(table.testResultId),
    uniqueIndex("test_step_result_unique").on(
      table.testResultId,
      table.testStepId,
    ),
  ],
);

// ============================================================
// Application tables — Cross-cutting
// ============================================================

export const attachment = pgTable(
  "attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    ...auditFields,
  },
  (table) => [
    index("attachment_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const shareLink = pgTable(
  "share_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    permission: text("permission").notNull().default("read"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("share_link_project_id_idx").on(table.projectId),
    index("share_link_entity_idx").on(table.entityType, table.entityId),
  ],
);

// ============================================================
// Application tables — API Tokens
// ============================================================

export const apiToken = pgTable(
  "api_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastUsedIp: text("last_used_ip"),
    status: text("status").notNull().default("active"),
    scopeType: text("scope_type").notNull().default("personal"),
    scopeStatus: text("scope_status").notNull().default("approved"),
    approvedBy: text("approved_by").references(() => user.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    index("api_token_user_id_idx").on(table.userId),
    index("api_token_organization_id_idx").on(table.organizationId),
    index("api_token_token_hash_idx").on(table.tokenHash),
    index("api_token_scope_type_idx").on(table.scopeType),
    index("api_token_scope_status_idx").on(table.scopeStatus),
    uniqueIndex("api_token_user_name_active_unique")
      .on(table.userId, table.name)
      .where(sql`${table.deletedAt} is null AND ${table.status} = 'active'`),
  ],
);

export const apiTokenPermission = pgTable(
  "api_token_permission",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tokenId: text("token_id")
      .notNull()
      .references(() => apiToken.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    ...timestamps,
  },
  (table) => [
    index("api_token_permission_token_id_idx").on(table.tokenId),
    uniqueIndex("api_token_permission_unique").on(
      table.tokenId,
      table.resource,
      table.action,
    ),
  ],
);

export const apiTokenProjectScope = pgTable(
  "api_token_project_scope",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tokenId: text("token_id")
      .notNull()
      .references(() => apiToken.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("api_token_project_scope_token_id_idx").on(table.tokenId),
    index("api_token_project_scope_project_id_idx").on(table.projectId),
    uniqueIndex("api_token_project_scope_unique").on(
      table.tokenId,
      table.projectId,
    ),
  ],
);

export const apiTokenActivity = pgTable(
  "api_token_activity",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tokenId: text("token_id")
      .notNull()
      .references(() => apiToken.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    path: text("path").notNull(),
    statusCode: integer("status_code").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    resource: text("resource"),
    action: text("action"),
    allowed: boolean("allowed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("api_token_activity_token_id_idx").on(table.tokenId),
    index("api_token_activity_created_at_idx").on(table.createdAt),
    index("api_token_activity_ip_idx").on(table.ipAddress),
  ],
);

// ============================================================
// Application tables — Team Membership (project-scoped)
// ============================================================

export const projectMember = pgTable(
  "project_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("team_member"),
    ...auditFields,
  },
  (table) => [
    index("project_member_project_id_idx").on(table.projectId),
    index("project_member_user_id_idx").on(table.userId),
    uniqueIndex("project_member_project_user_active_unique")
      .on(table.projectId, table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// ============================================================
// Application tables — Comments (polymorphic, project-scoped)
// ============================================================

export const comment = pgTable(
  "comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    body: text("body").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...auditFields,
  },
  (table) => [
    index("comment_entity_idx").on(table.entityType, table.entityId),
    index("comment_project_id_idx").on(table.projectId),
    index("comment_parent_id_idx").on(table.parentId),
    index("comment_created_at_idx").on(table.createdAt),
  ],
);

export const commentReaction = pgTable(
  "comment_reaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commentId: text("comment_id")
      .notNull()
      .references(() => comment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    ...timestamps,
  },
  (table) => [
    index("comment_reaction_comment_id_idx").on(table.commentId),
    uniqueIndex("comment_reaction_unique").on(
      table.commentId,
      table.userId,
      table.emoji,
    ),
  ],
);

export const commentMention = pgTable(
  "comment_mention",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    commentId: text("comment_id")
      .notNull()
      .references(() => comment.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("comment_mention_comment_id_idx").on(table.commentId),
    index("comment_mention_user_id_idx").on(table.userId),
    uniqueIndex("comment_mention_unique").on(table.commentId, table.userId),
  ],
);

export const projectMemberInvitation = pgTable(
  "project_member_invitation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("team_member"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_member_invitation_project_id_idx").on(table.projectId),
    uniqueIndex("project_member_invitation_project_email_pending_unique")
      .on(table.projectId, table.email)
      .where(sql`${table.status} = 'pending'`),
  ],
);
