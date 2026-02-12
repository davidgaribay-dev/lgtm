CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"last_used_ip" text,
	"status" text DEFAULT 'active' NOT NULL,
	"scope_type" text DEFAULT 'personal' NOT NULL,
	"scope_status" text DEFAULT 'approved' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	CONSTRAINT "api_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "api_token_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"token_id" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"resource" text,
	"action" text,
	"allowed" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_token_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"token_id" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_token_project_scope" (
	"id" text PRIMARY KEY NOT NULL,
	"token_id" text NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"project_id" text NOT NULL,
	"parent_id" text,
	"body" text NOT NULL,
	"edited_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "comment_mention" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" text DEFAULT 'planned' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "defect" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"defect_number" integer,
	"defect_key" text,
	"severity" text DEFAULT 'normal' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"defect_type" text DEFAULT 'functional' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"assignee_id" text,
	"steps_to_reproduce" text,
	"expected_result" text,
	"actual_result" text,
	"test_result_id" text,
	"test_run_id" text,
	"test_case_id" text,
	"external_url" text,
	"project_id" text NOT NULL,
	"environment_id" text,
	"cycle_id" text,
	"workspace_cycle_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "environment" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp,
	"inviterId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"organization_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"next_test_case_number" integer DEFAULT 1 NOT NULL,
	"next_run_number" integer DEFAULT 1 NOT NULL,
	"next_defect_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "project_member" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'team_member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "project_member_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'team_member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"inviter_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" text NOT NULL,
	"suite_id" text,
	"parent_id" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"activeOrganizationId" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "share_link" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"permission" text DEFAULT 'read' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	CONSTRAINT "share_link_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "shared_step" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "shared_step_action" (
	"id" text PRIMARY KEY NOT NULL,
	"shared_step_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"action" text NOT NULL,
	"data" text,
	"expected_result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "test_case" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"preconditions" text,
	"type" text DEFAULT 'functional' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"severity" text DEFAULT 'normal' NOT NULL,
	"automation_status" text DEFAULT 'not_automated' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"behavior" text DEFAULT 'not_set' NOT NULL,
	"layer" text DEFAULT 'not_set' NOT NULL,
	"is_flaky" boolean DEFAULT false NOT NULL,
	"postconditions" text,
	"assignee_id" text,
	"template_type" text DEFAULT 'steps' NOT NULL,
	"section_id" text,
	"suite_id" text,
	"project_id" text NOT NULL,
	"cycle_id" text,
	"workspace_cycle_id" text,
	"case_number" integer,
	"case_key" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "test_case_tag" (
	"test_case_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "test_plan_case" (
	"id" text PRIMARY KEY NOT NULL,
	"test_plan_id" text NOT NULL,
	"test_case_id" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_result" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"test_case_id" text NOT NULL,
	"status" text DEFAULT 'untested' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"executed_by" text,
	"executed_at" timestamp with time zone,
	"duration" integer,
	"comment" text,
	"defect_cycle_id" text,
	"defect_workspace_cycle_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_run" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"run_number" integer,
	"run_key" text,
	"description" text,
	"project_id" text NOT NULL,
	"test_plan_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"environment" text,
	"environment_id" text,
	"cycle_id" text,
	"workspace_cycle_id" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"executed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "test_run_log" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"test_result_id" text,
	"step_name" text,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"line_offset" integer NOT NULL,
	"line_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_step" (
	"id" text PRIMARY KEY NOT NULL,
	"test_case_id" text NOT NULL,
	"step_order" integer NOT NULL,
	"action" text NOT NULL,
	"data" text,
	"expected_result" text,
	"shared_step_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "test_step_result" (
	"id" text PRIMARY KEY NOT NULL,
	"test_result_id" text NOT NULL,
	"test_step_id" text NOT NULL,
	"status" text DEFAULT 'untested' NOT NULL,
	"actual_result" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_suite" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"description" text,
	"onboardingStep" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "workspace_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" text DEFAULT 'planned' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token_activity" ADD CONSTRAINT "api_token_activity_token_id_api_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."api_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token_permission" ADD CONSTRAINT "api_token_permission_token_id_api_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."api_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token_project_scope" ADD CONSTRAINT "api_token_project_scope_token_id_api_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."api_token"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token_project_scope" ADD CONSTRAINT "api_token_project_scope_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_comment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mention" ADD CONSTRAINT "comment_mention_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mention" ADD CONSTRAINT "comment_mention_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reaction" ADD CONSTRAINT "comment_reaction_comment_id_comment_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reaction" ADD CONSTRAINT "comment_reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle" ADD CONSTRAINT "cycle_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_test_result_id_test_result_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_result"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_test_run_id_test_run_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_cycle_id_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defect" ADD CONSTRAINT "defect_workspace_cycle_id_workspace_cycle_id_fk" FOREIGN KEY ("workspace_cycle_id") REFERENCES "public"."workspace_cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment" ADD CONSTRAINT "environment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_user_id_fk" FOREIGN KEY ("inviterId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member_invitation" ADD CONSTRAINT "project_member_invitation_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_member_invitation" ADD CONSTRAINT "project_member_invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_suite_id_test_suite_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."test_suite"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_parent_id_section_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."section"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_step" ADD CONSTRAINT "shared_step_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_step_action" ADD CONSTRAINT "shared_step_action_shared_step_id_shared_step_id_fk" FOREIGN KEY ("shared_step_id") REFERENCES "public"."shared_step"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_suite_id_test_suite_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."test_suite"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_cycle_id_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case" ADD CONSTRAINT "test_case_workspace_cycle_id_workspace_cycle_id_fk" FOREIGN KEY ("workspace_cycle_id") REFERENCES "public"."workspace_cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case_tag" ADD CONSTRAINT "test_case_tag_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_case_tag" ADD CONSTRAINT "test_case_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan" ADD CONSTRAINT "test_plan_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan_case" ADD CONSTRAINT "test_plan_case_test_plan_id_test_plan_id_fk" FOREIGN KEY ("test_plan_id") REFERENCES "public"."test_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_plan_case" ADD CONSTRAINT "test_plan_case_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_test_run_id_test_run_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_executed_by_user_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_defect_cycle_id_cycle_id_fk" FOREIGN KEY ("defect_cycle_id") REFERENCES "public"."cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_result" ADD CONSTRAINT "test_result_defect_workspace_cycle_id_workspace_cycle_id_fk" FOREIGN KEY ("defect_workspace_cycle_id") REFERENCES "public"."workspace_cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_test_plan_id_test_plan_id_fk" FOREIGN KEY ("test_plan_id") REFERENCES "public"."test_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_environment_id_environment_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_cycle_id_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_workspace_cycle_id_workspace_cycle_id_fk" FOREIGN KEY ("workspace_cycle_id") REFERENCES "public"."workspace_cycle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run" ADD CONSTRAINT "test_run_executed_by_user_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_log" ADD CONSTRAINT "test_run_log_test_run_id_test_run_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_log" ADD CONSTRAINT "test_run_log_test_result_id_test_result_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_step" ADD CONSTRAINT "test_step_test_case_id_test_case_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_step" ADD CONSTRAINT "test_step_shared_step_id_shared_step_id_fk" FOREIGN KEY ("shared_step_id") REFERENCES "public"."shared_step"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_step_result" ADD CONSTRAINT "test_step_result_test_result_id_test_result_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_step_result" ADD CONSTRAINT "test_step_result_test_step_id_test_step_id_fk" FOREIGN KEY ("test_step_id") REFERENCES "public"."test_step"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_suite" ADD CONSTRAINT "test_suite_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_cycle" ADD CONSTRAINT "workspace_cycle_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_token_user_id_idx" ON "api_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_token_organization_id_idx" ON "api_token" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "api_token_token_hash_idx" ON "api_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "api_token_scope_type_idx" ON "api_token" USING btree ("scope_type");--> statement-breakpoint
CREATE INDEX "api_token_scope_status_idx" ON "api_token" USING btree ("scope_status");--> statement-breakpoint
CREATE UNIQUE INDEX "api_token_user_name_active_unique" ON "api_token" USING btree ("user_id","name") WHERE "api_token"."deleted_at" is null AND "api_token"."status" = 'active';--> statement-breakpoint
CREATE INDEX "api_token_activity_token_id_idx" ON "api_token_activity" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "api_token_activity_created_at_idx" ON "api_token_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_token_activity_ip_idx" ON "api_token_activity" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "api_token_permission_token_id_idx" ON "api_token_permission" USING btree ("token_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_token_permission_unique" ON "api_token_permission" USING btree ("token_id","resource","action");--> statement-breakpoint
CREATE INDEX "api_token_project_scope_token_id_idx" ON "api_token_project_scope" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "api_token_project_scope_project_id_idx" ON "api_token_project_scope" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_token_project_scope_unique" ON "api_token_project_scope" USING btree ("token_id","project_id");--> statement-breakpoint
CREATE INDEX "attachment_entity_idx" ON "attachment" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "comment_entity_idx" ON "comment" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "comment_project_id_idx" ON "comment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "comment_parent_id_idx" ON "comment" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comment_created_at_idx" ON "comment" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "comment_mention_comment_id_idx" ON "comment_mention" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_mention_user_id_idx" ON "comment_mention" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_mention_unique" ON "comment_mention" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "comment_reaction_comment_id_idx" ON "comment_reaction" USING btree ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_reaction_unique" ON "comment_reaction" USING btree ("comment_id","user_id","emoji");--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_project_name_active_unique" ON "cycle" USING btree ("project_id","name") WHERE "cycle"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "cycle_project_id_idx" ON "cycle" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "cycle_status_idx" ON "cycle" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cycle_start_date_idx" ON "cycle" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "defect_project_id_idx" ON "defect" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "defect_status_idx" ON "defect" USING btree ("status");--> statement-breakpoint
CREATE INDEX "defect_severity_idx" ON "defect" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "defect_assignee_id_idx" ON "defect" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "defect_test_result_id_idx" ON "defect" USING btree ("test_result_id");--> statement-breakpoint
CREATE INDEX "defect_test_run_id_idx" ON "defect" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "defect_test_case_id_idx" ON "defect" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "defect_environment_id_idx" ON "defect" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "defect_cycle_id_idx" ON "defect" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "defect_workspace_cycle_id_idx" ON "defect" USING btree ("workspace_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "defect_project_number_unique" ON "defect" USING btree ("project_id","defect_number") WHERE "defect"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "defect_defect_key_idx" ON "defect" USING btree ("defect_key");--> statement-breakpoint
CREATE UNIQUE INDEX "environment_project_name_active_unique" ON "environment" USING btree ("project_id","name") WHERE "environment"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "environment_project_id_idx" ON "environment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_organization_id_idx" ON "project" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_org_key_active_unique" ON "project" USING btree ("organization_id","key") WHERE "project"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_key_idx" ON "project" USING btree ("key");--> statement-breakpoint
CREATE INDEX "project_member_project_id_idx" ON "project_member" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_member_user_id_idx" ON "project_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_project_user_active_unique" ON "project_member" USING btree ("project_id","user_id") WHERE "project_member"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "project_member_invitation_project_id_idx" ON "project_member_invitation" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_member_invitation_project_email_pending_unique" ON "project_member_invitation" USING btree ("project_id","email") WHERE "project_member_invitation"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "section_project_id_idx" ON "section" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "section_suite_id_idx" ON "section" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "section_parent_id_idx" ON "section" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "share_link_project_id_idx" ON "share_link" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "share_link_entity_idx" ON "share_link" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "shared_step_project_id_idx" ON "shared_step" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shared_step_project_title_active_unique" ON "shared_step" USING btree ("project_id","title") WHERE "shared_step"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "shared_step_status_idx" ON "shared_step" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shared_step_action_shared_step_id_idx" ON "shared_step_action" USING btree ("shared_step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_project_name_active_unique" ON "tag" USING btree ("project_id","name") WHERE "tag"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tag_project_id_idx" ON "tag" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_case_project_id_idx" ON "test_case" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_case_section_id_idx" ON "test_case" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "test_case_suite_id_idx" ON "test_case" USING btree ("suite_id");--> statement-breakpoint
CREATE INDEX "test_case_cycle_id_idx" ON "test_case" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "test_case_workspace_cycle_id_idx" ON "test_case" USING btree ("workspace_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_case_project_number_unique" ON "test_case" USING btree ("project_id","case_number") WHERE "test_case"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "test_case_case_key_idx" ON "test_case" USING btree ("case_key");--> statement-breakpoint
CREATE UNIQUE INDEX "test_case_tag_unique" ON "test_case_tag" USING btree ("test_case_id","tag_id");--> statement-breakpoint
CREATE INDEX "test_plan_project_id_idx" ON "test_plan" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_plan_case_plan_id_idx" ON "test_plan_case" USING btree ("test_plan_id");--> statement-breakpoint
CREATE INDEX "test_plan_case_case_id_idx" ON "test_plan_case" USING btree ("test_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_plan_case_unique" ON "test_plan_case" USING btree ("test_plan_id","test_case_id");--> statement-breakpoint
CREATE INDEX "test_result_test_run_id_idx" ON "test_result" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_result_test_case_id_idx" ON "test_result" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_result_defect_cycle_id_idx" ON "test_result" USING btree ("defect_cycle_id");--> statement-breakpoint
CREATE INDEX "test_result_defect_workspace_cycle_id_idx" ON "test_result" USING btree ("defect_workspace_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_result_run_case_unique" ON "test_result" USING btree ("test_run_id","test_case_id");--> statement-breakpoint
CREATE INDEX "test_result_run_status_idx" ON "test_result" USING btree ("test_run_id","status");--> statement-breakpoint
CREATE INDEX "test_run_project_id_idx" ON "test_run" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_run_test_plan_id_idx" ON "test_run" USING btree ("test_plan_id");--> statement-breakpoint
CREATE INDEX "test_run_environment_id_idx" ON "test_run" USING btree ("environment_id");--> statement-breakpoint
CREATE INDEX "test_run_cycle_id_idx" ON "test_run" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "test_run_workspace_cycle_id_idx" ON "test_run" USING btree ("workspace_cycle_id");--> statement-breakpoint
CREATE INDEX "test_run_run_key_idx" ON "test_run" USING btree ("run_key");--> statement-breakpoint
CREATE INDEX "test_run_log_run_id_idx" ON "test_run_log" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_run_log_result_id_idx" ON "test_run_log" USING btree ("test_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_run_log_scope_chunk_idx" ON "test_run_log" USING btree ("test_run_id","test_result_id","chunk_index");--> statement-breakpoint
CREATE INDEX "test_step_test_case_id_idx" ON "test_step" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_step_shared_step_id_idx" ON "test_step" USING btree ("shared_step_id");--> statement-breakpoint
CREATE INDEX "test_step_result_test_result_id_idx" ON "test_step_result" USING btree ("test_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_step_result_unique" ON "test_step_result" USING btree ("test_result_id","test_step_id");--> statement-breakpoint
CREATE INDEX "test_suite_project_id_idx" ON "test_suite" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_cycle_org_name_active_unique" ON "workspace_cycle" USING btree ("organization_id","name") WHERE "workspace_cycle"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "workspace_cycle_organization_id_idx" ON "workspace_cycle" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspace_cycle_status_idx" ON "workspace_cycle" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_cycle_start_date_idx" ON "workspace_cycle" USING btree ("start_date");