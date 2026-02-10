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
    slug: text("slug").notNull(),
    description: text("description"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    displayOrder: integer("display_order").notNull().default(0),
    ...auditFields,
  },
  (table) => [
    index("project_organization_id_idx").on(table.organizationId),
    uniqueIndex("project_org_slug_active_unique")
      .on(table.organizationId, table.slug)
      .where(sql`${table.deletedAt} is null`),
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
    type: text("type").notNull().default("manual"),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("draft"),
    templateType: text("template_type").notNull().default("steps"),
    sectionId: text("section_id").references(() => section.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    index("test_case_project_id_idx").on(table.projectId),
    index("test_case_section_id_idx").on(table.sectionId),
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
    ...timestamps,
  },
  (table) => [
    index("test_result_test_run_id_idx").on(table.testRunId),
    index("test_result_test_case_id_idx").on(table.testCaseId),
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
